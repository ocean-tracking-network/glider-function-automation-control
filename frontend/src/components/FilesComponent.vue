<script setup>
// import apiClient from '@/apiClientClient';
import { onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue'

const files = ref([]);

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
