<script setup>
import { useFilesStore } from '@/stores/files';
import { computed } from 'vue';

const props = defineProps({
  element: Object,
  canDelete: {
    type: Boolean,
    default: true,
  },
  canEdit: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(["remove", "edit"])
const filesStore = useFilesStore()

const styleColor = computed(() => {
  return (props.element.category !== undefined ? filesStore.colour_by_category[props.element.category] : '')
})

const classBold = computed(() => {
  return (props.element.bold !== undefined ?  props.element.bold : false )
})

</script>
<template>
  <div :class="{ border: true, selected: props.selected }">
    <p :style="{ color: styleColor }"
      :class="{ filename: true, bold: classBold}">{{
        element.name }}</p>
    <div class="buttons" v-if="props.canDelete || (props.canEdit && props.selected)">
      <button v-if="props.canEdit && props.selected" @click.stop="emit('edit')" class="edit" aria-label="Edit geofence" title="Edit geofence">✎</button>
      <!-- <button class="view">👁</button> -->
      <button v-if="props.canDelete" @click.stop="emit('remove')" class="del">X</button>
    </div>
  </div>
</template>
<style scoped>
.border {
  /* margin-top: .5rem; */
  display: flex;
  justify-content: space-between;
  transition: .2s;
  border-bottom-width: 1px;
  margin: auto;
  padding: .2rem;
}

.filename {
  padding: 0;
}

.buttons button {
  margin-left: .5rem;
  /* font-size: larger; */
}

.border:hover {
  transition: .2s;
  border-color: lightblue;
}

.selected {
  font-weight: bold;
  background-color: var(--color-border-hover);
  border-color: var(--color-text);
}

.del:hover {
  color: red;
}

.edit:hover {
  color: limegreen;
}

.edit {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #111;
}

.view:hover {
  color: limegreen;
}

.bold {
  color: red;
}
</style>
