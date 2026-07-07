<script setup lang="ts" generic="T">
import { computed, ref } from 'vue';
import FileListComponent from './FileListComponent.vue';
import FilesBoxHeader from './FilesBoxHeader.vue';
import type { FileBoxType } from '@/lib/types';

const props = withDefaults(defineProps<{
  title: string
  draggable?: boolean
  group?: object | string
  list: FileBoxType<T>[]
  sort?: boolean
  standard_delete?: boolean
  can_delete?: boolean
  can_edit?: boolean
  tabs?: string[]
  tab_sort_key?: string
  tabs_disabled?: boolean
  tabs_static?: boolean
  add_btn?: boolean
  dblclick?: boolean
}>(), {
  draggable: true,
  sort: true,
  standard_delete: true,
  can_delete: true,
  can_edit: true,
  tabs_disabled: true,
  add_btn: true,
  dblclick: true,
})

const emit = defineEmits<{
  add_btn: []
  click: [list_element: FileBoxType<T>]
  dblclick: [list_element: FileBoxType<T>]
  delete: [list_element: FileBoxType<T>]
  edit: [list_element: FileBoxType<T>]
  tab_select: [selected_tab: string]
  tab_rename: [{old: string; new: string}]
}>()

const selected_tab = ref("")
const new_tabs = ref<string[]>([])

// function delete_element(element_id: string) {
//   emit("delete", element_id)
//   if (props.standard_delete) {
//     const index = props.list.findIndex(item => item.id === element_id)
//     if (index > -1) {
//       props.list.splice(index, 1)
//     }
//   }
// }

function tab_select(value: string) {
  selected_tab.value = value
  emit("tab_select", value)
}

function tab_add(new_val: string) {
  if (!all_tabs.value.includes(new_val)) {
    new_tabs.value.push(new_val)
  }
}

function tab_rename(vals: {old: string; new: string}) {
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
    const ret: (FileBoxType<T>)[] = []
    props.list.forEach((element) => {
      if (selected_tab.value == element[props.tab_sort_key as keyof FileBoxType<T>]) {
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
  const tabs = props.tabs
  if (!tabs) {
    return []
  }
  new_tabs.value = new_tabs.value.filter((tab) => !tabs.includes(tab))
  return [...tabs, ...new_tabs.value]
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
        :tabs_static="tabs_static"
        @add_btn="emit('add_btn')"
        @tab_select="tab_select"
        @tab_add="tab_add"
        @tab_rename="tab_rename"
      />
      <hr v-if="tabs">
      <FileListComponent
        :list="filtered_list"
        :isDraggable="props.draggable"
        :group="props.group"
        :sort="props.sort"
        :can_delete="props.can_delete"
        :can_edit="props.can_edit"
        @click="emit('click', $event)"
        v-on="props.dblclick ? { dblclick: (event: FileBoxType<T>) => emit('dblclick', event) } : {}"
        @delete="emit('delete', $event)"
        @edit="emit('edit', $event)"
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
