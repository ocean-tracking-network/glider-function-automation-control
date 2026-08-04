<script setup lang="ts">
import FileBoxTabs from './FileBoxTabs.vue';

const props = withDefaults(defineProps<{
  title: string
  tabs: string[]
  selected_tab: string
  tabs_disabled: boolean
  add_btn: boolean
  tab_sort_key?: string
  tabs_static?: boolean
}>(), {
  tabs_disabled: false,
  add_btn: true,
})

const emit = defineEmits<{
  add_btn: []
  tab_select: [selected_tab: string]
  tab_add: [new_val: string]
  tab_rename: [vals: {old: string; new: string}]
}>()
</script>

<template>
  <div class="box-top">
    <strong>
      <h2>{{ props.title }}</h2>
    </strong>
    <FileBoxTabs
      class="file-box-tabs"
      @rename="(vals) => { emit('tab_rename', vals) }"
      @add="(tab) => { emit('tab_add', tab) }"
      :static="tabs_static || tabs_static === undefined"
      v-if="tabs"
      @select="(tab) => { emit('tab_select', tab) }"
      :selected="selected_tab"
      :tabs="tabs"
      :disabled="props.tabs_disabled"
    />
    <button v-if="props.add_btn" @click="emit('add_btn')" class="border add-btn">Add</button>
  </div>
</template>

<style scoped>
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

h2 {
  font-size: large;
  width: 2.5rem;
  overflow-x: visible;
  white-space: nowrap;
}

.add-btn {
  transition: .2s;
  padding: .3rem;
  padding-top: .2rem;
  padding-bottom: .2rem;
  width: 2.5rem;
  margin-bottom: .2rem;
  
}

.add-btn:hover {
  transition: .2s;
  border-color: limegreen;
}
</style>
