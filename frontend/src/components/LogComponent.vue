<script setup>
import { useGlidersStore } from '@/stores/gliders';
import apiClient from '@/apiClient';
import { computed, onMounted, ref } from 'vue';

const gliderStore = useGlidersStore()

const logs = ref([])
const filter_by_glider = ref(false)

function get_logs() {
  apiClient.get("/logs/").then((res) => {
    logs.value = res.data
    logs.value.sort((a, b) => {
      return new Date(b.date) - new Date(a.date)
    })
  }).catch((err) => {
    // This is bad, bad
    setTimeout(get_logs, 2000)
  })
}

onMounted(() => {
  // placeholder logs. Not sure how or what they'll look like ye.
  get_logs()
})

const filtered_logs = computed(() => {
  let ret = []
  logs.value.forEach(ele => {
    if (ele.glider && gliderStore.selected_glider && ele.glider == gliderStore.selected_glider._id) {
      ret.push(ele)
    }
    else if (!filter_by_glider.value || !gliderStore.selected_glider) {
      ret.push(ele)
    }
  });
  return ret
})

function formatDate(date) {
  const year = String(date.getFullYear()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed because javascript
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function get_glider_name(log) {
  return gliderStore.gliders_obj[log.glider].name
}

function is_log_glider_selected(log) {
  if (log.glider && gliderStore.selected_glider && gliderStore.selected_glider._id == log.glider) {
    return true
  }
  return false
}

</script>
<template>
  <div class="border">
    <div id="log-content-parent">
      <div id="log-content">
        <div v-for="log in filtered_logs" :class="[log.level, 'log', { selected: is_log_glider_selected(log) }]">
          <!-- <p class="level">{{ log.level }}</p> -->
          <p class="date">{{ formatDate(new Date(log.date)) }}</p>
          <span class="message">
            <p v-if="log.glider">{{ get_glider_name(log) }}</p>
          </span>
          <p class="message">{{ log.message }}</p>
        </div>
      </div>
      <span id="fade-overlay"></span>
    </div>
    <div id="right-side">
      <label for="glider-by-glider">Filter by Selected Glider</label>
      <input id="filter-by-glider" type="checkbox" v-model="filter_by_glider">
    </div>
  </div>
</template>
<style scoped>
.border {
  height: 15rem;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.log {
  display: flex;
}

.log p {
  margin-right: 1rem;
}

.message {
  border-left-width: 2px;
  /* border-left-color: white; */
  border-left-color: var(--color-text);
  padding-left: 1rem;
}

.level {
  width: 3rem;
}

.error {
  color: red;
}

.warning {
  color: orange;
}

.info {
  color: limegreen;
}

span {
  width: 8rem;
  text-align: center;
}

.selected * {
  font-weight: bold;
}

.date {
  width: 7.5rem;
}

#log-content {
  overflow-y: scroll;
  scrollbar-width: none;
  height: 100%;
}

#log-content::-webkit-scrollbar {
  display: none;
}

#log-content-parent {
  position: relative;
}

#fade-overlay {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  width: 100%;
  /* Height of the fade area */
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, var(--color-background) 100%);
  pointer-events: none;
  /* Allows scrolling underneath */
}

label {
  margin-right: .5rem;
}
</style>
