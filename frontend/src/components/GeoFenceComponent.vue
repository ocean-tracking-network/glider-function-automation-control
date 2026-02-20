<script setup>

import { computed, nextTick, ref, watch } from 'vue';
import FilesBoxComponent from './FilesBoxComponent.vue';
import AddGeoFenceComponent from './AddGeoFenceComponent.vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { useEventsStore } from '@/stores/events';
import { storeToRefs } from 'pinia';
import { useGlidersStore } from '@/stores/gliders';
import { useUserStore } from '@/stores/user';

const store = useGeoFencesStore()
const eventsStore = useEventsStore()
const gliderStore = useGlidersStore()
const userStore = useUserStore()
const geofence_editor = ref(false);
const selected_fence_local = ref("")
const just_removed = ref(false)

const { geofences, selected_fence } = storeToRefs(store)
const { selected_glider } = storeToRefs(gliderStore)

//GET USER ROLE FROM STORED USER
const { isAdmin } = storeToRefs(userStore)

//ADD GEOFENCE RESTRICTED TO ADMIN
function add_geo() {
  if (!isAdmin.value) {
    return
  }
  geofence_editor.value = true
}

//SAVE RESTRICTED TO ADMIN
function back(save) {
  if (!isAdmin.value) {
    save = false
  }
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

//RESTRICT REMOVE TO ADMIN
function remove(element) {
  if (!isAdmin.value) {
    return
  }
  back(false)
  just_removed.value = true
  if (confirm("WARNING!\nAre you sure you want to remove this geofence?") == true) {

    store.deleteGeofence(element.key)
  }
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


//UI/UX DRIVEN BY isAdmin WHERE NEEDED
</script>
<template>
  <div>
    <FilesBoxComponent v-if="geofence_editor == false" @delete="remove" @add_btn="add_geo()" @click="on_click"
      :list="latlons" :draggable="false" :add_btn="isAdmin" :can_delete="isAdmin" :standard_delete="isAdmin"
      title="Geofences" id="geo" />

    <div class="border2 border" v-if="geofence_editor == true">
      <AddGeoFenceComponent @back="back" :fenceKey="selected_fence_local" :canEdit="isAdmin" />
    </div>
  </div>
</template>
<style scoped>
.border2 {
  height: 15rem;
}

#geo {
  height: 100%;
}
</style>
