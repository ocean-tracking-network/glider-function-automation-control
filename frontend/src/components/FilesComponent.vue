<script setup lang="ts">
import { onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue'

const files = ref<{ filename: string}[]>([]);

onMounted(() => {
  //apiClient.get()
  files.value = [
    {
      filename: "file1"
    },
    {
      filename: "file2"
    }
  ]
})

</script>
<template>
  <div>
    <FileComponent v-for="file in files" :file="file" />
  </div>
</template>
<style scoped></style>
