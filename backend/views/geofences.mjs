import db from '../db/conn.mjs'
import { updateOne } from '../utils/db_utils.mjs'
import { deleteGeofenceCascade } from '../utils/cascade_delete.mjs'

const get_geofences = async (req, res) => {
  let collection = await db.collection('geofences')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

function filter_latlons(latlon) {
  if (!latlon.lat || !latlon.lng) {
    return false
  }
  return true
}

const post_geofences = async (req, res, next) => {
  console.log(req.body)
  const latlons = req.body.latlons.filter(filter_latlons).map((latlon) => {
    return {lat: parseFloat(latlon.lat), lng: parseFloat(latlon.lng)}
  })
  console.log(latlons)
  const name = req.body.name
  const notify = req.body.notify

  if (!latlons || !name) {
    res.send({ error: 'need to provide latlons and name' })
  }

  // filter out any empty values

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
  try {
    const result = await deleteGeofenceCascade(req.params.id, db)
    res.status(200).send(result)
  } catch (error) {
    res.status(error.statusCode ?? 500).send({ error: error.message })
  }
}

const patch_geofences = async (req, res) => {
  const id = req.params.id
  let data = req.body
  if (data.latlons) {
    data.latlons = data.latlons.filter(filter_latlons).map((latlon) => {
      return {lat: parseFloat(latlon.lat), lng: parseFloat(latlon.lng)}
    })
  }

  let result = await updateOne('geofences', id, data)
  res.send(result).status(200)
}

export { get_geofences, post_geofences, delete_geofences, patch_geofences }
