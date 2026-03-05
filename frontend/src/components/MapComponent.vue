<script setup>
import "leaflet/dist/leaflet.css"
import * as L from 'leaflet'
import { computed, onMounted, ref, watch } from "vue";
import { useGeoFencesStore } from "@/stores/geofences";
import { storeToRefs } from "pinia";
import { useGlidersStore } from "@/stores/gliders";
import slocum1 from "@/assets/slocum_marker.png";
import waypointIcon from "@/assets/target-opaque-32x32.png"
import { useUserStore } from "@/stores/user";

const store = useGeoFencesStore();
const gliderStore = useGlidersStore();
const userStore = useUserStore();

const initialMap = ref()
const polygons = ref([])
const polygon_to_geofence_map = ref({})
const idx_marker = ref(null)

const glider_track_polyline = ref(null)
const glider_track_points = ref(null)
const glider_current_location = ref(null)
const glider_next_waypoint = ref(null)

const all_glider_markers = ref([])


const { selected_idx, force_map_update, geofences, interactive_map, selected_fence } = storeToRefs(store)
const { selected_glider, gliders } = storeToRefs(gliderStore)
const { isAdmin } = storeToRefs(userStore)

// SFMC outputs in an annoying format compared to what leaflet wants
//  (Degrees decimal minutes -> Decimal degrees), so (4932.822) is actually 49* 32.822'
function convert_gps(val) {
  let degrees = Math.floor(val / 100)
  if (val < 0) {
    degrees = Math.ceil(val / 100)
  }
  const deci_minutes = ((val / 100) - degrees) * 100
  const ret = degrees + (deci_minutes / 60)
  return ret
}

function generate_geojson(latlons) {
  let geo_json = []
  for (let i = 0; i < latlons.length - 1; i++) {
    const new_json = {
      "type": "Feature",
      "properties": { "line_num": i },
      "geometry": { "type": "LineString", "coordinates": [[latlons[i][1], latlons[i][0]], [latlons[i + 1][1], latlons[i + 1][0]]] } //WHY IS IT IN LON:LAT FORMAT!
    }
    geo_json.push(new_json)
  }
  return geo_json
}

function get_geojson_opacity(line_num, total_num) {
  const min = 0
  const normalized = (line_num - min) / (total_num - min)
  return normalized + .1
}

function create_polygons() {
  let index = 0
  geofences_filtered.value.forEach((geofence) => {
    let options = {}
    if (geofence.key === store.selected_fence_key) {
      options.color = "orange"
      //CHANGE #JS0002
      // console.log("red?")
      //END CHANGE #JS0002
    }
    index++
    let new_polygon = L.polygon(geofence.latlons, options)
      .on("click", on_polygon_click)
      .addTo(initialMap.value)
    polygon_to_geofence_map.value[new_polygon._leaflet_id] = geofence.key
    polygons.value.push(new_polygon)
  })
}

const on_polygon_click = (e) => {
  store.select(polygon_to_geofence_map.value[e.target._leaflet_id])
}

function set_glider_track() {
  if (!selected_glider.value) return
  if (!Array.isArray(selected_glider.value.track)) return

  if (glider_track_polyline.value != null) {
    glider_track_polyline.value.removeFrom(initialMap.value)
    glider_track_points.value.forEach((ele) => {
      ele.removeFrom(initialMap.value)
    })
    if (typeof (glider_current_location.value) == Array) {
      glider_current_location.value.forEach((ele) => {
        ele.removeFrom(initialMap.value)
      })
    } else {
      glider_current_location.value.removeFrom(initialMap.value)
    }
  }
  if (glider_next_waypoint.value != null) {
    glider_next_waypoint.value.removeFrom(initialMap.value)
  }
  if (all_glider_markers.value.length > 0) {
    all_glider_markers.value.forEach((glider_marker) => {
      glider_marker.removeFrom(initialMap.value)
    })
    all_glider_markers.value = []
  }
  let tracks = []
  glider_track_points.value = []
  console.log(typeof (selected_glider.value.track[0]))
  selected_glider.value.track.forEach((element) => {
    tracks.push([convert_gps(element.lat), convert_gps(element.lon)])
    glider_track_points.value.push(
      L.circle([convert_gps(element.lat), convert_gps(element.lon)], { radius: 200, stroke: false, color: 'red' })
        .addTo(initialMap.value).bindPopup(`<b>${element.date}</b><p>200m</p>`)
    )
  })

  let slocum_icon = L.icon({
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
          opacity: get_geojson_opacity(feature.properties.line_num, tracks.length),
          color: "red"
        }
      }
    }).addTo(initialMap.value)
    glider_current_location.value = L.marker(tracks[tracks.length - 1], { icon: slocum_icon }).addTo(initialMap.value)
    initialMap.value.setView(tracks[tracks.length - 1])
  }
  if (selected_glider.value.next_waypoint) {
    let waypoint_icon = L.icon({
      iconUrl: waypointIcon,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    const waypoint = selected_glider.value.next_waypoint
    glider_next_waypoint.value = L.marker([convert_gps(waypoint[0]), convert_gps(waypoint[1])], { icon: waypoint_icon }).addTo(initialMap.value)
  }
  let i = 0
  gliderStore.gliders.forEach((glider) => {
    if (selected_glider.value && glider._id != selected_glider._id && glider_has_track(glider)) {
      const current_pos = [convert_gps(glider.track[glider.track.length - 1].lat), convert_gps(glider.track[glider.track.length - 1].lon)]
      const new_marker = L.marker(current_pos, { icon: slocum_icon, opacity: .4 })
        .on("click", () => { gliderStore.select_glider(glider._id) })
        .addTo(initialMap.value)
      all_glider_markers.value.push(new_marker)
    }
    i++
  })
}

function map_click(e) {
  if (!isAdmin.value) {
    return
  }
  if (store.selected_fence && interactive_map.value) {
    // store.selected_fence
    // //console.log(e.latlng)
    const lat = e.latlng.lat.toFixed(4)
    const lon = e.latlng.lng.toFixed(4)
    if (store.selected_fence_key && geofences.value[store.selected_fence_key]) {
      const fence = geofences.value[store.selected_fence_key]
      fence.latlons[fence.latlons.length - 1] = [lat, lon]
    }
  }

}

onMounted(() => {
  initialMap.value = L.map('map').setView([47.627146, -59.913357], 9)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(initialMap.value);
  initialMap.value.on('click', map_click)
  create_polygons()
})

function update_map() {
  //console.log("Map Update")
  polygons.value.forEach((poly) => {
    poly.removeFrom(initialMap.value)
  })
  polygons.value = []
  create_polygons()
}

function glider_has_track(glider) {
  return (glider.track && glider.track.length > 0)
}

watch(geofences, async (new_fence, old_fence) => {
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
    idx_marker.value.removeFrom(initialMap.value)
    idx_marker.value = null
  }
  if (store.selected_fence) {
    const lat_lon = store.selected_fence.latlons[new_idx]
    if (lat_lon[0] && lat_lon[1]) {
      idx_marker.value = L.marker(lat_lon).addTo(initialMap.value)
    }
  }
})

watch(selected_glider, () => {
  console.log("Updating glider track")
  set_glider_track()
})

//BEGIN CHANGES #JS0001
watch(selected_fence, () => {
  if (selected_fence.value) {
    try {
      // compute polygon centroid using shoelace formula for better centering
      const pts = selected_fence.value.latlons
        .filter((p) => p && p[0] !== undefined && p[1] !== undefined)
        .map((p) => ({ x: parseFloat(p[1]), y: parseFloat(p[0]) })) // x=lon, y=lat

      if (pts.length < 1) return

      let area = 0
      let cx = 0
      let cy = 0
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        const a = pts[i].x * pts[j].y - pts[j].x * pts[i].y
        area += a
        cx += (pts[i].x + pts[j].x) * a
        cy += (pts[i].y + pts[j].y) * a
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
        console.log(avgx + "," + avgy)
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
//END CHANGES #JS0001


const geofences_filtered = computed(() => {
  let ret = []
  Object.keys(geofences.value).forEach((key, index) => {
    let lat_lon_filtered = []
    geofences.value[key].latlons.forEach((element) => {
      if (element[0] && element[1]) {
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
    gliderStore.select_glider(new_val[0]._id)
  }
})

</script>
<template>
  <div id="map"></div>
</template>

<style scoped>
#map {
  width: 500px;
  height: 614px;
  /* height: 300px; */
}
</style>
