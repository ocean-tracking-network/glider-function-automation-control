<script setup>
import { computed, onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue';
import draggable from 'vuedraggable'
import FileBoxTabs from './FileBoxTabs.vue';

const props = defineProps({
  title: String,
  draggable: true,
  group: [Object, String],
  list: Array,
  sort: true,
  standard_delete: true,
  can_delete: {
    type: Boolean,
    default: true,
  },
  move: Function,
  tabs: Array,
  tab_sort_key: String,
  tabs_disabled: {
    type: Boolean,
    default: false,
  },
  add_btn: {
    type: Boolean,
    default(rawProps) {
      return true
    }
  }
})

const emit = defineEmits(['add_btn', 'click', 'delete', 'tab_select', 'tab_rename'])
const selected_tab = ref("")

const sort = ref()
const group = ref()

const new_tabs = ref([])

onMounted(() => {
  if (props.sort != undefined) {
    sort.value = props.sort
  }
  else {
    sort.value = true
  }
  if (!props.draggable) {
    group.value = {
      name: "no-dragable",
      pull: false,
      clone: false,
      put: false,
    }
    sort.value = false
  }
  else {
    group.value = props.group
  }
})


function delete_element(index, element_id) {
  if (!props.can_delete) {
    return
  }
  emit("delete", element_id)
  if (props.standard_delete) {
    props.list.splice(index, 1)
  }
}

function tab_select(value) {
  selected_tab.value = value
  emit("tab_select", value)
}

function tab_add(new_val) {
  if (!all_tabs.value.includes(new_val)) {
    new_tabs.value.push(new_val)
  }
}

function tab_rename(vals) {
  if (!new_tabs.value.includes(vals.old)) {
    emit('tab_rename', vals)
  }
  const idx = new_tabs.value.indexOf(vals.old)
  new_tabs.value[idx] = vals.new
}

const filtered_list = computed(() => {
  if (selected_tab.value && props.tab_sort_key) {
    let ret = []
    props.list.forEach((element) => {
      if (selected_tab.value == element[props.tab_sort_key]) {
        ret.push(element)
      }
    })
    return ret
  }
  else {
    return props.list
  }
})

const all_tabs = computed(() => {
  new_tabs.value = new_tabs.value.filter((tab) => !props.tabs.includes(tab))
  return [...props.tabs, ...new_tabs.value]
})

</script>
<template>
  <div>
    <div class="border files-box">
      <div class="box-top">
        <strong>
          <h2>{{ props.title }}</h2>
        </strong>
        <FileBoxTabs class="file-box-tabs" @rename="(vals) => { tab_rename(vals) }" @add="tab_add"
          :static="tab_sort_key == undefined" v-if="tabs" @select="tab_select" :selected="selected_tab"
          :tabs="all_tabs" :disabled="props.tabs_disabled" />
        <button v-if="props.add_btn" @click="emit('add_btn')" class="border add-btn">Add</button>
      </div>
      <hr v-if="tabs">
      <draggable :sort="sort" :list="filtered_list" :group="group" itemKey="id" class="list-group files-container">
        <template #item="{ element, index }">
          <a class="clickable" href="#" @click="emit('click', element)">
            <FileComponent :canDelete="props.can_delete" @remove="delete_element(index, element)" :element="element"
              class="files list-group-item" />
          </a>
        </template>
      </draggable>
      <div class="footer">
        <slot>
        </slot>
      </div>
    </div>
  </div>
</template>
<style scoped>
.footer {
  width: 95%;
  position: absolute;
  bottom: .5rem;
}

.files-box {
  width: 100%;
  height: 100%;
  position: relative;
}

.files-container {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: .5rem;
  overflow-y: scroll;
  overflow-x: scroll;
  margin-top: .5rem;
  min-height: 30%;
}

.box-top {
  width: 100%;
  max-height: 2rem;
  display: flex;
  justify-content: space-between;
}

.box-top * {
  margin-top: auto;
  margin-bottom: auto;
  text-align: center;
}

.files {
  width: auto;
  padding: .3rem;
}

.add-btn {
  transition: .2s;
  padding: .3rem;
  padding-top: .2rem;
  padding-bottom: .2rem;
}

h2 {
  font-size: large;
}

.add-btn:hover {
  transition: .2s;
  border-color: limegreen;
}

hr {
  /* color: var(--color-text); */
  border-top-width: 1px;
  border-top-color: var(--color-text);
  width: 100%;
}

.hidden {
  display: none !important
}
</style>
