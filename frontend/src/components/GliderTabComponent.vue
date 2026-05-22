<script setup lang="ts">
import { ref } from 'vue';
import { useGlidersStore } from '@/stores/gliders';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import ModalComponent from './ModalComponent.vue';
import type { Glider } from '@/lib/types';

const gliderStore = useGlidersStore()
const userStore = useUserStore()
const { gliders, selected_glider_id } = storeToRefs(gliderStore)
const { isAdmin } = storeToRefs(userStore)

const show_add_modal = ref(false)
const new_glider_name = ref('')
const error_msg = ref('')

const selected_delete = ref<Glider | null>(null)

function enable_disable_glider() {
  if (!isAdmin.value) return

  gliderStore.enable_disable_selected_glider()
}

function add_glider() {
  if (!isAdmin.value) return

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
  hide_add_modal()
}

function delete_glider() {
  if (!isAdmin.value) return

  if (!selected_delete.value) return
  gliderStore.delete_glider(selected_delete.value)
  selected_delete.value = null
}

function hide_add_modal() {
  show_add_modal.value = false
  new_glider_name.value = ''
  error_msg.value = ''
}
</script>
<template>
  <ModalComponent v-if="show_add_modal"
    header="Add a New Glider"
    @close="hide_add_modal()"
    @confirm="add_glider()"
  >
    <form @submit.prevent="add_glider()">
      <p v-if="error_msg" class="danger">{{ error_msg }}</p>
      <input v-model="new_glider_name" type="text" placeholder="Enter Glider Name">
      <br>
      <button type="submit">Add</button>
      <button type="button" @click="hide_add_modal()">Cancel</button>
    </form>
  </ModalComponent>

  <ModalComponent v-if="selected_delete" :blur="true" @close="selected_delete = null">
    <h2>Are You Sure You Want to Delete Glider: {{ selected_delete.name }}</h2>
    <form action="">
      <button type="button" class="danger" @click="delete_glider()">Delete</button>
      <button type="button" @click="selected_delete = null">Cancel</button>
    </form>
  </ModalComponent>

  <div class="border tab-border">
    <div id="button-div">
      <button v-for="glider in gliders"
        :key="glider._id"
        :class="{ selected: selected_glider_id === glider._id, gliders: true }"
        @click="gliderStore.select_glider(glider._id)"
      >
        <input v-model="glider.enabled"
          @change="enable_disable_glider"
          :disabled="!isAdmin || selected_glider_id !== glider._id"
          class="enable" type="checkbox"
        >
        {{ glider.name }}
        <button v-if="isAdmin && selected_glider_id === glider._id"
          @click="selected_delete = glider"
          class="x-btn"
        >X</button>
      </button>
    </div>
    <button v-if="isAdmin" class="add-btn" @click="show_add_modal = true">+</button>
  </div>
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
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.add-btn {
  flex: 0 0 auto;
  width: 2rem;
  font-size: x-large;
  padding-top: 0;
  padding-bottom: 0;
  border-left: 2px solid var(--color-text);
}

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
  flex: 0 0 auto;
  white-space: nowrap;
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
</style>
