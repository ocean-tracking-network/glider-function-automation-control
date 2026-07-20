<script setup lang="ts">
import * as THREE from 'three';
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import { useTemplateRef, onMounted, ref, type ShallowRef } from 'vue'
import gliderModelUrl from '@/assets/glider.glb?url'
import LineChart from './LineChart.vue';
import DataVariables from './DataVariables.vue';
import DBDComponent from './DBDComponent.vue';
import { DBDFile } from 'dinkumjs';
import type { ProcessedRecords } from 'dinkumjs';

type GliderState = {
    pitch: number
    roll: number
    depth: number
    rot_y: number
}
let gliderState: GliderState = {
    pitch: 0,
    roll: 0,
    depth: 0,
    rot_y: (90.0 * Math.PI) / 180.0
}

const autoAnimate = ref<boolean>(false)
const xAxis= ref<any>([1,2,3,4,5])
const yAxis = ref<any>([1,2,3,4,5])
const dbdData = ref<(ProcessedRecords)>()
const currentXPos = ref<number>(0)

const mainThreeContainer = useTemplateRef('mainThreeContainer')
const threeContainer = useTemplateRef('threeContainer')
const threeContainer2 = useTemplateRef('threeContainer2')

const scene = new THREE.Scene()
scene.background = new THREE.Color('blue')

// Give camera2 a starting position so it doesn't sit inside the model at 0,0,0
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
const camera2 = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)

const loader = new GLTFLoader()
const depthMarkerGeo = new THREE.BoxGeometry(3,.5,.5)
const depthMarkerMat = new THREE.MeshBasicMaterial({color: 0x00ff00})
const cube_rot = ref(0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
const sunlight = new THREE.DirectionalLight(0xffffff, 5.0)
const sunlight2 = new THREE.DirectionalLight(0xffffff, 5.0)

let gliderModel: THREE.Group<THREE.Object3DEventMap>

// OrbitControls needs to watch the container holding the views
let controls: OrbitControls

onMounted(() => {
    const parentRect = mainThreeContainer.value?.getBoundingClientRect()
    renderer.setSize(parentRect?.width as number, parentRect?.height as number)
    renderer.setScissorTest(true)
    
    // Inject the canvas into the parent container
    mainThreeContainer.value?.appendChild(renderer.domElement)
    
    // Setup light
    sunlight2.position.set(0, 0, -7.5)
    sunlight2.castShadow = false
    scene.add(sunlight2)
    sunlight.position.set(5, 10, 7.5)
    sunlight.castShadow = false
    scene.add(sunlight)

    // sunlight.position.set(0, -10, 7.5)
    // scene.add(sunlight)

    // Load model
    loader.load(gliderModelUrl, function (glb) {
        gliderModel = glb.scene
        scene.add(gliderModel)
    }, undefined, function (error) {
        console.error(error)
    })

    // Setup initial camera positions
    camera.position.set(0, 0, 20)
    camera2.position.set(15, 0, 0) // Look from the side
    camera2.lookAt(0, 0, 0)

    // Initialize controls on the main container element
    // if (mainThreeContainer.value) {
    //     controls = new OrbitControls(camera, mainThreeContainer.value)
    // }

    drawDepthMarks()
    renderer.setAnimationLoop(animate)
})

function drawDepthMarks(){
    const maxMarkDepth = 1000
    const marksEveryDepth = 10

    for(let i=marksEveryDepth; i<maxMarkDepth; i+= marksEveryDepth){
        const newCube = new THREE.Mesh(depthMarkerGeo, depthMarkerMat)
        newCube.position.y = -i
        scene.add(newCube)
    }
}

function animate(time: DOMHighResTimeStamp) {
    // if (controls) controls.update()
    if(gliderModel){
        if(autoAnimate.value){
            if(currentXPos.value >= xAxis.value.length){
                currentXPos.value = 0
            }
            currentXPos.value++
        }
        // gliderModel.rotation.x = time/1000
        // gliderModel.setRotationFromQuaternion(new THREE.Vector3(1,0,0), time/1000)
        // gliderModel.rotation.y = time/1000
        // gliderModel.rotation.z = time/1000
        const targetRot = new THREE.Quaternion()
        let eurler = new THREE.Euler(time/1000, time/1000, time/1000)
        if(dbdData.value){
            gliderState.depth = dbdData.value["m_depth"]?.at(currentXPos.value) ?? gliderState.depth
            gliderState.pitch = dbdData.value["m_pitch"]?.at(currentXPos.value) ?? gliderState.pitch
            gliderState.roll = dbdData.value["m_roll"]?.at(currentXPos.value) ?? gliderState.roll
            eurler = new THREE.Euler(gliderState.pitch, gliderState.rot_y, gliderState.roll, 'YXZ')
            gliderModel.position.y = -gliderState.depth
            gliderModel.position.x = currentXPos.value/-2
            // gliderModel.rotation.z = gliderState.roll
            // gliderModel.setRotationFromAxisAngle(new THREE.Vector3(0,0,1), gliderState.roll)
            // gliderModel.setRotationFromAxisAngle(new THREE.Vector3(1,0,0), gliderState.pitch)
            // gliderModel.rotation.y = gliderState.pitch
        }
        targetRot.setFromEuler(eurler)
        gliderModel.quaternion.copy(targetRot)
        camera2.position.y = gliderModel.position.y 
        camera2.position.x = gliderModel.position.x + 15
        camera.position.x = gliderModel.position.x
        camera.position.y = gliderModel.position.y

    }

    renderView(camera, threeContainer)
    renderView(camera2, threeContainer2)
}

function renderView(cam: THREE.PerspectiveCamera, html_ref: ShallowRef<HTMLElement | null>) {
    if (!html_ref.value || !mainThreeContainer.value) return

    // Get bounding boxes for both the target item and parent container
    const rect = html_ref.value.getBoundingClientRect()
    const parentRect = mainThreeContainer.value.getBoundingClientRect()

    const width = rect.width
    const height = rect.height

    // Calculate position relative to the local 600x600 canvas coordinate system
    const left = rect.left - parentRect.left
    const bottom = parentRect.bottom - rect.bottom

    // Map scissor and viewport boundaries
    renderer.setViewport(left, bottom, width, height)
    renderer.setScissor(left, bottom, width, height)

    cam.aspect = width / height-.2
    cam.updateProjectionMatrix()
    
    renderer.render(scene, cam)
}

function onRead(e: DBDFile){
    console.log("READ DBD!")
    console.log("Getting COLS")
    dbdData.value = e.getCols(e.columns)
    console.log("Done Getting COLS")
    const m_present_time = dbdData.value["m_present_time"]?.map(t => new Date((t as number) * 1000))
    xAxis.value = m_present_time
    yAxis.value = dbdData.value["m_depth"]
}

function slideChange() {
    // Zoom camera in/out based on slider value
    // camera.position.z = 
}
</script>

<template>
    <div class="container">
        <DBDComponent @on-read="onRead" id="dbd"/>
    <div class="wrapper">
        <!-- The container must have relative positioning -->
        <div id="mainThreeContainer" ref="mainThreeContainer">
            <div ref="threeContainer" class="view left"></div>
            <div ref="threeContainer2" class="view right"></div>
        </div>
        <div id="bottom">
            <div class="left">
                <LineChart :x-axis="xAxis" :y-axis="yAxis"/>
                <div class="controls-ui">
                    <button class="border" @click="autoAnimate = !autoAnimate" style="padding: .2rem; margin-right: .5rem;">Play/Pause</button>
                    <input id="slider" @input="slideChange" type="range" :min="0" :max="xAxis.length-1"  v-model="currentXPos">
                    {{ cube_rot }}
                </div>

            </div>
            <div class="right">
                <DataVariables :current-x="currentXPos" :data="(dbdData as object)"/>

            </div>
        </div>

    </div>

    </div>
</template>

<style scoped>
#dbd{
    margin-bottom: 1rem
}
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

#mainThreeContainer {
    position: relative; /* Crucial for internal absolute canvas */
    width: 100%;       /* Added 'px' units */
    height: 300px;      /* Added 'px' units */
    display: flex;      /* Split children side-by-side */
    border: 1px solid #ccc;
}

/* Force the WebGL canvas to sit behind the target elements */
#mainThreeContainer :deep(canvas) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    pointer-events: none; /* Allows mouse interactions to pass through to elements */
}

.view {
    height: 300px;      /* Added 'px' units */
    z-index: 1;         /* Sits on top of canvas for layout tracking */
    box-sizing: border-box;
}

/* Optional styling to visually separate the two camera scopes */

.right{
    width: 25%;
}
.left{
    width: 75%;
}

.controls-ui {
    font-family: sans-serif;
}
#bottom{
    display: flex;
    flex-wrap: nowrap;
    width: 100%;
}
.left {
    border-right: 2px dashed rgba(255,255,255,0.3);
}
#slider{
    width: 80%;
}
</style>
