<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import ModalComponent from './ModalComponent.vue';

const userStore = useUserStore()

const username = ref("")
const password = ref("")

function login() {
  userStore.login(username.value, password.value)

  password.value = ""
}

</script>
<template>
  <ModalComponent header="GFAC Login" :blur="true" @confirm="login">
    <form action="">
      <input v-model="username" type="text" id="username" placeholder="username">
      <br>
      <input v-model="password" type="password" id="password" placeholder="password">
      <br>
      <button type="button" @click="login">Login</button>
    </form>
  </ModalComponent>
</template>
