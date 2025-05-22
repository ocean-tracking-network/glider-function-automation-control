import db from '../db/conn.mjs'

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
  const new_doc = {
    name: glider_name,
    track: [],
  }
  let result = await collection.insertOne(new_doc)
  res.send(result).status(200)
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

export { get_gliders, post_gliders, post_gliders_track }
