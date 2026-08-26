import db from '../db/conn.mjs'
import { broadcast_new_logs } from '../views/sse/logs.mjs'

async function purge_old_logs() {
  const collection = await db.collection('logs')
  const past_date = new Date()
  past_date.setDate(past_date.getDate() - process.env.HISTORY_DAYS)
  const results = await collection.deleteMany({ date: { $lt: past_date } })
}


// Let us change logs a bit
// let log = {
//   date,
//   message,
//   level,
//   glider?,
//   glider_connection? : {
//     active,
//     start_time,
//     end_time,
//     log_file_path,
//     surface_dialog : [
//       ...
//     ]
//   }
// }

const close_connection_on_log = async (glider_connection) => {
  const collection = await db.collection('logs')
  let result = collection.updateOne({"glider_connection.id": glider_connection.id},
    {
      $set: {"glider_connection": glider_connection}
    })
  return result
}

const add_dialog_to_log = async (dialog) => {
  const log_collection = await db.collection('logs')
  const glider_collection = await db.collection('gliders')
  const glider = await glider_collection.findOne({name: dialog.gliderName})
  console.log(dialog)
  console.log(glider)
  const filter = {glider: glider._id, 'glider_connection.active': true}
  let result = await log_collection.updateOne(filter,
    {
      $push: {"surface_dialog": {
        ...dialog,
        time: new Date()
      }}
    })
  console.log(result)
  if(result.matchedCount == 0){
    console.log("PROBLEM ADDING TO LOG!")
  }
}

const create_log = async (message, level, glider = '', glider_connection=undefined) => {
  // level: str -> info, warning, error
  // glider: str _id (optional)
  // glider_connection: object from sfmc api (optional, don't need glider if this is populated)
  if (level != 'error' && level != 'info' && level != 'warning') {
    throw Error('Level must be a string and either be: info, warning, error')
  }
  const collection = await db.collection('logs')
  const current_date = new Date()
  let new_doc = {
    date: current_date,
    message: message,
    level: level,
  }
  if (glider) {
    new_doc.glider = glider
  } else if(glider_connection){
    const glider_collection = await db.collection('gliders')
    const glider_obj = await glider_collection.findOne({sfmc_id: glider_connection.gliderId})
    // check if there's already an active log
    const filter = {glider: glider_obj._id, 'glider_connection.active': true}
    const update_result = await collection.updateMany(filter,
      {
        $set: {"glider_connection.active": false}
      }
    )
    if (update_result.modifiedCount > 0){
      console.log(`Closed ${update_result.modifiedCount} active connections for glider: ${glider_obj.name}`)
    }
    new_doc.glider = glider_obj._id
    new_doc.glider_connection = glider_connection
  }
  const result = await collection.insertOne(new_doc)
  broadcast_new_logs({ ...new_doc, _id: result.insertedId })
  console.log(`${level} - ${new Date().toISOString()} - ${glider} - ${message}`)
  purge_old_logs()
  return result
}


export { create_log, close_connection_on_log, add_dialog_to_log }
