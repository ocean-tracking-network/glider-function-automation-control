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
import { get_files, post_files, delete_files, update_files } from './views/files.mjs'
import {
  delete_events,
  get_events,
  patch_events,
  post_events,
  trigger_events,
} from './views/events.mjs'
import { login } from './views/user.mjs'

import { authenticateToken } from './utils/auth.mjs'
import { get_logs, post_logs } from './views/logs.mjs'
import { send_slack_message } from './utils/slack.mjs'
import { create_log } from './utils/log_utils.mjs'
import './loadEnvironment.mjs'

const app = express()
app.use(cors())
const upload = multer({ dest: 'uploads/' })
app.use(express.json())
const port = 3000

// Routes

// user
app.post('/login', login)

// glider
app.post('/glider', authenticateToken, post_gliders)
app.get('/glider', authenticateToken, get_gliders)
app.post('/glider/:id/add-track', authenticateToken, post_gliders_track)
app.patch('/glider/:id', authenticateToken, update_gliders)

// geofence
app.get('/geofence', authenticateToken, get_geofences)
app.post('/geofence', authenticateToken, post_geofences)
app.delete('/geofence/:id', authenticateToken, delete_geofences)
app.patch('/geofence/:id', authenticateToken, patch_geofences)

// files
app.get('/files', authenticateToken, get_files)
app.post('/files', authenticateToken, upload.array('files', 100), post_files)
app.delete('/files/:id', authenticateToken, delete_files)
app.patch('/files', authenticateToken, update_files)

// Events
app.get('/events', authenticateToken, get_events)
app.post('/events', authenticateToken, post_events)
app.patch('/events/:id', authenticateToken, patch_events)
app.delete('/events/:id', authenticateToken, delete_events)
app.post('/events/:id/trigger', authenticateToken, trigger_events)

// logs
app.get('/logs', authenticateToken, get_logs)
app.post('/logs', authenticateToken, post_logs)

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

    if (last_track[0] != sfmc_json.gpsValidLat || last_track[1] != sfmc_json.gpsValidLon) {
      tracks.push([sfmc_json.gpsValidLat, sfmc_json.gpsValidLon])
      const filter = { _id: glider._id }
      const update_result = await collection.updateOne(filter, {
        $set: { track: tracks },
      })
      console.log('updated track')
      create_log(`${glider.name} as a new GPS position`, 'info', glider._id)
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
app.listen(port, async () => {
  const pause = process.env.SEND_FILES_TO_DUMMY_GLIDER.toLowerCase()
  if (pause == 'false') {
    for (let i = 0; i < 20; i++) {
      console.log('CAUTION: SENDING FLIES TO REAL GLIDERS IS ENABLED! ONLY USE THIS IN PRODUCTION!')
    }
    console.log('pausing for 5 seconds to make sure you want to do this')
    await new Promise((r) => setTimeout(r, 5000))
  }
  console.log(`example app listening on port ${port}`)
  send_slack_message('debug: Backend started and listening')
})
