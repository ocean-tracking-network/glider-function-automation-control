<script setup>
import { compile, computed, onMounted, ref, watch } from 'vue';
import DropDownComponent from './DropDownComponent.vue';
import apiClient from '@/apiClient';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useScriptsStore } from '@/stores/scripts';
import { useEventsStore } from '@/stores/events';


const props = defineProps(['event_type'])
const options = ref([])
const selected = ref("")

const non_text = "None"

const gliderStore = useGlidersStore()
const scriptsStore = useScriptsStore()
const eventsStore = useEventsStore()
const { scripts } = storeToRefs(scriptsStore)
const { selected_glider } = storeToRefs(gliderStore)

onMounted(() => {
  update_scripts()
})

watch(selected_glider, () => {
  console.log("SCRIPT COMPONENT WATCH")
  update_scripts()
})

function update_scripts() {
  const selected_script_event = eventsStore.selected_glider_scripts
  if (selected_script_event[props.event_type]) {
    selected.value = selected_script_event[props.event_type].script
  }
  else {
    selected.value = non_text
  }
}

function get_script_type(script_name) {
  const user_script_index = scripts.value[selected_glider.value.name].user.indexOf(script_name)
  if (user_script_index != -1) {
    return "user"
  }
  const factory_script_index = scripts.value[selected_glider.value.name].factory.indexOf(script_name)
  if (factory_script_index != -1) {
    return "factory"
  }
  console.log("WARNING, SCRIPT DOESN'T EXIST?")
}

function on_select(option) {
  const selected_script_event = eventsStore.selected_glider_scripts[props.event_type]
  if (option == non_text && selected_script_event) {
    eventsStore.remove_event(selected_script_event._id)
  } else {
    eventsStore.add_event(props.event_type, { script: option, script_type: get_script_type(option) })
  }
  selected.value = option;
}


const combined_options = computed(() => {
  const selected_glider_scripts = scripts.value[selected_glider.value.name]
  try {
    return [non_text, ...selected_glider_scripts.factory, ...selected_glider_scripts.user]
  } catch (err) {
    console.log("Cannot combine files" + err)
    return []
  }
})


</script>
<template>
  <div style="width: 100%;">
    <hr>
    <div class="dropdown-container">
      <strong>Selected Script:</strong>
      <DropDownComponent :selected="selected" @select="on_select" :default="non_text" :options="combined_options" />
    </div>
  </div>
</template>
<style scoped>
.dropdown-container {
  /* background-color: red; */
  width: 100%;
  display: flex;
  gap: 1rem;
  /* height: 100%; */
}

hr {
  width: 100%;
}
</style>
