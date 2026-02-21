<script setup>
import { useFilesStore } from '@/stores/files';
import { computed } from 'vue';

const props = defineProps({
  element: Object,
  canDelete: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(["remove"])
const filesStore = useFilesStore()

const styleColor = computed(() => {
  return (props.element.category !== undefined ? filesStore.colour_by_category[props.element.category] : '')
})

const classBold = computed(() => {
  return (props.element.bold !== undefined ?  props.element.bold : false )
})

</script>
<template>
  <div class="border">
    <p :style="{ color: styleColor }"
      :class="{ filename: true, bold: classBold}">{{
        element.name }}</p>
    <div class="buttons" v-if="props.canDelete">
      <!-- <button class="view">👁</button> -->
      <button @click="emit('remove')" class="del">X</button>
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

p {
  /* font-size: large; */
}

.buttons button {
  margin-left: .5rem;
  /* font-size: larger; */
}

.border:hover {
  transition: .2s;
  border-color: lightblue;
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
