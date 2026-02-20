<script setup>
import { ref } from 'vue';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';

const gliderStore = useGlidersStore()
const userStore = useUserStore()
const { gliders, selected_glider_idx } = storeToRefs(gliderStore)
const { isAdmin } = storeToRefs(userStore)

const new_glider_name = ref('')
const selected_delete = ref({})
const add_prompt = ref(false)
const delete_prompt = ref(false)
const error_msg = ref('')

function enable_disable_glider() {
  if (!isAdmin.value) {
    return
  }
  gliderStore.enable_disable_selected_glider()
}

function add_glider() {
  const name = new_glider_name.value.trim()

  if (!name) {
    error_msg.value = 'Invalid: Name is empty'
    return
  }
  if (name.includes(' ')) {
    error_msg.value = 'Invalid: Name cannot include spaces'
    return
  }
  if (gliders.value.some((glider) => glider.name === name)) {
    error_msg.value = `Invalid: "${name}" is already taken`
    return
  }

  gliderStore.save_glider(name)
  error_msg.value = ''
  add_prompt.value = ''
  new_glider_name.value = ''
}
</script>
<template>
  <div class="border tab-border">
    <div id="button-div">
      <button v-for="(glider, index) in gliders" :class="{ selected: selected_glider_idx == index, gliders: true }"
        @click="gliderStore.select_glider(index)">
        <input v-model="glider.enabled" @change="enable_disable_glider"
          :disabled="!isAdmin || selected_glider_idx != index"
          class="enable" type="checkbox">
        {{ glider.name }}
        <button v-if="isAdmin && gliders[selected_glider_idx]._id == glider._id"
          @click="selected_delete = glider; delete_prompt = true" class="x-btn">X</button>
      </button>
      <button v-if="isAdmin" class="gliders" id="add" @click="add_prompt = true">+</button>
    </div>
  </div>

  <Teleport defer to="#main-flex">
    <div v-if="isAdmin && add_prompt" class="border modal">
        <h2 class="modal-header">Add a New Glider</h2>
        <form action="">
          <p v-if="error_msg" class="danger">{{ error_msg }}</p>
          <input v-model="new_glider_name" type="text" placeholder="Enter Glider Name">
          <br>
          <button v-if="isAdmin" type="button" class="border" @click="add_glider()">Add</button>
          <button type="button" class="border"
            @click="error_msg = ''; new_glider_name = ''; add_prompt = false">Cancel</button>
        </form>
    </div>
  </Teleport>

  <Teleport defer to="#main-flex">
    <div v-if="isAdmin && delete_prompt" class="border modal">
        <h2 class="modal-header">Are You Sure You Want to Delete Glider: {{ selected_delete.name ?? delete_prompt == false}}</h2>
        <form action="">
          <button type="button" class="border danger"
            @click="gliderStore.delete_glider(selected_delete); delete_prompt = false">Delete</button>
          <button type="button" class="border"
            @click="selected_delete = {}; delete_prompt = false">Cancel</button>
        </form>
    </div>
  </Teleport>
</template>
<style scoped>
#tab-body {
  width: 100%;
  height: 2rem;
  border-width: 2px;
}

.tab-border {
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

.danger {
  color: red;
}

.modal {
  background-color: var(--color-background);
  padding: 2rem;
  text-align: center;
  width: 300px;

  position: fixed;
  top: 30%;
  left: 50%;
  z-index: 1000;
  transform: translate(-50%, -50%);
}

.modal-header {
  margin-bottom: 2rem;
  font-size: x-large;
}

form button {
  transition: .3s;
  /* float: left; */
  /* margin: 1rem 0 0 2rem; */
  width: 30%;
  display: inline;
  margin: 10%;
}

form button:hover {
  transition: .3s;
  background-color: var(--color-border-hover);
}

input {
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border-radius: 3px;
  border-color: lightgray;
  border-width: 1px;
  padding: .2rem;
}


</style>
