import {updateOne } from "./db_utils.mjs";
import { trigger_glider_event } from "./events.mjs";
import db from '../db/conn.mjs'
import axios from "axios";
import { is_in_polygon, convert_gps } from "./geofence_utils.mjs";
import { send_slack_message } from "./slack.mjs";
import { broadcast_delete_boats, broadcast_new_boats, broadcast_update_boats } from "../views/sse/boats.mjs";

async function _fetch_ais() {
  const url = process.env.AIS_API_URL;
  try {
    const res = await axios.get(url);
    return res.data;
  } catch (error) {
    console.log("COULD NOT GET AIS DATA!");
    console.log(error);
    throw error;
  }
}

async function _ais_exists(ais_data) {
  const col = await db.collection("historic_ais");
  const ais = await col.findOne({
    "AIS.TIMESTAMP": ais_data.AIS.TIMESTAMP,
    "AIS.MMSI": ais_data.AIS.MMSI,
  });
  // console.log(ais);
  if (ais == null) {
    console.log("Historic DNE");
    return false;
  } else {
    console.log("Historic Exists");
    return true;
  }
}

async function insert_ais_historic_data(ais_data_list) {
  const historic_col = await db.collection("historic_ais");
  for (const ais of ais_data_list) {
    const exists = await _ais_exists(ais);
    if (!exists) {
      await historic_col.insertOne({
        AIS: ais.AIS,
        api_time: new Date(),
      });
    }
  }
}

async function _clean_boats() {
  const time_cutoff = 3; //hours (this could be configurable, open to either)
  const col = await db.collection("boats");
  const boats = col.find({}); //No way this couldn't be a mongo filter, right?
  let deleted_boats_arr = []
  for await (const boat of boats) {
    const time_offset =
      (new Date().getTime() -
        boat.locations[boat.locations.length - 1].TIMESTAMP.getTime()) /
      (1000 * 60 * 60);
    console.log(time_offset);
    if (time_offset >= time_cutoff) {
      console.log(`Deleting, over ${time_cutoff} hours`);
      const deleted_boat = await col.deleteOne({ _id: boat._id });
      deleted_boats_arr.push(deleted_boat)
    } else {
      console.log("Still got time");
    }
  }
  broadcast_delete_boats(deleted_boats_arr)
}

function _TIMESTAMP_to_date(TIMESTAMP) {
  return new Date(TIMESTAMP.replace(" ", "T").replace(" UTC", "Z"));
}

function _get_new_location_obj(ais_data) {
  return {
    TIMESTAMP: _TIMESTAMP_to_date(ais_data.TIMESTAMP),
    LATITUDE: ais_data.LATITUDE,
    LONGITUDE: ais_data.LONGITUDE,
    NAVSTAT: ais_data.NAVSTAT,
    COURSE: ais_data.COURSE,
    HEADING: ais_data.HEADING,
    SPEED: ais_data.SPEED,
    SRC: ais_data.SRC,
    api_time: new Date(),
  };
}

async function _insert_or_update_current_boats(ais_data_list) {
  const col = await db.collection("boats");
  let update_boats_arr = []
  let new_boats_arr = []
  for (const ele of ais_data_list) {
    const ais_data = ele.AIS;
    const boat = await col.findOne({ MMSI: ais_data.MMSI });
    if (boat == null) {
      const new_doc = {
        MMSI: ais_data.MMSI,
        gliders_inside: [],
        NAME: ais_data.NAME,
        locations: [_get_new_location_obj(ais_data)],
      }
      await col.insertOne(new_doc);
      new_boats_arr.push(new_doc)
    } else {
      const last_timestamp =
        boat.locations[boat.locations.length - 1].TIMESTAMP;
      if (
        last_timestamp.getTime() !=
        _TIMESTAMP_to_date(ais_data.TIMESTAMP).getTime()
      ) {
        console.log("New timestamp!");
        let new_locations = [
          ...boat.locations,
          _get_new_location_obj(ais_data),
        ];
        if (new_locations.length > 10) {
          new_locations = new_locations.slice(-9);
        }
        await updateOne("boats", boat._id, {
          locations: new_locations,
        });
        update_boats_arr.push({...boat, locations: new_locations})
      } else {
        console.log("No New Timestamp");
      }
    }
  }
  //This hard coded 180 needs to be moved, frontend get_boats function also has a hard coded 180
  broadcast_new_boats(serialize_boats(180, new_boats_arr))
  broadcast_update_boats(serialize_boats(180, update_boats_arr))
}

function _predict_ship_movement(AIS, key, angle_offset = 0, distance = 50) {
  //key is heading or course
  if (AIS[key] > 360) {
    return [AIS["LATITUDE"], AIS["LONGITUDE"]];
  }
  let offset_tc = AIS[key] + angle_offset;
  if (offset_tc > 360) {
    offset_tc = offset_tc - 360;
  } else if (offset_tc < 0) {
    offset_tc = offset_tc + 360;
  }
  const degToRad = Math.PI / 180;
  const radToDeg = 180 / Math.PI;
  const lat1 = AIS["LATITUDE"] * degToRad;
  const lon1 = AIS["LONGITUDE"] * degToRad;
  const tc = (-1 * (offset_tc - 180) + 180) * degToRad; //have to mirror for some reason
  const d = distance / 6371;
  const lat = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(tc)
  );
  const lon =
    ((lon1 -
      Math.asin((Math.sin(tc) * Math.sin(d)) / Math.cos(lat)) +
      Math.PI) %
      (2 * Math.PI)) -
    Math.PI;

  return [lat * radToDeg, lon * radToDeg];
}

function _get_predicted_ship_position(
  ais_data,
  hour_offset,
  degree_offset = 10
) {
  // get distance in km that the ship will have traveled
  const d = _predict_ship_distance(ais_data, hour_offset)
  const cone = _get_predict_cone(ais_data, d, degree_offset);
  return [cone[0], cone[2]];
}

function _predict_ship_distance(ais_data, hour_offset) {
  return ais_data["SPEED"] * 1.852 * hour_offset; //Magic number!? :pensive:
}

function _get_predict_cone(ais_data, distance = 50, cone_degrees = 10) {
  let ret_points = [];
  ret_points.push(
    _predict_ship_movement(ais_data, "COURSE", cone_degrees, distance)
  );
  ret_points.push([ais_data["LATITUDE"], ais_data["LONGITUDE"]]);
  ret_points.push(
    _predict_ship_movement(ais_data, "COURSE", -cone_degrees, distance)
  );
  return ret_points;
}

// config = {boat_id: str, last_ais_point}
async function predict_boat_movement_single(hour_offset, config) {
  let {last_ais_point, boat_id} = config
  if(!boat_id && !last_ais_point){
    throw new Error("Need to have either boat_id or ais_data")
  }
  if(boat_id) {
    const collection = await db.collection("boats");
    const boat = await collection.findOne({ _id: boat_id });
    last_ais_point = boat.locations[boat.locations.length - 1];
  }
  const boat_distance = _predict_ship_distance(last_ais_point, hour_offset)
  return {
    line: _get_predicted_ship_position(last_ais_point, hour_offset),
    center: _get_predicted_ship_position(last_ais_point, hour_offset, 0)[0],
    cone: _get_predict_cone(last_ais_point, boat_distance)
  }
}

// returns {cone: [], intervals: [{offset: int, line: [], center: []}]}
// or {cone: [], line: [], center: []}
async function predict_boat_movement_range(boat_id, minutes_diff_start, minutes_diff_end, interval_minutes, current_minute_offset) {
  const collection = await db.collection("boats");
  const boat = await collection.findOne({ _id: boat_id });
  if (boat != null) {
    const last_pos = boat.locations[boat.locations.length - 1];
    let intervals = []
    for(let i=minutes_diff_start; i<=minutes_diff_end; i+=interval_minutes){
      const hour_offset = i/60
      const interval_movement_predict = await predict_boat_movement_single(hour_offset, {last_ais_point: last_pos})
      intervals.push({
        offset: i-Math.floor(current_minute_offset),
        ...interval_movement_predict
      })
    }
    return {
        count: intervals.length,
        cone: _get_predict_cone(last_pos),
        intervals: intervals
    };
  } else {
    return { cone: [], line: [], center: [], intervals: [] };
  }
}


async function get_gliders_inside_current_all() {
  const boats_col = await db.collection("boats");
  const boats = boats_col.find({})
  let gliders_inside = [] 
  for await (const boat of boats){
    const gliders = await gliders_in_boat_path(boat)
    for(const glider of gliders){
      if (!gliders_inside.includes(glider)){
        gliders_inside.push(glider)
      }
    }
  }
  return gliders_inside
}


async function get_glider_list_inside_all() {
  const boats_col = await db.collection("boats");
  const boats = boats_col.find({})
  let gliders_inside = []
  for await (const boat of boats){
    // console.log(boat)
    if(boat.gliders_inside == undefined){
      console.log(`NO gliders_inside for boat: ${boat.NAME}`)
      updateOne("boats", boat._id, {gliders_inside: []})
      continue
    }
    for(const glider of boat.gliders_inside){
      if (!gliders_inside.includes(glider)){
        gliders_inside.push(glider)
      }
    }
  }
  return gliders_inside
}

// glider object
async function update_glider_boat_paths(glider){
  const glider_id = glider._id.toHexString()
  const boats_col = await db.collection("boats");
  const geofence_col = await db.collection("geofences")
  
  let glider_was_in_a_path = false
  let glider_now_in_a_path = false
  const boats = boats_col.find({})
  for await (const boat of boats){
    let glider_was_in_this_path = false
    if(boat.gliders_inside.includes(glider_id)){
      glider_was_in_a_path = true
      glider_was_in_this_path = true
    }
    // Check if boat is in a safe zone
    // If the boat and glider isn't in a safe zone, trigger the script
    const currently_in_this_path = await is_glider_in_boat_path(glider, boat)
    if(currently_in_this_path && !glider_was_in_this_path){
      const gliders_inside = [...boat.gliders_inside, glider_id]
      updateOne('boats', boat._id.toHexString(), {gliders_inside: gliders_inside})
    }
    else if(!currently_in_this_path && glider_was_in_this_path){
      const gliders_inside = boat.gliders_inside.filter(g_id => g_id !== glider_id)
      updateOne('boats', boat._id.toHexString(), {gliders_inside: gliders_inside})
    }
    if(currently_in_this_path){
      glider_now_in_a_path = true
    }
  }

  if(glider_was_in_a_path && !glider_now_in_a_path){
    send_slack_message(`${glider.name} is no longer in the path of a ship :)`)
    await trigger_glider_event(glider, "ship", "exit")
  }
  else if(!glider_was_in_a_path && glider_now_in_a_path){
    send_slack_message(`${glider.name} is in the path of a ship! :slocum_glider: :ship:`)
    await trigger_glider_event(glider, "ship", "enter")
  }

}

async function update_gliders_inside_boat_paths(glider_id=undefined){
  const gliders_that_were_in_path = await get_glider_list_inside_all()
  console.log("Gliders that were in path:")
  console.log(gliders_that_were_in_path)

  const boats_col = await db.collection("boats");
  const gliders_col = await db.collection("gliders");
  const gliders_now_in_path = await get_gliders_inside_current_all()
  console.log("Gliders now in path:")
  console.log(gliders_now_in_path)

  const boats = boats_col.find({})
  for await (const boat of boats){
    let new_gliders_inside = []
    const gliders_inside = await gliders_in_boat_path(boat)
    for(const glider of gliders_inside){}
    updateOne('boats', boat._id.toHexString(), { gliders_inside: gliders_inside })
  }
  const gliders = gliders_col.find(glider_filter)
  for await (const glider of gliders){
    const glider_id_str = glider._id.toHexString() 
    const glider_was_in = gliders_that_were_in_path.includes(glider_id_str)
    const glider_is_in = gliders_now_in_path.includes(glider_id_str)
    if(glider_was_in != glider_is_in){
      if(glider_is_in){
        send_slack_message(`${glider.name} is in the path of a ship! :slocum_glider: :ship:`)
        await trigger_glider_event(glider, "ship", "enter")
      }
      else{
        send_slack_message(`${glider.name} is no longer in the path of a ship :)`)
        await trigger_glider_event(glider, "ship", "exit")
      }
    }
  }

}

// There is going to be an assumption that boats that are about to leave the AIS area wont have a glider in their path
// Because if a glider is in a ships path, then it gets cleaned, and the glider is in a ships path again, it will send
// the glider enter again. Which isn't bad, but isn't expected.
async function update_boat_locations() {
  console.log("Updating boats")


  const new_ais = await _fetch_ais();
  await insert_ais_historic_data(new_ais);
  await _insert_or_update_current_boats(new_ais);
  await _clean_boats();
}

function get_boat_polygon(last_pos, hours_diff) {
  const ship_pos = [last_pos["LATITUDE"], last_pos["LONGITUDE"]];
  const corners = _get_predicted_ship_position(last_pos, hours_diff);
  return [ship_pos, ...corners];
}

// glider: glider object, boat: boat object
async function is_glider_in_boat_path(glider, boat){
  if (glider.track) {
    let glider_pos = glider.track[glider.track.length - 1];
    glider_pos = [convert_gps(glider_pos.lat), convert_gps(glider_pos.lng)];
    const last_location = boat.locations[boat.locations.length - 1];
    const cone_hour_offset = glider.boat_cone_hour_offset ?? 1.5
    const final_hour_offset = ((new Date().getTime() - last_location.TIMESTAMP.getTime()) / (1000 * 60 * 60)) + cone_hour_offset
    console.log(`Using hour offset: ${final_hour_offset} for glider ${glider.name}`)
    const boat_poly = get_boat_polygon(last_location, final_hour_offset);
    if (is_in_polygon(glider_pos, [...boat_poly, [null]])) {
      // check if boat is in a safe zone, if so that's not very safe
      const geofence_col = await db.collection("geofences")
      const boat_in_safe_zone = geofence_col.findOne({safe_zone: true, boats_inside: boat._id.toHexString()})
      const glider_in_safe_zone = geofence_col.findOne({safe_zone: true, gliders_inside: glider._id.toHexString()})
    if(glider_in_safe_zone && !boat_in_safe_zone){
      send_slack_message(`Glider ${glider.name} is in the path of a ship, but is also in a safe zone`)
      return false
    }
    return true
    }
  }
  return false

}


// returns list of gliders in range of boat
async function gliders_in_boat_path(boat) {
  const glider_collection = await db.collection("gliders");
  const gliders = await glider_collection.find({}).toArray();
  let ret_gliders = [];
  for (const glider of gliders) {
    if(await is_glider_in_boat_path(glider, boat)){
      ret_gliders.push(glider._id.toHexString());
    }
  }
  return ret_gliders;
}

async function serialize_boat(minute_range, boat){
  const last_location_time = boat.locations.at(-1).TIMESTAMP;
  const minute_offset =
    (new Date().getTime() - last_location_time.getTime()) /
    (1000 * 60)
  let min_minutes = Math.floor(minute_offset)
  const max_minutes = Math.floor(minute_offset + minute_range)
  if (min_minutes < 0){
    min_minutes = 0
  }
  boat["prediction"] = await predict_boat_movement_single(minute_offset/60, {boat_id: boat._id});
  boat["prediction_range"] = await predict_boat_movement_range(boat._id, min_minutes,max_minutes,1, minute_offset);
  boat["minute_offset"] = minute_offset;
  return boat
}

async function serialize_boats(minute_range, boats=undefined) {
  const col = await db.collection("boats");
  boats = boats ?? await col.find({}).toArray();
  for(let i=0; i<boats.length; i++){
    boats[i] = await serialize_boat(minute_range, boats[i])
    // console.log(boats[i])
  }
  return boats;
}

export {
  predict_boat_movement_range,
  gliders_in_boat_path as gliders_in_boath_path,
  serialize_boats,
  update_boat_locations,
  update_gliders_inside_boat_paths,
  update_glider_boat_paths
};
