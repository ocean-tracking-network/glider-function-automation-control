<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import FilesBoxComponent from './FilesBoxComponent.vue';
import AddGeoFenceComponent from './AddGeoFenceComponent.vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { useEventsStore } from '@/stores/events';
import { storeToRefs } from 'pinia';
import { useGlidersStore } from '@/stores/gliders';

const store = useGeoFencesStore()
const eventsStore = useEventsStore()
const gliderStore = useGlidersStore()
const geofence_editor = ref(false);
const selected_fence_local = ref("")
const just_removed = ref(false)

const { geofences, selected_fence } = storeToRefs(store)
const { selected_glider } = storeToRefs(gliderStore)

function add_geo() {
  geofence_editor.value = true
}

function back(save) {
  if (save) {
    store.saveOrUpdateGeofence()
  }
  else {
    store.getGeofences()
  }
  geofence_editor.value = false
  store.deselect()
  selected_fence_local.value = ""
}

function on_click(e) {
  if (just_removed.value) {
    just_removed.value = false;
    return
  }
  selected_fence_local.value = e.key
  geofence_editor.value = true
  store.select(e.key)
  //console.log("ONCLICK")
}

function remove(element) {
  const id = Object.keys(geofences.value)[element]
  back(false)
  just_removed.value = true
  store.deleteGeofence(id)
}

const latlons = computed(() => {
  let ret = []
  Object.keys(geofences.value).forEach((key, index) => {
    let new_obj = {
      ...geofences.value[key]
    }
    let name = geofences.value[key].name
    if (selected_glider.value && eventsStore.glider_has_geofence_event(selected_glider.value._id, key)) {
      name = "* " + name
    }
    ret.push({
      ...new_obj,
      key: key,
      bold: (selected_glider.value && eventsStore.glider_has_geofence_event(selected_glider.value._id, key))
    })
  })
  return ret;
})

watch(selected_fence, (new_val) => {
  selected_fence_local.value = new_val
  if (new_val != '') {
    geofence_editor.value = true
  }
})

</script>
<template>
  <div>
    <FilesBoxComponent v-if="geofence_editor == false" @delete="remove" @add_btn="add_geo()" @click="on_click"
      :list="latlons" :draggable="false" title="Geofences" id="geo" />

    <div class="border2 border" v-if="geofence_editor == true">
      <AddGeoFenceComponent @back="back" :fenceKey="selected_fence_local" />
    </div>
  </div>
</template>
<style scoped>
.border2 {
  height: 15rem;
  /* overflow-y: scroll; */
}

#geo {
  height: 100%;
}
</style>
