import { updateOne } from './db_utils.mjs'
import db from '../db/conn.mjs'
import { create_log } from './log_utils.mjs'
import { send_slack_message } from './slack.mjs'
import { trigger_event } from './events.mjs'

function is_in_polygon(point, polygon) {
  let in_polygon = false
  // point: [lat,lng]
  // polygon: [[lat:lng],...]

  const y = point[0]
  const x = point[1]

  // Get the bounding box of the polygon
  let y_list = []
  polygon.forEach((element) => {
    y_list.push(element[0])
  })
  let x_list = []
  polygon.forEach((element) => {
    x_list.push(element[1])
  })

  x_list.splice(x_list.length - 1, 1)
  y_list.splice(y_list.length - 1, 1)
  x_list.push(x_list[0])
  y_list.push(y_list[0])

  let bounding_box = {
    max_x: Math.max(...x_list),
    min_x: Math.min(...x_list),
    max_y: Math.max(...y_list),
    min_y: Math.min(...y_list),
  }

  if (
    x < bounding_box.max_x &&
    x > bounding_box.min_x &&
    y < bounding_box.max_y &&
    y > bounding_box.min_y
  ) {
    // In the bounding box, time to raycast
    // add some padding for the raycast
    const padding = 0.1

    const start = {
      x: bounding_box.min_x - padding,
      y: y,
    }

    // I wont lie, alot of this code is taken from https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon
    // I translated it to this function and JS, feel free to take a look at that post to understand the algorith more

    const a1 = y - start.y
    const b1 = start.x - x
    const c1 = x * start.y - start.x * y

    let intersection = 0

    for (let i = 0; i < x_list.length - 1; i++) {
      let d1 = a1 * x_list[i] + b1 * y_list[i] + c1
      let d2 = a1 * x_list[i + 1] + b1 * y_list[i + 1] + c1

      if (d1 > 0 && d2 > 0) {
        continue
      }
      if (d1 < 0 && d2 < 0) {
        continue
      }

      // The fact that vector 2 intersected the infinite line 1 above doesn'
      // mean it also intersects the vector 1. Vector 1 is only a subset of that
      // infinite line 1, so it may have intersected that line before the vector
      // started or after it ended. To know for sure, we have to repeat the
      // the same test the other way round. We start by calculating the
      // infinite line 2 in linear equation standard form.
      let a2 = y_list[i + 1] - y_list[i]
      let b2 = x_list[i] - x_list[i + 1]
      let c2 = x_list[i + 1] * y_list[i] - x_list[i] * y_list[i + 1]

      // Calculate d1 and d2 again, this time using points of vector 1.
      d1 = a2 * start.x + b2 * start.y + c2
      d2 = a2 * x + b2 * y + c2

      // Again, if both have the same sign (and neither one is 0),
      // no intersection is possible.
      if (d1 > 0 && d2 > 0) {
        //console.log("3")
        continue
      }
      if (d1 < 0 && d2 < 0) {
        //console.log("4")
        continue
      }

      // If we get here, only two possibilities are left. Either the two
      // vectors intersect in exactly one point or they are collinear, which
      // means they intersect in any number of points from zero to infinite.
      if (a1 * b2 - a2 * b1 == 0) {
        //console.log("COLINEAR!")
      }

      // If they are not collinear, they must intersect in exactly one point.
      intersection++
    }
    if (intersection != 0 && intersection % 2 == 1) {
      in_polygon = true
    } else {
      in_polygon = false
    }

    //console.log("inter_num: " + intersection)
  } else {
    in_polygon = false
  }
  return in_polygon
}

async function upload_event_files(glider, geofence, event_type) {
  if (!glider.enabled) {
    console.log('Glider not enabled, not sending file')
    return
  }
  let collection = await db.collection('events')
  let events = await collection
    .find({
      glider: glider._id.toHexString(),
      geofence: geofence._id.toHexString(),
      event_type: event_type,
    })
    .toArray()
  if (events.length > 0) {
    for (const event of events) {
      trigger_event(event, geofence, glider)
    }
  } else {
  }
}

function convert_gps(val) {
  let degrees = Math.floor(val / 100)
  if (val < 0) {
    degrees = Math.ceil(val / 100)
  }
  const deci_minutes = (val / 100 - degrees) * 100
  const ret = degrees + deci_minutes / 60
  return ret
}

const update_geofences = async () => {
  // Checks each event object to see if it should be activated
  let glider_collection = await db.collection('gliders')
  let geofence_collection = await db.collection('geofences')

  const gliders = await glider_collection.find({}).toArray()
  const geofences = await geofence_collection.find({}).toArray()

  for (const geofence of geofences) {
    for (const glider of gliders) {
      if (glider.track == undefined || glider.track.length == 0) {
        console.log('Glider has no track, continuing')
        continue
      }
      let last_glider_point = glider.track[glider.track.length - 1]
      if (last_glider_point[0] > 100) {
        //Hack because SFMC uses large numbers
        last_glider_point[0] = convert_gps(last_glider_point.lat)
        last_glider_point[1] = convert_gps(last_glider_point.lon)
      }
      const in_geofence = is_in_polygon(last_glider_point, geofence.latlons)
      let last_in_geofence = false
      let gliders_in_geofence = []
      const glider_id = glider._id.toHexString()
      if (geofence.gliders_inside != undefined || geofence.gliders_inside != null) {
        last_in_geofence = geofence.gliders_inside.includes(glider_id)
        gliders_in_geofence = geofence.gliders_inside
      }
      if (in_geofence != last_in_geofence) {
        //the glider either entered or exited
        try {
          if (in_geofence) {
            //glider entered
            if (geofence.notify) {
              send_slack_message(`${glider.name} has entered geofence ${geofence.name}`)
            }
            await upload_event_files(glider, geofence, 'enter')
            gliders_in_geofence.push(glider_id)
          } else {
            //glider exited
            if (geofence.notify) {
              send_slack_message(`${glider.name} has exited geofence ${geofence.name}`)
            }
            const idx = gliders_in_geofence.indexOf(glider_id)
            await upload_event_files(glider, geofence, 'exit')
            gliders_in_geofence.splice(idx, 1)
          }
        } catch (error) {
          create_log(
            `Failed to upload files to ${glider.name} - Will try again next refresh (60 seconds) ---- ${error}`,
            'error',
            glider._id.toHexString()
          )
        }
      }

      updateOne('geofences', geofence._id.toHexString(), { gliders_inside: gliders_in_geofence })
    }
  }
}

export { update_geofences }
