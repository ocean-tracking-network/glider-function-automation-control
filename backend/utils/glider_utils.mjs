import db from '../db/conn.mjs'
import { gliders_sse } from '../views/sse/gliders.mjs'
import { add_dialog_to_log, close_connection_on_log, create_log } from './log_utils.mjs'
import {
  get_active_deployment_details,
  subscribe_for_glider_connection,
  subscribe_for_glider_dialog,
} from './sfmc_api.mjs'

async function update_glider_waypoint(glider, sfmc_json) {
  const next_waypoint = {lat: sfmc_json.nextWaypointLat, lng: sfmc_json.nextWaypointLon}
  if (
    !glider.next_waypoint ||
    glider.next_waypoint.lat != next_waypoint.lat ||
    glider.next_waypoint.lng != next_waypoint.lng
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
      lng: sfmc_json.gpsValidLon,
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
  const collection = await db.collection('gliders')
  const gliders = await collection.find({}).toArray()
  for (let glider of gliders) {
    update_glider_position(glider, collection)
  }
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

// keep track of subscriptions to avoid duplicates when called multiple times
const _subscribed_gliders = new Set()

async function subscribe_sfmc_glider(gliderName) {
  if (!gliderName) return
  if (_subscribed_gliders.has(gliderName)) {
    console.log(`Already subscribed to glider: ${gliderName}`)
    return
  }
  try {
    console.log('subbing glider: ' + gliderName)
    subscribe_for_glider_connection(gliderName, connection_callback)
    subscribe_for_glider_dialog(gliderName, dialog_callback)
    _subscribed_gliders.add(gliderName)
    console.log('done')
  } catch (err) {
    console.log('Failed to subscribe to glider: ' + gliderName)
    console.log(err)
  }
}

async function subscribe_sfmc_gliders() {
  try {
    const collection = await db.collection('gliders')
    const docs = await collection.find({}).toArray()
    const gliders = docs.map((g) => g.name).filter(Boolean)
    for (let glider of gliders) {
      await subscribe_sfmc_glider(glider)
    }
  } catch (err) {
    console.log('Error fetching gliders for subscription')
    console.log(err)
  }
}

export {
  update_glider_positions,
  update_glider_waypoint,
  delete_old_tracks,
  subscribe_sfmc_gliders,
  subscribe_sfmc_glider,
}
