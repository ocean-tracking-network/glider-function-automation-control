<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  tabs: String,
  selected: String,
  static: {
    type: Boolean,
    default(rawProps) {
      return false
    }
  }
})
const emit = defineEmits(["add", "select"])

const rename = ref(false)
const temp_rename_text = ref("")
const adding_new = ref(false)

function select(tab) {
  if (!props.static) {
    if (tab == props.selected) {
      temp_rename_text.value = tab
      rename.value = true
    }
    else {
      rename.value = false
      temp_rename_text.value = ""
    }
  }
  emit("select", tab)
}

function stop_edit() {
  rename.value = false
}

function add() {
  adding_new.value = true
  rename.value = true
  emit("select", "")
}

const all_tabs = computed(() => {
  const tabs = [...props.tabs]
  if (adding_new.value) {
    tabs.push("")
  }
  return tabs
})

</script>
<template>
  <div class="tab-container">
    <button v-for="(tab, index) in tabs"
      :class="{ first: index == 0, selected: (selected == tab && !static), last: static }" @click="select(tab)">
      <p v-if="!rename || selected != tab" class="tab-contents">{{ tab }}</p>
      <input @focusout="stop_edit" v-model="temp_rename_text" v-if="rename && selected == tab" class="tab-contents"
        type="text">
    </button>
    <button v-if="!static" @click="add" class="last">+</button>
  </div>
</template>
<style scoped>
.tab-container {
  display: flex;
  font-size: large;
  /* gap: 1rem; */
}

.tab-container button {
  border-width: 1px;
  border-bottom-width: 0px;
  border-left-width: 0px;
  border-color: white;
  padding-right: .5rem;
  padding-left: .5rem;
}

.first {
  border-left-width: 1px !important;
  border-color: white;
  border-top-left-radius: 3px;
}

.last {
  border-top-right-radius: 3px;
}

button:hover {
  color: lightgray;
  color: var(--color-border-hover);
  transition: .2s;
}

.selected {
  color: white;
}

.tab-contents {
  /* min-width: 5rem; */
}

input {
  background-color: var(--color-background);
  /* background-color: red; */
  color: var(--vt-c-white);
  width: 8rem;
}
</style>
