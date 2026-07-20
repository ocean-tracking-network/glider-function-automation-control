<script setup lang="ts">
    const props = defineProps<{
        data: object,
        currentX: number
    }>()
</script>
<template>
<div class="container">
    <div v-for="(value, key) in data" :key="key">
        <div class="data-entry">
            <p class="key">{{ key }}</p>
            <!-- <p>:</p> -->
            <p v-if="key=='sci_m_present_time'" class="val">{{ (value[currentX] as Date).toISOString() }}</p>
            <p v-else class="val">{{ value[currentX] }}</p>

        </div>
        <hr>
    </div>
</div>
</template>
<style scoped>
.data-entry{
    display: flex;
    justify-content: space-between;
    flex-wrap: nowrap;
}
.container{
    height: 300px;
    overflow: scroll;
    margin: .5rem;
}
.key{
    /* width: 60%; */
}
.val{
    overflow-x: scroll;
    /* width: 30%; */
}
hr{
    border-color: var(--color-border);
}
</style>