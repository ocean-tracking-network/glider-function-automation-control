import type { GeoJsonGeometryTypes } from 'geojson'
import type { MoveEvent } from 'sortablejs';
import type { Component } from 'vue';

export type Latlon = {
  lat: number
  lng: number
}

export type Glider = {
  _id: string
  name: string
  track: (Latlon & { date?: string })[]
  enabled: boolean
  next_waypoint?: Latlon
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

export type EventGliderFile = UploadedFile & GliderEvent

export type ScriptData = {
  factory?: string[]
  user?: string[]
}

export type GliderScripts = {
  [glider_name: string]: ScriptData
}

export type GliderLog = {
  _id: string
  date: string
  glider: string
  level: string
  message: string
}

export type UserRole = 'admin' | 'viewer'

export type User = {
  username?: string
  role?: UserRole
  lastLogin?: string
}

export type FileBoxType<T> = T & {
  key?: string
  bold?: boolean,
  type?: string
}

export type DraggableMoveEvent<T> = MoveEvent & {
  draggedContext: {
    index: number
    futureIndex: number
    element: T
  }
  relatedContext: {
    index: number
    element: T
    list: T[]
    component: Component
  }
}

// AIS Report derrived boat type
// export type Boat = Latlon & {
//   vid: number
//   mmsi: number
//   courseOverGround: number
//   speedOverGround: number
//   heading: number
//   rateOfTurn: number
//   shipCargoType: number
//   navigationStatus: number
//   length: number
//   breadth: number
//   imoNumber: number
//   dimensions: number
//   vehicleName: string
//   shipName: string
//   callSign: string
//   destination: string
//   aisClass: string
//   // ISO 8601 formatted date strings
//   eta: string
//   timeStamp: string
// }


export type BoatLocation = {
    LATITUDE: number
    LONGITUDE: number
    NAVSTAT: string
    COURSE: string
    HEADING: string
    NAME: string
    TIMESTAMP: string
}

// Boat type inferred from boat_utils
export type Boat = {
  locations: BoatLocation[]
  prediction: {
    line: [number, number]
    center: number[]
    cone: number[]
  }
  prediction_range: {
    count: number
    cone: number[]
    intervals: {
      offset: number
      line: [number, number]
      center: [number, number]
      cone: [number, number]
    }[]
  }
  minute_offset: number
}
