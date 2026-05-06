import type { GeoJsonGeometryTypes } from 'geojson'

export type Latlon = {
  lat: number
  lon: number
}

export type Glider = {
  _id: string
  name: string
  track: Latlon[]
  enabled: boolean
}


export type Geofence = {
  latlons: Latlon[]
  name: string
  notify: boolean
  selected?: boolean
}

export type kmlGeoJson = {
  coordinates: Latlon[]
  placemark: string
  type?: GeoJsonGeometryTypes
  isValid: boolean
  description?: string
}

export type UploadedFile = {
  _id: string
  category: string
  filename: string
  path: string
}

export type ScriptOptions = {
  file_id?: string
  script?: string
  script_type?: string
}

export type EventType = 'enter' | 'exit'

export type Script = ScriptOptions & {
  geofence: string
  glider: string
  event_type: EventType
}

export type GliderEvent = Script & {
  _id: string
}

export type GliderScripts = {
  [glider_name: string]: {
    factoryScripts?: string[]
    userScripts?: string[]
  }
}

export type UserRole = 'admin' | 'viewer'

export type User = {
  username?: string
  role?: UserRole
  lastLogin?: string
}

export type GliderLog = {
  _id: string
  date: string
  glider: string
  level: string
  message: string
}
