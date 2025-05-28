<script setup>
import { computed, onBeforeMount, onMounted, ref, watch } from 'vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { storeToRefs } from 'pinia';

const store = useGeoFencesStore()
const { geofences, interactive_map, selected_fence } = storeToRefs(store)
const props = defineProps({
  fenceKey: String
})

const emit = defineEmits(["geofenceupdate", "back"])

const fence_key = ref("")
const lock_fence = ref(true)

onBeforeMount(() => {
  if (props.fenceKey) {
    console.log("BEFORE MOUNT")
    //console.log("FENCE KEY FOUND")
    fence_key.value = props.fenceKey
    let latlons = selected_fence.value.latlons
    if (latlons.length == 0 || (latlons[latlons.length - 1][0] || latlons[latlons.length - 1][1])) {
      selected_fence.value.latlons.push([,])
    }
  }
  else {
    console.log("NO FENCE KEY")
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

function remove_idx(idx) {
  selected_fence.value.latlons.splice(idx, 1)
}

const overflowed = computed(() => {
  if (selected_fence.value.latlons.length >= 9) {
    return true
  }
  return false
})

const back_display = computed(() => {
  return lock_fence.value ? "Back" : "Save/Back"
})

watch(geofences.value, async (new_fence, old_fence) => {
  //console.log("HELLO?")
  on_input()
})

watch(fence_key, () => {
  console.log("FENCE KEY CHANGED!!!")
  console.log(fence_key.value)
})

</script>
<template>
  <div>
    <div id="name">
      <div>
        <button id="back-btn" class="border" @click="emit('back', !lock_fence)">{{ back_display }}</button>
        <input v-model="lock_fence" id="lock" type="checkbox" class="label">
        <label for="lock">Lock</label>
      </div>
      <input :disabled="lock_fence" class="text-input" id="name-input" v-model="selected_fence.name" placeholder="Name"
        type="text">
      <div>
        <div>
          <input :disabled="lock_fence" v-model="selected_fence.notify" id="notify" type="checkbox">
          <label class="label" for="map-interact">Notify when glider enters/leaves</label>
        </div>
        <div>
          <input :disabled="lock_fence" v-model="interactive_map" id="map-interact" type="checkbox">
          <label class="label" for="map-interact">Enable interactive map</label>
        </div>

      </div>
    </div>
    <div id="main-container" :class="{ overflow: overflowed }">
      <div class="inputs" v-for="(lat_lon, index) in selected_fence.latlons">
        <p id="index">{{ index }}</p>
        <input :disabled="lock_fence" class="text-input latlon" @focusout="focus_out(index)" @focusin="focus_in(index)"
          @input="on_input()" v-model="lat_lon[0]" placeholder="lon" type="text" name="" id="" />
        <p>:</p>
        <input :disabled="lock_fence" class="text-input latlon" @focusout="focus_out(index)" @focusin="focus_in(index)"
          @input="on_input()" v-model="lat_lon[1]" placeholder="lat" type="text" name="" id="" />
        <button class="x-btn" @click="remove_idx(index)" v-if="index < selected_fence.latlons.length - 1">x</button>
      </div>
      <!-- <div class="inputs">
      <input @input="on_input()" v-model="current_lat" placeholder="lon" type="text" name="" id="" />
      <p>:</p>
      <input v-model="current_lon" placeholder="lat" type="text" name="" id="" />
    </div> -->
    </div>
  </div>
</template>
<style scoped>
.inputs {
  display: flex;
  flex-wrap: nowrap;
  gap: .5rem;
  width: 20rem;
  flex-basis: 20%;
  margin-right: 1rem;
}

#index {
  min-width: 1rem;
}

.latlon {
  width: 8rem;
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
  background-color: black;
  border-radius: 3px;
  color: lightgray;
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
  width: 6rem;
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
  font-size: x-large;
  text-align: center;
}

.overflow-child {
  height: 40rem;
}
</style>
