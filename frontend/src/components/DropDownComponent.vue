<script setup>
import { computed, ref } from 'vue';

const options = ref(['file1.xml', 'script2.xml', 'script343.xml'])
const title = ref("Script")
const show_dropdown = ref(false)
const filter_text = ref("")

const filtered_options = computed(() => {
  if (!filter_text.value) {
    return options.value
  }
  return options.value.filter(option => option.includes(filter_text.value))
})


</script>
<template>
  <div class="dropdown">
    <button @click="show_dropdown = !show_dropdown" class="dropbtn border">{{ title
    }}</button>
    <div id="myDropdown" v-if="show_dropdown" class="dropdown-content">
      <input @focusin="" type="text" placeholder="Search.." id="myInput" v-model="filter_text">
      <button @click="show_dropdown = false" v-for="option in filtered_options">{{ option }}</button>
    </div>
  </div>
</template>
<style scoped>
.dropbtn {
  padding: .1rem;
  width: 50px;
}

/* Dropdown button on hover & focus */
.dropbtn:hover,
.dropbtn:focus {
  background-color: #3e8e41;
}

/* The search field */
#myInput {
  box-sizing: border-box;
  background-image: url('searchicon.png');
  background-position: 14px 12px;
  background-repeat: no-repeat;
  font-size: 16px;
  padding: 14px 20px 12px 45px;
  border: none;
  border-bottom: 1px solid #ddd;
}

/* The search field when it gets focus/clicked on */
#myInput:focus {
  outline: 3px solid #ddd;
}

/* The container <div> - needed to position the dropdown content */
.dropdown {
  position: relative;
  display: inline-block;
}

/* Dropdown Content (Hidden by Default) */
.dropdown-content {
  display: block;
  position: absolute;
  background-color: #f6f6f6;
  min-width: 230px;
  border: 1px solid #ddd;
  z-index: 1;
}

/* Links inside the dropdown */
.dropdown-content button {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
}

/* Change color of dropdown links on hover */
.dropdown-content button:hover {
  background-color: #f1f1f1
}

/* Show the dropdown menu (use JS to add this class to the .dropdown-content container when the user clicks on the dropdown button) */
.show {
  display: block;
}
</style>
