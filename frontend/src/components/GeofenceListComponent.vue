<script setup lang="ts">
import GeofenceRowComponent from './GeofenceRowComponent.vue';
import type { FileBoxType, Geofence } from '@/lib/types';

const props = withDefaults(defineProps<{
  list: FileBoxType<Geofence>[]
  can_delete?: boolean
  can_edit?: boolean
}>(), {
  can_delete: true,
  can_edit: false,
})

const emit = defineEmits<{
  click: [list_element: FileBoxType<Geofence>]
  dblclick: [list_element: FileBoxType<Geofence>]
  delete: [list_element: FileBoxType<Geofence>]
  edit: [list_element: FileBoxType<Geofence>]
}>()

function delete_element(element: FileBoxType<Geofence>) {
  if (!props.can_delete) return
  emit("delete", element)
}

</script>

<template>
  <div class="list-group files-container">
    <a v-for="element in list" :key="element.key ?? element.name" class="clickable" href="#"
      @click.prevent="emit('click', element)" @dblclick.prevent="emit('dblclick', element)">
      <GeofenceRowComponent :canDelete="props.can_delete" :canEdit="props.can_edit" :selected="element.selected"
        @remove="delete_element(element)" @edit="emit('edit', element)" :element="element"
        class="files list-group-item" />
    </a>
  </div>
</template>

<style scoped>
.files-container {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: .5rem;
  overflow-y: scroll;
  overflow-x: scroll;
  margin-top: .5rem;
  min-height: 30%;
}

.files {
  width: auto;
  padding: .3rem;
}
</style>
