import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'

const deleteOne = async (collection_name, id) => {
  let collection = await db.collection(collection_name)
  let result = await collection.deleteOne({ _id: ObjectId.createFromHexString(id) })
  return result
}

const updateOne = async (collection_name, id, update_dict) => {
  let collection = await db.collection(collection_name)
  const filter = { _id: ObjectId.createFromHexString(id) }
  let updateDoc = {
    $set: {
      ...update_dict,
    },
  }
  let result = await collection.updateOne(filter, updateDoc)
  return result
}

export { deleteOne, updateOne }
