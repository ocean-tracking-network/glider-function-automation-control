import db from '../db/conn.mjs'
import { updateOne, deleteOne } from '../utils/db_utils.mjs'

const get_geofences = async (req, res) => {
  let collection = await db.collection('geofences')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

const post_geofences = async (req, res, next) => {
  const latlons = req.body.latlons
  const name = req.body.name
  const notify = req.body.notify

  if (!latlons || !name) {
    res.send({ error: 'need to provide latlons and name' })
  }

  let collection = await db.collection('geofences')
  let newdocument = {
    name: name,
    latlons: latlons,
    gliders_inside: [],
    notify: notify,
  }
  const result = await collection.insertOne(newdocument)

  res.send(result).status(200)
}

const delete_geofences = async (req, res) => {
  // delete events attached to the geofence
  const event_collection = await db.collection('events')
  const event_results = await event_collection.deleteMany({ geofence: req.params.id })
  const geofence_result = deleteOne('geofences', req.params.id)
  const ret = {
    events: event_results,
    geofence: geofence_result,
  }
  res.send(ret).status(200)
}

const patch_geofences = async (req, res) => {
  const id = req.params.id
  const data = req.body
  let result = await updateOne('geofences', id, data)
  res.send(result).status(200)
}

export { get_geofences, post_geofences, delete_geofences, patch_geofences }
