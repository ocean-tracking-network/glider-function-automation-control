import { ObjectId } from 'mongodb'

class CascadeDeleteError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'CascadeDeleteError'
    this.statusCode = statusCode
  }
}

function assertValidObjectId(id) {
  // ObjectId.isValid allows non-hex strings; route ids come from Mongo _id values.
  if (!ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new CascadeDeleteError('Invalid id', 400)
  }
}

function referenceValues(id) {
  // References are mixed: events query strings in geofence_utils.mjs:128,
  // while log writers pass ObjectIds in events.mjs:30 and glider_utils.mjs:98.
  return [id, ObjectId.createFromHexString(id)]
}

async function deleteGliderCascade(id, database) {
  assertValidObjectId(id)
  const references = referenceValues(id)

  const events = await database.collection('events').deleteMany({ glider: { $in: references } })
  const logs = await database.collection('logs').deleteMany({ glider: { $in: references } })
  const geofences = await database
    .collection('geofences')
    .updateMany(
      { gliders_inside: { $in: references } },
      { $pull: { gliders_inside: { $in: references } } },
    )
  const glider = await database
    .collection('gliders')
    .deleteOne({ _id: ObjectId.createFromHexString(id) })

  return {
    events,
    logs,
    geofences,
    glider,
  }
}

async function deleteGeofenceCascade(id, database) {
  assertValidObjectId(id)
  const references = referenceValues(id)

  // Events are owned by their geofence and should not survive deletion.
  const events = await database.collection('events').deleteMany({ geofence: { $in: references } })
  const geofence = await database
    .collection('geofences')
    .deleteOne({ _id: ObjectId.createFromHexString(id) })

  return {
    events,
    geofence,
  }
}

async function deleteFileCascade(id, database) {
  assertValidObjectId(id)
  const references = referenceValues(id)

  const events = await database.collection('events').deleteMany({ file: { $in: references } })
  const file = await database
    .collection('files')
    .deleteOne({ _id: ObjectId.createFromHexString(id) })

  return {
    events,
    file,
  }
}

export {
  CascadeDeleteError,
  assertValidObjectId,
  deleteFileCascade,
  deleteGeofenceCascade,
  deleteGliderCascade,
}
