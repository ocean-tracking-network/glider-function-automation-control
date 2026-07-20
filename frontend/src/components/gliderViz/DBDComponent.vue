<script setup lang="ts">
    import { DBDFile } from 'dinkumjs';
import { sub } from 'three/tsl';
import { ref, shallowRef, useTemplateRef, type ShallowRef } from 'vue';
    
    const emit = defineEmits<{
        (e: 'onRead', id: DBDFile): void
    }>()
    // const emit = defineEmits({
    //     onRead(payload: DBDFile) {
    //     }
    // })    

    const dbdfilesRef = useTemplateRef('dbdFiles')
    const cachefilesRef = useTemplateRef('cacheFiles')
    let dbdFile: DBDFile|null  = null

    async function submit(){
        const dbdSingleFile = (dbdfilesRef.value?.files as FileList).item(0) as File
        dbdFile = new DBDFile(dbdSingleFile, cachefilesRef.value?.files as FileList)
        console.log("Decoding DBD!")
        await dbdFile.decode()
        console.log("Done Decoding DBD!")
        emit('onRead', dbdFile)
    }
</script>
<template>
    <div>
        <label for="cacheFiles">Cache Files: </label>
        <input type="file" ref="cacheFiles" id="cacheFiles" name="cacheFiles" multiple>

        <label for="dbdFiles">DBD File: </label>
        <input type="file" ref="dbdFiles" id="dbdFiles" name="dbdFiles">

        <button id="submit" class="border" @click="submit">Submit</button>
    </div>
</template>
<style scoped>
#submit{
    padding: .2rem;
    margin: 0;
}
</style>