<script setup>
import { ref, onMounted, computed } from 'vue';
import { useGlidersStore } from '@/stores/gliders';
import { useEventsStore } from '@/stores/events';
import apiClient from '@/apiClient';

const emit = defineEmits(['close']);
const glidersStore = useGlidersStore();
const eventsStore = useEventsStore();
const signups = ref([]);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const users = ref([]);
const formData = ref({
  user: '',
  slackId: '',
  phone: '',
  glider: '',
  event: '',
});
const gliders = computed(() => glidersStore.gliders);

const openGliderDropdown = ref('');

const smsEventTypes = [
  'Glider Connect',
  'Glider Mission Abort',
  'Surface Sensor Value Out of Range',
  'Glider Started Last Gasp Mission',
  'Glider Missed Last Call-In',
  'Segment Errors',
  'Glider Started Initial Mission',
  'Glider Outside Geofence'
];


const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

const overlayMouseDownPos = ref({ x: 0, y: 0 });
const isDraggingOnOverlay = ref(false);
function isValidPhone(phone) {
  if (phone.trim() === '') return false;
  return phoneRegex.test(phone);
}

function validateNotificationFields() {
  const hasValidPhone = isValidPhone(formData.value.phone);
  if (!hasValidPhone) {
    return {
      valid: false,
      message: 'Please provide a valid phone number.'
    };
  }

  return { valid: true, message: '' };
}

function handleOverlayMouseDown(event) {
  overlayMouseDownPos.value = { x: event.clientX, y: event.clientY };
  isDraggingOnOverlay.value = false;
}

function handleOverlayMouseMove(event) {
  const dx = Math.abs(event.clientX - overlayMouseDownPos.value.x);
  const dy = Math.abs(event.clientY - overlayMouseDownPos.value.y);
  if (dx > 5 || dy > 5) {
    isDraggingOnOverlay.value = true;
  }
}

function handleOverlayClick(event) {
  if (!isDraggingOnOverlay.value && event.target === event.currentTarget) {
    close();
  }
}

onMounted(async () => {
  await loadUsers();
  await loadSignups();
});

async function loadUsers() {
  try {
    const res = await apiClient.get('/users/list');
    users.value = Array.isArray(res.data.users) ? res.data.users : [];
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

async function loadSignups() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/notify');
    signups.value = res.data.notifications || [];
  } catch (err) {
    error.value = 'Failed to load signups: ' + (err.response?.data?.error || err.message);
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('close');
}



async function submitSignup() {
  if (!formData.value.user || !formData.value.glider || !formData.value.event) {
    error.value = 'Please fill in all required fields (User, Glider, Event)';
    return;
  }

  const validation = validateNotificationFields();
  if (!validation.valid) {
    error.value = validation.message;
    return;
  }

  try {
    error.value = '';
    successMessage.value = '';
    const selectedGlider = gliders.value.find((g) => g._id === formData.value.glider);
    const gliderName = selectedGlider?.name || '';

    const payload = {
      name: formData.value.user,
      slack_id: formData.value.slackId,
      phone: formData.value.phone,
      notification_type: 'sms',
      glider: gliderName,
      event: formData.value.event,
    };

    await apiClient.post('/notify', payload);
    successMessage.value = 'SMS signup created successfully!';
    
    formData.value = {
      user: '',
      slackId: '',
      phone: '',
      glider: '',
      event: '',
    };

    await loadSignups();

    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create signup';
  }
}

async function deleteSignup(id) {
  if (!confirm('Are you sure you want to delete this signup?')) return;

  try {
    error.value = '';
    await apiClient.delete(`/notify/${id}`);
    successMessage.value = 'Signup deleted successfully!';
    await loadSignups();
    
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (err) {
    error.value = 'Failed to delete signup: ' + (err.response?.data?.error || err.message);
  }
}

function getGliderName(gliderId) {
  const glider = gliders.value.find((g) => g._id === gliderId);
  return glider ? glider.name : 'Unknown Glider';
}

function getEventName(eventValue) {
  return eventValue || 'Not specified';
}

const groupedSignups = computed(() => {
  const grouped = {};
  signups.value.forEach((signup) => {
    if (!grouped[signup.glider]) {
      grouped[signup.glider] = [];
    }
    grouped[signup.glider].push(signup);
  });
  return grouped;
});

function toggleGliderDropdown(gliderName) {
  openGliderDropdown.value = openGliderDropdown.value === gliderName ? '' : gliderName;
}
</script>

<template>
  <transition name="slide-drawer">
    <div
      class="drawer-overlay"
      @mousedown="handleOverlayMouseDown"
      @mousemove="handleOverlayMouseMove"
      @click="handleOverlayClick"
    >
      <div class="drawer-panel" :style="{ width: '500px' }" @click.stop>
        <div class="drawer-header">
          <h2 class="drawer-title">SMS Notification Signup</h2>
          <button class="drawer-close-btn" @click="close" aria-label="Close drawer">
            <span>&times;</span>
          </button>
        </div>
        <div class="drawer-content">
          <div class="sms-signup-body">
            <div v-if="error" class="message message-error">{{ error }}</div>

            <div v-if="successMessage" class="message message-success">{{ successMessage }}</div>
            <div class="form-section">
              <h3 class="section-title">Add SMS Signup</h3>
              <form @submit.prevent="submitSignup" class="signup-form">
                <div class="form-group">
                  <label for="user">Name *</label>
                  <input
                    id="user"
                    v-model="formData.user"
                    type="text"
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="slackId">Slack ID</label>
                  <input
                    id="slackId"
                    v-model="formData.slackId"
                    type="text"
                    placeholder="Enter Slack ID"
                  />
                </div>

                <div class="form-group">
                  <label for="phone">Phone *</label>
                  <input
                    id="phone"
                    v-model="formData.phone"
                    type="tel"
                    placeholder="Enter phone number"
                  />
                </div>

                <div class="form-group">
                  <label for="glider">Glider *</label>
                  <select v-model="formData.glider" id="glider" required>
                    <option value="">Select a glider</option>
                    <option v-for="glider in gliders" :key="glider._id" :value="glider._id">
                      {{ glider.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="event">Event *</label>
                  <select v-model="formData.event" id="event" required>
                    <option value="">Select an event</option>
                    <option v-for="eventType in smsEventTypes" :key="eventType" :value="eventType">
                      {{ eventType }}
                    </option>
                  </select>
                </div>

                <button type="submit" class="submit-btn">Add Signup</button>
              </form>
            </div>

            <div class="signups-section">
              <h3 class="section-title">Registered Signups</h3>
              <div v-if="loading" class="loading">Loading signups...</div>
              <div v-else-if="signups.length === 0" class="no-signups">No SMS signups yet.</div>
              <div v-else class="glider-dropdowns">
                <div v-for="(gliderSignups, gliderName) in groupedSignups" :key="gliderName" class="glider-dropdown">
                  <button
                    type="button"
                    class="glider-toggle"
                    @click="toggleGliderDropdown(gliderName)"
                  >
                    <span class="glider-toggle-label">
                      {{ gliderName }}
                      <span class="glider-count">{{ gliderSignups.length }}</span>
                    </span>
                    <span class="toggle-icon" :class="{ open: openGliderDropdown === gliderName }">+</span>
                  </button>
                  <div v-if="openGliderDropdown === gliderName" class="signup-list">
                    <div v-for="signup in gliderSignups" :key="signup._id" class="signup-item">
                      <div>
                        <div><strong>{{ signup.name }}</strong> - {{ getEventName(signup.event) }}</div>
                        <div class="signup-details">
                          Slack ID: {{ signup.slack_id || 'Not specified' }}<br>
                          Phone: {{ signup.phone || 'Not specified' }}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="delete-btn-small"
                        @click="deleteSignup(signup._id)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="sms-signup-close" @click="close">Close</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 8px;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  height: calc(100vh - 16px);
  background-color: var(--color-background);
  border-left: 1px solid var(--color-border, lightgray);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
  border-radius: 4px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--color-border, lightgray);
  flex-shrink: 0;
}

.drawer-title {
  margin: 0;
  color: var(--color-text);
  font-size: 1.25rem;
  font-weight: 600;
}

.drawer-close-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 2rem;
  border: none;
  background: none;
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.drawer-close-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.drawer-content {
  padding: 0 20px 20px 20px;
  overflow: auto;
  flex: 1;
}

.sms-signup-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message {
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  border: 1px solid;
}

.message-error {
  background-color: #fee;
  color: #c00;
  border-color: #fcc;
}

.message-success {
  background-color: #efe;
  color: #060;
  border-color: #cfc;
}

/* Forms */
.form-section {
  border: 1px solid var(--color-border, lightgray);
  border-radius: 4px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.02);
}

.section-title {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--color-text);
}

.form-group input,
.form-group select {
  font-family: inherit;
  color: var(--color-text);
  background-color: var(--color-background);
  border: 1px solid var(--color-border, #ccc);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.95rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-text);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.optional-note {
  font-weight: normal;
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
}



.submit-btn {
  padding: 10px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 4px;
}

.submit-btn:hover {
  background-color: #45a049;
}

.submit-btn:active {
  background-color: #3d8b40;
}

.sms-signup-close {
  padding: 10px 16px;
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.sms-signup-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.delete-btn-small {
  padding: 6px 12px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.delete-btn-small:hover {
  background-color: #da190b;
}

.no-signups,
.loading {
  text-align: center;
  color: var(--color-text);
  padding: 20px;
  font-style: italic;
}

.glider-dropdowns {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.glider-dropdown {
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  overflow: hidden;
}

.glider-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.05);
  border: none;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}

.glider-toggle:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.glider-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.glider-count {
  min-width: 1.75rem;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: var(--user-picker-surface);
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
}

.toggle-icon {
  font-size: 1.2rem;
  transition: transform 0.2s;
}

.toggle-icon.open {
  transform: rotate(45deg);
}

.signup-list {
  padding: 0;
  background-color: var(--color-background);
  max-height: 300px;
  overflow-y: auto;
}

.signup-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--color-border, #eee);
  font-size: 0.9rem;
  color: var(--color-text);
}

.signup-item:first-child {
  border-top: none;
}

.signup-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.signup-details {
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
  margin-top: 4px;
  line-height: 1.4;
}

@keyframes slideInRight {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.slide-drawer-enter-from,
.slide-drawer-leave-to {
  opacity: 0;
}
</style>
