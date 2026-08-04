<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FilesBoxHeader from './FilesBoxHeader.vue';
import GeofenceListComponent from './GeofenceListComponent.vue';
import AddGeoFenceComponent from './AddGeoFenceComponent.vue';
import ModalComponent from './ModalComponent.vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { useEventsStore } from '@/stores/events';
import { storeToRefs } from 'pinia';
import { useGlidersStore } from '@/stores/gliders';
import { useUserStore } from '@/stores/user';
import type { FileBoxType, Geofence, Glider } from '@/lib/types';
import DropDownComponent from './DropDownComponent.vue';

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
const show_delete_confirm_modal = ref(false)
const geofence_is_dirty = ref(false)
const pending_fence_key = ref<string | null>(null)
const pending_from_map = ref(false)
const pending_delete_element = ref<FileBoxType<Geofence> | null>(null)
const tabs: string[] = ["Geofences", "Ships"]
const selected_tab = ref<string>(tabs[0] as string)
const offset_time_ref = ref<number>(0)

const emit = defineEmits<{
  'drawer-offset-change': [number]
}>()

const { geofences, selected_fence, selected_fence_key, is_geofence_tab_selected } = storeToRefs(store)
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
  const hasSelectedGeofence = selected_fence_local.value !== "" || selected_fence.value !== null
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
function back(save: boolean) {
  if (!isAdmin.value) {
    save = false
  }
  let savePromise: Promise<boolean | void> = Promise.resolve()
  if (save) {
    savePromise = store.saveOrUpdateGeofence() || Promise.resolve()
  }
  else {
    if (is_create_mode.value) {
      store.remove('123')
    }
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
      selected_fence_local.value = pending_fence_key.value as string
      store.select(pending_fence_key.value as string)
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
    if (is_create_mode.value) {
      store.remove('123')
    }
    const reloadPromise = store.getGeofences() || Promise.resolve()
    reloadPromise.then(() => {
      is_create_mode.value = false
      geofence_is_dirty.value = false
      selected_fence_local.value = pending_fence_key.value as string
      store.select(pending_fence_key.value as string)
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

function on_click(e: FileBoxType<Geofence>) {
  //console.log("ONCLICK")
  if (just_removed.value) {
    just_removed.value = false;
    return
  }
  if (geofence_is_dirty.value) {
    pending_fence_key.value = e.key ?? ''
    show_close_confirm_modal.value = true
    return
  }
  if (is_create_mode.value) {
    store.remove('123')
  }
  is_create_mode.value = false
  selected_fence_local.value = e.key ?? ''
  store.select(e.key ?? '')
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

function handle_outside_click(event: PointerEvent) {
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

function handle_geofence_selection(fenceKey: string) {
  if (geofence_is_dirty.value) {
    pending_fence_key.value = fenceKey
    pending_from_map.value = true
    show_close_confirm_modal.value = true
    return
  }
  if (is_create_mode.value) {
    store.remove('123')
  }
  is_create_mode.value = false
  selected_fence_local.value = fenceKey
  store.select(fenceKey)
}

function handle_geofence_double_click(fenceKey: string) {
  if (geofence_is_dirty.value) {
    pending_fence_key.value = fenceKey
    pending_from_map.value = true
    show_close_confirm_modal.value = true
    return
  }
  if (is_create_mode.value) {
    store.remove('123')
  }
  is_create_mode.value = false
  selected_fence_local.value = fenceKey
  store.select(fenceKey)
  geofence_editor.value = true
}

//RESTRICT REMOVE TO ADMIN
function remove(element: FileBoxType<Geofence>) {
  if (!isAdmin.value) {
    return
  }
  just_removed.value = true
  pending_delete_element.value = element
  show_delete_confirm_modal.value = true
}

function confirm_delete() {
  const element = pending_delete_element.value
  if (element) {
    back(false).then(() => {
      store.deleteGeofence(element.key as string)
    })
  }
  show_delete_confirm_modal.value = false
  pending_delete_element.value = null
}

function startResize(e: MouseEvent) {
  isResizing.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e: MouseEvent) {
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
  const ret: FileBoxType<Geofence>[] = []
  Object.keys(geofences.value).forEach((key) => {
    if (geofences.value[key] === undefined) return

    let has_geofence_event = false
    let name = geofences.value[key].name
    const new_obj = {
      ...geofences.value[key]
    }

    if (selected_glider.value && eventsStore.glider_has_geofence_event(selected_glider.value._id, key)) {
      name = "* " + name
      has_geofence_event = true
    }
    ret.push({
      ...new_obj,
      name: name,
      selected: selected_fence_local.value === key,
      key: key,
      bold: has_geofence_event,
      type: "Geofences" // For the tabs
    })
  })
  return ret;
})

const filtered_list = computed(() => {
  if (selected_tab.value) {
    return latlons.value.filter((element) => selected_tab.value === element.type)
  }
  return latlons.value
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
  store.setDoubleClickGeofenceHandler(handle_geofence_double_click)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handle_outside_click)
  stopResize()
  store.setSelectGeofenceHandler(null)
  store.setDoubleClickGeofenceHandler(null)
  emit('drawer-offset-change', 0)
})

function tab_select(tab: string){
  selected_tab.value = tab
  is_geofence_tab_selected.value = tab == tabs[0]
}

watch(selected_glider, (() =>{
  if (selected_glider.value?.boat_cone_hour_offset){
    offset_time_ref.value = selected_glider.value?.boat_cone_hour_offset as number * 60
  }
  else{
    offset_time_ref.value = 90
  }
}))

function update_glider_offset_cone(){
  const hour_offset =  offset_time_ref.value /60
  gliderStore.update_glider_boat_offset(selected_glider.value as Glider, hour_offset)
}

const show_offset_time_update = computed(() => {
  if(offset_time_ref.value/60 == selected_glider.value?.boat_cone_hour_offset){
    return false
  }
  else{
    return true
  }
})

//UI/UX DRIVEN BY isAdmin WHERE NEEDED
</script>
<template>
  <div class="geofence-section">
    <div class="geofence-list">
      <div id="geo" class="border files-box">
        <FilesBoxHeader
          title="Event Triggers"
          :tabs="tabs"
          :selected_tab="selected_tab"
          :tabs_disabled="false"
          :add_btn="isAdmin"
          tab_sort_key="type"
          :tabs_static="true"
          @add_btn="add_geo"
          @tab_select="tab_select"
        />
        <hr>
        <GeofenceListComponent
          :list="filtered_list"
          :can_delete="isAdmin"
          :can_edit="isAdmin"
          @click="on_click"
          @delete="remove"
          @edit="open_selected_geofence_editor"
        />
        <div class="footer">
          <div v-if="selected_tab == tabs[1]" id="boats-text" class="center-div">
            <div style="text-align: center;">
              <h2 class="unselected-text">Files/script changes for when a glider is in the path of a ship</h2>
              <div class="center-div">
                <input @change="show_offset_time_update = true" id="minute-input"  v-model="offset_time_ref" class="text-input" type="number">
                <button @click="update_glider_offset_cone()" :class="{border: true, green: show_offset_time_update}" :disabled="!show_offset_time_update" id="update-btn">✓</button>
                <h2>minute cone offset</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="geofence-actions"> -->
      <!-- <button class="geofence-extra" type="button" :disabled="!selected_fence_local" @click="open_selected_geofence_editor">
        Edit Geofence
      </button>
            <button class="geofence-extra" type="button" :disabled="!selected_fence_local" @click="deselect_selected_geofence_editor">
        Deselect Geofence
      </button> -->
    <!-- </div> -->


    <ModalComponent v-if="show_delete_confirm_modal" :blur="true" @close="show_delete_confirm_modal = false">
      <div class="delete-modal-content">
        <h2 class="delete-modal-title">Delete Geofence?</h2>
        <p class="delete-modal-text">Are you sure you want to remove this geofence?</p>
        <div class="delete-confirm-actions">
          <button type="button" class="btn-cancel" @click="show_delete_confirm_modal = false">Cancel</button>
          <button type="button" class="btn-delete" @click="confirm_delete()">Delete</button>
        </div>
      </div>
    </ModalComponent>
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

#boats-text{
  margin-bottom: 5rem;
  font-size: large;
}

.geofence-list {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

#geo {
  height: 100%;
}

.files-box {
  width: 100%;
  height: 100%;
  position: relative;
}

.footer {
  width: 95%;
  position: absolute;
  bottom: .5rem;
}

hr {
  border-top-width: 1px;
  border-top-color: var(--color-text);
  width: 100%;
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

.delete-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
}

.delete-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.delete-modal-text {
  margin: 0;
  color: var(--color-text);
  font-size: 0.95rem;
}

.delete-confirm-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.delete-confirm-actions button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background-color: var(--color-border, #e0e0e0);
  color: var(--color-text);
}

.btn-cancel:hover {
  background-color: var(--color-border, #d0d0d0);
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
}

.text-input{
  padding: .1rem;
  background-color: var(--color-background-soft);
  border-radius: 4px;
  color: var(--color-text);
  border: 1px solid var(--color-border, lightgray);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}
#minute-input{
  width: 3.2rem;
}
#minute-input[type=number]{
  appearance: textfield;
}
#minute-input[type=number]:hover{
  appearance: auto;
}
#update-btn{
  padding: 0px 5px;
  border-color: var(--color-border);
  height: 30px;
}
.green{
  color: green;
  border-color: green;
}
</style>
