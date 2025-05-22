import db from '../db/conn.mjs'

const create_log = async (message, level, glider = '') => {
  // level: str -> info, warning, error
  // glider: str _id (optional)
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
  }
  const result = await collection.insertOne(new_doc)
  console.log(`${level} - ${new Date().toISOString} - ${glider} - ${message}`)
  return result
}

export { create_log }
