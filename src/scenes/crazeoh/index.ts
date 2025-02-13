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
import { pickRandomAnomaly } from "./anomaly";
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

  // camera.position.set(2, 1.4, -5)

  camera.rotateY(-Math.PI / 2)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0)
  scene.add(ambientLight)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const fxaaPass = new ShaderPass(FXAAShader)
  fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
  effectComposer.addPass(fxaaPass)

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

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      effectComposer.render()

      // rotate camera slowly around y axis
      if (!state.playing) {
        camera.rotateY(-0.0005)
      }
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
    effectComposer.setSize(window.innerWidth, window.innerHeight)
  }

  resize()

  window.addEventListener('resize', resize, false);

  const [sceneGltf] = await Promise.all([
    loadGltf("/3d/scenes/island/crazeoh.glb"),

    loadEquirectangularAsEnvMap("/3d/env/fantasy_sky_2.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 0.0
      scene.environment = texture
      scene.environmentIntensity = 0
    }),
  ])

  for (const child of traverse(sceneGltf.scene)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true

      const material = child.material as THREE.Material
      material.shadowSide = THREE.DoubleSide
      material.side = THREE.DoubleSide
    }
  }

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  scene.add(sceneGltf.scene)

  const playerView = await player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])

  disableLoading()

  let previousPlayStatus = false

  simulation.Start()

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

  return () => {
    simulation.Stop()

    simulation.ViewSync.Cleanup(simulation)

    window.removeEventListener('resize', resize)
  }
}
