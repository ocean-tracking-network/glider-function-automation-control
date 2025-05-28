import db from './db/conn.mjs'
import express from 'express'
import multer from 'multer'
import { scheduleJob } from 'node-schedule'
import cors from 'cors'
import { get_active_deployment_details } from './utils/sfmc_api.mjs'
import { update_geofences } from './utils/geofence_utils.mjs'

import { get_gliders, post_gliders, post_gliders_track, update_gliders } from './views/gliders.mjs'
import {
  delete_geofences,
  get_geofences,
  patch_geofences,
  post_geofences,
} from './views/geofences.mjs'
import { get_files, post_files, delete_files } from './views/files.mjs'
import { delete_events, get_events, patch_events, post_events } from './views/events.mjs'
import { get_logs, post_logs } from './views/logs.mjs'
import { send_slack_message } from './utils/slack.mjs'
import { create_log } from './utils/log_utils.mjs'

const app = express()
app.use(cors())
const upload = multer({ dest: 'uploads/' })
app.use(express.json())
const port = 3000

// Routes

// glider
app.post('/glider', post_gliders)
app.get('/glider', get_gliders)
app.post('/glider/:id/add-track', post_gliders_track)
app.patch('/glider/:id', update_gliders)

// geofence
app.get('/geofence', get_geofences)
app.post('/geofence', post_geofences)
app.delete('/geofence/:id', delete_geofences)
app.patch('/geofence/:id', patch_geofences)

// files
app.get('/files', get_files)
app.post('/files', upload.array('files', 100), post_files)
app.delete('/files/:id', delete_files)

// Events
app.get('/events', get_events)
app.post('/events', post_events)
app.patch('/events/:id', patch_events)
app.delete('/events/:id', delete_events)
app.patch('/files', async (req, res) => {})

// logs
app.get('/logs', get_logs)
app.post('/logs', post_logs)

async function update_glider_waypoint(glider, sfmc_json) {
  const next_waypoint = [sfmc_json.nextWaypointLat / 100, sfmc_json.nextWaypointLon / 100]
  if (
    !glider.next_waypoint ||
    glider.next_waypoint[0] != next_waypoint[0] ||
    glider.next_waypoint[1] != next_waypoint[1]
  ) {
    const collection = await db.collection('gliders')
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
    let last_track = [0, 0]
    if (tracks.length > 0) {
      last_track = tracks[tracks.length - 1]
    }

    if (last_track[0] != sfmc_json.gpsLat || last_track[1] != sfmc_json.gpsLon) {
      tracks.push([sfmc_json.gpsLat, sfmc_json.gpsLon])
      const filter = { _id: glider._id }
      const update_result = await collection.updateOne(filter, {
        $set: { track: tracks },
      })
      console.log('updated track')
      send_slack_message(`${glider.name} has a new GPS position!`)
      create_log(`${glider._id} as a new GPS position`, 'info', glider.name)
    } else {
      console.log('gps is the same')
    }
  }
}

// Schedule
const backend_schedule = scheduleJob('*/60 * * * * *', async () => {
  await update_glider_positions()
  await update_geofences()
})

// app start
app.listen(port, () => {
  console.log(`example app listening on port ${port}`)
  send_slack_message('debug: Backend started and listening')
})
