<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const version_number = "0.2.1"
const userStore = useUserStore();

function logout() {
  userStore.logout();
}
</script>

<template>
  <div class="header-wrapper">
    <div class="header-title">
      <h1>Glider Function Automation Control (GFAC)<small>v{{ version_number }}</small></h1>
    </div>
    <div class="login-badge-container" v-if="userStore.loggedin">
      <div class="badge">
        <div class="user-info">
          <span class="username">{{ userStore.username }}</span>
          <span class="role" :class="userStore.role">{{ userStore.role }}</span>
        </div>
        <button class="logout-btn" @click="logout">Logout</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  padding: 0 1rem;
}

.header-title {
  flex: 1;
  text-align: center;
}

h1 {
  font-size: x-large;
  margin: 0;
}

small {
  font-size: x-small;
  margin-left: 5px;
}

.login-badge-container {
  display: flex;
  justify-content: flex-end;
  padding: 0;
}

.badge {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, var(--color-background-mute), var(--color-background));
  border: 2px solid var(--color-border-hover);
  border-radius: 2rem;
  padding: 0.5rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.username {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
}

.role {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role.admin {
  background-color: #ff6b6b;
  color: white;
}

.role.viewer {
  background-color: #4dabf7;
  color: white;
}

.logout-btn {
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background-color: var(--color-border-hover);
  border-color: var(--color-text);
  color: var(--color-text);
}

.logout-btn:active {
  transform: scale(0.98);
}

@media (max-width: 768px) {
  .header-wrapper {
    flex-direction: column;
    gap: 1rem;
  }

  .header-title {
    text-align: center;
  }
}
</style>
