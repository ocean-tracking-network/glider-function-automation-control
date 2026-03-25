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
  delete_gliders,
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
import { login, create_user, delete_user, user_exists } from './views/user.mjs'

import { authenticateToken, requireAdmin } from './utils/auth.mjs'
import { get_logs, post_logs } from './views/logs.mjs'
import { send_slack_message } from './utils/slack.mjs'
import { delete_old_tracks, update_glider_positions } from './utils/glider_utils.mjs'
import './loadEnvironment.mjs'

const app = express()
app.use(cors())
const upload = multer({ dest: 'uploads/' })
app.use(express.json())
const port = 3000

//ADMIN USER ROLE REQUIRED FOR MOST OPERATIONS, IMPLEMENTED WITH requireAdmin AND authenticateToken

// Routes

// user
app.post('/login', login)
app.post('/users', authenticateToken, requireAdmin, create_user)
app.get('/users/:username/exists', authenticateToken, requireAdmin, user_exists)
app.delete('/users/:username', authenticateToken, requireAdmin, delete_user)

// glider
app.get('/glider', authenticateToken, get_gliders)
app.post('/glider', authenticateToken, requireAdmin, post_gliders)
app.delete('/glider/:id', authenticateToken, requireAdmin, delete_gliders)
app.patch('/glider/:id', authenticateToken, requireAdmin, update_gliders)
// glider-tracks
app.post('/glider/:id/add-track', authenticateToken, requireAdmin, post_gliders_track)
app.get('/glider/:id/scripts', authenticateToken, get_scripts)

// geofence
app.get('/geofence', authenticateToken, get_geofences)
app.post('/geofence', authenticateToken, requireAdmin, post_geofences)
app.delete('/geofence/:id', authenticateToken, requireAdmin, delete_geofences)
app.patch('/geofence/:id', authenticateToken, requireAdmin, patch_geofences)

// files
app.get('/files', authenticateToken, get_files)
app.post('/files', authenticateToken, requireAdmin, upload.array('files', 100), post_files)
app.delete('/files/:id', authenticateToken, requireAdmin, delete_files)
app.patch('/files', authenticateToken, requireAdmin, update_files)

// Events
app.get('/events', authenticateToken, get_events)
app.post('/events', authenticateToken, requireAdmin, post_events)
app.patch('/events/:id', authenticateToken, requireAdmin, patch_events)
app.delete('/events/:id', authenticateToken, requireAdmin, delete_events)
app.post('/events/:id/trigger', authenticateToken, requireAdmin, trigger_events)

// logs
app.get('/logs', authenticateToken, get_logs)
app.post('/logs', authenticateToken, requireAdmin, post_logs)

// Schedule
const backend_schedule = scheduleJob('*/45 * * * * *', async () => {
  await update_glider_positions()
  await update_geofences()

  await delete_old_tracks()
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
