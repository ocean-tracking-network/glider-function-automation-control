<script setup>
import { computed, onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue';
import draggable from 'vuedraggable'

const props = defineProps({
  draggable: {
    type: Boolean,
    default: true,
  },
  group: [Object, String],
  list: Array,
  sort: {
    type: Boolean,
    default: true,
  },
  can_delete: {
    type: Boolean,
    default: true,
  },
  move: Function,
})

const emit = defineEmits(['click', 'delete'])

const sort = ref()
const group = ref()

onMounted(() => {
  if (props.sort != undefined) {
    sort.value = props.sort
  } else {
    sort.value = true
  }

  if (!props.draggable) {
    group.value = {
      name: "no-dragable",
      pull: false,
      clone: false,
      put: false,
    }
    sort.value = false
  } else {
    group.value = props.group
  }
})

function delete_element(index, element_id) {
  if (!props.can_delete) {
    return
  }
  emit("delete", element_id)
  props.list.splice(index, 1)
}
</script>

<template>
  <draggable :sort="sort" :list="list" :group="group" itemKey="id" class="list-group files-container">
    <template #item="{ element, index }">
      <a class="clickable" href="#" @click.prevent="emit('click', element)">
        <FileComponent :canDelete="props.can_delete" @remove="delete_element(index, element)" :element="element"
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
