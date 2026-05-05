import express from 'express'
import multer from 'multer'
import { scheduleJob } from 'node-schedule'
import cors from 'cors'
import { update_geofences } from './utils/geofence_utils.mjs'

import {
  get_gliders,
  get_scripts,
  post_gliders,
  post_gliders_track,
  update_gliders,
} from './views/gliders.mjs'
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
import { 
  get_boats,
  get_boat_predict,
  check_gliders_safe,
} from './views/boats.mjs'
import { login } from './views/user.mjs'

import { authenticateToken } from './utils/auth.mjs'
import { get_logs, post_logs } from './views/logs.mjs'
import { send_slack_message } from './utils/slack.mjs'
import { delete_old_tracks, update_glider_positions, subscribe_sfmc_gliders } from './utils/glider_utils.mjs'
import './loadEnvironment.mjs'
import { update_boats } from './utils/boat_utils.mjs'

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
app.get('/glider/:id/scripts', authenticateToken, get_scripts)

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

// boats
app.get("/boats/:end_offset", authenticateToken, get_boats);
app.get("/boats/predict/:id/:start_offset/:end_offset/:interval", get_boat_predict); //NOT USED BY THE FRONTEND ATM
app.get("/boats/test", check_gliders_safe);

// Schedule
const backend_schedule = scheduleJob(`*/${process.env.SCHEDULE_SECS} * * * * *`, async () => {
  await update_glider_positions()
  await update_geofences()
  await delete_old_tracks()
  update_boats()
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
  
  subscribe_sfmc_gliders()

  console.log(`example app listening on port ${port}`)
  send_slack_message('debug: Backend started and listening')
})
