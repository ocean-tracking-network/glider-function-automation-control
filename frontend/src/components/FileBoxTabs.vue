<script setup>
import { useFilesStore } from '@/stores/files'
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  tabs: Array,
  selected: String,
  static: {
    type: Boolean,
    default(rawProps) {
      return false
    }
  }
})
const emit = defineEmits(["add", "select", "rename"])
const filesStore = useFilesStore()

const rename = ref(false)
const temp_rename_text = ref("")
const adding_new = ref(false)

function select(tab) {
  // adding_new.value = false
  // temp_rename_text.value = ""
  if(!adding_new.value && !rename.value){
  if (!props.static) {
    if (tab == props.selected && !adding_new.value) {
      temp_rename_text.value = tab
      rename.value = true
    }
    else {
      rename.value = false
      temp_rename_text.value = ""
    }
  }

  console.log("1")
  emit("select", tab)
  }
}

function stop_edit() {
  rename.value = false
  if (adding_new.value) {
    if (temp_rename_text.value != "") {
      emit("add", temp_rename_text.value)
      temp_rename_text.value = ""
    }
    adding_new.value = false
  }
  else {
    emit("rename", { old: props.selected, new: temp_rename_text.value })
    // nextTick(() => {
    console.log("2")
    // emit("select", temp_rename_text.value)
    // })

  }
}

function add() {
  console.log("3")
  // emit("select", "")
  adding_new.value = true
  // rename.value = true
  temp_rename_text.value = ""
}

const all_tabs = computed(() => {
  let tabs = [...props.tabs]
  if (adding_new.value) {
    tabs.push(temp_rename_text.value)
  }
  return tabs
})

</script>
<template>
  <div class="tab-container">
    <button :class="{ first: index == 0 }" v-for="(tab, index) in all_tabs" @click="select(tab)">
      <p :class="{ selected: (selected == tab && !static), last: static }"
        :style="{ color: filesStore.colour_by_category[tab] }"
        v-if="(!rename || selected != tab) && !(adding_new && index == all_tabs.length - 1)" class="tab-contents">
        {{ tab }}
        <!-- {{ filesStore.colour_by_category[tab] }} -->
      </p>
      <input @focusout="stop_edit" v-model="temp_rename_text"
        v-if="(rename && selected == tab) || (adding_new && index == all_tabs.length - 1)" class="tab-contents"
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
  width: 500px;
  overflow-x: scroll;
}

.tab-container * {
}

.tab-container button {
  border-width: 1px;
  border-bottom-width: 0px;
  border-left-width: 0px;
  border-color: white;
  padding-right: .5rem;
  padding-left: .5rem;
  max-width: 100px;
  text-wrap: nowrap;
  overflow: hidden;
  font-size: medium;
  transition: 1s;
}

.tab-container button:hover {
  transition: 1s;
  max-width: 500px;
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
  /* color: white !important; */
  font-weight: bold;
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
