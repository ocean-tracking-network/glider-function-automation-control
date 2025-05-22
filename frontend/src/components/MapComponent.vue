<script setup>
import "leaflet/dist/leaflet.css"
import * as L from 'leaflet'
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useGeoFencesStore } from "@/stores/geofences";
import { storeToRefs } from "pinia";
import { useGlidersStore } from "@/stores/gliders";
import slocum1 from "@/assets/slocum_marker.png";
import waypointIcon from "@/assets/target-opaque-32x32.png"

const store = useGeoFencesStore();
const gliderStore = useGlidersStore();

const initialMap = ref()
const polygons = ref([])
const polygon_to_geofence_map = ref({})
const idx_marker = ref(null)

const glider_track_polyline = ref(null)
const glider_track_points = ref(null)
const glider_current_location = ref(null)
const glider_next_waypoint = ref(null)


const { selected_idx, force_map_update, geofences, interactive_map, selected_fence } = storeToRefs(store)
const { selected_glider, gliders } = storeToRefs(gliderStore)

function create_polygons() {
  let index = 0
  geofences_filtered.value.forEach((geofence) => {
    let options = {}
    if (index == Object.keys(store.geofences).indexOf(store.selected_fence_key)) {
      options.color = "orange"
      console.log("red?")
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
  console.log(e)
  store.select(polygon_to_geofence_map.value[e.target._leaflet_id])
}

function set_glider_track() {
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
  let tracks = []
  glider_track_points.value = []
  console.log(typeof (selected_glider.value.track[0]))
  // for(let i=0; i < )
  selected_glider.value.track.forEach((element) => {
    tracks.push([element[0] / 100, element[1] / 100])
    glider_track_points.value.push(
      L.circle([element[0] / 100, element[1] / 100], { radius: 100, stroke: false, color: 'red' })
        .addTo(initialMap.value).bindPopup("<b>100 meters</b>")

    )
  })
  let slocum_icon = L.icon({
    iconUrl: slocum1,
    iconSize: [37, 61],
    iconAnchor: [18, 61],
  })
  glider_track_polyline.value = L.polyline(tracks, { color: 'red' }).addTo(initialMap.value)
  glider_current_location.value = L.marker(tracks[tracks.length - 1], { icon: slocum_icon }).addTo(initialMap.value)
  initialMap.value.setView(tracks[tracks.length - 1])
  if (selected_glider.value.next_waypoint) {
    let waypoint_icon = L.icon({
      iconUrl: waypointIcon,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    glider_next_waypoint.value = L.marker(selected_glider.value.next_waypoint, { icon: waypoint_icon }).addTo(initialMap.value)
  }
}

function map_click(e) {
  if (store.selected_fence && interactive_map.value) {
    // store.selected_fence
    // //console.log(e.latlng)
    geofences.value[store.selected_fence_key].latlons[geofences.value[store.selected_fence_key].latlons.length - 1] = [e.latlng.lat, e.latlng.lng]
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


  // draggable_marker.value = L.marker([47, -60], { draggable: true }).addTo(initialMap.value)
  // draggable_marker.value.on('drag', on_marker_drag)
})

function update_map() {
  //console.log("Map Update")
  polygons.value.forEach((poly) => {
    poly.removeFrom(initialMap.value)
  })
  polygons.value = []
  create_polygons()
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
  console.log("Updaing glider track")
  set_glider_track()
})

watch(selected_fence, () => {
  if (selected_fence.value) {
    let avg_lat = 0
    let avg_lon = 0
    selected_fence.value.latlons.forEach((ele) => {
      if (ele[0] && ele[1]) {
        avg_lat += ele[0]
        avg_lon += ele[1]
      }
    })
    avg_lat = avg_lat / (selected_fence.value.latlons.length - 1)
    avg_lon = avg_lon / (selected_fence.value.latlons.length - 1)
    console.log(avg_lat)
    console.log(avg_lon)
    initialMap.value.setView([avg_lat, avg_lon])
  }
})


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

</script>
<template>
  <div>
    <div style="height: 750px; width: 800px;" id="map"></div>
  </div>
</template>
