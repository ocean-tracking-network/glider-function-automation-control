import {updateOne } from "./db_utils.mjs";
import db from '../db/conn.mjs'
import axios from "axios";
import { is_in_polygon, convert_gps } from "./geofence_utils.mjs";

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
  for await (const boat of boats) {
    const time_offset =
      (new Date().getTime() -
        boat.locations[boat.locations.length - 1].TIMESTAMP.getTime()) /
      (1000 * 60 * 60);
    console.log(time_offset);
    if (time_offset >= time_cutoff) {
      console.log(`Deleting, over ${time_cutoff} hours`);
      await col.deleteOne({ _id: boat._id });
    } else {
      console.log("Still got time");
    }
  }
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
    api_time: new Date(),
  };
}

async function _insert_or_update_current_boats(ais_data_list) {
  const col = await db.collection("boats");
  for (const ele of ais_data_list) {
    const ais_data = ele.AIS;
    const boat = await col.findOne({ MMSI: ais_data.MMSI });
    if (boat == null) {
      await col.insertOne({
        MMSI: ais_data.MMSI,
        NAME: ais_data.NAME,
        locations: [_get_new_location_obj(ais_data)],
      });
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
      } else {
        console.log("No New Timestamp");
      }
    }
  }
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

async function update_boats() {
  const new_ais = await _fetch_ais();
  await insert_ais_historic_data(new_ais);
  await _insert_or_update_current_boats(new_ais);
  await _clean_boats();

  const col = await db.collection("boats");
  const boats = await col.find({});
}

function get_boat_polygon(last_pos, hours_diff = 2) {
  const ship_pos = [last_pos["LATITUDE"], last_pos["LONGITUDE"]];
  const corners = _get_predicted_ship_position(last_pos, hours_diff);
  return [ship_pos, ...corners];
}

// returns list of gliders in range of boat
async function gliders_in_boath_path(boat) {
  const glider_collection = await db.collection("gliders");
  const gliders = await glider_collection.find({}).toArray();
  let ret_gliders = [];
  for (const glider of gliders) {
    if (glider.track) {
      let glider_pos = glider.track[glider.track.length - 1];
      glider_pos = [convert_gps(glider_pos.lat), convert_gps(glider_pos.lon)];
      const last_location = boat.locations[boat.locations.length - 1];
      const boat_poly = get_boat_polygon(last_location);
      // console.log(glider_pos);
      // console.log(boat_poly);
      if (is_in_polygon(glider_pos, [...boat_poly, [null]])) {
        ret_gliders.push(glider.name);
      }
    }
  }
  return ret_gliders;
}

async function serialize_boats(minute_range) {
  const col = await db.collection("boats");
  const boats = await col.find({}).toArray();
  for (const boat of boats) {
    const last_location_time = boat.locations.at(-1).TIMESTAMP;
    const minute_offset =
      (new Date().getTime() - last_location_time.getTime()) /
      (1000 * 60)
    let min_minutes = Math.floor(minute_offset - minute_range)
    const max_minutes = Math.floor(minute_offset + minute_range)
    if (min_minutes < 0){
      min_minutes = 0
    }
    boat["prediction"] = await predict_boat_movement_single(minute_offset/60, {boat_id: boat._id});
    boat["prediction_range"] = await predict_boat_movement_range(boat._id, min_minutes,max_minutes,1, minute_offset);
    boat["minute_offset"] = minute_offset;
  }
  return boats;
}

export {
  update_boats,
  predict_boat_movement_range,
  gliders_in_boath_path,
  serialize_boats,
};
