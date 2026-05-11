import db from '../db/conn.mjs'
import { gliders_sse } from '../views/sse/gliders.mjs'
import { add_dialog_to_log, close_connection_on_log, create_log } from './log_utils.mjs'
import {
  get_active_deployment_details,
  subscribe_for_glider_connection,
  subscribe_for_glider_dialog,
} from './sfmc_api.mjs'

async function update_glider_waypoint(glider, sfmc_json) {
  const next_waypoint = [sfmc_json.nextWaypointLat, sfmc_json.nextWaypointLon]
  if (
    !glider.next_waypoint ||
    glider.next_waypoint[0] != next_waypoint[0] ||
    glider.next_waypoint[1] != next_waypoint[1]
  ) {
    const collection = await db.collection('gliders')
    console.log('Glider waypoint update!!!!')
    const update_result = await collection.updateOne(
      { _id: glider._id },
      {
        $set: { next_waypoint: next_waypoint },
      },
    )
  }
}

async function delete_old_tracks() {
  let collection = await db.collection('gliders')
  const gliders = await collection.find({}).toArray()

  const past_date = new Date()

  //date just comes from the .env/env.example file
  past_date.setDate(past_date.getDate() - process.env.HISTORY_DAYS)

  for (const glider of gliders) {
    const tracks = glider.track.filter((track) => track.date > past_date)
    await collection.updateOne(
      { _id: glider._id },
      {
        $set: { track: tracks },
      },
    )
  }
}

async function update_glider_position(glider, collection = undefined) {
  // if updating multiple gliders don't need to keep getting the collection
  if (!collection) {
    collection = await db.collection('gliders')
  }
  let sfmc_json = {}
  console.log(glider)
  sfmc_json = await get_active_deployment_details(glider.name)
  if (sfmc_json == false) {
    console.log('No SFMC JSON')
    return
  }
  sfmc_json = sfmc_json.data
  // Keep going if the glider wasn't skipped
  // update the next waypoint since that can change without the glider resurfacing
  await update_glider_waypoint(glider, sfmc_json)
  if (!sfmc_json.isGpsValid) {
    console.log('no valid gps for: ' + glider.name)
    return
  }
  let tracks = glider.track
  let last_track = { lat: 0, lon: 0 }
  if (tracks.length > 0) {
    last_track = tracks[tracks.length - 1]
  }

  if (last_track.lat != sfmc_json.gpsValidLat || last_track.lon != sfmc_json.gpsValidLon) {
    const track = {
      lat: sfmc_json.gpsValidLat,
      lon: sfmc_json.gpsValidLon,
      date: new Date(),
    }

    tracks.push(track)
    const filter = { _id: glider._id }
    const _update_result = await collection.updateOne(filter, {
      $set: { track: tracks },
    })

    gliders_sse.broadcast_new_tracks(glider._id, track)
    console.log('updated track')
    create_log(`${glider.name} as a new GPS position`, 'info', glider._id)
  } else {
    // console.log('gps is the same')
  }
}

async function update_glider_positions() {
  // for (let glider of gliders) {
  //   update_glider_position(glider)
  // }
}

function dialog_callback(dialog_event) {
  console.log('New dialog!')
  add_dialog_to_log(dialog_event)
}

async function connection_callback(connection_event) {
  for (let connection of connection_event) {
    console.log('New connection by a glider!')
    console.log(connection)
    if (connection.active) {
      // create new log and update positions
      let glider_collection = await db.collection('gliders')
      let glider = await glider_collection.findOne({ sfmc_id: connection.gliderId })
      update_glider_position(glider, glider_collection)
      create_log('Glider Connection', 'info', '', connection)
    } else {
      // Close the log that has the active connection
      close_connection_on_log(connection)
    }
  }
}

function subscribe_sfmc_gliders() {
  const gliders = ['otn200']
  // const gliders = ["adam", "otn200"]
  for (let glider of gliders) {
    console.log('subbing glider: ' + glider)
    subscribe_for_glider_connection(glider, connection_callback)
    subscribe_for_glider_dialog(glider, dialog_callback)
    console.log('done')
  }
}

export {
  update_glider_positions,
  update_glider_waypoint,
  delete_old_tracks,
  subscribe_sfmc_gliders,
}
