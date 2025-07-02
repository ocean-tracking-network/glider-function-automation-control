import db from '../db/conn.mjs'
import { deleteOne, updateOne } from '../utils/db_utils.mjs'

const get_files = async (req, res) => {
  let collection = await db.collection('files')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

const post_files = async (req, res) => {
  let new_docs = []
  let collection = await db.collection('files')
  req.files.forEach(async (ele) => {
    new_docs.push({
      filename: ele.originalname,
      path: ele.path,
      category: req.body.category,
    })
  })
  let results = { msg: 'No files uploaded, empty list' }
  if (new_docs.length > 0) {
    results = await collection.insertMany(new_docs)
  }
  res.send(results).status(200)
}

const delete_files = async (req, res) => {
  const id = req.params.id
  if (!id) {
    res.send({ error: 'Need to supply an ID' }).status(400)
    return
  }
  const eventCollection = await db.collection('events')
  eventCollection.deleteMany({ file: id })
  let result = await deleteOne('files', id)
  res.send(result).status(200)
}

const update_files = async (req, res) => {
  let files = req.body
  console.log(typeof files)
  if (!files.length) {
    files = [files]
  }
  // we only allow editing of category
  console.log(files)
  for (let file of files) {
    await updateOne('files', file._id, { category: file.category })
  }
  res.send({}).status(200)
}

export { get_files, post_files, delete_files, update_files }
