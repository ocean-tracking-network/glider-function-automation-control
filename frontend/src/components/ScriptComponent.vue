<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DropDownComponent from './DropDownComponent.vue';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useScriptsStore } from '@/stores/scripts';
import { useEventsStore } from '@/stores/events';
import { useUserStore } from '@/stores/user';
import type { EventType } from '@/lib/types';


// const props = defineProps(['event_type'])
const props = defineProps<{event_type: EventType}>()
const selected = ref<string | null>(null)

const non_text = "None"

const gliderStore = useGlidersStore()
const scriptsStore = useScriptsStore()
const eventsStore = useEventsStore()
const userStore = useUserStore()
const { scripts } = storeToRefs(scriptsStore)
const { selected_glider } = storeToRefs(gliderStore)
const { isAdmin } = storeToRefs(userStore)

onMounted(() => {
  update_scripts()
})

watch(selected_glider, () => {
  console.log("SCRIPT COMPONENT WATCH")
  update_scripts()
})

function update_scripts() {
  const selected_script_event = eventsStore.selected_glider_scripts
  selected.value = selected_script_event[props.event_type]?.script ?? non_text
}

function get_script_type(script_name: string) {
  if (!selected_glider.value) return
  const user_script_index = scripts.value[selected_glider.value.name]?.userScripts?.indexOf(script_name)
  if (user_script_index && user_script_index != -1) {
    return "user"
  }
  const factory_script_index = scripts.value[selected_glider.value.name]?.factoryScripts?.indexOf(script_name)
  if (factory_script_index && factory_script_index != -1) {
    return "factory"
  }
  console.log("WARNING, SCRIPT DOESN'T EXIST?")
}

function on_select(option: string) {
  if (!isAdmin.value) {
    return
  }
  const selected_script_event = eventsStore.selected_glider_scripts[props.event_type]
  if (option === non_text && selected_script_event) {
    eventsStore.remove_event(selected_script_event._id)
  } else {
    eventsStore.add_event(props.event_type, { script: option, script_type: get_script_type(option) })
  }
  selected.value = option;
}


const combined_options = computed<string[]>(() => {
  if (!selected_glider.value) return []
  const selected_glider_scripts = scripts.value[selected_glider.value.name]
  try {
    return [non_text, ...(selected_glider_scripts?.factoryScripts ?? []), ...(selected_glider_scripts?.userScripts ?? [])]
  } catch (err) {
    console.log("Cannot combine options" + err)
    return []
  }
})


</script>
<template>
  <div style="width: 100%;">
    <hr>
    <div class="dropdown-container">
      <strong>Selected Script:</strong>
      <DropDownComponent :selected="selected" @select="on_select" :default="non_text" :options="combined_options"
        :disabled="!isAdmin" />
    </div>
  </div>
</template>
<style scoped>
.dropdown-container {
  width: 100%;
  display: flex;
  gap: 1rem;
}

hr {
  width: 100%;
}
</style>
