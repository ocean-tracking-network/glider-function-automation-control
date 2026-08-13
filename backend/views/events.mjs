import { ObjectId } from 'mongodb'
import db from '../db/conn.mjs'
import { updateOne, deleteOne } from '../utils/db_utils.mjs'
import { trigger_event } from '../utils/events.mjs'

const get_events = async (req, res) => {
  let query = {}
  if (req.query.glider) {
    query.glider = req.query.glider
  }
  if (req.query.geofence) {
    query.geofence = req.query.geofence
  }
  let collection = await db.collection('events')
  let results = await collection.find(query).toArray()
  res.send(results).status(200)
}

const post_events = async (req, res) => {
  let collection = await db.collection('events')
  let new_doc = {
    glider: req.body.glider,
    geofence: req.body.geofence,
    event_type: req.body.event_type,
  }
  const file = req.body.file
  const script = req.body.script
  if (file) {
    new_doc.file = file
  }
  if (script) {
    new_doc.script = script
    new_doc.script_type = req.body.script_type
    // we can only have a single script at a time, replace the old one if it exists, delete many just in case
    const old_script = await collection.deleteMany({
      geofence: new_doc.geofence,
      glider: new_doc.glider,
      event_type: new_doc.event_type,
      script: { $exists: true },
    })
  }
  if (!script && !file) {
    res.send({ error: 'Need to include a script or a file for the event' }).status(400)
    return
  }
  let result = await collection.insertOne(new_doc)
  res.send(result).status(200)
}

const delete_events = async (req, res) => {
  let result = await deleteOne('events', req.params.id)
  res.send(result).status(200)
}

const patch_events = async (req, res) => {
  let data = {
    glider: req.body.glider,
    geofence: req.body.geofence,
    event_type: req.body.event_type,
  }

  const file = req.body.file
  const script = req.body.script
  if (file) {
    data.file = file
  }
  if (script) {
    data.script = script
  }
  let result = await updateOne('events', req.params.id, data)
  res.send(result).status(200)
}

const trigger_events = async (req, res) => {
  const id = req.params.id
  const collection = await db.collection('events')
  const result = await collection.findOne({ _id: ObjectId.createFromHexString(id) })
  if (!result) {
    return { error: 'Object not found' }.status(404)
  }
  trigger_event(result)
  res.send(result).status(200)
}

export { get_events, post_events, delete_events, patch_events, trigger_events }
