import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'

async function get_contacts() {
  const collection = await db.collection('contacts')
  return collection.find({}).toArray()
}

async function get_contact_by_id(id) {
  const collection = await db.collection('contacts')
  return collection.findOne({ _id: new ObjectId(id) })
}

async function glider_exists(gliderName) {
  if (!gliderName) {
    return false
  }

  const collection = await db.collection('gliders')
  const glider = await collection.findOne({ name: gliderName })
  return Boolean(glider)
}

async function create_contact({ name, phone, notification_type, glider }) {
  if (!name || !phone || !notification_type || !glider) {
    return { error: 'Need to provide name, phone, notification_type, and glider' }
  }

  const contactCollection = await db.collection('contacts')
  const existing = await contactCollection.findOne({ name, phone, notification_type, glider })
  if (existing) {
    return { error: 'Contact already exists' }
  }

  const gliderOk = await glider_exists(glider)
  if (!gliderOk) {
    return { error: 'Glider does not exist' }
  }

  const result = await contactCollection.insertOne({ name, phone, notification_type, glider })
  return { contact: result }
}

async function update_contact(id, { name, phone, notification_type, glider }) {
  const contactCollection = await db.collection('contacts')
  const existing = await contactCollection.findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return { error: 'Contact not found' }
  }

  if (glider && !(await glider_exists(glider))) {
    return { error: 'Glider does not exist' }
  }

  await contactCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, phone, notification_type, glider } },
  )
  return { message: 'Contact updated' }
}

async function delete_contact(id) {
  const contactCollection = await db.collection('contacts')
  await contactCollection.deleteOne({ _id: new ObjectId(id) })
  return { status: 204 }
}

export { get_contacts, get_contact_by_id, create_contact, update_contact, delete_contact }

