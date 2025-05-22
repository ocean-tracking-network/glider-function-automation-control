<script setup>
import { onMounted, ref } from 'vue';
import FileComponent from './FileComponent.vue';
import draggable from 'vuedraggable'

const props = defineProps({
  title: String,
  draggable: true,
  group: [Object, String],
  list: Array,
  sort: true,
  standard_delete: true,
  move: Function
})

const emit = defineEmits(['add_btn', 'click', 'delete'])

const sort = ref()
const group = ref()

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


function delete_element(element_id) {
  // const index = props.list.findIndex(ele => ele.id == element_id)
  emit("delete", element_id)
  if (props.standard_delete) {
    props.list.splice(element_id, 1)
  }
}

</script>
<template>
  <div>
    <div class="border files-box">
      <div class="box-top">
        <!-- <h1>Files - To Glider</h1> -->
        <strong>
          <h2>{{ props.title }}</h2>
        </strong>
        <button @click="emit('add_btn')" class="border add-btn">Add</button>
      </div>
      <draggable :sort="sort" :list="list" :group="group" itemKey="id" class="list-group files-container">
        <template #item="{ element, index }">
          <a class="clickable" href="#" @click="emit('click', element)">
            <FileComponent @remove="delete_element(index)" :element="element" class="files list-group-item" />
          </a>
        </template>
      </draggable>
    </div>
  </div>
</template>
<style scoped>
.files-box {
  display: flex;
  flex-grow: 0;
  width: 100%;
  height: 100%;
  flex-wrap: wrap;
  /* justify-content: flex-end; */
}

.files-container {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: .5rem;
  overflow-y: scroll;
  overflow-x: scroll;
  /* height: 10rem; */
  height: 80%;
}

.box-top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.box-top * {
  margin-top: auto;
  margin-bottom: auto;
  text-align: center;
}

.files {
  /* width: 200px; */
  /* width: 50%; */
  width: auto;
  /* height: 2.5rem; */
}

.add-btn {
  transition: .2s;
  padding: .5rem;
}

h2 {
  font-size: x-large;
}

.add-btn:hover {
  transition: .2s;
  border-color: limegreen;
}
</style>
