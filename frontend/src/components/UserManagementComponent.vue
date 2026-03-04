<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore()

const newUsername = ref("")
const newPassword = ref("")
const newRole = ref("viewer")
const message = ref("")
const messageType = ref("") // 'success' or 'error'

async function createUser() {
  if (!newUsername.value || !newPassword.value) {
    message.value = "Username and password are required"
    messageType.value = "error"
    return
  }

  if (newPassword.value.length < 3) {
    message.value = "Password must be at least 3 characters"
    messageType.value = "error"
    return
  }

  const result = await userStore.createUser(newUsername.value, newPassword.value, newRole.value)

  if (result.success) {
    message.value = `User '${newUsername.value}' created successfully as ${newRole.value}`
    messageType.value = "success"
    // Clear form
    newUsername.value = ""
    newPassword.value = ""
    newRole.value = "viewer"

    // Clear message after 3 seconds
    setTimeout(() => {
      message.value = ""
      messageType.value = ""
    }, 3000)
  } else {
    message.value = result.error || "Failed to create user"
    messageType.value = "error"
  }
}
</script>

<template>
  <div id="user-management-container" class="border">
    <h2 id="header">Create New User</h2>
    <div class="message" :class="messageType" v-if="message">
      {{ message }}
    </div>
    <div>
      <form @submit.prevent="createUser">
        <input
          v-model="newUsername"
          type="text"
          id="new-username"
          placeholder="Username"
          autocomplete="off"
        >
        <br>
        <input
          v-model="newPassword"
          type="password"
          id="new-password"
          placeholder="Password (min 3 chars)"
          autocomplete="new-password"
        >
        <br>
        <div class="role-selector">
          <label class="role-option">
            <input
              type="radio"
              v-model="newRole"
              value="viewer"
              name="role"
            >
            <span class="role-label">Viewer</span>
          </label>
          <label class="role-option">
            <input
              type="radio"
              v-model="newRole"
              value="admin"
              name="role"
            >
            <span class="role-label">Admin</span>
          </label>
        </div>
        <br>
        <button type="submit" class="border">Create User</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
#user-management-container {
  background-color: var(--color-background);
  padding: 2rem;
  text-align: center;
  min-width: 300px;
}

#header {
  margin-bottom: 1.5rem;
  font-size: large;
}

.message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 5px;
  font-size: 0.9rem;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

button {
  transition: .3s;
  cursor: pointer;
  padding: 0.5rem 1.5rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
}

button:hover {
  transition: .3s;
  background-color: var(--color-border-hover);
}

input[type="text"],
input[type="password"] {
  margin-bottom: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 3px;
  color: var(--color-text);
  border-color: lightgray;
  border-width: 1px;
  padding: .5rem;
  width: 100%;
  max-width: 250px;
  box-sizing: border-box;
}

.role-selector {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.role-option input[type="radio"] {
  cursor: pointer;
  margin: 0;
  width: auto;
}

.role-label {
  font-weight: 500;
  color: var(--color-text);
}
</style>
