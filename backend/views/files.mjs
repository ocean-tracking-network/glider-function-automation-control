import db from '../db/conn.mjs'
import { deleteOne } from '../utils/db_utils.mjs'

const get_files = async (req, res) => {
  let collection = await db.collection('files')
  let results = await collection.find({}).toArray()
  res.send(results).status(200)
}

const post_files = async (req, res) => {
  console.log(req)
  let new_docs = []
  let collection = await db.collection('files')

  req.files.forEach(async (ele) => {
    new_docs.push({
      filename: ele.originalname,
      path: ele.path,
    })
  })
  //console.log(new_docs)
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
  let result = deleteOne('files', id)
  res.send(result).status(200)
}

export { get_files, post_files, delete_files }
