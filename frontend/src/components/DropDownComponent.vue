<script setup>
import { computed, ref } from 'vue';
import DropDownIcon from '@/assets/arrow_drop_down.svg'

const emit = defineEmits(["select"])
const props = defineProps(["options", "selected", "default"])

const show_dropdown = ref(false)
const filter_text = ref("")

const filtered_options = computed(() => {
  if (!filter_text.value) {
    return props.options
  }
  return props.options.filter(option => option.includes(filter_text.value))
})

function option_click(option){
  emit("select", option)
  show_dropdown.value = false;
}


</script>
<template>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=arrow_drop_down" />
  <div class="dropdown">
    <button @click="show_dropdown = !show_dropdown" class="dropbtn border">
    <p>{{ props.selected ? props.selected : props.default}} </p> <DropDownIcon class="dropdown-icon"/>
    </button>
    <div id="myDropdown" v-if="show_dropdown" class="dropdown-content">
      <input @focusin="" type="text" placeholder="Search.." id="myInput" v-model="filter_text">
      <button @click="option_click(option)" v-for="option in filtered_options">
        {{ option }}
</button>
    </div>
  </div>
</template>
<style scoped>
.dropbtn {
  padding: .1rem;
  /* width: 50px; */
  display: flex;
  text-align: center;
}
.dropbtn *{
  margin: auto;
}

/* Dropdown button on hover & focus */
.dropbtn:hover {
  border-color: lightblue;
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
