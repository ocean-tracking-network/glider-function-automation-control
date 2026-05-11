import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'

const deleteOne = async (collection_name, id) => {
  let collection = await db.collection(collection_name)
  let result = await collection.deleteOne({ _id: ObjectId.createFromHexString(id) })
  return result
}

const deleteMany = async (collection_name, ids) => {
  results = []
  for (let id of ids) {
    results.push(await deleteOne(collection_name, id))
  }
  return results
}
const updateOne = async (collection_name, id, update_dict) => {
  let collection = await db.collection(collection_name);
  const filter_id = typeof id == String ? ObjectId.createFromHexString(id) : id;
  const filter = { _id: filter_id };
  let updateDoc = {
    $set: {
      ...update_dict,
    },
  };
  let result = await collection.updateOne(filter, updateDoc);
  return result;
};

export { deleteOne, updateOne, deleteMany }
