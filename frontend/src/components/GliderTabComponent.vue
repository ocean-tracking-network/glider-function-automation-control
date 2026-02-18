<script setup>
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';

const gliderStore = useGlidersStore()
const { gliders, selected_glider_idx } = storeToRefs(gliderStore)

function enable_disable_glider() {
  gliderStore.enable_disable_selected_glider()
}

function add_glider_prompt() {
  const rawName = prompt('Please enter new glider name', '')
  if (rawName === null) {
    return
  }

  const name = rawName.trim()

  if (!name) {
    alert('Invalid: Name is empty')
    return
  }
  if (name.includes(' ')) {
    alert('Invalid: Name cannot include spaces')
    return
  }
  if (gliders.value.some((glider) => glider.name === name)) {
    alert(`Invalid: "${name}" is already taken`)
    return
  }

  if (!confirm(`Are you sure you want to create glider '${name}''`)) {
    return
  }

  gliderStore.save_glider(name)
}
function delete_glider_prompt(glider) {
  if (confirm(`Are you sure you want to delete glider ${glider.name}`)) {
    gliderStore.delete_glider(glider)
  }
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
        <button v-if="gliders[selected_glider_idx]._id == glider._id" @click="delete_glider_prompt(glider)" class="x-btn">X</button>
      </button>
      <button class="gliders" id="add" @click="add_glider_prompt()">+</button>
    </div>
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
}

/* #add:hover {
  border-color: limegreen;
} */

.x-btn:hover {
  transition: .2s;
  color: red;
}

.x-btn {
  height: 1px;
  padding-left: 4px;
}

.selected {
  font-weight: bold;
  background-color: var(--color-border-hover);

}

.gliders {
  border-right-width: 2px;
  border-right-color: var(--color-text);
  padding: .5rem;
  width: 110px;
}

.gliders:hover {
  color: var(--color-border-hover);
  transition: .2s;
}

.enable {
  margin-right: .5rem;
}
</style>
