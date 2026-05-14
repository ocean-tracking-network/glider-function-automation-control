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

// Form state
const formData = ref({
  name: '',
  phone: '',
  glider: '',
  event: '',
});

const gliders = computed(() => glidersStore.gliders);

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

// Drag detection for overlay
const overlayMouseDownPos = ref({ x: 0, y: 0 });
const isDraggingOnOverlay = ref(false);

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
  await loadSignups();
});

async function loadSignups() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/notify');
    signups.value = res.data.contacts || [];
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
  if (!formData.value.name || !formData.value.phone || !formData.value.glider) {
    error.value = 'Please fill in all fields';
    return;
  }

  try {
    error.value = '';
    successMessage.value = '';

    // Get glider name from selected ID
    const selectedGlider = gliders.value.find((g) => g._id === formData.value.glider);
    const gliderName = selectedGlider?.name || '';

    const payload = {
      name: formData.value.name,
      phone: formData.value.phone,
      notification_type: 'sms',
      glider: gliderName,
    };

    await apiClient.post('/notify', payload);
    successMessage.value = 'SMS signup created successfully!';
    
    // Reset form
    formData.value = {
      name: '',
      phone: '',
      glider: '',
      event: '',
    };

    // Reload signups
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
            <!-- Error Message -->
            <div v-if="error" class="message message-error">{{ error }}</div>

            <!-- Success Message -->
            <div v-if="successMessage" class="message message-success">{{ successMessage }}</div>

            <!-- Form Section -->
            <div class="form-section">
              <h3 class="section-title">Add SMS Signup</h3>
              <form @submit.prevent="submitSignup" class="signup-form">
                <div class="form-group">
                  <label for="name">Name *</label>
                  <input
                    id="name"
                    v-model="formData.name"
                    type="text"
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="phone">Phone *</label>
                  <input
                    id="phone"
                    v-model="formData.phone"
                    type="tel"
                    placeholder="Enter phone number"
                    required
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
                  <label for="event">Event</label>
                  <select v-model="formData.event" id="event" :disabled="!formData.glider">
                    <option value="">Select an event</option>
                    <option v-for="eventType in smsEventTypes" :key="eventType" :value="eventType">
                      {{ eventType }}
                    </option>
                  </select>
                </div>

                <button type="submit" class="submit-btn">Add Signup</button>
              </form>
            </div>

            <!-- Signups List Section -->
            <div class="signups-section">
              <h3 class="section-title">Registered Signups</h3>
              <div v-if="loading" class="loading">Loading signups...</div>
              <div v-else-if="signups.length === 0" class="no-signups">No SMS signups yet.</div>
              <div v-else class="signups-list">
                <div v-for="(gliderSignups, gliderName) in groupedSignups" :key="gliderName" class="glider-group">
                  <h4 class="glider-name">{{ gliderName }}</h4>
                  <table class="signups-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Event</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="signup in gliderSignups" :key="signup._id" class="signup-row">
                        <td>{{ signup.name }}</td>
                        <td>{{ signup.phone }}</td>
                        <td>{{ getEventName(signup.event) }}</td>
                        <td>
                          <button
                            type="button"
                            class="delete-btn"
                            @click="deleteSignup(signup._id)"
                            title="Delete signup"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
  top: 8px;
  right: 8px;
  bottom: 8px;
  left: 8px;
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
}

.message-error {
  background-color: #fee;
  color: #c00;
  border: 1px solid #fcc;
}

.message-success {
  background-color: #efe;
  color: #060;
  border: 1px solid #cfc;
}

.form-section {
  border: 1px solid var(--color-border, lightgray);
  border-radius: 4px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.02);
}

.section-title {
  margin: 0 0 16px 0;
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
  padding: 8px 12px;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: inherit;
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

.submit-btn {
  padding: 10px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
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

.signups-section {
  border: 1px solid var(--color-border, lightgray);
  border-radius: 4px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.02);
}

.loading {
  text-align: center;
  color: var(--color-text);
  padding: 20px;
}

.no-signups {
  text-align: center;
  color: var(--color-text);
  padding: 20px;
  font-style: italic;
}

.signups-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.glider-group {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--color-background);
}

.glider-name {
  margin: 0;
  padding: 12px 16px;
  background-color: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid var(--color-border, #ddd);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.signups-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.signups-table thead {
  background-color: rgba(0, 0, 0, 0.08);
}

.signups-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border, #ddd);
}

.signups-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #eee);
  color: var(--color-text);
}

.signups-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.delete-btn {
  padding: 4px 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #da190b;
}

.sms-signup-close {
  padding: 10px 16px;
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.sms-signup-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
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
