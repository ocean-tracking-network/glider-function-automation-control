<script setup lang="ts" generic="T">
import { onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue';
import draggable from 'vuedraggable';
import type { FileBoxType } from '@/lib/types';

const props = withDefaults(defineProps<{
  isDraggable: boolean
  group?: object | string
  list: FileBoxType<T>[]
  sort: boolean
  can_delete: boolean
  can_edit: boolean
}>(), {
  isDraggable: true,
  sort: true,
  can_delete: true,
  can_edit: false,
})

const emit = defineEmits<{
  click: [list_element: FileBoxType<T>]
  dblclick: [list_element: FileBoxType<T>]
  delete: [list_element: FileBoxType<T>]
  edit: [list_element: FileBoxType<T>]
}>()

const sortRef = ref()
const groupRef = ref()

onMounted(() => {
  if (props.sort != undefined) {
    sortRef.value = props.sort
  } else {
    sortRef.value = true
  }

  if (!props.isDraggable) {
    groupRef.value = {
      name: "no-dragable",
      pull: false,
      clone: false,
      put: false,
    }
    sortRef.value = false
  } else {
    groupRef.value = props.group
  }
})

function delete_element(element: FileBoxType<T>) {
  if (!props.can_delete) return
  emit("delete", element)
}

</script>

<template>
  <draggable :sort="sortRef" :list="list" :group="groupRef" itemKey="id" class="list-group files-container">
    <template #item="{ element }">
      <a class="clickable" href="#" @click.prevent="emit('click', element)" @dblclick.prevent="emit('dblclick', element)">
        <FileComponent :canDelete="props.can_delete" :canEdit="props.can_edit" :selected="element.selected" @remove="delete_element(element)" @edit="emit('edit', element)" :element="element"
          class="files list-group-item" />
      </a>
    </template>
  </draggable>
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
