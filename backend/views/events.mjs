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
  console.log(query)
  let collection = await db.collection('events')
  let results = await collection.find(query).toArray()
  res.send(results).status(200)
}

const post_events = async (req, res) => {
  let collect = await db.collection('events')
  const new_doc = {
    file: req.body.file,
    glider: req.body.glider,
    geofence: req.body.geofence,
    event_type: req.body.event_type,
  }
  let result = await collect.insertOne(new_doc)
  res.send(result).status(200)
}

const delete_events = async (req, res) => {
  let result = await deleteOne('events', req.params.id)
  res.send(result).status(200)
}

const patch_events = async (req, res) => {
  const data = {
    file: req.body.file,
    glider: req.body.glider,
    geofence: req.body.geofence,
    event_type: req.body.event_type,
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
