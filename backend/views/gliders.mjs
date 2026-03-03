import { ObjectId } from 'mongodb'
import db from '../db/conn.mjs'
import { deleteOne, updateOne } from '../utils/db_utils.mjs'
import { get_active_deployment_details, get_available_scripts } from '../utils/sfmc_api.mjs'

const get_gliders = async (req, res) => {
  let collection = await db.collection('gliders')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

const post_gliders = async (req, res) => {
  // body {name: str}
  let collection = await db.collection('gliders')
  const glider_name = req.body.name
  if (!glider_name) {
    res.send({ error: 'Need to specify a name' }).status(400)
    return
  }

  const sfmc_json = await get_active_deployment_details(glider_name)

  // Dummy data
  // const sfmc_json = {
  //   data: {
  //     gpsValidLat: 4859.91552734375 + (Math.random() * (1 - -1) + -1),
  //     gpsValidLon: -6317.248046875 + (Math.random() * (1 - -1) + -1),
  //     id: 275,
  //     isGpsValid: true,
  //     name: glider_name,
  //   },
  // }

  if (!sfmc_json) {
    console.log(`No SFMC JSON for ${glider_name}`)
    return
  }

  const new_doc = {
    name: glider_name,
    track: [
      {
        lat: sfmc_json.data.gpsValidLat,
        lon: sfmc_json.data.gpsValidLon,
        date: new Date(),
      },
    ],
    enabled: false,
  }
  let result = await collection.insertOne(new_doc)
  res.send(result).status(200)
}

const update_gliders = async (req, res) => {
  const id = req.params.id
  const update_dict = req.body
  const result = await updateOne('gliders', id, update_dict)
  res.send(result).status(200)
}

const delete_gliders = async (req, res) => {
  // Delete events associated with this glider
  const event_collection = await db.collection('events')
  const event_results = await event_collection.deleteMany({ glider: req.params.id })
  const glider_result = deleteOne('gliders', req.params.id)
  const ret = {
    events: event_results,
    glider: glider_result,
  }
  res.send(ret).status(200)
}

const post_gliders_track = async (req, res) => {
  // body {latlon: array[int,int]}
  const latlon = req.body.latlon
  let collect = await db.collection('gliders')
  const filter = { _id: ObjectId.createFromHexString(req.params.id) }
  const result = await collect.findOne(filter)
  let tracks = result.track
  tracks.push(latlon)
  let update_result = await collect.updateOne(filter, { $set: { track: tracks } })
  res.send(update_result).status(200)
}

const get_scripts = async (req, res) => {
  let collection = await db.collection('gliders')
  let glider = await collection.findOne({ _id: ObjectId.createFromHexString(req.params.id) })
  const scripts = await get_available_scripts(glider.name)
  res.send(scripts).status(200)
}
export {
  get_gliders,
  post_gliders,
  post_gliders_track,
  update_gliders,
  get_scripts,
  delete_gliders,
}
