<script setup>
import { compile, computed, onMounted, ref } from 'vue';
import DropDownComponent from './DropDownComponent.vue';
import apiClient from '@/apiClient';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useScriptsStore } from '@/stores/scripts';
const options = ref([])
const selected = ref("")


const gliderStore = useGlidersStore()
const scriptsStore = useScriptsStore()
const { scripts } = storeToRefs(scriptsStore)
const { selected_glider } = storeToRefs(gliderStore)

onMounted(() => {
})

function on_select(option){
  selected.value = option;
}


const combined_options = computed(() => {
  const selected_glider_scripts = scripts.value[selected_glider.value.name]
  return [...selected_glider_scripts.factoryScripts, ...selected_glider_scripts.userScripts]
})


</script>
<template>
  <div style="width: 100%;">
    <hr>
  <div class="dropdown-container">
    <strong>Selected Script:</strong>
    <DropDownComponent :selected="selected" @select="on_select" default="No Script" :options="combined_options" />
  </div>
  </div>
</template>
<style scoped>
.dropdown-container{
  /* background-color: red; */
  width: 100%;
  display: flex;
  gap: 1rem;
  /* height: 100%; */
}
hr{
  width: 100%;
}
</style>
