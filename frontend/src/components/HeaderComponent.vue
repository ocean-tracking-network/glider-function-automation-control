<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const version_number = "0.2.1"
const userStore = useUserStore();
const emit = defineEmits(['toggle-user-management']);
const menuOpen = ref(false);

function logout() {
  userStore.logout();
  menuOpen.value = false;
}

function openUserManagement() {
  emit('toggle-user-management');
  menuOpen.value = false;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
</script>

<template>
  <div class="header-wrapper">
    <div class="placeholder"></div>
    <div class="header-title">
      <h1>Glider Function Automation Control (GFAC)<small>v{{ version_number }}</small></h1>
    </div>
    <div class="login-badge-container" v-if="userStore.loggedin">
      <div class="badge">
        <div class="user-info">
          <span class="username">{{ userStore.username }}</span>
          <span class="role" :class="userStore.role">{{ userStore.role }}</span>
        </div>
        <div class="menu-container">
          <button class="hamburger-btn" @click="toggleMenu" :class="{ active: menuOpen }">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="dropdown-menu" v-if="menuOpen">
            <button v-if="userStore.isAdmin" class="menu-item" @click="openUserManagement">
              Create User
            </button>
            <button class="menu-item logout-item" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="placeholder" v-else></div>
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

.placeholder {
  flex: 1;
  height: 2.5rem;
  border: 2px solid transparent;
  border-radius: 2rem;
  padding: 0.5rem 1.5rem;
  box-sizing: border-box;
}

.header-title {
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

h1 {
  font-size: x-large;
  margin: 0;
  white-space: nowrap;
}

small {
  font-size: x-small;
  margin-left: 5px;
}

.login-badge-container {
  flex: 1;
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

.menu-container {
  position: relative;
}

.hamburger-btn {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.4rem;
  color: var(--color-text);
}

.hamburger-btn span {
  display: block;
  width: 1.5rem;
  height: 0.2rem;
  background-color: var(--color-text);
  border-radius: 0.1rem;
  transition: all 0.3s ease;
}

.hamburger-btn.active span:nth-child(1) {
  transform: rotate(45deg) translate(0.6rem, 0.6rem);
}

.hamburger-btn.active span:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.active span:nth-child(3) {
  transform: rotate(-45deg) translate(0.5rem, -0.5rem);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border-hover);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  text-align: left;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: var(--color-border-hover);
}

.menu-item.logout-item {
  border-top: 1px solid var(--color-border);
  color: #ff6b6b;
}

.menu-item.logout-item:hover {
  background-color: rgba(255, 107, 107, 0.1);
}

.manage-users-btn,
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

.manage-users-btn {
  /* background-color: #4caf50;
  color: white;
  border-color: #4caf50; */
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

.manage-users-btn:hover {
  background-color: #45a049;
  border-color: #45a049;
}

.logout-btn:hover {
  background-color: var(--color-border-hover);
  border-color: var(--color-text);
  color: var(--color-text);
}

.manage-users-btn:active,
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
