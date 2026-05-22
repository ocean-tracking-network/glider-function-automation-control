import db from '../db/conn.mjs'
import { parseGliderDialog } from './glider_dialog_parser.mjs'
import { create_log } from './log_utils.mjs'
import { sendSlackNotification } from './slack.mjs'

const EVENT_LABELS = {
  connect: 'Glider Connect',
  abort: 'Glider Mission Abort',
}

function formatNotificationDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}Z`
}

function formatGps(gpsLocation) {
  if (!gpsLocation || gpsLocation.lat == null || gpsLocation.lng == null) return null
  return `${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}`
}

function formatBattery(parsed) {
  const details = []
  if (parsed.batteryPercent != null) details.push(`${Math.round(parsed.batteryPercent)}%`)
  if (parsed.batteryVolts != null) details.push(`${parsed.batteryVolts.toFixed(1)} volts`)
  return details.length ? details.join(', ') : null
}

function formatWaypoint(waypoint) {
  if (!waypoint) return null

  const details = []
  if (waypoint.rangeMeters != null) details.push(`range ${Math.round(waypoint.rangeMeters)} m`)
  if (waypoint.bearingDegrees != null) {
    details.push(`bearing ${Math.round(waypoint.bearingDegrees)} degrees`)
  }
  return details.length ? details.join(', ') : null
}

function addMessageLine(lines, label, value) {
  if (value == null || value === '') return
  lines.push(`${label}: ${String(value).trim()}`)
}

function buildNotificationMessage(parsed) {
  const eventLabel = EVENT_LABELS[parsed.eventType] || 'Unknown Glider Event'
  const gliderName = parsed.gliderName || 'unknown'
  const abortHistory = parsed.abortHistory
  const lines = ['GFAC Notification', `Event: ${eventLabel}`, `Glider: ${gliderName}`]

  if (parsed.eventType == 'abort') {
    addMessageLine(lines, 'Status', 'The glider reported a mission abort')
    addMessageLine(lines, 'Abort cause', parsed.abortCause)
    addMessageLine(
      lines,
      'Abort time',
      formatNotificationDate(parsed.abortTime || parsed.currentTime || parsed.connectionStartTime),
    )
    addMessageLine(lines, 'Abort segment', parsed.abortSegment)
    addMessageLine(lines, 'Abort mission', parsed.abortMission || parsed.missionName)
    addMessageLine(lines, 'Abort count since reset', abortHistory?.totalSinceReset)
  } else {
    addMessageLine(lines, 'Status', 'The glider connected and is reporting from the surface')
    addMessageLine(lines, 'Surface reason', parsed.reason)
    addMessageLine(
      lines,
      'Report time',
      formatNotificationDate(parsed.currentTime || parsed.connectionStartTime),
    )
    addMessageLine(lines, 'GPS location', formatGps(parsed.gpsLocation))
    addMessageLine(lines, 'Battery', formatBattery(parsed))
    addMessageLine(lines, 'Mission', parsed.missionName)
    addMessageLine(lines, 'Mission number', parsed.missionNum)
    addMessageLine(lines, 'Waypoint', formatWaypoint(parsed.waypoint))
    addMessageLine(
      lines,
      'Dive timer',
      parsed.timeUntilDivingSecs != null ? `${parsed.timeUntilDivingSecs} seconds` : null,
    )

    // ABORT HISTORY in a surface dialog is historical, but it is operationally useful.
    // Include it as context without changing the event from CONNECT to ABORT.
    if (abortHistory?.totalSinceReset > 0) {
      lines.push('Historical abort reported in dialog:')
      addMessageLine(lines, 'Historical abort count since reset', abortHistory.totalSinceReset)
      addMessageLine(lines, 'Historical abort cause', abortHistory.cause)
      addMessageLine(lines, 'Historical abort time', formatNotificationDate(abortHistory.time))
      addMessageLine(lines, 'Historical abort segment', abortHistory.segment)
      addMessageLine(lines, 'Historical abort mission', abortHistory.mission)
    }
  }

  return lines.join('\n')
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

function summarizeParsedDialogForLog(parsed) {
  return {
    eventType: parsed.eventType,
    gliderName: parsed.gliderName,
    reason: parsed.reason,
    currentTime: parsed.currentTime,
    connectionStartTime: parsed.connectionStartTime,
    gpsLocation: parsed.gpsLocation,
    batteryVolts: parsed.batteryVolts,
    batteryPercent: parsed.batteryPercent,
    missionName: parsed.missionName,
    missionNum: parsed.missionNum,
    waypoint: parsed.waypoint,
    timeUntilDivingSecs: parsed.timeUntilDivingSecs,
    abortHistory: parsed.abortHistory,
    abortCause: parsed.abortCause,
    abortTotalSinceReset: parsed.abortTotalSinceReset,
    abortTime: parsed.abortTime,
    abortSegment: parsed.abortSegment,
    abortMission: parsed.abortMission,
  }
}

async function sendSmsNotification(_recipient, _message) {
  return {
    status: 'skipped',
    reason: 'sms-not-configured',
  }
}

function notificationField(kind, eventType) {
  return `${kind}_notification.${eventType}`
}

function wasAlreadyProcessed(connectionLog, kind, eventType) {
  return Boolean(connectionLog?.[`${kind}_notification`]?.[eventType])
}

function finalStatus(validRecipientCount, delivery) {
  if (delivery.errors > 0) return 'error'
  if (validRecipientCount == 0 || delivery.skipped > 0) return 'skipped'
  return 'sent'
}

function overallStatus(results) {
  if (results.sms.status == 'error' || results.slack.status == 'error') return 'error'
  if (results.sms.status == 'sent' || results.slack.status == 'sent') return 'sent'
  return 'skipped'
}

function summarizeDelivery(results) {
  const summary = { sent: 0, skipped: 0, errors: 0, reasons: {} }

  for (const result of results) {
    if (result.status == 'sent') {
      summary.sent += 1
      continue
    }

    if (result.status == 'skipped') summary.skipped += 1
    else summary.errors += 1

    const reason = result.reason || 'unknown'
    summary.reasons[reason] = (summary.reasons[reason] || 0) + 1
  }

  return summary
}

function buildRecipientLists(subscribers) {
  const recipients = {
    sms: [],
    slack: [],
    invalidSmsPhones: [],
  }

  for (const subscriber of subscribers) {
    // A subscriber can receive both SMS and Slack if both fields are saved.
    if (subscriber.phone) {
      const phone = normalizeNorthAmericanPhone(subscriber.phone)
      if (phone) {
        recipients.sms.push({ notificationId: subscriber._id, name: subscriber.name, phone })
      } else {
        recipients.invalidSmsPhones.push({
          notificationId: subscriber._id,
          name: subscriber.name,
          phone: subscriber.phone,
        })
      }
    }

    if (subscriber.slack_id) {
      recipients.slack.push({
        notificationId: subscriber._id,
        name: subscriber.name,
        slack_id: subscriber.slack_id,
      })
    }
  }

  return recipients
}

async function getSubscribers(parsed, event, connectionLog) {
  try {
    return await db.collection('notifications').find({ glider: parsed.gliderName, event }).toArray()
  } catch (error) {
    await create_log(
      `notification lookup failed for ${parsed.gliderName} ${event}: ${error.message}`,
      'error',
      connectionLog.glider || '',
    )
    return null
  }
}

async function claimDelivery(
  logs,
  connectionLog,
  field,
  kind,
  parsed,
  event,
  message,
  parsedSummary,
) {
  const startedAt = new Date()
  const result = await logs.updateOne(
    { _id: connectionLog._id, [field]: { $exists: false } },
    {
      $set: {
        [field]: {
          status: 'processing',
          notification_type: kind,
          event,
          eventType: parsed.eventType,
          startedAt,
          message,
          parsed: parsedSummary,
        },
      },
    },
  )

  return result.modifiedCount == 1 ? startedAt : null
}

async function writeDeliveryResult(logs, connectionLog, field, result) {
  await logs.updateOne({ _id: connectionLog._id }, { $set: { [field]: result } })
  return result
}

async function addNotificationHistory(recipient, details) {
  if (!recipient.notificationId) return

  try {
    await db.collection('notifications').updateOne(
      { _id: recipient.notificationId },
      {
        $push: {
          history: {
            date: new Date(),
            ...details,
          },
        },
      },
    )
  } catch (error) {
    console.log(`Could not update notification history: ${error.message}`)
  }
}

async function logDeliveryProblem(kind, parsed, event, result, glider) {
  if (result.recipients.matching == 0 || result.status == 'sent') return

  const label = kind == 'sms' ? 'SMS' : 'Slack'
  const reasons = Object.entries(result.delivery.reasons)
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ')
  const level = result.status == 'error' ? 'error' : 'warning'

  await create_log(
    `${label} notification ${result.status} for ${parsed.gliderName} ${event}: ${reasons || 'no valid recipients'}, ${result.recipients.invalid} invalid recipient(s)`,
    level,
    glider || '',
  )
}

async function sendSmsMessages(connectionLog, parsed, event, message, parsedSummary, recipients) {
  const field = notificationField('sms', parsed.eventType)
  if (wasAlreadyProcessed(connectionLog, 'sms', parsed.eventType)) {
    return { status: 'skipped', reason: 'already-processed' }
  }

  const logs = db.collection('logs')
  const startedAt = await claimDelivery(
    logs,
    connectionLog,
    field,
    'sms',
    parsed,
    event,
    message,
    parsedSummary,
  )
  if (!startedAt) return { status: 'skipped', reason: 'already-processed' }

  const results = []
  for (const recipient of recipients.sms) {
    let sendResult
    try {
      sendResult = await sendSmsNotification(recipient, message)
    } catch (error) {
      sendResult = { status: 'error', reason: error.message || 'sms-send-failed' }
    }
    results.push(sendResult)
    await addNotificationHistory(recipient, {
      notification_type: 'sms',
      event,
      eventType: parsed.eventType,
      glider: parsed.gliderName,
      status: sendResult.status,
      reason: sendResult.reason,
      destination: recipient.phone,
      message,
      connectionLogId: connectionLog._id,
    })
  }

  for (const recipient of recipients.invalidSmsPhones) {
    await addNotificationHistory(recipient, {
      notification_type: 'sms',
      event,
      eventType: parsed.eventType,
      glider: parsed.gliderName,
      status: 'skipped',
      reason: 'invalid-phone',
      destination: recipient.phone,
      message,
      connectionLogId: connectionLog._id,
    })
  }

  const delivery = summarizeDelivery(results)
  const result = {
    status: finalStatus(recipients.sms.length, delivery),
    notification_type: 'sms',
    event,
    eventType: parsed.eventType,
    startedAt,
    completedAt: new Date(),
    message,
    parsed: parsedSummary,
    recipients: {
      matching: recipients.sms.length + recipients.invalidSmsPhones.length,
      valid: recipients.sms.length,
      invalid: recipients.invalidSmsPhones.length,
    },
    delivery,
  }

  await writeDeliveryResult(logs, connectionLog, field, result)
  await logDeliveryProblem('sms', parsed, event, result, connectionLog.glider)
  return result
}

async function sendSlackMessages(connectionLog, parsed, event, message, parsedSummary, recipients) {
  const field = notificationField('slack', parsed.eventType)
  if (wasAlreadyProcessed(connectionLog, 'slack', parsed.eventType)) {
    return { status: 'skipped', reason: 'already-processed' }
  }

  const logs = db.collection('logs')
  const startedAt = await claimDelivery(
    logs,
    connectionLog,
    field,
    'slack',
    parsed,
    event,
    message,
    parsedSummary,
  )
  if (!startedAt) return { status: 'skipped', reason: 'already-processed' }

  const results = []
  for (const recipient of recipients.slack) {
    let sendResult
    try {
      sendResult = await sendSlackNotification(recipient, message)
    } catch (error) {
      sendResult = { status: 'error', reason: error.message || 'slack-send-failed' }
    }
    results.push(sendResult)
    await addNotificationHistory(recipient, {
      notification_type: 'slack',
      event,
      eventType: parsed.eventType,
      glider: parsed.gliderName,
      status: sendResult.status,
      reason: sendResult.reason,
      destination: recipient.slack_id,
      message,
      connectionLogId: connectionLog._id,
    })
  }

  const delivery = summarizeDelivery(results)
  const result = {
    status: finalStatus(recipients.slack.length, delivery),
    notification_type: 'slack',
    event,
    eventType: parsed.eventType,
    startedAt,
    completedAt: new Date(),
    message,
    parsed: parsedSummary,
    recipients: {
      matching: recipients.slack.length,
      valid: recipients.slack.length,
      invalid: 0,
    },
    delivery,
  }

  await writeDeliveryResult(logs, connectionLog, field, result)
  await logDeliveryProblem('slack', parsed, event, result, connectionLog.glider)
  return result
}

async function processNotificationsForConnectionLog(connectionLog) {
  if (!connectionLog?._id) return { status: 'skipped', reason: 'missing-connection-log' }

  // Dialog chunks arrive over time. Do nothing until the parser has enough summary data.
  const parsed = parseGliderDialog(connectionLog)
  const event = EVENT_LABELS[parsed.eventType]
  if (!event || !parsed.isReady) return { status: 'skipped', reason: 'dialog-not-ready', parsed }

  // Subscriber records are event-based. Each record can contain phone, slack_id, or both.
  const subscribers = await getSubscribers(parsed, event, connectionLog)
  if (!subscribers) return { status: 'error', reason: 'subscriber-lookup-failed', parsed }

  const message = buildNotificationMessage(parsed)
  const parsedSummary = summarizeParsedDialogForLog(parsed)
  const recipients = buildRecipientLists(subscribers)

  // SMS and Slack have separate log fields so repeated dialog chunks cannot duplicate either send.
  const results = {
    sms: await sendSmsMessages(connectionLog, parsed, event, message, parsedSummary, recipients),
    slack: await sendSlackMessages(
      connectionLog,
      parsed,
      event,
      message,
      parsedSummary,
      recipients,
    ),
  }

  return {
    status: overallStatus(results),
    event,
    eventType: parsed.eventType,
    parsed,
    results,
    sms: results.sms,
    slack: results.slack,
  }
}

export { processNotificationsForConnectionLog }
