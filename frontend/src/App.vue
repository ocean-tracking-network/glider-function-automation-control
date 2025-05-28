<script setup>
import FilesBoxComponent from './components/FilesBoxComponent.vue';
import HeaderComponent from './components/HeaderComponent.vue';
import MapComponent from './components/MapComponent.vue';
import LogComponent from './components/LogComponent.vue';
import GeoFenceComponent from './components/GeoFenceComponent.vue';
import GliderTabComponent from './components/GliderTabComponent.vue';
import { computed, useTemplateRef } from 'vue';
import { useEventsStore } from './stores/events';
import { useFilesStore } from './stores/files';
import { useGeoFencesStore } from './stores/geofences';
import { storeToRefs } from 'pinia';
import { useGlidersStore } from './stores/gliders';


const eventsStore = useEventsStore()
const filesStore = useFilesStore()
const geofenceStore = useGeoFencesStore()
const gliderStore = useGlidersStore()


const { selected_fence } = storeToRefs(geofenceStore)
const { enter_files_ref, exit_files_ref } = storeToRefs(eventsStore)
const { files_arr } = storeToRefs(filesStore)
const fileUpload = useTemplateRef('fileUpload')

function fileMoveCallback(evt, originalEvent) {
  console.log(evt)
  console.log(originalEvent)
}

function delete_event_exit(index) {
  const id = exit_files_ref.value[index]._id
  eventsStore.remove_event(id)
}
function delete_event_enter(index) {
  const id = enter_files_ref.value[index]._id
  eventsStore.remove_event(id)
}

const display_events = computed(() => {
  return selected_fence.value && gliderStore.selected_glider != undefined
})

function add_file() {
  fileUpload.value.click()
}

function delete_file(idx) {
  const file_id = files_arr.value[idx]._id
  filesStore.delete_file(file_id)
}

</script>
<template>
  <header>
    <HeaderComponent />
  </header>

  <main>
    <div id="main-flex">

      <!-- <div id="map"> -->
      <!-- </div> -->
      <div>
        <MapComponent />
      </div>
      <div id="side">
        <GliderTabComponent />
        <GeoFenceComponent id="geo" />

        <FilesBoxComponent @delete="delete_event_enter" :standard_delete="false" v-if="display_events"
          :list="enter_files_ref" group="files" :draggable="true" title="On Enter" class="middle" id="enter" />
        <FilesBoxComponent @delete="delete_event_exit" :standard_delete="false" v-if="display_events"
          :list="exit_files_ref" group="files" :draggable="true" title="On Exit" class="middle" id="exit" />
        <div v-if="!display_events" id="middle-placeholder" class="middle border center-div">
          <h2 class="unselected-text">Please select a <strong>glider</strong> and <strong>geofence</strong></h2>
        </div>
        <FilesBoxComponent @add_btn="add_file" @delete="delete_file" :move="fileMoveCallback" :sort="false"
          :list="files_arr" :group="{ name: 'files', pull: 'clone', put: false }" :draggable="true" title="All Files"
          id="total" />
        <input multiple type="file" id="file-upload" ref="fileUpload" @change="filesStore.upload_files">
      </div>
    </div>
    <LogComponent id="logs" />
  </main>
</template>

<style scoped>
.logo {
  display: block;
  margin: 0 auto 2rem;
}

#main-flex {
  display: flex;
  padding: 1rem;
  gap: 1rem;
  /* flex-wrap: wrap; */
}

#side {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

#geo {
  width: 100%;
  height: 15rem;
}

#total {
  width: 100%;
}

.middle {
  /* flex-grow: 1; */
  /* max-width: 50%; */
  /* width: 48%; */
  flex: 1;
  height: 10rem;
  flex-basis: 48%;
  max-width: 50%;

}

#middle-placeholder {
  max-width: 100%;

}


header {
  width: 100%;
}

#logs {
  width: 100%;
  margin-top: 1rem;
}

.unselected-text {
  font-size: xx-large;
  text-align: center;
}

.center-div {
  display: flex;
  align-items: center;
  justify-content: center;
}


#file-upload {
  visibility: hidden;
}
</style>
