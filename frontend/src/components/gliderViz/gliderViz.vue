<script setup lang="ts">
import * as THREE from 'three';
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import {useTemplateRef, onMounted, ref} from 'vue'
import gliderModelUrl from '@/assets/glider.glb?url'

const threeContainer = useTemplateRef('threeContainer')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const geometry = new THREE.BoxGeometry(1,1,1,1);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00})
const cube = new THREE.Mesh(geometry, material)
const loader = new GLTFLoader()

const cube_rot = ref(0)

const renderer = new THREE.WebGLRenderer()
const sunlight = new THREE.DirectionalLight(0xffffff, 5.0)
const controls = new OrbitControls(camera, renderer.domElement)

onMounted(() => {
    renderer.setSize(600,600)
    threeContainer.value?.appendChild(renderer.domElement)
    sunlight.position.set(5,10,7.5)
    sunlight.castShadow = true
    scene.add(sunlight)
    // scene.add(cube)

    loader.load(gliderModelUrl, function (glb) {
        const model = glb.scene
        model.rotation.y = 90.0*Math.PI / 180.0
        scene.add(model)
    }, undefined, function (error){
        console.error(error)
    })

    camera.position.z = 20;
    renderer.setAnimationLoop(animate)
})

function animate(time: DOMHighResTimeStamp){
    controls.update()
    renderer.render(scene, camera)
}

function slideChange(){
    camera.position.z = cube_rot.value / 100
    // cube.rotation.x = cube_rot.value / 180
    // cube.rotation.y = cube_rot.value / 360
}


</script>
<template>
    <div>
        <div ref="threeContainer"></div>
        <input @input="slideChange" type="range" min="0", max="3600" v-model="cube_rot">
        {{ cube_rot }}
    </div>
</template>