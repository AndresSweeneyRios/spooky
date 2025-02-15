import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadAudio, loadEquirectangularAsEnvMap, loadGltf, } from '../../graphics/loaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader, ShaderPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import { traverse } from "../../utils/traverse";
import * as state from "./state"
import { disableAllAnomalies, pickRandomAnomaly } from "./anomaly";
import { createFridge } from "../../entities/crazeoh/fridge";
import { createStove } from "../../entities/crazeoh/stove";
import { createMicrowave } from "../../entities/crazeoh/microwave";
import * as shaders from '../../graphics/shaders';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getAngle } from "../../utils/math";
import { createDoor } from "../../entities/crazeoh/door";
import { PlayerView } from "../../views/player";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { SimulationCommand } from "../../simulation/commands/_command";
import { CollidersDebugger } from "../../views/collidersDebugger";

// import "../../graphics/injections/cel"
// import "../../graphics/injections/outline"

const SHADOW_BIAS = -0.0009;

const mapLoader = loadGltf("/3d/scenes/island/crazeoh.glb")

const windAudioPromise = loadAudio("/audio/sfx/wind.ogg", {
  loop: true,
})

const nightAmbianceAudioPromise = loadAudio("/audio/sfx/night_ambiance.ogg", {
  loop: true,
  detune: -200,
})

const cameraAudioPromise = loadAudio("/audio/sfx/camera.ogg", {})

const ceilingFanAudioPromise = loadAudio("/audio/sfx/ceiling_fan.ogg", {
  loop: true,
  positional: true,
})

const eatChipAudioPromise = loadAudio("/audio/sfx/eat_chip.ogg", {
  detune: -600,
})

eatChipAudioPromise.then(audio => {
  audio.setVolume(0.5)
})

cameraAudioPromise.then(audio => {
  audio.setVolume(0.3)
})

windAudioPromise.then(audio => {
  audio.setVolume(0.06)
  audio.play()
})

nightAmbianceAudioPromise.then(audio => {
  audio.setVolume(0.03)
  audio.play()
})

// functions to disable and enable #caseoh-loading via is-hidden attribute
const disableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "true")
}

const enableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "false")
}

export let currentPlayerView: PlayerView | null = null

export const init = async () => {
  state.setAnomalyPosition(new THREE.Vector3(0, 0, 0))
  state.setFoundAnomaly(false)
  state.setTookPicture(false)
  state.setPlaying(false)

  enableLoading()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene)

  const listener = new THREE.AudioListener()
  camera.add(listener)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  // const fxaaPass = new ShaderPass(FXAAShader)
  // effectComposer.addPass(fxaaPass)

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 0.95 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  effectComposer.addPass(crtPass);

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  player.setThirdPerson(false)
  player.setCameraHeight(2)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(2, 3, -6);

  spotLight.castShadow = false;

  spotLight.shadow.mapSize.width = 4096;
  spotLight.shadow.mapSize.height = 4096;

  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 30;
  spotLight.shadow.camera.fov = 30;
  spotLight.intensity = 3
  spotLight.decay = 0.3
  spotLight.angle = Math.PI * 0.25
  spotLight.penumbra = 1
  spotLight.shadow.bias = SHADOW_BIAS
  scene.add(spotLight);

  // add target to spotlight
  const target = new THREE.Object3D()
  scene.add(target)
  spotLight.target = target

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    // fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  }

  resize()

  window.addEventListener('resize', resize, false);

  const [
    sceneGltfOriginal,
    playerView,
  ] = await Promise.all([
    mapLoader,
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0]),
  ])

  currentPlayerView = playerView

  const sceneGltf = SkeletonUtils.clone(sceneGltfOriginal.scene)

  for (const child of traverse(sceneGltf)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true

      const material = child.material as THREE.Material
      material.shadowSide = THREE.DoubleSide
      material.side = THREE.DoubleSide
    }
  }

  processAttributes(sceneGltf, simulation, sceneEntId, false)

  shaders.applyInjectedMaterials(sceneGltf)

  scene.add(sceneGltf)

  let previousPlayStatus = false

  disableAllAnomalies(simulation)

  const detectPlayStateChange = async () => {
    if (state.playing === previousPlayStatus) {
      return
    }

    if (state.playing) {
      playerView.enableControls()
      pickRandomAnomaly(simulation)
    } else {
      playerView.disableControls()
    }

    previousPlayStatus = state.playing
  }

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Update(): void {
      detectPlayStateChange()
    }

    public Draw(): void {
      camera.updateMatrixWorld()

      // For example, offset the spotlight from the camera:
      const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      spotLight.position.copy(cameraPosition).add(new THREE.Vector3(0, 0, 0));

      // Then update the target to point where the camera is looking:
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      spotLight.target.position.copy(cameraPosition).add(cameraDirection);
      spotLight.target.updateMatrixWorld();
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  createFridge(simulation)
  createStove(simulation)
  createMicrowave(simulation)
  createDoor(simulation)

  const fanBlades = scene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh

  ceilingFanAudioPromise.then(audio => {
    audio.setVolume(1)
    fanBlades.add(audio.getPositionalAudio())
    audio.play()
  })

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);

      // rotate camera slowly around y axis
      if (!state.playing) {
        camera.rotateY(-0.0005)
      }

      fanBlades.rotateZ(0.06)

      effectComposer.render()
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  let shutterOn = false

  const setPolaroidFromViewport = () => {
    if (shutterOn || document.pointerLockElement !== renderer.domElement) {
      return
    }

    shutterOn = true

    cameraAudioPromise.then(audio => audio.play())

    const polaroid = document.querySelector(".caseoh-polaroid-overlay.ingame .background") as HTMLImageElement
    const polaroid2 = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay .background") as HTMLImageElement
    const dataUrl = renderer.domElement.toDataURL()

    polaroid.src = dataUrl
    polaroid2.src = dataUrl
    polaroid.parentElement!.setAttribute("is-hidden", "false")
    polaroid.parentElement!.setAttribute("shutter", "true")

    const playerEntId = playerView.EntId
    const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
    const targetPosition = state.anomalyPosition

    if (state.anomaly) {
      const angle = getAngle(targetPosition, new THREE.Vector3(
        playerPosition[0],
        playerPosition[1],
        playerPosition[2]
      ), camera)

      state.setFoundAnomaly(angle < 30)
    }

    state.setTookPicture(true)

    setTimeout(() => {
      polaroid.parentElement!.setAttribute("shutter", "false")

      shutterOn = false
    }, 2000)
  }

  window.addEventListener("click", setPolaroidFromViewport)

  setTimeout(() => {
    disableLoading()
  }, 750)

  const pizzaObject = scene.getObjectByName("pizza") as THREE.Mesh
  const pizzaEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(pizzaEntId)
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(pizzaEntId, [2, 2, 2], [
    pizzaObject.position.x,
    pizzaObject.position.y,
    pizzaObject.position.z,
  ], undefined, true)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(pizzaEntId)
  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: pizzaEntId,
    executionMode: ExecutionMode.Interaction,
    once: true,
    command: new class extends SimulationCommand {
      public Execute(simulation: Simulation): void {
        pizzaObject.visible = false
        eatChipAudioPromise.then(audio => audio.play())
      }
    }
  })

  simulation.Start()

  return () => {
    simulation.Stop()

    simulation.ViewSync.Cleanup(simulation)

    window.removeEventListener('resize', resize)

    window.removeEventListener("click", setPolaroidFromViewport)
  }
}
