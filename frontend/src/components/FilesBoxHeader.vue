<script setup>
import FileBoxTabs from './FileBoxTabs.vue';

const props = defineProps({
  title: String,
  tabs: Array,
  selected_tab: String,
  tabs_disabled: {
    type: Boolean,
    default: false,
  },
  add_btn: {
    type: Boolean,
    default: true,
  },
  tab_sort_key: String,
})

const emit = defineEmits(['add_btn', 'tab_select', 'tab_add', 'tab_rename'])
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
      :static="tab_sort_key == undefined"
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
}

.add-btn {
  transition: .2s;
  padding: .3rem;
  padding-top: .2rem;
  padding-bottom: .2rem;
}

.add-btn:hover {
  transition: .2s;
  border-color: limegreen;
}
</style>
