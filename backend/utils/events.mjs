import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'
import os from 'os'
import fs from 'fs'
import { set_script, upload_file } from './sfmc_api.mjs'
import { create_log } from './log_utils.mjs'
import { send_slack_message } from './slack.mjs'

async function trigger_file_event(event, glider, geofence) {
  const files_collection = await db.collection('files')
  const file = await files_collection.findOne({ _id: ObjectId.createFromHexString(event.file) })
  if (file != null) {
    const tmp_dir = os.tmpdir()
    const temp_file_location = tmp_dir + '/' + file.filename
    try {
      fs.copyFileSync(file.path, temp_file_location)
    } catch (err) {
      console.log('ERROR CERATING THE TEMP FILE!')
      console.log(err)
      return
    }

    try {
      console.log('trying to upload file')
      await upload_file(glider.name, 'to-glider', temp_file_location, file.category)
      if (geofence) {
        await create_log(
          `${glider.name} has ${event.event_type}ed the geofence ${geofence.name}. Sent file: ${file.filename}`,
          'info',
          glider._id
        )
      } else {
        await create_log(`Sent file: ${file.filename} to ${glider.name}`, 'info', glider._id)
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
    fs.rmSync(temp_file_location)
  } else {
    console.log('File object not found!')
  }
}


async function trigger_glider_event(glider, geofence, event_type) {
  if (!glider.enabled) {
    console.log(`Glider ${glider.name} not enabled, not sending file`)
    return
  }
  let geofence_filter = geofence
  if(typeof geofence !== 'string' ){
    geofence_filter = geofence.toHexString()
  }
  let collection = await db.collection('events')
  let events = await collection
    .find({
      glider: glider._id.toHexString(),
      geofence: geofence_filter,
      event_type: event_type,
    })
    .toArray()
  if (events.length > 0) {
    for (const event of events) {
      trigger_event(event, geofence, glider)
    }
  } else {
  }
}

async function trigger_script_event(event, glider, geofence) {
  const generic_message_text = `Switched script: ${event.script} for ${glider.name}`
  await set_script(glider.name, event.script, event.script_type)
  if (geofence) {
    await create_log(
      `${glider.name} has ${event.event_type}ed the geofence ${geofence.name}. Swapped script to: ${event.script}`,
      'info',
      glider._id
    )
  } else {
    await create_log(generic_message_text, 'info', glider._id)
  }
  send_slack_message(generic_message_text)
}

const trigger_event = async (event, geofence = null, glider = null) => {
  console.log(event)
  if (!glider) {
    const glider_collection = await db.collection('gliders')
    glider = await glider_collection.findOne({ _id: ObjectId.createFromHexString(event.glider) })
  }
  if (event.file) {
    await trigger_file_event(event, glider, geofence)
  } else if (event.script) {
    await trigger_script_event(event, glider, geofence)
  }
}

export { trigger_event, trigger_glider_event }
