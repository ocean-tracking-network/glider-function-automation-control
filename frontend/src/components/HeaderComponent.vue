<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useUserStore } from '@/stores/user';
import ModalComponent from './ModalComponent.vue';
import SmsSignupComponent from './SmsSignupComponent.vue';

const version_number = "0.2.1"
const userStore = useUserStore();
const emit = defineEmits(['toggle-user-management']);
const menuOpen = ref(false);
const menuContainer = ref(null);
const showDeleteModal = ref(false);
const showDeleteConfirmModal = ref(false);
const roleToDelete = ref('');
const userSearch = ref('');
const deleteUsername = ref('');
const deletableUsers = ref([]);
const loadingDeletableUsers = ref(false);
const deleteMessage = ref('');
const deleteMessageType = ref('');
const deleting = ref(false);
const showSmsSignupDrawer = ref(false);

const sortedDeletableUsers = computed(() => {
  return [...deletableUsers.value].sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === 'admin' ? -1 : 1;
    }
    return a.username.localeCompare(b.username);
  });
});

const usersForSelectedRole = computed(() => {
  return sortedDeletableUsers.value.filter((user) => user.role === roleToDelete.value);
});

const filteredUsersForSelectedRole = computed(() => {
  const searchText = userSearch.value.trim().toLowerCase();
  return usersForSelectedRole.value.filter((user) => {
    return user.username.toLowerCase().includes(searchText);
  });
});

const hasAdminUsers = computed(() => deletableUsers.value.some((user) => user.role === 'admin'));
const hasViewerUsers = computed(() => deletableUsers.value.some((user) => user.role === 'viewer'));
const isValidSelectedUser = computed(() => {
  return filteredUsersForSelectedRole.value.some((user) => user.username === deleteUsername.value);
});

const selectedUserLastLogin = computed(() => {
  const matchedUser = deletableUsers.value.find((user) => user.username === deleteUsername.value);
  return matchedUser?.lastLogin || null;
});

function formatLastLogin(dateString) {
  if (!dateString) return 'Never logged in';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function setDeleteMessage(type, text) {
  deleteMessageType.value = type;
  deleteMessage.value = text;
}

function resetDeleteState() {
  roleToDelete.value = '';
  userSearch.value = '';
  deleteUsername.value = '';
  deletableUsers.value = [];
  loadingDeletableUsers.value = false;
  deleteMessage.value = '';
  deleteMessageType.value = '';
}

function logout() {
  userStore.logout();
  menuOpen.value = false;
  window.location.reload();
}

function openUserManagement() {
  emit('toggle-user-management');
  menuOpen.value = false;
}

async function deleteUser() {
  showDeleteModal.value = true;
  resetDeleteState();
  loadingDeletableUsers.value = true;
  menuOpen.value = false;

  const usersResult = await userStore.getDeletableUsers();
  loadingDeletableUsers.value = false;

  if (!usersResult.success) {
    setDeleteMessage('error', usersResult.error || 'Failed to load users');
    return;
  }

  deletableUsers.value = usersResult.users;
}

function selectRole(role) {
  roleToDelete.value = role;
  userSearch.value = '';
  deleteUsername.value = '';
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  showDeleteConfirmModal.value = false;
  resetDeleteState();
}

function confirmDeleteUser() {
  const selectedUsername = deleteUsername.value;

  if (!selectedUsername) {
    setDeleteMessage('error', 'Please select a user');
    return;
  }

  if (!isValidSelectedUser.value) {
    setDeleteMessage('error', 'Please choose a valid user from the list');
    return;
  }

  showDeleteConfirmModal.value = true;
}

function closeDeleteConfirmModal() {
  showDeleteConfirmModal.value = false;
}

async function executeDeleteUser() {
  const selectedUsername = deleteUsername.value;

  if (!selectedUsername) {
    showDeleteConfirmModal.value = false;
    return;
  }

  deleting.value = true;
  const result = await userStore.deleteUser(selectedUsername);
  deleting.value = false;
  showDeleteConfirmModal.value = false;

  if (result.success) {
    setDeleteMessage('success', `User '${selectedUsername}' deleted successfully`);
    deletableUsers.value = deletableUsers.value.filter((user) => user.username !== selectedUsername);
    deleteUsername.value = '';

    const remainingInRole = usersForSelectedRole.value;
    if (remainingInRole.length === 0) {
      setDeleteMessage('success', 'User deleted successfully. There are no more users with this role.');
    }
  } else {
    setDeleteMessage('error', result.error || 'Failed to delete user');
  }
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function openSmsSignup() {
  showSmsSignupDrawer.value = true;
  menuOpen.value = false;
}

function handleClickOutside(event) {
  if (menuContainer.value && !menuContainer.value.contains(event.target)) {
    menuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
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
        <div class="menu-container" ref="menuContainer">
          <button class="hamburger-btn" @click="toggleMenu" :class="{ active: menuOpen }">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="dropdown-menu" v-if="menuOpen">
            <button v-if="userStore.isAdmin" class="menu-item" @click="openUserManagement">
              Create User
            </button>
            <button v-if="userStore.isAdmin" class="menu-item" @click="openSmsSignup">
              SMS Signup
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
    v-if="showDeleteModal && !showDeleteConfirmModal"
    header="Delete User"
    :blur="true"
    :wide="true"
    @close="closeDeleteModal"
    @confirm="confirmDeleteUser"
  >
    <div class="delete-user-modal">
      <div class="modal-message" :class="deleteMessageType" v-if="deleteMessage">
        {{ deleteMessage }}
      </div>

      <p v-if="loadingDeletableUsers" class="delete-user-loading">Loading users...</p>

      <div v-if="!loadingDeletableUsers && deletableUsers.length > 0">
        <label class="delete-user-label">Select role to delete from:</label>
        <div class="role-selector">
          <button
            type="button"
            class="role-btn role-btn-admin"
            :class="{ active: roleToDelete === 'admin' }"
            @click="selectRole('admin')"
            :disabled="deleting || !hasAdminUsers"
          >
            Admin
          </button>
          <button
            type="button"
            class="role-btn role-btn-viewer"
            :class="{ active: roleToDelete === 'viewer' }"
            @click="selectRole('viewer')"
            :disabled="deleting || !hasViewerUsers"
          >
            Viewer
          </button>
        </div>

        <div v-if="roleToDelete" class="user-list-section">
          <label for="delete-user-list" class="delete-user-label">Select user to delete</label>
          <input
            v-model="userSearch"
            type="text"
            class="delete-user-search"
            placeholder="Search users..."
            autocomplete="off"
          />
          <div class="user-list-row">
            <div class="delete-user-select-wrap">
              <select
                id="delete-user-list"
                v-model="deleteUsername"
                class="delete-user-list"
                size="6"
                :disabled="deleting || filteredUsersForSelectedRole.length === 0"
              >
                <option
                  v-for="user in filteredUsersForSelectedRole"
                  :key="user.username"
                  :value="user.username"
                >
                  {{ user.username }}
                </option>
              </select>
            </div>
            <div class="selected-user-info">
              <div class="info-username">{{ deleteUsername || 'No user selected' }}</div>
              <div class="info-lastlogin">
                <span class="login-label">Last Login:</span>
                <span class="login-value">
                  {{ deleteUsername ? formatLastLogin(selectedUserLastLogin) : 'Select a user from the list' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p class="delete-user-note">This action permanently deletes the account.</p>
      <div class="modal-actions">
        <button
          type="button"
          class="danger-btn"
          @click="confirmDeleteUser"
          :disabled="deleting || loadingDeletableUsers || !deleteUsername"
        >
          Delete User
        </button>
        <button type="button" @click="closeDeleteModal" :disabled="deleting">Close</button>
      </div>
    </div>
  </ModalComponent>

  <SmsSignupComponent v-if="showSmsSignupDrawer" @close="showSmsSignupDrawer = false" />

  <ModalComponent
    v-if="showDeleteConfirmModal"
    header="Confirm Deletion"
    :blur="true"
    @close="closeDeleteConfirmModal"
    @confirm="executeDeleteUser"
  >
    <div class="delete-user-modal">
      <p class="delete-user-note">
        Delete <strong>{{ deleteUsername }}</strong>? This cannot be undone.
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="danger-btn"
          @click="executeDeleteUser"
          :disabled="deleting"
        >
          Yes, Delete User
        </button>
        <button type="button" @click="closeDeleteConfirmModal" :disabled="deleting">Cancel</button>
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

.delete-user-note {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.delete-user-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.delete-user-search {
  display: block;
  width: 100%;
  margin: 0 0 0.75rem;
  box-sizing: border-box;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 0.55rem;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9rem;
}

.delete-user-search:focus {
  outline: none;
  border-color: var(--color-border);
}

.role-selector {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.role-btn {
  flex: 0 1 10rem;
  padding: 0.6rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-background-soft);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.role-btn-admin {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

.role-btn-viewer {
  color: #4dabf7;
  border-color: #4dabf7;
}

.role-btn-admin.active,
.role-btn-viewer.active {
  color: white;
}

.role-btn-admin.active {
  background-color: #ff6b6b;
}

.role-btn-viewer.active {
  background-color: #4dabf7;
}

.selected-user-info {
  width: 16rem;
  margin-top: 0;
  align-self: start;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-background-soft), var(--color-background));
  border: 1px solid var(--color-border-hover);
  border-radius: 0.6rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.info-username {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.info-lastlogin {
  font-size: 0.9rem;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.login-label {
  opacity: 0.8;
  font-weight: 600;
}

.login-value {
  opacity: 0.7;
}

.role-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.user-list-section {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.user-list-row {
  display: grid;
  grid-template-columns: minmax(18rem, 1fr) 16rem;
  gap: 1rem;
  align-items: start;
}

.delete-user-select-wrap {
  margin-bottom: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: 0.6rem;
  background: linear-gradient(180deg, var(--color-background-soft), var(--color-background));
  overflow: hidden;
}

.delete-user-list {
  width: 100%;
  min-height: 11rem;
  margin: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  font-size: 0.92rem;
  line-height: 1.5;
  padding: 0.25rem;
  color: var(--color-text);
}

.delete-user-list:focus {
  outline: none;
}

.delete-user-list option:checked {
  background: linear-gradient(90deg, rgba(77, 171, 247, 0.25), rgba(77, 171, 247, 0.12));
  color: var(--color-text);
  font-weight: 600;
}

.delete-user-loading {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.modal-actions button {
  width: min(100%, 14rem);
  min-width: 0;
  margin: 0;
  text-align: center;
}

.danger-btn {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .header-wrapper {
    flex-direction: column;
    gap: 1rem;
  }

  .header-title {
    text-align: center;
  }

  .user-list-row {
    grid-template-columns: 1fr;
  }

  .selected-user-info {
    width: 100%;
    margin-top: 0;
  }
}
</style>
