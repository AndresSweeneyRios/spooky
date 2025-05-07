import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { processAttributes } from '../../utils/processAttributes';
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { playerInput } from "../../input/player";
import { ToneMappingShader } from "../../graphics/toneMappingShader";
import { SobelOperatorShader } from "../../graphics/sobelOberatorShader";
import skyMirrorWebp from '../../assets/3d/env/sky_mirror.webp';
import stairsGlb from '../../assets/3d/scenes/stairs/stairs.glb';
import dmtPng from '../../assets/3d/env/dmt.png';
import { getRGBBits } from "../../graphics/quantize";
import { createParallaxWindowMaterial } from "../../graphics/parallaxWindow";
import { NoiseMaterial } from '../../graphics/noise';
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export let currentCrtPass: ShaderPass | null = null

const toggleStartKey = (bool: boolean) => {
  document.querySelector("#spooky .temp-activate")?.setAttribute("is-hidden", bool ? "false" : "true")
}

const toggleBattleTrack = (bool: boolean) => {
  document.querySelector("#spooky #battle-track")?.setAttribute("is-hidden", bool ? "false" : "true")
}

import * as midi from '../../audio/midi';
import fastbeatWav from '../../assets/audio/music/fastbeat.wav';
import fastbeatMidURL from '../../assets/audio/music/fastbeat.mid';
import { SubSceneContext } from "./sub-scenes";

async function doBeatMap() {
  const noteElementMap = new Map<symbol, HTMLElement>();
  const noteMap = new Map<symbol, midi.Note>();

  const dpad = document.getElementById("dpad");
  if (!dpad) {
    throw new Error("Dpad not found");
  }

  // Ideally in the future this should be in the in the simulation loop or pausable.
  // Also this should probably be inspected. The hitboxes feel super off.
  for await (const notes of midi.playNotesOnce(fastbeatWav, fastbeatMidURL, 4000, 2, 2000, 300, 200)) {
    for (const note of notes) {
      noteMap.set(note.note, note);

      if (!noteElementMap.has(note.note)) {
        const noteElement = dpad.cloneNode(true) as HTMLElement;
        noteElement.style.right = "0";
        noteElement.style.left = "auto";
        noteElement.style.opacity = "1";
        noteElement.classList.add("note");
        noteElement.id = "";
        dpad.parentElement!.appendChild(noteElement);
        noteElementMap.set(note.note, noteElement);

        const up = noteElement.querySelector(".up") as SVGPathElement;
        const down = noteElement.querySelector(".down") as SVGPathElement;
        const left = noteElement.querySelector(".left") as SVGPathElement;
        const right = noteElement.querySelector(".right") as SVGPathElement;
        const middle = noteElement.querySelector(".middle") as SVGPathElement;

        const buttonTypeMap = {
          [midi.ButtonType.Up]: up,
          [midi.ButtonType.Down]: down,
          [midi.ButtonType.Left]: left,
          [midi.ButtonType.Right]: right,
          [midi.ButtonType.Middle]: middle,
        };

        const button = buttonTypeMap[note.button];

        button.style.fill = "white"
        button.style.fillOpacity = "1"
      }

      const noteElement = noteElementMap.get(note.note)!;

      noteElement.style.left = `${note.percentage}%`;
    }

    // Cleanup
    for (const [note, noteElement] of noteElementMap) {
      if (notes.every(n => n.note !== note)) {
        noteElementMap.delete(note);

        if (!noteMap.has(note)) {
          continue;
        }

        noteElement.style.left = "0";

        if (noteMap.get(note)!.hit) {
          noteElement.setAttribute("hit", "true");
        } else {
          noteElement.setAttribute("hit", "false");
        }

        setTimeout(() => {
          noteElement.remove();
        }, 500);
      }
    }
  }
}

let camera: THREE.PerspectiveCamera;
let simulation: Simulation;
let scene: THREE.Scene;
let effectComposer: EffectComposer;
let crtPass: ShaderPass;
let sobelPass: ShaderPass;

export async function init() {
  console.log("Initializing the battle scene!")
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  simulation = new Simulation(camera, scene);

  effectComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 0.95 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.5, 0.6)
  effectComposer.addPass(bloomPass)

  sobelPass = new ShaderPass(SobelOperatorShader);
  effectComposer.addPass(sobelPass);

  crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.scanlineIntensity.value = 0.5
  effectComposer.addPass(crtPass);
  currentCrtPass = crtPass

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.6)
  scene.add(ambientLight)

  const [, sceneGltf] = await Promise.all([
    loadEquirectangularAsEnvMap(skyMirrorWebp, THREE.LinearFilter, THREE.LinearFilter, renderer).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 1.0

      scene.environmentRotation.y = Math.PI / -4
      scene.backgroundRotation.y = Math.PI / -4
    }),

    loadGltf(stairsGlb)
  ])

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  sceneGltf.scene.visible = false

  shaders.applyInjectedMaterials(sceneGltf.scene)

  sceneGltf.scene.traverse((object) => {
    if (object.name === "Skull009") {
      const skull = object as THREE.Mesh
      skull.material = NoiseMaterial;
    }

    if (object.name === "stairs_1") {
      const cube = object as THREE.Mesh

      shaders.waitForShader(cube).then((shader) => {
        const bits = getRGBBits(64)
        shader.uniforms.colorBitsR = { value: bits.r }
        shader.uniforms.colorBitsG = { value: bits.g }
        shader.uniforms.colorBitsB = { value: bits.b }
      })
    }

    if (object.name === "Plane001" && object.parent!.name === "arc") {
      const plane = object as THREE.Mesh

      loadEquirectangularAsEnvMap(dmtPng, undefined, undefined, renderer).then((envMap) => {
        const parallax = createParallaxWindowMaterial(envMap, camera)

        plane.material = parallax.material

        let rotationX = 46
        let rotationY = 90
        let rotationZ = 28

        simulation.ViewSync.AddAuxiliaryView(new class ParallaxWindowView extends View {
          public Draw(simulation: Simulation): void {
            parallax.updateCameraPosition()

            rotationX += 0.05 * simulation.SimulationState.DeltaTime
            rotationY -= 0.03 * simulation.SimulationState.DeltaTime
            rotationZ += 0.01 * simulation.SimulationState.DeltaTime

            const euler = new THREE.Euler(rotationX, rotationY, rotationZ, 'XYZ')

            const mat4 = new THREE.Matrix4()
            mat4.makeRotationFromEuler(euler)

            const rotationMatrix = new THREE.Matrix3()
            rotationMatrix.setFromMatrix4(mat4)

            parallax.setRotationMatrix(rotationMatrix)
          }
        })
      })
    }
  })

  scene.add(sceneGltf.scene)

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      scene.environmentRotation.y += 0.0002
      scene.backgroundRotation.y += 0.0002

      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;

      effectComposer.render()

      playerInput.update()

      // if (!simulationPlayerViews[simulation.SimulationIndex]?.getControlsEnabled()) {
      //   simulationPlayerViews[simulation.SimulationIndex]?.enableControls()
      // }
    }
  })
}

// We don't want to load assets in the show function or if we do we want to load them non-blocking then inject them into the scene later
// If we wait for asset initialization in here then there will be significant lag on scene switch. We want to load all assets in the above init function.
export async function show(context: SubSceneContext) {
  console.log("Showing battle scene!");

  toggleStartKey(false)
  toggleBattleTrack(true)

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    sobelPass.uniforms.resolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    // fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  }

  window.addEventListener('resize', resize, false);

  resize()

  simulation.Start();
  doBeatMap().then(() => {
    console.log("Beatmap done!")
    context.End();
  })

  return () => {
    window.removeEventListener('resize', resize, false);
    simulation.Stop();
    simulation.ViewSync.Cleanup(simulation);
    toggleStartKey(true);
    toggleBattleTrack(false);
  }
}
