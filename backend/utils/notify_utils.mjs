import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'

async function get_notifications() {
  const collection = await db.collection('notifications')
  return collection.find({}).toArray()
}

async function get_notification_by_id(id) {
  const collection = await db.collection('notifications')
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

async function create_notification({ name, slack_id, phone, notification_type, glider, event }) {
  if (!name || !notification_type || !glider) {
    return { error: 'Need to provide name, notification_type, and glider' }
  }

  if (!slack_id && !phone) {
    return { error: 'Need to provide either a Slack ID or phone number' }
  }

  const notificationCollection = await db.collection('notifications')
  const existing = await notificationCollection.findOne({ name, slack_id, phone, notification_type, glider })
  if (existing) {
    return { error: 'Notification already exists' }
  }

  const gliderOk = await glider_exists(glider)
  if (!gliderOk) {
    return { error: 'Glider does not exist' }
  }

  const result = await notificationCollection.insertOne({ name, slack_id, phone, notification_type, glider, event })
  return { notification: result }
}

async function update_notification(id, { name, slack_id, phone, notification_type, glider, event }) {
  const notificationCollection = await db.collection('notifications')
  const existing = await notificationCollection.findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return { error: 'Notification not found' }
  }

  if (glider && !(await glider_exists(glider))) {
    return { error: 'Glider does not exist' }
  }

  await notificationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, slack_id, phone, notification_type, glider, event } },
  )
  return { message: 'Notification updated' }
}

async function delete_notification(id) {
  const notificationCollection = await db.collection('notifications')
  await notificationCollection.deleteOne({ _id: new ObjectId(id) })
  return { status: 204 }
}

export { get_notifications, get_notification_by_id, create_notification, update_notification, delete_notification }

