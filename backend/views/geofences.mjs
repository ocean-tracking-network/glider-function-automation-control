import db from '../db/conn.mjs'
import { updateOne } from '../utils/db_utils.mjs'
import { deleteGeofenceCascade } from '../utils/cascade_delete.mjs'

const get_geofences = async (req, res) => {
  let collection = await db.collection('geofences')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

function filter_latlngs(latlng) {
  if (!latlng.lat || !latlng.lng) {
    return false
  }
  return true
}

const post_geofences = async (req, res, next) => {
  console.log(req.body)
  const latlngs = req.body.latlngs.filter(filter_latlngs).map((latlng) => {
    return { lat: parseFloat(latlng.lat), lng: parseFloat(latlng.lng) }
  })
  console.log(latlngs)
  const name = req.body.name
  const notify = req.body.notify

  if (!latlngs || !name) {
    res.send({ error: 'need to provide latlngs and name' })
  }

  // filter out any empty values

  let collection = await db.collection('geofences')
  let newdocument = {
    name: name,
    latlngs: latlngs,
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
  if (data.latlngs) {
    data.latlngs = data.latlngs.filter(filter_latlngs).map((latlng) => {
      return { lat: parseFloat(latlng.lat), lng: parseFloat(latlng.lng) }
    })
  }

  let result = await updateOne('geofences', id, data)
  res.send(result).status(200)
}

export { get_geofences, post_geofences, delete_geofences, patch_geofences }
