import db from '../db/conn.mjs'
import { ObjectId } from 'mongodb'

const NOTIFICATION_TYPES = new Set(['sms', 'slack'])
const NOTIFICATION_EVENTS = new Set([
  'Glider Connect',
  'Glider Mission Abort',
  'Surface Sensor Value Out of Range',
  'Glider Started Last Gasp Mission',
  'Glider Missed Last Call-In',
  'Segment Errors',
  'Glider Started Initial Mission',
  'Glider Outside Geofence',
])

async function get_notifications() {
  const collection = db.collection('notifications')
  return collection.find({}).toArray()
}

async function get_notification_by_id(id) {
  const collection = db.collection('notifications')
  return collection.findOne({ _id: new ObjectId(id) })
}

async function glider_exists(gliderName) {
  if (!gliderName) {
    return false
  }

  const collection = db.collection('gliders')
  const glider = await collection.findOne({ name: gliderName })
  return Boolean(glider)
}

function normalizeNorthAmericanPhone(phone) {
  if (phone == null) return null

  const raw = String(phone).trim()
  if (!raw || (raw.startsWith('+') && !raw.startsWith('+1'))) return null

  const digits = raw.replace(/\D/g, '')
  if (digits.length == 10) return `+1${digits}`
  if (digits.length == 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

function clean_notification(payload = {}) {
  return {
    name: typeof payload.name == 'string' ? payload.name.trim() : payload.name,
    slack_id: typeof payload.slack_id == 'string' ? payload.slack_id.trim() : payload.slack_id,
    phone: typeof payload.phone == 'string' ? payload.phone.trim() : payload.phone,
    notification_type:
      typeof payload.notification_type == 'string'
        ? payload.notification_type.trim()
        : payload.notification_type,
    glider: typeof payload.glider == 'string' ? payload.glider.trim() : payload.glider,
    event: typeof payload.event == 'string' ? payload.event.trim() : payload.event,
  }
}

function validate_notification(notification) {
  if (
    !notification.name ||
    !notification.notification_type ||
    !notification.glider ||
    !notification.event
  ) {
    return { error: 'Need to provide name, notification_type, glider, and event' }
  }
  if (!NOTIFICATION_TYPES.has(notification.notification_type)) {
    return { error: 'Unsupported notification_type' }
  }
  if (!NOTIFICATION_EVENTS.has(notification.event)) {
    return { error: 'Unsupported event' }
  }
  if (notification.phone && !normalizeNorthAmericanPhone(notification.phone)) {
    return { error: 'Need to provide a valid North American phone number' }
  }
  if (!normalizeNorthAmericanPhone(notification.phone) && !notification.slack_id) {
    return { error: 'Need to provide phone or slack_id' }
  }
  return null
}

function duplicate_filter(notification) {
  const filter = {
    name: notification.name,
    notification_type: notification.notification_type,
    glider: notification.glider,
    event: notification.event,
  }
  if (notification.notification_type == 'sms') {
    filter.phone = notification.phone
  } else {
    filter.slack_id = notification.slack_id
  }
  return filter
}

async function create_notification(payload) {
  const notification = clean_notification(payload)
  const validationError = validate_notification(notification)
  if (validationError) {
    return validationError
  }

  const notificationCollection = db.collection('notifications')
  const existing = await notificationCollection.findOne(duplicate_filter(notification))
  if (existing) {
    return { error: 'Notification already exists' }
  }

  const gliderOk = await glider_exists(notification.glider)
  if (!gliderOk) {
    return { error: 'Glider does not exist' }
  }

  const result = await notificationCollection.insertOne(notification)
  return { notification: result }
}

async function update_notification(id, payload) {
  const cleanedPayload = clean_notification(payload)
  const notificationCollection = db.collection('notifications')
  const existing = await notificationCollection.findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return { error: 'Notification not found' }
  }

  const nextNotification = {
    ...existing,
  }
  for (const [key, value] of Object.entries(cleanedPayload)) {
    if (value !== undefined) {
      nextNotification[key] = value
    }
  }

  const validationError = validate_notification(nextNotification)
  if (validationError) {
    return validationError
  }

  if (nextNotification.glider && !(await glider_exists(nextNotification.glider))) {
    return { error: 'Glider does not exist' }
  }

  const duplicate = await notificationCollection.findOne({
    ...duplicate_filter(nextNotification),
    _id: { $ne: new ObjectId(id) },
  })
  if (duplicate) {
    return { error: 'Notification already exists' }
  }

  const { _id, ...updateDoc } = nextNotification
  await notificationCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc })
  return { message: 'Notification updated' }
}

async function delete_notification(id) {
  const notificationCollection = db.collection('notifications')
  await notificationCollection.deleteOne({ _id: new ObjectId(id) })
  return { status: 204 }
}

export {
  get_notifications,
  get_notification_by_id,
  create_notification,
  update_notification,
  delete_notification,
}
