<script setup>
import { computed, onBeforeMount, ref, useTemplateRef, watch } from 'vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { storeToRefs } from 'pinia';
import { useFilesStore } from '@/stores/files';
import { useDropZone } from '@vueuse/core'


const filesStore = useFilesStore()
const store = useGeoFencesStore()
const { geofences, interactive_map, selected_fence, selected_kml_geo_json } = storeToRefs(store)
const uploadKmlFile = useTemplateRef('uploadKmlFile')
const dropZoneRef = useTemplateRef('dropZoneRef')

const props = defineProps({
  fenceKey: String
})

const emit = defineEmits(["geofenceupdate", "back"])

const fence_key = ref("")
const lock_fence = ref(true)

onBeforeMount(() => {
  if (props.fenceKey) {
    fence_key.value = props.fenceKey
    let latlons = selected_fence.value.latlons
    if (latlons.length == 0 || (latlons[latlons.length - 1][0] || latlons[latlons.length - 1][1])) {
      selected_fence.value.latlons.push([,])
    }
  }
  else {
    lock_fence.value = false
    fence_key.value = store.add("")
    store.select(fence_key.value)
    geofences.value[fence_key.value].latlons.push([,])
  }
})

function on_input() {
  let latlons = selected_fence.value.latlons
  const idx = latlons.length - 1
  if (latlons[idx][0] || latlons[idx][1]) {
    selected_fence.value.latlons.push([,])
  }
}

function focus_out(idx) {
  let latlons = selected_fence.value.latlons
  let geofence = selected_fence.value
  if (idx == latlons.length - 1) {
    return
  }
  if (!latlons[idx][0] && !latlons[idx][1]) {
    latlons.splice(idx, 1)
    geofence.latlons = latlons
    store.set_geofence(store.selected_fence_key, geofence)
  }
}

function focus_in(idx) {
  store.select_idx(idx)
}

function onDrop(files) {
  filesStore.upload_kml_file(null, files)
}

function remove_idx(idx) {
  if (!lock_fence.value) {
    selected_fence.value.latlons.splice(idx, 1)
  }
}

const overflowed = computed(() => {
  if (selected_fence.value.latlons.length >= 6) {
    return true
  }
  return false
})

const back_display = computed(() => {
  return lock_fence.value ? "Back" : "Save/Back"
})

watch(geofences.value, async (new_fence, old_fence) => {
  on_input()
})

watch(fence_key, () => {
  console.log(fence_key.value)
})

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop,
  // dataTypes: ['.kml'],
  multiple: false,
  // whether to prevent default behavior for unhandled events
  preventDefaultForUnhandled: false,
})

</script>
<template>
  <div class="geofence-container">
    <div class="main-container">
      <div class="header">
        <button id="back-btn" class="border" @click="emit('back', !lock_fence)">{{ back_display }}</button>
        <input :disabled="lock_fence" class="text-input" id="name-input" v-model="selected_fence.name"
          placeholder="Name" type="text">
      </div>
      <div class="lat-lon-container">
        <div id="main-container" :class="{ overflow: overflowed }">
          <div class="inputs" v-for="(lat_lon, index) in selected_fence.latlons" :key="'lat_lon-' + index">
            <p id="index">{{ index }}</p>
            <input :disabled="lock_fence" class="text-input latlon" @focusout="focus_out(index)"
              @focusin="focus_in(index)" @input="on_input()" v-model="lat_lon[0]" placeholder="lat" type="text" name=""
              id="" />
            <p>:</p>
            <input :disabled="lock_fence" class="text-input latlon" @focusout="focus_out(index)"
              @focusin="focus_in(index)" @input="on_input()" v-model="lat_lon[1]" placeholder="lon" type="text" name=""
              id="" />
            <button class="x-btn" @click="remove_idx(index)" v-if="index < selected_fence.latlons.length - 1">x</button>
          </div>
        </div>
      </div>
    </div>
    <div class="controls-container">
      <div>
        <input v-model="lock_fence" id="lock" type="checkbox">
        <label for="lock" class="label">Lock</label>
      </div>
      <div>
        <input :disabled="lock_fence" v-model="selected_fence.notify" id="notify" type="checkbox">
        <label class="label" for="map-interact">Notify when glider enters/leaves</label>
      </div>
      <div>
        <input :disabled="lock_fence" v-model="interactive_map" id="map-interact" type="checkbox">
        <label class="label" for="map-interact">Enable interactive map</label>
      </div>
      <div class="border upload-kml-container" ref="dropZoneRef">
        <div v-if="!selected_kml_geo_json" class="upload-kml-dropzone">
          <button :class="{ overDropZone: isOverDropZone }" @click="uploadKmlFile.click()">
            <div v-if="!isOverDropZone">
              <p>Click or Drop</p>
              <p>a KML File here</p>
            </div>
            <div v-else>Drop it</div>
          </button>
          <input type="file" class="upload-kml-input" accept=".kml" ref="uploadKmlFile"
            @change="filesStore.upload_kml_file" />
        </div>
        <div v-else class="uploaded-kml-coordinates-selector-contianer">
          <div class="uploaded-kml-coordinates-selector-inner-contianer">
            <div class="kml-file-placemark-card" v-for="(geofence, index) in selected_kml_geo_json"
              :key="geofence.placemark + index">
              <div class="kml-file-placemark-card-placemark">
                <span><b>Placemark:</b></span>
                <p>{{ geofence.placemark }}</p>
              </div>
              <div class="kml-file-placemark-card-type">
                <span><b>Type:</b></span>
                <p>{{ geofence.type }}</p>
              </div>
              <div class="kml-file-placemark-card-coordinates">
                <span><b>Coordinates:</b></span>
                <p>#{{ geofence.coordinates.length ?? 0 }}</p>
              </div>
              <button :disabled="!geofence.isValid" class="border"
                @click="store.apply_coordinates_from_kml_file(geofence.coordinates)">Apply</button>
            </div>
          </div>
          <button class="remove x-btn" @click="filesStore.clear_kml_file">
            x
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.geofence-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 4px;
}

.main-container {
  flex: 60%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header {
  display: flex;
  flex-direction: row;
  gap: 4px;
}

#name-input {
  margin: 0px auto;
}

.lat-lon-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.controls-container {
  flex: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 4px;
}

.upload-kml-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.upload-kml-dropzone button {
  border: 0.5px dotted lightgray;
  padding: 16px;
  border-radius: 4px;
}

.overDropZone {
  transition: .5s;
  border: 1px dotted lightgreen !important;
  padding: 30px;
}

.upload-kml-container p {
  text-align: center;
  position: relative;
}

.upload-kml-input {
  visibility: hidden;
  position: absolute;
}

.uploaded-kml-coordinates-selector-contianer {
  width: 100%;
  height: 100%;
  position: relative;
}

.uploaded-kml-coordinates-selector-contianer .remove {
  position: absolute;
  top: -4px;
  right: -4px;
  border: 1px solid lightgray;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  background-color: white;
}

.uploaded-kml-coordinates-selector-inner-contianer {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kml-file-placemark-card {
  width: 100%;
  padding: 8px;
  color: var(--color-text);
  border-color: lightgray;
  border-width: 1px;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  gap: 8px;
}

.kml-file-placemark-card button {
  padding: 4px 2px;
}

.kml-file-placemark-card button:hover {
  transition: .2s;
  border-color: lightblue;
}

.kml-file-placemark-card button:disabled {
  background-color: lightgray;
  opacity: .4;
  border-color: lightgray;
}

.kml-file-placemark-card-placemark,
.kml-file-placemark-card-type,
.kml-file-placemark-card-coordinates {
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
}

.inputs {
  display: flex;
  flex-wrap: nowrap;
  gap: .3rem;
  width: 16rem;
  flex-basis: 20%;
  margin-right: 1rem;
}

#index {
  min-width: 1rem;
}

.latlon {
  width: 6rem;
}

#main-container {
  width: 10%;
  height: 10rem;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
}

.overflow {
  overflow: scroll;
  width: 100% !important;
}

.label {
  margin: .5rem;
}

.text-input {
  /* width: 8rem;
  background-color: lightgray;
  color: black;
  */
  margin-bottom: .5rem;
  padding: .1rem;
  /* background-color: black; */
  background-color: var(--color-background-soft);
  border-radius: 3px;
  /* color: lightgray; */
  color: var(--color-text);
  border-color: lightgray;
  border-width: 1px;
}

#name input {
  margin-left: .5rem;
}

#name {
  display: flex;
  justify-content: space-between;
  margin-bottom: .5rem;
}

button {
  transition: .2s;
}

#back-btn:hover {
  transition: .2s;
  border-color: lightblue;
}

#back-btn {
  width: 5rem;
}

.x-btn:hover {
  transition: .2s;
  color: red;
}

.x-btn {
  height: 1px;
}

#name-input {
  /* height: 100%; */
  min-width: 12rem;
  /* font-size: x-large; */
  text-align: center;
}

.overflow-child {
  height: 40rem;
}

input:disabled {
  background-color: var(--color-background);
}
</style>
