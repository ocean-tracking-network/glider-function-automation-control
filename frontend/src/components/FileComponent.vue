<script setup>
const props = defineProps(['element'])
const emit = defineEmits(["remove"])
</script>
<template>
  <div class="border">
    <p :class="{ filename: true, bold: element.bold }">{{ element.name }}</p>
    <div class="buttons">
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
