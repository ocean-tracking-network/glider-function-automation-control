<script setup lang="ts" generic="T">
import type { FileBoxType } from '@/lib/types';
import { useFilesStore } from '@/stores/files';
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  element: FileBoxType<T>
  canDelete?: boolean
  canEdit?: boolean
  selected?: boolean
}>(), {
  canDelete: true,
  canEdit: false,
  selected: false,
})

const emit = defineEmits(["remove", "edit"])
const filesStore = useFilesStore()

const styleColor = computed(() => {
  return ('category' in props.element ? filesStore.colour_by_category[props.element.category as string] : '')
})

const elementName = computed(() => {
  if ('name' in props.element) return props.element.name
  if ('filename' in props.element) return props.element.filename
  return ''
})


</script>
<template>
  <div :class="{ border: true, selected: props.selected }">
    <p :style="{ color: styleColor }"
      :class="{ filename: true, bold: element.bold}">
      {{ elementName }}
    </p>
    <div class="buttons" v-if="(props.canEdit && props.selected) || (props.canDelete && props.selected)">
      <button v-if="props.canEdit && props.selected" @click.stop="emit('edit')" class="edit" aria-label="Edit geofence" title="Edit geofence"> ✎</button>
      <span class="divider" v-if="props.canDelete && props.canEdit && props.selected">|</span>
      <button v-if="props.canDelete && props.selected" @click.stop="emit('remove')" class="del" aria-label="Delete geofence" title="Delete geofence">🗑</button>
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

.buttons button,
.buttons .divider {
  margin: 0;
}

.buttons button {
  background: transparent;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #111;
  cursor: pointer;
    padding-left:6px;
  padding-right:6px ;
}

.buttons .divider {
  color: var(--color-text);
  opacity: .6;
  margin: 0 0.25rem;
  user-select: none;
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

.del:hover,
.edit:hover {
  color: limegreen;
}

.del:hover {
  color: red;
}

.view:hover {
  color: limegreen;
}

.bold {
  color: red;
}
</style>
