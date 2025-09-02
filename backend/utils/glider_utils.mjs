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

async function update_glider_positions() {
  let collection = await db.collection('gliders')
  const gliders = await collection.find({}).toArray()

  for (let glider of gliders) {
    console.log('Upding glider: ' + glider.name)
    let sfmc_json = {}
    sfmc_json = await get_active_deployment_details(glider.name)
    if (sfmc_json == false) {
      console.log('CONTINUING!')
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
      tracks.push({
        lat: sfmc_json.gpsValidLat,
        lon: sfmc_json.gpsValidLon,
        date: new Date(),
      })
      const filter = { _id: glider._id }
      const _update_result = await collection.updateOne(filter, {
        $set: { track: tracks },
      })
      console.log('updated track')
      create_log(`${glider.name} as a new GPS position`, 'info', glider._id)
    } else {
      console.log('gps is the same')
    }
  }
}

export { update_glider_positions, update_glider_waypoint }
