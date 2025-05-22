import db from '../db/conn.mjs'
import { create_log } from '../utils/log_utils.mjs'

const get_logs = async (req, res) => {
  let collection = await db.collection('logs')
  let result = await collection.find({}).toArray()
  res.send(result).status(200)
}

const post_logs = async (req, res) => {
  const info = req.body.level ? req.body.level : 'info'
  console.log(req.body)
  let result = {}
  try {
    result = await create_log(req.body.message, info)
    res.send(result).status(200)
    return
  } catch (error) {
    res.send({ error: error }).status(500)
    return
  }
}

export { get_logs, post_logs }
