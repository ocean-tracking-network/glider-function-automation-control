<script setup>

import FilesBoxComponent from './components/FilesBoxComponent.vue';
import HeaderComponent from './components/HeaderComponent.vue';
import MapComponent from './components/MapComponent.vue';
import LogComponent from './components/LogComponent.vue';
import GeoFenceComponent from './components/GeoFenceComponent.vue';
import GliderTabComponent from './components/GliderTabComponent.vue';
import LoginComponent from './components/LoginComponent.vue';
import UserManagementComponent from './components/UserManagementComponent.vue';
import { computed, ref, useTemplateRef } from 'vue';
import { useEventsStore } from './stores/events';
import { useFilesStore } from './stores/files';
import { useGeoFencesStore } from './stores/geofences';
import { storeToRefs } from 'pinia';
import { useGlidersStore } from './stores/gliders';
import { useUserStore } from './stores/user';
import ScriptComponent from './components/ScriptComponent.vue';


const eventsStore = useEventsStore()
const filesStore = useFilesStore()
const geofenceStore = useGeoFencesStore()
const gliderStore = useGlidersStore()
const userStore = useUserStore()

const { selected_fence } = storeToRefs(geofenceStore)
const { enter_files_ref, exit_files_ref } = storeToRefs(eventsStore)
const { files_arr } = storeToRefs(filesStore)

const { loggedin, isAdmin } = storeToRefs(userStore)

const fileUpload = useTemplateRef('fileUpload')
const file_tab_select = ref("")
const showUserManagement = ref(false)

function fileMoveCallback(evt, originalEvent) {
  console.log(evt)
  console.log(originalEvent)
}

function delete_event_exit(index) {
  // const id = exit_files_ref.value[index]._id
  eventsStore.remove_event(index._id)
}
function delete_event_enter(index) {
  console.log(enter_files_ref.value)
  console.log(index)
  // const id = enter_files_ref.value[index]._id
  eventsStore.remove_event(index._id)
}

const display_events = computed(() => {
  return selected_fence.value && gliderStore.selected_glider != undefined
})

function add_file() {
  if (!isAdmin.value) {
    return
  }
  fileUpload.value.click()
}

function delete_file(file) {
  if (!isAdmin.value) {
    return
  }
  // const file_id = files_arr.value[idx]._id
  filesStore.delete_file(file._id)
}

function show_send_now_btn(list) {
  // returns string ["Send Now"] if it should be sent
  if (!isAdmin.value) {
    return undefined
  }
  if (list.length > 0) {
    return ["Send Now"]
  }
  return undefined
}

//FILE UPLOAD RESTRICTED TO ADMIN USER
function upload_files_wrapper(event) {
  if (!isAdmin.value) {
    return
  }
  let category = file_tab_select.value
  if (category == "") {
    category = undefined
  }
  filesStore.upload_files(event, category)
}

function trigger_events(event_type) {
  if (!isAdmin.value) {
    return
  }
  let send = window.confirm("Are you sure you want to send the file now?")
  if (send) {
    const events = event_type == "enter" ? eventsStore.enter_files : eventsStore.exit_files
    for (const event of events)
      eventsStore.trigger_event(event)
    const script_event = eventsStore.selected_glider_scripts[event_type]
    if (script_event) {
      eventsStore.trigger_event(script_event)
    }
  }

}

//RENAME RESTRICTED TO ADMIN USER
function rename_tab_category(vals) {
  if (!isAdmin.value) {
    return
  }
  let files_to_update = []
  for (let file of filesStore.files_arr) {
    if (file.category == vals.old) {
      files_to_update.push({
        _id: file._id,
        category: vals.new
      })
    }
  }
  console.log(files_to_update)
  filesStore.update_files_category(files_to_update)
}

function select_file_tab(file_tab) {
  file_tab_select.value = file_tab
}

const all_categories = computed(() => {
  return [...filesStore.categories, ...temp_file_categories.value]
})

function toggleUserManagement() {
  showUserManagement.value = !showUserManagement.value
}

</script>
<template>
  <div>
    <div>
      <header>
        <HeaderComponent @toggle-user-management="toggleUserManagement" />
      </header>

      <!-- PAGE ADMIN/VIEWER UI/UX CONTROLLED HERE -->
      <main>
        <div id="main-flex">

          <!-- <div id="map"> -->
          <!-- </div> -->
          <div>
            <MapComponent id="map" />
          </div>
          <div id="side">
            <GliderTabComponent />
            <GeoFenceComponent id="geo" />

            <FilesBoxComponent @tab_select="trigger_events('enter')" :tabs="show_send_now_btn(enter_files_ref)"
              :add_btn="false" @delete="delete_event_enter" :standard_delete="false" :can_delete="isAdmin"
              v-if="display_events" :list="enter_files_ref" group="files" :draggable="isAdmin" title="On Enter"
              class="middle" id="enter">

              <ScriptComponent event_type="enter" />

            </FilesBoxComponent>
            <FilesBoxComponent @tab_select="trigger_events('exit')" :tabs="show_send_now_btn(exit_files_ref)"
              :add_btn="false" @delete="delete_event_exit" :standard_delete="false" :can_delete="isAdmin"
              v-if="display_events" :list="exit_files_ref" group="files" :draggable="isAdmin" title="On Exit"
              class="middle" id="exit">

              <ScriptComponent event_type="exit" />

            </FilesBoxComponent>
            <div v-if="!display_events" id="middle-placeholder" class="middle border center-div">
              <h2 class="unselected-text">Please select a <strong>glider</strong> and <strong>geofence</strong></h2>
            </div>
            <FilesBoxComponent @tab_rename="rename_tab_category" @tab_select="select_file_tab"
              :tabs="filesStore.categories" :tab_sort_key="'category'" @add_btn="add_file" @delete="delete_file"
              :move="fileMoveCallback" :sort="false" :list="files_arr"
              :group="{ name: 'files', pull: 'clone', put: false }" :draggable="isAdmin" :add_btn="isAdmin"
              :can_delete="isAdmin" :tabs_disabled="!isAdmin" title="All Files" id="total" />
            <input multiple type="file" id="file-upload" ref="fileUpload" @change="upload_files_wrapper"
              :disabled="!isAdmin">
          </div>
        </div>
        <LogComponent id="logs" />
      </main>
    </div>
    <LoginComponent v-if="!loggedin" />
    <UserManagementComponent v-if="showUserManagement && isAdmin" @close="showUserManagement = false"/>
  </div>
</template>

<style scoped>
.logo {
  display: block;
  margin: 0 auto 2rem;
}

#main-flex {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  /* height: 670px; */
}

#side {
  display: flex;
  flex-wrap: wrap;
  /* gap: 1rem; */
}

#geo {
  width: 100%;
  height: 15rem;
  margin-bottom: .5rem;
}

#total {
  width: 100%;
  height: 8rem;
  margin-top: .5rem;
}

.middle {
  /* flex-grow: 1; */
  /* max-width: 50%; */
  /* width: 48%; */
  flex: 1;
  height: 12rem;
  flex-basis: 48%;
  max-width: 49.3%;
}

#middle-placeholder {
  max-width: 100%;

}

#exit {
  margin-left: .5rem;
}

header {
  width: 100%;
}

#logs {
  width: 100%;
}

.unselected-text {
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
