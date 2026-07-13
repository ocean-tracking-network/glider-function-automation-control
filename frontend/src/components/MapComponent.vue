<script setup lang="ts">
import "leaflet/dist/leaflet.css"
import * as EL from 'esri-leaflet';
import * as L from 'leaflet'
import { computed, onMounted, ref, shallowRef, watch, type Ref } from "vue";
import { useGeoFencesStore } from "@/stores/geofences";
import { storeToRefs } from "pinia";
import { useGlidersStore } from "@/stores/gliders";
import slocum1 from "@/assets/slocum_marker.png";
import waypointIcon from "@/assets/target-opaque-32x32.png"
import { useUserStore } from "@/stores/user";
import apiClient from "@/apiClient";
import type { Boat, BoatLocation, BoatPrediction, Glider, Latlon } from '@/lib/types';
import type { GeoJsonObject, GeoJsonTypes } from 'geojson'

const store = useGeoFencesStore();
const gliderStore = useGlidersStore();
const userStore = useUserStore();

const initialMap = shallowRef<L.Map>()
const polygons = shallowRef<L.Polygon[]>([])
const polygon_to_geofence_map = shallowRef<Record<number, string>>({})
const idx_marker = shallowRef<L.Marker | null>(null)

const glider_track_polyline = shallowRef<L.GeoJSON | null>(null)
const glider_track_points = shallowRef<L.Circle[] | null>(null)
const glider_current_location = shallowRef<L.Marker | null>(null)
const glider_next_waypoint = shallowRef<L.Marker | null>(null)

const all_glider_markers = shallowRef<L.Marker[]>([])

// Double-click tracking
const lastClickedFenceKey = ref<string | null>(null)
const lastClickTime = ref(0)
const clickTimeout = ref<number | null>(null)
const DOUBLE_CLICK_DELAY = 300

// The box we have AIS data for
const ais_border: Latlon[] = [
  [50.2823, -65.3394],
  [49.1961, -66.2842],
  [49.2319, -64.9988],
  [48.9946, -64.3066],
  [47.7836, -61.7578],
  [48.8575, -60.835],
  [49.0883, -62.1753],
  [49.3681, -63.4717],
  [49.6427, -63.8892],
  [ 49.8238, -64.4641],
  [50.2823, -65.3394],
].map((ele) => { return { lat: ele[0]!, lng: ele[1]! } })


const ais_offset_amount = 180
const boat_slide_time_offset = ref(0)
const boat_slider_min = ref(0)
const boat_slider_max = ref()
const boat_predict_lines = shallowRef<(L.Polyline | L.Circle)[]>([])
const boat_markers = shallowRef<L.Marker[]>([])
const boats = shallowRef<Boat[]>([])
const shortest_distance = shallowRef<L.Polyline>()


const { selected_idx, force_map_update, geofences, interactive_map, selected_fence } = storeToRefs(store)
const { selected_glider, gliders } = storeToRefs(gliderStore)
const { isAdmin, loggedin } = storeToRefs(userStore)

function get_boats() {
  console.log("Getting boats")
  apiClient.get(`/boats/${ais_offset_amount}`)
    .then((res) => {
      boats.value = res.data
      if(boats.value.length > 0){
        const offsets = res.data[0].prediction_range.intervals.map((element: { offset: unknown}) => element.offset)

        boat_slider_max.value = Math.max(...offsets)
        boat_slider_min.value = Math.min(...offsets)
      }
      draw_boats()
      draw_predict()
      draw_glider_to_ship_line()
    })
    .catch((error) => {
      console.error("Error fetching boats:", error)
    })
}

function clear_map_data(map_element_arr: Ref<L.Marker[]>) {
  if (map_element_arr.value.length) {
    map_element_arr.value.forEach((ele) => {
      ele.removeFrom(initialMap.value as L.Map)
    })
  }
  map_element_arr.value = []
}


function get_current_predict(boat: Boat): BoatPrediction{
  let predict_data = boat.prediction
  if (boat.prediction_range && boat.prediction_range.intervals) {
    predict_data = boat.prediction_range.intervals.find((element) => element.offset == boat_slide_time_offset.value ) as BoatPrediction
  }
  return predict_data
}

async function draw_glider_to_ship_line(){
  const truncateToTwoDecimals = (num: number): number => Math.trunc(num * 100) / 100;
  const glider_latlng = glider_current_location.value?.getLatLng()
  if (!glider_latlng) return
  if(shortest_distance) shortest_distance.value?.removeFrom(initialMap.value as L.Map)
  let shortest = 100000
  let shortest_boat_latlng = new L.LatLng(0,0)
  for (const boat of boats.value){
    if (!boat || !boat.prediction) continue
    const boat_predict = get_current_predict(boat)
    const boat_ghost_latlng = new L.LatLng(boat_predict.center[0] as number, boat_predict.center[1] as number)
    const distance = initialMap.value?.distance(glider_latlng, boat_ghost_latlng)
    if (distance as number < shortest) {
      shortest = distance as number
      shortest_boat_latlng = boat_ghost_latlng
    }
  }
  const popup_text =`${truncateToTwoDecimals(shortest / 1000)}km` 
  const shortest_distance_line = L.polyline([glider_latlng, shortest_boat_latlng], {color: "blue", opacity: .5}).addTo(initialMap.value as L.Map)
  shortest_distance_line.bindPopup(
    popup_text,
  )
  shortest_distance_line.bindTooltip(
    popup_text,
  )
  shortest_distance.value = shortest_distance_line
}

async function draw_predict() {
  const temp_array = boat_predict_lines.value
  boat_predict_lines.value = []
  for (const boat of boats.value) {
    if (!boat || !boat.prediction) continue
    const predict_data = get_current_predict(boat)

    console.log(predict_data)
    // Will need more specifc typing on predict_data properties (preferrably in latlng object format like leaflet)
    if (predict_data.line) {
        const ghost_line = L.polyline([predict_data.line[0] as [number, number],
                                        predict_data.center,
                                        predict_data.line[1] as [number, number]],
                                        { color: "white" }).addTo(initialMap.value as L.Map)
        boat_predict_lines.value.push(ghost_line)
    }
    if (predict_data.cone) {
        const predict_cone = L.polyline(predict_data.cone, { color: "green" }).addTo(initialMap.value as L.Map)
        boat_predict_lines.value.push(predict_cone)
    }
    if (predict_data.center) {
        const ghost = L.circle(predict_data.center, { radius: 3 }).addTo(initialMap.value as L.Map)
        boat_predict_lines.value.push(ghost)
        // const ghost_point = L.latLng(predict_data.center[0], predict_data.center[1]);
    }
  }

  if (temp_array.length) {
    temp_array.forEach((ele) => {
      ele.removeFrom(initialMap.value as L.Map)
    })
  }

}

watch(boat_slide_time_offset, () => {
  draw_predict()
  draw_glider_to_ship_line()
})

function get_boat_rotation(last_location: BoatLocation) {
  const heading = Number(last_location["HEADING"])
  if (Number.isFinite(heading) && heading >= 0 && heading <= 360) {
    return heading
  }

  const course = Number(last_location["COURSE"])
  if (Number.isFinite(course) && course >= 0 && course <= 360) {
    return course
  }

  return 0
}

function create_boat_icon(rotation: Number) {
  return L.divIcon({
    className: 'boat-arrow-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span class="boat-arrow" style="transform: rotate(${rotation}deg);"></span>`,
  })
}

function draw_boats() {
  clear_map_data(boat_markers as Ref<L.Marker[]>)
  const boat_size = 30
  boats.value.forEach((ele) => {
    if (!ele.locations || ele.locations.length === 0) return
    const last_location = ele.locations[ele.locations.length - 1]
    if (!last_location || !last_location["LATITUDE"] || !last_location["LONGITUDE"]) return

    const rotation = get_boat_rotation(last_location)
    const new_marker = L.marker([last_location["LATITUDE"], last_location["LONGITUDE"]], { icon: create_boat_icon(rotation) })
      .addTo(initialMap.value as L.Map).bindPopup(`<b>Last Known Time: ${last_location["TIMESTAMP"]} boat: ${ele["NAME"]} src: ${last_location["SRC"]}</b>`)
    boat_markers.value.push(new_marker)
  })
}

// This border is where our old AIS data is within
function draw_ais_border() {
  const geo_json = generate_geojson(ais_border)
  const ais_boder = L.geoJSON(geo_json, {
    style: function (feature) {
      return {
        opacity: 1,
        color: "blue"
      }
    }
  }).addTo(initialMap.value as L.Map)
}

// SFMC outputs in an annoying format compared to what leaflet wants
//  (Degrees decimal minutes -> Decimal degrees), so (4932.822) is actually 49* 32.822'
function convert_gps(val: number) {
  let degrees = Math.floor(val / 100)
  if (val < 0) {
    degrees = Math.ceil(val / 100)
  }
  const deci_minutes = ((val / 100) - degrees) * 100
  const ret = degrees + (deci_minutes / 60)
  return ret
}

function generate_geojson(latlons: Latlon[]) {
  const geo_json: GeoJsonObject[] = []
  for (let i = 0; i < latlons.length - 1; i++) {
    const new_json = {
      "type": "Feature" as GeoJsonTypes,
      "properties": { "line_num": i },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [latlons[i]!.lng, latlons[i]!.lat],
          [latlons[i + 1]!.lng, latlons[i + 1]!.lat]
        ]
      } //WHY IS IT IN LON:LAT FORMAT!
    }
    geo_json.push(new_json)
  }
  return geo_json
}

function get_geojson_opacity(line_num: number, total_num: number) {
  const min = 0
  const normalized = (line_num - min) / (total_num - min)
  return normalized + .1
}

function create_polygons() {
  geofences_filtered.value.forEach((geofence) => {
    const options: L.PolylineOptions = {}
    if (geofence.key === store.selected_fence_key) {
      options.color = "orange"
    }
    const new_polygon = L.polygon(geofence.latlons, options)
      .on("click", on_polygon_click)
      .addTo(initialMap.value as L.Map)
    polygon_to_geofence_map.value[L.Util.stamp(new_polygon)] = geofence.key
    polygons.value.push(new_polygon)
  })
}

const on_polygon_click = (e: L.LeafletMouseEvent) => {
  if (e.originalEvent) {
    e.originalEvent.preventDefault()
    e.originalEvent.stopPropagation()
  }

  const fenceKey = polygon_to_geofence_map.value[e.target._leaflet_id]
  const currentTime = Date.now()
  if (!fenceKey) return

  console.log("CLICK on polygon, fenceKey:", fenceKey, "currentTime:", currentTime, "lastClickTime:", lastClickTime.value)

  if (lastClickedFenceKey.value === fenceKey && (currentTime - lastClickTime.value) < DOUBLE_CLICK_DELAY) {
    console.log("DOUBLE CLICK DETECTED")
    if (clickTimeout.value) {
      clearTimeout(clickTimeout.value)
      clickTimeout.value = null
    }
    lastClickedFenceKey.value = null
    lastClickTime.value = 0
    store.doubleClickGeofence(fenceKey)
  } else {
    lastClickedFenceKey.value = fenceKey
    lastClickTime.value = currentTime

    if (clickTimeout.value) {
      clearTimeout(clickTimeout.value)
    }

    clickTimeout.value = setTimeout(() => {
      lastClickedFenceKey.value = null
      lastClickTime.value = 0
      clickTimeout.value = null
    }, DOUBLE_CLICK_DELAY)

    store.selectGeofence(fenceKey)
  }
}


function clear_glider_map_elements() {
  if (glider_track_polyline.value) {
    glider_track_polyline.value.removeFrom(initialMap.value as L.Map)
    glider_track_polyline.value = null
  }
  if (glider_track_points.value) {
    glider_track_points.value.forEach((ele) => {
      ele.removeFrom(initialMap.value as L.Map)
    })
    glider_track_points.value = []
  }
  if (glider_current_location.value) {
    if (Array.isArray(glider_current_location.value)) {
      glider_current_location.value.forEach((ele) => {
        ele.removeFrom(initialMap.value)
      })
    } else {
      glider_current_location.value.removeFrom(initialMap.value as L.Map)
    }
    glider_current_location.value = null
  }
  if (glider_next_waypoint.value) {
    glider_next_waypoint.value.removeFrom(initialMap.value as L.Map)
    glider_next_waypoint.value = null
  }
  if (all_glider_markers.value.length > 0) {
    all_glider_markers.value.forEach((glider_marker) => {
      glider_marker.removeFrom(initialMap.value as L.Map)
    })
    all_glider_markers.value = []
  }
}

function set_glider_track() {
  clear_glider_map_elements()
  if (!selected_glider.value || !Array.isArray(selected_glider.value.track)) return

  const tracks: Latlon[] = []
  glider_track_points.value = []
  selected_glider.value.track.forEach((element) => {
    tracks.push({ lat: convert_gps(element.lat), lng: convert_gps(element.lng) })
    glider_track_points.value?.push(
      L.circle({lat: convert_gps(element.lat), lng: convert_gps(element.lng)}, { radius: 200, stroke: false, color: 'red' })
        .addTo(initialMap.value as L.Map).bindPopup(`<b>${element.date ?? 'No Attached Date'}</b><p>200m</p>`)
    )
  })

  const slocum_icon = L.icon({
    iconUrl: slocum1,
    iconSize: [37, 61],
    iconAnchor: [18, 61],
  })

  if (glider_has_track(selected_glider.value)) {
    // glider_track_polyline.value = L.polyline(tracks, { color: 'red' }).addTo(initialMap.value)
    const geo_json = generate_geojson(tracks)
    glider_track_polyline.value = L.geoJSON(geo_json, {
      style: function (feature) {
        return {
          opacity: get_geojson_opacity(feature?.properties.line_num ?? 0, tracks.length),
          color: "red"
        }
      }
    }).addTo(initialMap.value as L.Map)
    glider_current_location.value = L.marker(
      tracks[tracks.length - 1]!,
      { icon: slocum_icon }
    ).addTo(initialMap.value as L.Map)
    initialMap.value!.setView(tracks[tracks.length - 1]!)
  }
  if (selected_glider.value.next_waypoint) {
    const waypoint_icon = L.icon({
      iconUrl: waypointIcon,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    const waypoint = selected_glider.value.next_waypoint
    glider_next_waypoint.value = L.marker(
      {lat: convert_gps(waypoint.lat), lng: convert_gps(waypoint.lng)},
      { icon: waypoint_icon }
    ).addTo(initialMap.value as L.Map)
  }
  gliderStore.gliders.forEach((glider) => {
    if (selected_glider.value && glider._id != selected_glider.value._id && glider_has_track(glider)) {
      const current_pos: Latlon = {
        lat: convert_gps(glider.track[glider.track.length - 1]!.lat),
        lng: convert_gps(glider.track[glider.track.length - 1]!.lng),
      }
      const new_marker = L.marker(current_pos, { icon: slocum_icon, opacity: .4 })
        .on("click", () => { gliderStore.select_glider(glider._id) })
        .addTo(initialMap.value as L.Map)
      all_glider_markers.value.push(new_marker)
    }
  })
}

function map_click(e: L.LeafletMouseEvent) {
  if (!isAdmin.value) {
    return
  }
  const clicked_layer = e?.originalEvent?.target
  if (clicked_layer instanceof Element && clicked_layer.closest('.leaflet-interactive')) {
    return
  }
  if (store.selected_fence && interactive_map.value) {
    // store.selected_fence
    // //console.log(e.latlng)
    const lat = +e.latlng.lat.toFixed(4)
    const lng = +e.latlng.lng.toFixed(4)
    const fence = geofences.value[store.selected_fence_key]
    if (store.selected_fence_key && fence) {
      fence.latlons[fence.latlons.length - 1] = { lat: lat, lng: lng }
    }
  }
}

onMounted(() => {
  initialMap.value = L.map('map').setView([47.627146, -59.913357], 9)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(initialMap.value);

  const dl = EL.dynamicMapLayer({
    url: 'https://egisp.dfo-mpo.gc.ca/arcgis/rest/services/open_data_donnees_ouvertes/vessel_traffic_routes_en/MapServer',
    opacity: 1,
    attribution: "DFO Canada"
  })

  dl.addTo(initialMap.value)

  initialMap.value.on('click', map_click)
  create_polygons()
  draw_ais_border()
})

watch(loggedin, (isLoggedIn) => {
  if (isLoggedIn) {
    get_boats()
  }
}, { immediate: true })

function update_map() {
  //console.log("Map Update")
  polygons.value.forEach((poly) => {
    poly.removeFrom(initialMap.value as L.Map)
  })
  polygons.value = []
  create_polygons()

  // get_boats()
  draw_ais_border()
}

function glider_has_track(glider: Glider) {
  return (glider.track && glider.track.length > 0)
}

watch(geofences, async () => {
  update_map()
}, { deep: true })

watch(force_map_update, (new_val) => {
  // console.log("Map update?")
  //console.log(new_val)
  if (new_val == true) {
    // console.log("Map update? - Yes")
    update_map()
    store.set_force_map_update(false)
  }
})

// When the user clicks on a geofence cord box
watch(selected_idx, (new_idx) => {
  if (idx_marker.value != null) {
    idx_marker.value.removeFrom(initialMap.value as L.Map)
    idx_marker.value = null
  }
  if (!store.selected_fence || new_idx == null) {
    return
  }

  const lat_lon = store.selected_fence.latlons?.[new_idx]
  if (lat_lon?.lat && lat_lon?.lng) {
    idx_marker.value = L.marker(lat_lon).addTo(initialMap.value as L.Map)
  }
})

watch(selected_glider, () => {
  console.log("Updating glider track")
  set_glider_track()
  draw_glider_to_ship_line()
})

watch(selected_fence, () => {
  if (selected_fence.value && initialMap.value) {
    try {
      // compute polygon centroid using shoelace formula for better centering
      const pts = selected_fence.value.latlons
        .filter((p) => p && p.lat !== null && p.lng !== null)
        .map((p) => ({ x: p.lng, y: p.lat })) // x=lon, y=lat

      if (pts.length < 1) return

      let area = 0
      let cx = 0
      let cy = 0
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        const a = pts[i]!.x * pts[j]!.y - pts[j]!.x * pts[i]!.y
        area += a
        cx += (pts[i]!.x + pts[j]!.x) * a
        cy += (pts[i]!.y + pts[j]!.y) * a
      }
      area = area / 2
      if (Math.abs(area) < 1e-9) {
        // fallback to simple average if degenerate
        let sumx = 0
        let sumy = 0
        pts.forEach((p) => {
          sumx += p.x
          sumy += p.y
        })
        const avgx = sumx / pts.length
        const avgy = sumy / pts.length
        initialMap.value.setView([avgy, avgx])
        // console.log(avgx + "," + avgy)
        console.log(`Set view to ${avgy}, ${avgx}`)
      } else {
        cx = cx / (6 * area)
        cy = cy / (6 * area)
        initialMap.value.setView([cy, cx])
        console.log(cx + "," + cy)
      }
    } catch (error) {
      console.log("Failed to center view on geofence")
      console.log(error)
    }
  }
})

const geofences_filtered = computed(() => {
  const ret: {key: string, latlons: Latlon[]}[] = []
  Object.keys(geofences.value).forEach((key) => {
    const lat_lon_filtered: Latlon[] = []
    geofences.value[key]?.latlons.forEach((element) => {
      if (element.lat && element.lng) {
        lat_lon_filtered.push(element)
      }
    })
    ret.push({ key: key, latlons: lat_lon_filtered })
  })
  return ret
})

watch(gliders, (new_val) => {
  if (!new_val.length) return
  const stillExists = new_val.some((g) => g._id === gliderStore.selected_glider_id)
  if (!stillExists) {
    gliderStore.select_glider((new_val[0] as Glider)._id)
  }
})

</script>
<template>
  <div>
    <div>
      <div id="map"></div>
    </div>
    <div id="slider">
      <div class="slider-flex" id="slider-header">
      <div class="slider-flex" id="slider-lhs">
          <p>Ship predictor minute offset:</p>
          <p v-if="boat_slide_time_offset != 0">+{{ boat_slide_time_offset }} minutes</p>
          <p v-else>Current Time</p>
      </div>
      <div id="slider-rhs">
        <button @click="boat_slide_time_offset = 0" id="current-time-btn" class="border">Set to current time</button>
      </div>
      </div>
      <input style="width: 100%;" type="range" :min="boat_slider_min" :max="boat_slider_max" v-model="boat_slide_time_offset">
    </div>
  </div>
</template>

<style scoped>
#map {
  width: 500px;
  height: 614px;
}
#current-time-btn {
  padding: .1rem;
}
#current-time-btn:hover {
 border-color: var(--color-border-hover);
}
#slider-lhs {
  margin-top: auto;
  margin-bottom: auto;
}
#slider {
margin-top: .2rem;
}
.slider-flex {
  display: flex;
  justify-content: space-between;

}
#slider-header p{
  margin-right: .5rem;
}

:deep(.boat-arrow-marker) {
  background: transparent;
  border: 0;
}

:deep(.boat-arrow) {
  display: block;
  position: relative;
  width: 30px;
  height: 30px;
  transform-origin: center;
}

:deep(.boat-arrow::before) {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 22px solid #1fb655;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .45));
  transform: translateX(-50%);
}

:deep(.boat-arrow::after) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 6px;
  height: 12px;
  background: #137a39;
  border-radius: 999px;
  transform: translateX(-50%);
}
</style>
