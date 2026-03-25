<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import ModalComponent from './ModalComponent.vue';

const version_number = "0.2.1"
const userStore = useUserStore();
const emit = defineEmits(['toggle-user-management']);
const menuOpen = ref(false);
const showDeleteModal = ref(false);
const deleteUsername = ref('');
const deleteMessage = ref('');
const deleteMessageType = ref('');
const deleting = ref(false);

function logout() {
  userStore.logout();
  menuOpen.value = false;
}

function openUserManagement() {
  emit('toggle-user-management');
  menuOpen.value = false;
}

async function deleteUser() {
  showDeleteModal.value = true;
  deleteUsername.value = '';
  deleteMessage.value = '';
  deleteMessageType.value = '';
  menuOpen.value = false;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deleteUsername.value = '';
  deleteMessage.value = '';
  deleteMessageType.value = '';
}

async function confirmDeleteUser() {
  const normalizedUsername = deleteUsername.value.trim();

  if (!normalizedUsername) {
    deleteMessage.value = 'Username is required';
    deleteMessageType.value = 'error';
    return;
  }

  deleting.value = true;
  const existsResult = await userStore.userExists(normalizedUsername);
  deleting.value = false;

  if (!existsResult.success) {
    deleteMessage.value = existsResult.error || 'Failed to validate user';
    deleteMessageType.value = 'error';
    return;
  }

  if (!existsResult.exists) {
    deleteMessage.value = 'User not found';
    deleteMessageType.value = 'error';
    return;
  }

  const confirmed = window.confirm(`Delete '${normalizedUsername}'? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  deleting.value = true;
  const result = await userStore.deleteUser(normalizedUsername);
  deleting.value = false;

  if (result.success) {
    deleteMessage.value = `User '${normalizedUsername}' deleted successfully`;
    deleteMessageType.value = 'success';
    deleteUsername.value = '';
  } else {
    deleteMessage.value = result.error || 'Failed to delete user';
    deleteMessageType.value = 'error';
  }
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
            <button v-if="userStore.isAdmin" class="menu-item delete-item" @click="deleteUser">
              Delete User
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
  <ModalComponent
    v-if="showDeleteModal"
    header="Delete User"
    :blur="true"
    @close="closeDeleteModal"
    @confirm="confirmDeleteUser"
  >
    <div class="delete-user-modal">
      <div class="modal-message" :class="deleteMessageType" v-if="deleteMessage">
        {{ deleteMessage }}
      </div>
      <input
        v-model="deleteUsername"
        type="text"
        placeholder="Username"
        autocomplete="off"
      >
      <p class="delete-user-note">This action permanently deletes the account.</p>
      <div class="modal-actions">
        <button type="button" class="danger-btn" @click="confirmDeleteUser" :disabled="deleting">
          {{ deleting ? 'Deleting...' : 'Delete User' }}
        </button>
        <button type="button" @click="closeDeleteModal" :disabled="deleting">Close</button>
      </div>
    </div>
  </ModalComponent>
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

.menu-item.delete-item {
  color: #ff6b6b;
}

.menu-item.delete-item:hover {
  background-color: rgba(255, 107, 107, 0.1);
}

.menu-item.logout-item {
  border-top: 1px solid var(--color-border);
  color: #ff6b6b;
}

.menu-item.logout-item:hover {
  background-color: rgba(255, 107, 107, 0.1);
}

.delete-user-modal {
  width: 100%;
  box-sizing: border-box;
}

.modal-message {
  padding: 0.75rem;
  margin: -1rem 0 1rem;
  border-radius: 5px;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.modal-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.modal-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.modal-message.warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.delete-user-note {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-actions button {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.danger-btn {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
