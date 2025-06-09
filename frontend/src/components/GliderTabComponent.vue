<script setup>
import { onMounted } from 'vue';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';

const gliderStore = useGlidersStore()
const { gliders, selected_glider_idx } = storeToRefs(gliderStore)

onMounted(() => {
  gliderStore.get_gliders()
})

function enable_disable_glider() {
  gliderStore.enable_disable_selected_glider()
}

</script>
<template>
  <div class="border">
    <div id="button-div">
      <button v-for="(glider, index) in gliders" :class="{ selected: selected_glider_idx == index, gliders: true }"
        @click="gliderStore.select_glider(index)">
        <input v-model="glider.enabled" @change="enable_disable_glider" :disabled="selected_glider_idx != index"
          class="enable" type="checkbox">
        {{ glider.name }}
      </button>
      <button class="gliders" id="add">
        +
      </button>
    </div>
    <!-- <button id="add">+</button> -->
  </div>
</template>
<style scoped>
#tab-body {
  width: 100%;
  height: 2rem;
  border-width: 2px;
}

.border {
  border-bottom-width: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0;
}

#button-div {
  display: flex;
  flex-wrap: nowrap;
}

#add {
  width: 2rem;
  font-size: x-large;
  padding-top: 0;
  padding-bottom: 0;
  /* border-color: white;
  border-width: 2px;
  width: 2rem;
  border-radius: 5px;
  margin: .5rem; */
}

#add:hover {
  border-color: limegreen;
}

.selected {
  /* color: white; */
  font-weight: bold;

}

.gliders {
  border-right-width: 2px;
  /* border-right-color: white; */
  border-right-color: var(--color-text);
  padding: .5rem;
  width: 110px;
  /* width: ; */
}

.gliders:hover {
  /* color: lightgray; */
  color: var(--color-border-hover);
  transition: .2s;
}

.enable {
  margin-right: .5rem;
}
</style>
