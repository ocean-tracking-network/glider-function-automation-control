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
const is_create_mode = ref(false)
const just_removed = ref(false)
const drawerWidth = ref(370)
const isResizing = ref(false)

const { geofences, selected_fence } = storeToRefs(store)
const { selected_glider } = storeToRefs(gliderStore)

//GET USER ROLE FROM STORED USER
const { isAdmin } = storeToRefs(userStore)

//CLOSE DRAWER ON LOGOUT
watch(() => userStore.loggedin, (new_val) => {
  if (!new_val) {
    geofence_editor.value = false
  }
})

//ADD GEOFENCE RESTRICTED TO ADMIN
function add_geo() {
  if (!isAdmin.value) {
    return
  }
  is_create_mode.value = true
  const hasSelectedGeofence = selected_fence_local.value !== "" || selected_fence.value !== ""
  selected_fence_local.value = ""
  store.deselect()

  if (geofence_editor.value && hasSelectedGeofence) {
    geofence_editor.value = false
    nextTick(() => {
      geofence_editor.value = true
    })
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
  is_create_mode.value = false
  store.deselect()
  selected_fence_local.value = ""
}

function on_click(e) {
  if (just_removed.value) {
    just_removed.value = false;
    return
  }
  is_create_mode.value = false
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

function startResize(e) {
  isResizing.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e) {
  if (!isResizing.value) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= 200 && newWidth <= 800) {
    drawerWidth.value = newWidth
  }
}

function stopResize() {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
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
  if (is_create_mode.value) {
    return
  }
  selected_fence_local.value = new_val
  if (new_val != '') {
    is_create_mode.value = false
    geofence_editor.value = true
  }
})


//UI/UX DRIVEN BY isAdmin WHERE NEEDED
</script>
<template>
  <div class="geofence-section">
    <div class="geofence-list">
      <FilesBoxComponent @delete="remove" @add_btn="add_geo" @click="on_click"
        :list="latlons" :draggable="false" :add_btn="isAdmin" :can_delete="isAdmin" :standard_delete="isAdmin"
        title="Geofences" id="geo" />
    </div>


    <transition name="slide-drawer">
      <div v-if="geofence_editor" class="drawer-overlay">
        <div class="drawer-panel" :style="{ width: drawerWidth + 'px' }" @click.stop>
          <div class="resize-handle" @mousedown="startResize"></div>
          <div class="drawer-header">
            <h2 class="drawer-title">{{ is_create_mode ? 'Create Geofence' : (selected_fence_local ? 'Edit Geofence' : 'Create Geofence') }}</h2>
            <button class="drawer-close-btn" @click="back(false)" aria-label="Close drawer">
              <span>&times;</span>
            </button>
          </div>
          <div class="drawer-content">
            <AddGeoFenceComponent @back="back" :fenceKey="selected_fence_local" :canEdit="isAdmin" />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
<style scoped>
.geofence-section {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.geofence-list { flex: 1; height: 100%; overflow: hidden; }
#geo { height: 100%; }

.drawer-panel {
  position: fixed;
  top: 8px;
  right: 8px;
  height: calc(100vh - 16px);
  background-color: var(--color-background);
  border-left: 1px solid var(--color-border, lightgray);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
  z-index: 1000;
  pointer-events: auto;
  border-radius: 4px;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  background-color: transparent;
  z-index: 1001;
  transition: background-color 0.2s;
  user-select: none;
}

.resize-handle:hover {
  background-color:grey }

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--color-border, lightgray);
  flex-shrink: 0;
}

.drawer-title { margin: 0; color: var(--color-text); font-size: 1.25rem; font-weight: 600; }

.drawer-close-btn {
  font-size: 2rem;
  cursor: pointer;
  color: var(--color-text);
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

</style>
