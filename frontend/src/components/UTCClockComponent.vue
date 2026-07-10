<script setup lang="ts">
import {ref, onMounted} from 'vue';
const current_time = ref<string>("");

function set_utc_time(){
    const current_date = new Date()
    current_time.value = current_date.toISOString().replace("T", " ").slice(0,-5)
}

onMounted(() => {
    set_utc_time()
    setInterval(set_utc_time, 1000)
})

</script>
<template>
<div>
    {{ current_time }}
</div>
</template>