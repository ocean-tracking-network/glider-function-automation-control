import { ObjectId } from 'mongodb'
import db from '../db/conn.mjs'
import { updateOne } from '../utils/db_utils.mjs'
import { deleteGliderCascade } from '../utils/cascade_delete.mjs'
import {
  get_available_scripts,
  get_glider_details,
  get_glider_ls_dir
} from '../utils/sfmc_api.mjs'
import { subscribe_sfmc_glider } from '../utils/glider_utils.mjs'

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
  const sfmc_json = await get_glider_details(glider_name)
  console.log(sfmc_json)
  if (!sfmc_json || !sfmc_json.id) {
    res.status(404).send({ error: `Glider not found in SFMC: ${glider_name}` })
    return
  }
  const new_doc = {
    name: glider_name,
    sfmc_id: sfmc_json.id,
    track: [],
    enabled: false,
  }
  let result = await collection.insertOne(new_doc)
  // subscribe to SFMC events for this new glider so it receives connections/dialogs
  if(process.env.SFMC_CONNECTION_METHOD?.toLowerCase() == "socket"){
    try {
      await subscribe_sfmc_glider(glider_name)
    } catch (err) {
      console.log('Failed to auto-subscribe new glider: ' + glider_name)
      console.log(err)
    }
  }
  res.send(result).status(200)
}

const update_gliders = async (req, res) => {
  const id = req.params.id
  const update_dict = req.body
  const result = await updateOne('gliders', id, update_dict)
  res.send(result).status(200)
}

const delete_gliders = async (req, res) => {
  try {
    const result = await deleteGliderCascade(req.params.id, db)
    res.status(200).send(result)
  } catch (error) {
    res.status(error.statusCode ?? 500).send({ error: error.message })
  }
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

const get_glider_file_list = async (req, res) => {
  // let collection = await db.collection('gliders')
  // let glider = await collection.findOne({ _id: ObjectId.createFromHexString(req.params.id) })
  const scripts = await get_glider_ls_dir()
  res.send(scripts).status(200)
}

export {
  get_gliders,
  post_gliders,
  post_gliders_track,
  update_gliders,
  get_scripts,
  delete_gliders,
  get_glider_file_list
}
