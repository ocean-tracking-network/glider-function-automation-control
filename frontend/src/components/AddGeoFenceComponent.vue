<script setup>
import { computed, onBeforeMount, ref, useTemplateRef, watch } from 'vue';
import { useGeoFencesStore } from '@/stores/geofences';
import { storeToRefs } from 'pinia';
import { useFilesStore } from '@/stores/files';
import { useDropZone } from '@vueuse/core'
import ModalComponent from './ModalComponent.vue';
import draggable from 'vuedraggable'


const filesStore = useFilesStore()
const store = useGeoFencesStore()
const { geofences, interactive_map, selected_fence, selected_kml_geo_json, show_alert_modal } = storeToRefs(store)
const uploadKmlFile = useTemplateRef('uploadKmlFile')
const dropZoneRef = useTemplateRef('dropZoneRef')
const uploadedKmlListRef = useTemplateRef('uploadedKmlListRef')

const props = defineProps({
  fenceKey: String,
  canEdit: {
    type: Boolean,
    default: false,
  }
})

const emit = defineEmits(["geofenceupdate", "back", "dirty-change"])

const fence_key = ref("")
const lock_fence = ref(true)
const initial_snapshot = ref('')
const pressed_handle_index = ref(null)
const is_dragging_latlon = ref(false)

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
  if (!props.canEdit || lock_fence.value) {
    return
  }
  let latlons = selected_fence.value.latlons
  const idx = latlons.length - 1
  if (latlons[idx][0] || latlons[idx][1]) {
    selected_fence.value.latlons.push([,])
  }
}

function focus_out(idx) {
  if (!props.canEdit || lock_fence.value) {
    return
  }
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

function clear_focus() {
  store.select_idx(null)
}

function is_non_drag_row_target(event) {
  return event?.target?.closest('input, .x-btn, .no-x-btn, .no-drag-handle')
}

function on_row_pointer_down(index, event) {
  if (is_non_drag_row_target(event)) {
    return
  }

  if (!props.canEdit || lock_fence.value || index >= selected_fence.value.latlons.length - 1) {
    return
  }

  pressed_handle_index.value = index
  is_dragging_latlon.value = false
  focus_in(index)
}

function on_row_pointer_up(index, event) {
  if (is_non_drag_row_target(event)) {
    return
  }

  if (pressed_handle_index.value !== index) {
    return
  }

  pressed_handle_index.value = null

  if (is_dragging_latlon.value) {
    is_dragging_latlon.value = false
    return
  }

  clear_focus()
}

function onDrop(files) {
  if (!props.canEdit || lock_fence.value) {
    return
  }
  filesStore.upload_kml_file(files)
}

function remove_idx(idx) {
  if (props.canEdit && !lock_fence.value) {
    selected_fence.value.latlons.splice(idx, 1)
    if (idx === store.selected_idx) {
      clear_focus()
    }
  }
}

const valid_kml_placemarks = computed(() => {
  return (selected_kml_geo_json.value ?? []).filter((placemark) => placemark?.isValid)
})

const valid_kml_placemarks_are_points = computed(() => {
  return valid_kml_placemarks.value.length > 0 && valid_kml_placemarks.value.every((placemark) => placemark.type === 'Point')
})

const can_apply_all_kml = computed(() => {
  return props.canEdit && !lock_fence.value && valid_kml_placemarks_are_points.value
})

function apply_all_kml_coordinates() {
  if (!can_apply_all_kml.value || !selected_fence.value) {
    return
  }

  const combined_coordinates = []

  valid_kml_placemarks.value.forEach((placemark) => {
    if (placemark.type === 'Point') {
      if (placemark.coordinates?.[0]) {
        combined_coordinates.push(placemark.coordinates[0])
      }
      return
    }

    if (placemark.type === 'Polygon') {
      combined_coordinates.push(...(placemark.coordinates ?? []))
    }
  })

  if (combined_coordinates.length === 0) {
    return
  }

  const latlons = selected_fence.value.latlons ?? []
  const last_latlon = latlons[latlons.length - 1]
  const has_trailing_blank = Array.isArray(last_latlon) && !last_latlon[0] && !last_latlon[1]

  if (has_trailing_blank) {
    latlons.splice(latlons.length - 1, 0, ...combined_coordinates)
  } else {
    latlons.push(...combined_coordinates)
  }
}

function scroll_to_next_kml_item(index) {
  const next_index = index + 1
  if (!uploadedKmlListRef.value) {
    return
  }

  const next_card = uploadedKmlListRef.value.querySelector(`[data-kml-index="${next_index}"]`)
  if (!next_card) {
    return
  }

  next_card.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

function apply_kml_item(geofence, index) {
  store.apply_coordinates_from_kml_file(geofence.coordinates)
  scroll_to_next_kml_item(index)
}

function normalize_latlons(latlons) {
  if (!Array.isArray(latlons)) {
    return []
  }

  const normalized = latlons.map((latlon) => {
    if (!Array.isArray(latlon)) {
      return ['', '']
    }
    return [latlon[0] ?? '', latlon[1] ?? '']
  })

  const last_latlon = normalized[normalized.length - 1]
  if (last_latlon && !last_latlon[0] && !last_latlon[1]) {
    normalized.pop()
  }

  return normalized
}

function create_snapshot() {
  return JSON.stringify({
    name: selected_fence.value?.name ?? '',
    notify: selected_fence.value?.notify ?? false,
    latlons: normalize_latlons(selected_fence.value?.latlons),
  })
}

const overflowed = computed(() => {
  if (selected_fence.value.latlons.length >= 6) {
    return true
  }
  return false
})

const has_unsaved_changes = computed(() => {
  return create_snapshot() !== initial_snapshot.value
})

const back_display = computed(() => {
  return has_unsaved_changes.value ? "Save/Back" : "Back"
})

watch(() => geofences.value, async (new_fence, old_fence) => {
  on_input()
}, { deep: true })

watch(
  [selected_fence],
  () => {
    emit('dirty-change', has_unsaved_changes.value)
  },
  { deep: true },
)

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

function onMoveLatLon(evt) {
  const rows = selected_fence.value?.latlons ?? []
  const last = rows.length - 1

  const from = evt.draggedContext?.index
  const to = evt.draggedContext?.futureIndex

  // keep trailing placeholder row fixed at end
  if (from === last || to === last) return false

  return true
}

function on_latlon_drag_start(evt) {
  const start_index = evt?.oldIndex
  is_dragging_latlon.value = true
  focus_in(start_index)
}

function on_latlon_drag_end(evt) {
  const end_index = evt?.newIndex
  pressed_handle_index.value = null
  focus_in(end_index)
}

onBeforeMount(() => {
  initial_snapshot.value = create_snapshot()
  emit('dirty-change', false)
})

</script>
<template>
  <ModalComponent v-if="show_alert_modal" :alert-text="show_alert_modal" @close="show_alert_modal = ''">
  </ModalComponent>

  <div class="geofence-container">
    <div class="main-container">
      <div class="header">
        <button id="back-btn" class="border" @click="emit('back', has_unsaved_changes)">{{ back_display }}</button>
        <input :disabled="lock_fence || !props.canEdit" class="text-input" id="name-input" v-model="selected_fence.name"
          placeholder="Name" type="text">
      </div>
      <div class="lat-lon-container">
        <div id="main-container" :class="{ overflow: overflowed }">
          <draggable :move="onMoveLatLon" :list="selected_fence.latlons" @start="on_latlon_drag_start"
            @end="on_latlon_drag_end" :item-key="(_, index) => `latlon-${index}`"
            filter="input, .x-btn, .no-x-btn, .no-drag-handle" :prevent-on-filter="false"
            :disabled="lock_fence || !props.canEdit" class="latlon-draggable">
            <template #item="{ element: lat_lon, index }">
              <div class="inputs" @pointerdown="on_row_pointer_down(index, $event)"
                @pointerup="on_row_pointer_up(index, $event)" @pointercancel="on_row_pointer_up(index, $event)">
                <button v-if="index < selected_fence.latlons.length - 1" type="button" class="drag-handle">
                  ⋮⋮
                </button>
                <button v-if="index >= selected_fence.latlons.length - 1" type="button" disabled="true"
                  class="no-drag-handle">
                  ⋮⋮
                </button>
                <span style="width: 20px;"></span>

                <p id="index">{{ index }}</p>
                <input :disabled="lock_fence || !props.canEdit" class="text-input latlon" @focusout="focus_out(index)"
                  @focusin="focus_in(index)" @input="on_input()" v-model="lat_lon[0]" placeholder="lat" type="text" />
                <p>:</p>
                <input :disabled="lock_fence || !props.canEdit" class="text-input latlon" @focusout="focus_out(index)"
                  @focusin="focus_in(index)" @input="on_input()" v-model="lat_lon[1]" placeholder="lon" type="text" />

                <button class="x-btn" @click="remove_idx(index)"
                  v-if="props.canEdit && index < selected_fence.latlons.length - 1">
                  x
                </button>
                <button class="no-x-btn" v-if="index >= selected_fence.latlons.length - 1" disabled="true">
                  x
                </button>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
    <div class="controls-container">
      <div>
        <input :disabled="!props.canEdit" v-model="lock_fence" id="lock" type="checkbox">
        <label for="lock" class="label">Lock</label>
      </div>
      <div>
        <input :disabled="lock_fence || !props.canEdit" v-model="selected_fence.notify" id="notify" type="checkbox">
        <label class="label" for="map-interact">Notify when glider enters/leaves</label>
      </div>
      <div>
        <input :disabled="lock_fence || !props.canEdit" v-model="interactive_map" id="map-interact" type="checkbox">
        <label class="label" for="map-interact">Enable interactive map</label>
      </div>
      <div class="upload-kml-container" :class="{ border: props.canEdit }" ref="dropZoneRef">
        <div v-if="!selected_kml_geo_json" class="upload-kml-dropzone">
          <button :disabled="lock_fence || !props.canEdit" :class="{ overDropZone: isOverDropZone }"
            @click="uploadKmlFile.click()">
            <div v-if="props.canEdit && !isOverDropZone">
              <p>Click or Drop</p>
              <p>a KML File here</p>
            </div>
            <div v-else-if="props.canEdit">Drop it</div>
          </button>
          <input :disabled="lock_fence || !props.canEdit" type="file" class="upload-kml-input" accept=".kml"
            ref="uploadKmlFile" @change="filesStore.upload_kml_file" />
        </div>
        <div v-else class="uploaded-kml-coordinates-selector-contianer">
          <button :disabled="!can_apply_all_kml" class="border apply-all-kml-btn" @click="apply_all_kml_coordinates">
            Apply All
          </button>
          <div class="uploaded-kml-coordinates-selector-inner-contianer" ref="uploadedKmlListRef">
            <div class="kml-file-placemark-card" v-for="(geofence, index) in selected_kml_geo_json"
              :key="geofence.placemark + index" :data-kml-index="index">
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
              <button :disabled="!geofence.isValid || lock_fence || !props.canEdit" class="border"
                @click="apply_kml_item(geofence, index)">Apply</button>
            </div>
          </div>
          <button :disabled="lock_fence || !props.canEdit" class="remove x-btn" @click="filesStore.clear_kml_file">
            x
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.drag-handle {
  cursor: grab;
  border: none;
  background: transparent;
  padding: 0 4px;
}

.no-drag-handle {
  padding: 0 4px;
  opacity: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.latlon-draggable {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.no-x-btn {
  visibility: hidden;
}

.inputs {
  cursor: grab;
}

.inputs:has(input:hover),
.inputs:has(input:focus),
.inputs:has(.x-btn:hover),
.inputs:has(.no-x-btn:hover) {
  cursor: default;
}

.geofence-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

#name-input {
  margin: 0px auto;
  flex: 1;
}

.lat-lon-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 200px;
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--color-border, lightgray);
  padding: 16px 10px;
}

.controls-container>div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-kml-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 150px;
  border: 1px dashed var(--color-border, lightgray);
  border-radius: 4px;
  padding: 16px;
}

.upload-kml-dropzone button {
  border: 2px dashed var(--color-border, lightgray);
  padding: 24px 32px;
  border-radius: 6px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  width: 100%;
  max-width: 300px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.upload-kml-dropzone button:hover:not(:disabled) {
  border-color: lightblue;
  background-color: var(--color-background);
}

.overDropZone {
  transition: .3s !important;
  border: 2px dashed lightgreen !important;
  padding: 40px 48px !important;
  background-color: var(--color-background);
}

.upload-kml-container p {
  text-align: center;
  position: relative;
  margin: 0;
  color: var(--color-text);
}

.upload-kml-input {
  visibility: hidden;
  position: absolute;
}

.uploaded-kml-coordinates-selector-contianer {
  width: 100%;
  position: relative;
}

.uploaded-kml-coordinates-selector-contianer .remove {
  position: absolute;
  top: 0;
  right: 0;
  border: 1px solid var(--color-border, lightgray);
  border-radius: 4px;
  width: 30px;
  height: 30px;
  background-color: var(--color-background);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  color: red;
  transition: all 0.2s;
}

.uploaded-kml-coordinates-selector-contianer .remove:hover {
  background-color: #ffe0e0;
  border-color: red;
}

.uploaded-kml-coordinates-selector-inner-contianer {
  width: 100%;
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.apply-all-kml-btn {
  width: 100%;
  margin: 0;
  margin-top: 12px;
}

.apply-all-kml-btn:disabled {
  background-color: var(--color-background-soft, #f2f2f2);
  border-color: var(--color-border, lightgray);
  color: var(--color-text-muted, #777);
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.apply-all-kml-btn:disabled:hover {
  border-color: var(--color-border, lightgray);
}

.kml-file-placemark-card {
  width: 100%;
  padding: 12px;
  color: var(--color-text);
  border-color: var(--color-border, lightgray);
  border-width: 1px;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  gap: 8px;
  background-color: var(--color-background-soft);
}

.kml-file-placemark-card button {
  padding: 6px 12px;
  align-self: flex-start;
  border-radius: 4px;
  font-size: 0.9rem;
}

.kml-file-placemark-card button:hover {
  transition: .2s;
  border-color: lightblue;
}

.kml-file-placemark-card button:disabled {
  background-color: lightgray;
  opacity: .4;
  border-color: lightgray;
  cursor: not-allowed;
}

.kml-file-placemark-card-placemark,
.kml-file-placemark-card-type,
.kml-file-placemark-card-coordinates {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  font-size: 0.95rem;
}

.kml-file-placemark-card-placemark span,
.kml-file-placemark-card-type span,
.kml-file-placemark-card-coordinates span {
  min-width: 90px;
}

.kml-file-placemark-card p {
  margin: 0;
  color: var(--color-text);
}

.inputs {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: .3rem;
  width: 16rem;
  flex-basis: 20%;
  margin-right: 1rem;
  padding-bottom: .5rem;
}

#index {
  min-width: 2rem;
  font-weight: 600;
  color: var(--color-text);
}

.latlon {
  width: 7rem;
}

#main-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 300px;
  padding: 12px;
  background-color: var(--color-background-soft);
  border-radius: 4px;
  overflow-y: auto;
}

.overflow {
  overflow-y: auto !important;
}

.label {
  margin: 0;
  font-weight: 500;
  color: var(--color-text);
}

.text-input {
  /* width: 8rem;
  background-color: lightgray;
  color: black;
  */
  padding: .1rem;
  /* background-color: black; */
  background-color: var(--color-background-soft);
  border-radius: 4px;
  color: var(--color-text);
  border: 1px solid var(--color-border, lightgray);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: lightblue;
}

#name input {
  margin-left: 0;
}

#name {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0;
}

button {
  transition: .2s;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.95rem;
  margin-left: 10px;
}

#back-btn:hover {
  transition: .2s;
  border-color: lightblue;
}

#back-btn {
  margin-left: 10px;
  width: 7rem;
  padding: 8px 12px;
}

.x-btn:hover {
  transition: .2s;
  color: red;
}

.x-btn {
  height: auto;
  padding: 4px 8px;
  font-size: 1rem;
  min-width: auto;
}

#name-input {
  text-align: center;
  padding: 8px 12px;
}

.overflow-child {
  height: 40rem;
}

input:disabled {
  background-color: var(--color-background);
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
