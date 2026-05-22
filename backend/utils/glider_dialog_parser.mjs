const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const PATTERNS = {
  gliderName: [
    /^Vehicle Name:\s*(\S+)/im,
    /^Glider\s+(\S+)\s+at surface\./im,
    /^Subject:\s*Glider:\s*(\S+)/im,
  ],
  reason: /^Because:\s*([^\[\n]+)/im,
  currentTime: /^Curr Time:\s*(.+?)\s+MT:/im,
  batteryVolts: /sensor:m_battery\(volts\)=([^\s]+)/i,
  batteryPercent: /sensor:m_lithium_battery_relative_charge\(%\)=([^\s]+)/i,
  diveTimer: /^Time until diving is:\s*(\d+)\s*secs/im,
  abortSubject: /^Subject:\s*Glider:\s*\S+\s+Event:\s*Glider Mission Abort\b/im,
  abortTotalSinceReset: /^ABORT HISTORY:\s*total since reset:\s*(\d+)/im,
  abortCause: /^ABORT HISTORY:\s*last abort cause:\s*(.+)$/im,
  abortDetails: /^ABORT HISTORY:\s*last abort details:\s*(.*)$/im,
  abortTime: /^ABORT HISTORY:\s*last abort time:\s*(.+)$/im,
  abortSegment: /^ABORT HISTORY:\s*last abort segment:\s*(.+)$/im,
  abortMission: /^ABORT HISTORY:\s*last abort mission:\s*(.+)$/im,
}

function normalizeDialogText(text = '') {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
}

function dialogEntries(input) {
  if (Array.isArray(input)) return input
  if (input?.surface_dialog) return input.surface_dialog
  return typeof input?.data == 'string' ? [input] : []
}

function buildDialogText(input) {
  if (typeof input == 'string') return normalizeDialogText(input)

  // SFMC stream chunks can split words, so sort the chunks and join the raw data before parsing.
  const text = dialogEntries(input)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aSequence = Number(a.entry.sequenceNumber)
      const bSequence = Number(b.entry.sequenceNumber)
      return Number.isFinite(aSequence) && Number.isFinite(bSequence) && aSequence != bSequence
        ? aSequence - bSequence
        : a.index - b.index
    })
    .map(({ entry }) => entry.data ?? '')
    .join('')
  return normalizeDialogText(text)
}

function firstMatch(text, regexOrList) {
  for (const regex of Array.isArray(regexOrList) ? regexOrList : [regexOrList]) {
    const value = text.match(regex)?.[1]?.trim()
    if (value) return value
  }
  return null
}

function parseNumber(value) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : null
}

function parseSlocumCurrentTime(raw) {
  const match = String(raw).match(
    /^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
  )
  const month = match ? MONTHS.indexOf(match[1]) : -1
  return month < 0 ? Number.NaN : Date.UTC(match[6], month, match[2], match[3], match[4], match[5])
}

function parseTimestamp(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  // Slocum lines omit timezone; treat them as UTC because SFMC email examples are UTC.
  const slocumTime = parseSlocumCurrentTime(raw)
  if (Number.isFinite(slocumTime)) return new Date(slocumTime)

  const isoLike = raw
    .replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T')
    .replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$/, '$1Z')
  const timestamp = Date.parse(isoLike)
  const fallback = Number.isFinite(timestamp) ? timestamp : Date.parse(`${raw} UTC`)
  return Number.isFinite(fallback) ? new Date(fallback) : null
}

function convertSlocumCoordinate(value, hemisphere) {
  const raw = Number.parseFloat(value)
  if (!Number.isFinite(raw)) return null

  const degrees = Math.floor(Math.abs(raw) / 100)
  const minutes = Math.abs(raw) - degrees * 100
  const direction = String(hemisphere || '').toUpperCase()
  const sign = raw < 0 || direction == 'S' || direction == 'W' ? -1 : 1
  return sign * (degrees + minutes / 60)
}

function parseLocation(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(
    new RegExp(
      `^${escapedLabel}:\\s+(-?\\d+(?:\\.\\d+)?)\\s+([NS])\\s+(-?\\d+(?:\\.\\d+)?)\\s+([EW])`,
      'im',
    ),
  )
  if (!match) return null

  const lat = convertSlocumCoordinate(match[1], match[2])
  const lng = convertSlocumCoordinate(match[3], match[4])
  return lat == null || lng == null ? null : { lat, lng, source: label }
}

function parseMission(text) {
  const match = text.match(/^MissionName:\s*(\S+)\s+MissionNum:\s*(.+)$/im)
  return { missionName: match?.[1]?.trim() || null, missionNum: match?.[2]?.trim() || null }
}

function parseWaypoint(text) {
  const match = text.match(
    /^Waypoint:\s*\(([^,]+),([^)]+)\)\s*Range:\s*([0-9.]+)m,\s*Bearing:\s*([0-9.]+)deg/im,
  )
  return match
    ? {
        lat: parseNumber(match[1]),
        lng: parseNumber(match[2]),
        rangeMeters: parseNumber(match[3]),
        bearingDegrees: parseNumber(match[4]),
      }
    : null
}

function parseAbortHistory(text) {
  const timeRaw = firstMatch(text, PATTERNS.abortTime)
  const history = {
    totalSinceReset: parseNumber(firstMatch(text, PATTERNS.abortTotalSinceReset)),
    cause: firstMatch(text, PATTERNS.abortCause),
    details: firstMatch(text, PATTERNS.abortDetails),
    timeRaw,
    time: parseTimestamp(timeRaw),
    segment: firstMatch(text, PATTERNS.abortSegment),
    mission: firstMatch(text, PATTERNS.abortMission),
  }

  const hasHistory = Object.values(history).some((value) => value != null && value !== '')
  return hasHistory ? history : null
}

function classifyDialog(text, fields) {
  const hasSurfacePrompt = /^Glider\s+\S+\s+at surface\./im.test(text)
  const hasConnectionHeader = /^Connection Event:/im.test(text)
  const hasAbortSubject = PATTERNS.abortSubject.test(text)
  const abortHistoryOnly =
    /^\s*ABORT HISTORY:/i.test(text) && !hasSurfacePrompt && !hasConnectionHeader
  const criticalAbortActive = /sensor:x_critical_abort_active\(int\)=1\b/i.test(text)
  const hasAbortSinceReset = fields.abortHistory?.totalSinceReset > 0

  // Surface reports often include historical ABORT HISTORY from before this surfacing.
  // Keep those as connect events, but still expose the history for the message/log.
  if (hasSurfacePrompt || hasConnectionHeader) return 'connect'

  // A current abort is either explicitly labeled by SFMC, actively flagged by the glider,
  // or an abort-history-only payload where "total since reset" says an abort exists.
  if (hasAbortSubject || criticalAbortActive || (abortHistoryOnly && hasAbortSinceReset)) {
    return 'abort'
  }

  return null
}

function hasEnoughDialogForNotification(parsed) {
  if (parsed.eventType == 'abort') {
    return Boolean(
      parsed.gliderName &&
      parsed.abortCause &&
      (parsed.abortTime || parsed.abortSegment || parsed.abortMission),
    )
  }
  if (parsed.eventType != 'connect') return false

  const hasSurfaceMenu = /Water Velocity Calculations|Hit Control-R/i.test(parsed.rawText)
  return Boolean(
    parsed.gliderName &&
    parsed.reason &&
    parsed.gpsLocation &&
    parsed.missionName &&
    (parsed.timeUntilDivingSecs != null || hasSurfaceMenu),
  )
}

function parseGliderDialog(input) {
  const rawText = buildDialogText(input)
  const mission = parseMission(rawText)
  const currentTimeRaw = firstMatch(rawText, PATTERNS.currentTime)
  const abortHistory = parseAbortHistory(rawText)

  const parsed = {
    rawText,
    gliderName:
      firstMatch(rawText, PATTERNS.gliderName) ||
      input?.surface_dialog?.find((dialog) => dialog.gliderName)?.gliderName ||
      input?.gliderName ||
      null,
    reason: firstMatch(rawText, PATTERNS.reason),
    currentTimeRaw,
    currentTime: parseTimestamp(currentTimeRaw),
    connectionStartTime: parseTimestamp(input?.glider_connection?.startDateTime),
    gpsLocation: parseLocation(rawText, 'GPS Location') || parseLocation(rawText, 'DR  Location'),
    batteryVolts: parseNumber(firstMatch(rawText, PATTERNS.batteryVolts)),
    batteryPercent: parseNumber(firstMatch(rawText, PATTERNS.batteryPercent)),
    missionName: mission.missionName,
    missionNum: mission.missionNum,
    waypoint: parseWaypoint(rawText),
    timeUntilDivingSecs: parseNumber(firstMatch(rawText, PATTERNS.diveTimer)),
    abortHistory,
    abortTotalSinceReset: abortHistory?.totalSinceReset ?? null,
    abortCause: abortHistory?.cause ?? null,
    abortDetails: abortHistory?.details ?? null,
    abortTimeRaw: abortHistory?.timeRaw ?? null,
    abortTime: abortHistory?.time ?? null,
    abortSegment: abortHistory?.segment ?? null,
    abortMission: abortHistory?.mission ?? null,
  }

  parsed.eventType = classifyDialog(rawText, parsed)
  parsed.isReady = hasEnoughDialogForNotification(parsed)
  return parsed
}

export { parseGliderDialog }
