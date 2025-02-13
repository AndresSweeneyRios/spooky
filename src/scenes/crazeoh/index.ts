import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf, } from '../../graphics/loaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader, ShaderPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import { CollidersDebugger } from "../../views/collidersDebugger";
import { vec3 } from "gl-matrix";
import { traverse } from "../../utils/traverse";
import * as state from "./state"
import { disableAllAnomalies, pickRandomAnomaly } from "./anomaly";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { ToggleFridge } from "../../simulation/commands/crazeoh/ToggleFridge";
import { createFridge } from "../../entities/crazeoh/fridge";
import { createStove } from "../../entities/crazeoh/stove";
import { createMicrowave } from "../../entities/crazeoh/microwave";
import * as shaders from '../../graphics/shaders';

const SHADOW_MAP_SIZE = renderer.capabilities.maxTextureSize;
const SHADOW_CAMERA_NEAR = 0.1;
const SHADOW_CAMERA_FAR = 2000;
const SHADOW_CAMERA_LEFT = -100;
const SHADOW_CAMERA_RIGHT = 100;
const SHADOW_CAMERA_TOP = 100;
const SHADOW_CAMERA_BOTTOM = -100;
const SHADOW_BIAS = -0.0009;

const mapLoader = loadGltf("/3d/scenes/island/crazeoh.glb")

// functions to disable and enable #caseoh-loading via is-hidden attribute
const disableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "true")
}

const enableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "false")
}

export const init = async () => {
  enableLoading()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  ToneMappingShader.uniforms.contrast = { value: 1.09 }
  ToneMappingShader.uniforms.saturation = { value: 0.9 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  effectComposer.addPass(crtPass);

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  player.setThirdPerson(false)
  player.setCameraHeight(1.8)

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
  spotLight.angle = Math.PI * 0.17
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
    // fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
    effectComposer.setSize(window.innerWidth, window.innerHeight)
  }

  resize()

  window.addEventListener('resize', resize, false);

  const [sceneGltfOriginal, playerView] = await Promise.all([
    mapLoader,
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ])

  const sceneGltf = sceneGltfOriginal.scene.clone()

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

  disableLoading()

  let previousPlayStatus = false

  simulation.Start()

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

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      crtPass.uniforms.time.value = performance.now() / 1000.0;
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);

      // rotate camera slowly around y axis
      if (!state.playing) {
        camera.rotateY(-0.0005)
      }

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

    const polaroid = document.querySelector("#caseoh-polaroid-overlay .background") as HTMLImageElement
    const dataUrl = renderer.domElement.toDataURL()

    polaroid.src = dataUrl
    polaroid.parentElement!.setAttribute("is-hidden", "false")
    polaroid.parentElement!.setAttribute("shutter", "true")

    setTimeout(() => {
      polaroid.parentElement!.setAttribute("shutter", "false")

      shutterOn = false
    }, 2000)
  }

  window.addEventListener("click", setPolaroidFromViewport)

  return () => {
    simulation.Stop()

    simulation.ViewSync.Cleanup(simulation)

    window.removeEventListener('resize', resize)

    window.removeEventListener("click", setPolaroidFromViewport)
  }
}
