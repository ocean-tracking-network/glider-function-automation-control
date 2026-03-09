import db from '../db/conn.mjs'
import { create_log } from './log_utils.mjs'
import { get_active_deployment_details } from './sfmc_api.mjs'

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
      }
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
      }
    )
  }
}

async function update_glider_positions() {
  let collection = await db.collection('gliders')
  const gliders = await collection.find({}).toArray()

  for (let glider of gliders) {
    let sfmc_json = {}
    sfmc_json = await get_active_deployment_details(glider.name)

    //// Random sfmc_json (with default) to simulate unique movement of gliders
    // sfmc_json = {
    //   'data': {
    //     'gpsValidLat': glider.track.length > 0 ? glider.track[glider.track.length-1].lat + (Math.random() * (1 - -1) + -1) : 4859.91552734375,
    //     'gpsValidLon': glider.track.length > 0 ? glider.track[glider.track.length-1].lon + (Math.random() * (1 - -1) + -1) : -6317.248046875,
    //     'id': 275,
    //     'isGpsValid': true,
    //     'name': glider.name,
    //   }
    // }

    if (sfmc_json == false) {
      console.log('No SFMC JSON')
      continue
    }
    sfmc_json = sfmc_json.data
    // Keep going if the glider wasn't skipped
    // update the next waypoint since that can change without the glider resurfacing
    await update_glider_waypoint(glider, sfmc_json)
    if (!sfmc_json.isGpsValid) {
      console.log('no valid gps for: ' + glider.name)
      continue
    }
    let tracks = glider.track
    let last_track = { lat: 0, lon: 0 }
    if (tracks.length > 0) {
      last_track = tracks[tracks.length - 1]
    }

    if (last_track.lat != sfmc_json.gpsValidLat || last_track.lon != sfmc_json.gpsValidLon) {
      const filter = { _id: glider._id }
      const _update_result = await collection.updateOne(filter, {
        $push: { track: {
          lat: sfmc_json.gpsValidLat,
          lon: sfmc_json.gpsValidLon,
          date: new Date(),
        } },
      })
      console.log('updated track')
      create_log(`${glider.name} as a new GPS position`, 'info', glider._id)
    } else {
      // console.log('gps is the same')
    }
  }
}

export { update_glider_positions, update_glider_waypoint, delete_old_tracks }
