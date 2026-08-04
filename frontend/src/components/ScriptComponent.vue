<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DropDownComponent from './DropDownComponent.vue';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useScriptsStore } from '@/stores/scripts';
import { useEventsStore } from '@/stores/events';
import { useUserStore } from '@/stores/user';
import type { EventType } from '@/lib/types';

const props = defineProps<{event_type: EventType}>()
const selected = ref<string | null>(null)

const NONE_TEXT = "None"

const gliderStore = useGlidersStore()
const scriptsStore = useScriptsStore()
const eventsStore = useEventsStore()
const userStore = useUserStore()
const { scripts } = storeToRefs(scriptsStore)
const { selected_glider } = storeToRefs(gliderStore)
const { isAdmin } = storeToRefs(userStore)
const { selected_glider_event_scripts } = storeToRefs(eventsStore)

onMounted(() => {
  update_scripts()
})

watch(selected_glider_event_scripts, () => {
  update_scripts()
})

function update_scripts() {
  // const 
  console.log(selected_glider_event_scripts.value)
  console.log(selected_glider_event_scripts.value[props.event_type])
  selected.value = selected_glider_event_scripts.value[props.event_type]?.script ?? NONE_TEXT
}

function get_script_type(script_name: string) {
  if (!selected_glider.value) return
  const user_script_index = scripts.value[selected_glider.value.name]?.user?.indexOf(script_name)
  if (user_script_index !== undefined && user_script_index !== -1) {
    return "user"
  }
  const factory_script_index = scripts.value[selected_glider.value.name]?.factory?.indexOf(script_name)
  if (factory_script_index !== undefined && factory_script_index !== -1) {
    return "factory"
  }
  console.log("WARNING, SCRIPT DOESN'T EXIST?")
}

function on_select(option: string) {
  if (!isAdmin.value) {
    return
  }
  const selected_script_event = selected_glider_event_scripts.value[props.event_type]
  if (option === NONE_TEXT && selected_script_event) {
    eventsStore.remove_event(selected_script_event._id)
  } else if (option !== NONE_TEXT) {
    eventsStore.add_event(props.event_type, { script: option, script_type: get_script_type(option) })
  }
  selected.value = option;
}

const combined_options = computed<string[]>(() => {
  if (!selected_glider.value) return []
  const selected_glider_scripts = scripts.value[selected_glider.value.name]
  try {
    return [NONE_TEXT, ...(selected_glider_scripts?.factory ?? []), ...(selected_glider_scripts?.user ?? [])]
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
      <DropDownComponent :selected="selected" @select="on_select" :default="NONE_TEXT" :options="combined_options"
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
