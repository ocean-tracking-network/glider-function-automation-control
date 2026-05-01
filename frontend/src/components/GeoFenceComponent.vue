<script setup>

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FilesBoxComponent from './FilesBoxComponent.vue';
import AddGeoFenceComponent from './AddGeoFenceComponent.vue';
import ModalComponent from './ModalComponent.vue';
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
const show_close_confirm_modal = ref(false)
const geofence_is_dirty = ref(false)
const pending_fence_key = ref(null)
const pending_from_map = ref(false)
const emit = defineEmits(['drawer-offset-change'])

const { geofences, selected_fence, selected_fence_key } = storeToRefs(store)
const { selected_glider } = storeToRefs(gliderStore)

//GET USER ROLE FROM STORED USER
const { isAdmin } = storeToRefs(userStore)

//CLOSE DRAWER ON LOGOUT
watch(() => userStore.loggedin, (new_val) => {
  if (!new_val) {
    geofence_editor.value = false
    geofence_is_dirty.value = false
    show_close_confirm_modal.value = false
  }
})

//ADD GEOFENCE RESTRICTED TO ADMIN
function add_geo() {
  if (!isAdmin.value) {
    return
  }
  is_create_mode.value = true
  geofence_is_dirty.value = false
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
  let savePromise = Promise.resolve()
  if (save) {
    savePromise = store.saveOrUpdateGeofence() || Promise.resolve()
  }
  else {
    savePromise = store.getGeofences() || Promise.resolve()
  }
  return savePromise.then(() => {
    geofence_editor.value = false
    is_create_mode.value = false
    geofence_is_dirty.value = false
    show_close_confirm_modal.value = false
    store.deselect()
    selected_fence_local.value = ""
  })
}

function request_close_drawer() {
  if (!geofence_is_dirty.value) {
    back(false)
    return
  }

  show_close_confirm_modal.value = true
}

function confirm_close_save() {
  if (pending_from_map.value) {
    const savePromise = store.saveOrUpdateGeofence() || Promise.resolve()
    savePromise.then(() => {
      is_create_mode.value = false
      geofence_is_dirty.value = false
      selected_fence_local.value = pending_fence_key.value
      store.select(pending_fence_key.value)
      pending_fence_key.value = null
      pending_from_map.value = false
      show_close_confirm_modal.value = false
    })
  } else {
    back(true).then(() => {
      if (pending_fence_key.value) {
        is_create_mode.value = false
        geofence_is_dirty.value = false
        selected_fence_local.value = pending_fence_key.value
        if (!pending_from_map.value) {
          geofence_editor.value = true
        }
        store.select(pending_fence_key.value)
        pending_fence_key.value = null
        pending_from_map.value = false
      }
    })
  }
}

function confirm_close_discard() {
  if (pending_from_map.value) {
    const reloadPromise = store.getGeofences() || Promise.resolve()
    reloadPromise.then(() => {
      is_create_mode.value = false
      geofence_is_dirty.value = false
      selected_fence_local.value = pending_fence_key.value
      store.select(pending_fence_key.value)
      pending_fence_key.value = null
      pending_from_map.value = false
      show_close_confirm_modal.value = false
    })
  } else {
    back(false).then(() => {
      if (pending_fence_key.value) {
        is_create_mode.value = false
        geofence_is_dirty.value = false
        selected_fence_local.value = pending_fence_key.value
        if (!pending_from_map.value) {
          geofence_editor.value = true
        }
        store.select(pending_fence_key.value)
        pending_fence_key.value = null
        pending_from_map.value = false
      }
    })
  }
}

function on_click(e) {
  //console.log("ONCLICK")
  if (just_removed.value) {
    just_removed.value = false;
    return
  }
  if (geofence_is_dirty.value) {
    pending_fence_key.value = e.key
    show_close_confirm_modal.value = true
    return
  }
  is_create_mode.value = false
  selected_fence_local.value = e.key
  store.select(e.key)
}

function open_selected_geofence_editor() {
  if (!selected_fence_local.value) {
    return
  }
  is_create_mode.value = false
  geofence_is_dirty.value = false
  geofence_editor.value = true
}

function deselect_selected_geofence_editor() {
  if (!selected_fence_local.value) {
    return
  }
  selected_fence_local.value = ""
  store.deselect()
}

function handle_outside_click(event) {
  if (!selected_fence_local.value && !selected_fence.value) {
    return
  }

  if (geofence_editor.value) {
    return
  }

  const event_path = typeof event.composedPath === 'function' ? event.composedPath() : []
  const clicked_inside_map = event_path.some((node) => {
    if (!(node instanceof Element)) {
      return false
    }

    return node.id === 'map' || node.closest('#map') || node.classList.contains('leaflet-container')
  })

  if (!(event.target instanceof Element)) {
    return
  }

  if (event.target.closest('.drawer-panel') || event.target.closest('.clickable') || clicked_inside_map) {
    return
  }

  deselect_selected_geofence_editor()
}

function on_double_click(e) {
  on_click(e)
  open_selected_geofence_editor()
}

function handle_geofence_selection(fenceKey) {
  if (geofence_is_dirty.value) {
    pending_fence_key.value = fenceKey
    pending_from_map.value = true
    show_close_confirm_modal.value = true
    return
  }
  is_create_mode.value = false
  selected_fence_local.value = fenceKey
  store.select(fenceKey)
}

//RESTRICT REMOVE TO ADMIN
function remove(element) {
  if (!isAdmin.value) {
    return
  }
  just_removed.value = true
  if (confirm("WARNING!\nAre you sure you want to remove this geofence?") == true) {
    back(false).then(() => {
      store.deleteGeofence(element.key)
    })
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

function emitDrawerOffset() {
  const offset = geofence_editor.value ? drawerWidth.value + 16 : 0
  emit('drawer-offset-change', offset)
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
      selected: selected_fence_local.value === key,
      bold: (selected_glider.value && eventsStore.glider_has_geofence_event(selected_glider.value._id, key))
    })
  })
  return ret;
})

watch(selected_fence_key, (new_val) => {
  if (is_create_mode.value) {
    return
  }
  selected_fence_local.value = new_val
})

watch([geofence_editor, drawerWidth], emitDrawerOffset, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handle_outside_click)
  store.setSelectGeofenceHandler(handle_geofence_selection)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handle_outside_click)
  stopResize()
  store.setSelectGeofenceHandler(null)
  emit('drawer-offset-change', 0)
})


//UI/UX DRIVEN BY isAdmin WHERE NEEDED
</script>
<template>
  <div class="geofence-section">
    <div class="geofence-list">
      <FilesBoxComponent @delete="remove" @add_btn="add_geo" @click="on_click" @dblclick="on_double_click" :list="latlons" :draggable="false"
        :add_btn="isAdmin" :can_delete="isAdmin" :standard_delete="isAdmin" title="Geofences" id="geo" />
    </div>
    <!-- <div class="geofence-actions"> -->
      <!-- <button class="geofence-extra" type="button" :disabled="!selected_fence_local" @click="open_selected_geofence_editor">
        Edit Geofence
      </button>
            <button class="geofence-extra" type="button" :disabled="!selected_fence_local" @click="deselect_selected_geofence_editor">
        Deselect Geofence
      </button> -->
    <!-- </div> -->


    <transition name="slide-drawer">
      <div v-if="geofence_editor" class="drawer-overlay">
        <ModalComponent v-if="show_close_confirm_modal" :blur="true" @close="show_close_confirm_modal = false">
          <h2>Save geofence changes before closing?</h2>
          <div class="close-confirm-actions">
            <button type="button" @click="confirm_close_save()">Save</button>
            <button type="button" @click="confirm_close_discard()">Discard</button>
            <button type="button" @click="show_close_confirm_modal = false">Cancel</button>
          </div>
        </ModalComponent>
        <div class="drawer-panel" :style="{ width: drawerWidth + 'px' }" @click.stop>
          <div class="resize-handle" @mousedown="startResize"></div>
          <div class="drawer-header">
            <h2 class="drawer-title">{{ is_create_mode ? 'Create Geofence' : (selected_fence_local ? 'Edit Geofence' :
              'Create Geofence') }}</h2>
            <button class="drawer-close-btn" @click="request_close_drawer()" aria-label="Close drawer">
              <span>&times;</span>
            </button>
          </div>
          <div class="drawer-content">
            <AddGeoFenceComponent
              :key="selected_fence_local || 'create-geofence'"
              @back="back"
              @dirty-change="geofence_is_dirty = $event"
              :fenceKey="selected_fence_local"
              :canEdit="isAdmin"
            />
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

.geofence-list {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.geofence-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.4rem;
}

.geofence-extra {
border-radius: 3px;
border-width: 2px 2px 2px 2px;
padding: 2px 4px 2px 4px;
margin-left: 5px;
margin-right:5px;
}

#geo {
  height: 100%;
}

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
  background-color: grey
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--color-border, lightgray);
  flex-shrink: 0;
}

.drawer-title {
  margin: 0;
  color: var(--color-text);
  font-size: 1.25rem;
  font-weight: 600;
}

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

.close-confirm-actions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 0.5em;
}

.close-confirm-actions button {
  margin: 0;
}
</style>
