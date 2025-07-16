<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore()

const username = ref("")
const password = ref("")

function login() {
  userStore.login(username.value, password.value)

  password.value = ""
}


</script>
<template>
  <div id="main-container" class="border">
    <h2 id="header">GFAC Login</h2>
    <div>
      <form action="">
        <!-- <label for="username">Username:</label> -->
        <input v-model="username" type="text" id="username" placeholder="username">

        <br>
        <!-- <label for="password">Password:</label> -->
        <input v-model="password" type="password" id="password" placeholder="password">
        <br>
        <button type="button" class="border" @click="login">Login</button>
      </form>
    </div>
  </div>
</template>
<style scoped>
#main-container {
  background-color: var(--color-background);
  padding: 2rem;
  text-align: center;
}

#header {
  margin-bottom: 2rem;
  font-size: x-large;
}

button {
  transition: .3s;
}

button:hover {
  transition: .3s;
  background-color: var(--color-border-hover);
}

input {
  margin-bottom: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 3px;
  /* color: lightgray; */
  color: var(--color-text);
  border-color: lightgray;
  border-width: 1px;
  padding: .2rem;
}
</style>
