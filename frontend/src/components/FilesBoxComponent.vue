<script setup>
import { computed, ref } from 'vue';
import FileListComponent from './FileListComponent.vue';
import FilesBoxHeader from './FilesBoxHeader.vue';

const props = defineProps({
  title: String,
  draggable: {
    type: Boolean,
    default: true,
  },
  group: [Object, String],
  list: Array,
  sort: {
    type: Boolean,
    default: true,
  },
  standard_delete: {
    type: Boolean,
    default: true,
  },
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
    default: true,
  }
})

const emit = defineEmits(['add_btn', 'click', 'dblclick', 'delete', 'tab_select', 'tab_rename'])
const selected_tab = ref("")
const new_tabs = ref([])

function delete_element(element_id) {
  emit("delete", element_id)
  if (props.standard_delete) {
    const index = props.list.findIndex(item => item.id === element_id)
    if (index > -1) {
      props.list.splice(index, 1)
    }
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
  if (idx > -1) {
    new_tabs.value[idx] = vals.new
  }
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
  if (!props.tabs) {
    return []
  }
  new_tabs.value = new_tabs.value.filter((tab) => !props.tabs.includes(tab))
  return [...props.tabs, ...new_tabs.value]
})

</script>
<template>
  <div>
    <div class="border files-box">
      <FilesBoxHeader
        :title="props.title"
        :tabs="all_tabs"
        :selected_tab="selected_tab"
        :tabs_disabled="props.tabs_disabled"
        :add_btn="props.add_btn"
        :tab_sort_key="props.tab_sort_key"
        @add_btn="emit('add_btn')"
        @tab_select="tab_select"
        @tab_add="tab_add"
        @tab_rename="tab_rename"
      />
      <hr v-if="tabs">
      <FileListComponent
        :list="filtered_list"
        :draggable="props.draggable"
        :group="props.group"
        :sort="props.sort"
        :can_delete="props.can_delete"
        :move="props.move"
        @click="emit('click', $event)"
        @dblclick="emit('dblclick', $event)"
        @delete="delete_element"
      />
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

hr {
  border-top-width: 1px;
  border-top-color: var(--color-text);
  width: 100%;
}

.hidden {
  display: none !important
}
</style>
