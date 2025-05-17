import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ToneMappingShader } from '../../graphics/toneMappingShader'
import { Simulation } from '../../simulation'
import { View } from '../../simulation/View'
import { renderer } from '../../components/Viewport'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import * as state from './state'
import * as shaders from '../../graphics/shaders'
import { SkeletonUtils } from "three/examples/jsm/Addons.js"
import { processAttributes } from "../../utils/processAttributes"
import { simulationPlayerViews, InteractionsChangedPayload } from "../../views/player"
import { SimulationCommand } from "../../simulation/commands/_command"
import { playerInput } from "../../input/player"
import { until } from "../../utils/defer"

export let currentOutlinePass: OutlinePass | null = null
export let currentCrtPass: ShaderPass | null = null

const SHADOW_BIAS = -0.0009

export const initScene = async (map: Promise<THREE.Object3D>) => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
  const simulation = new Simulation(camera, scene)
  camera.add(new THREE.AudioListener())

  const effectComposer = new EffectComposer(renderer)
  effectComposer.addPass(new RenderPass(scene, camera))

  ToneMappingShader.uniforms.contrast = { value: 1.3 }
  ToneMappingShader.uniforms.contrastMidpoint = { value: 0.1 }
  ToneMappingShader.uniforms.saturation = { value: 0.6 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader)
  effectComposer.addPass(toneMappingPass)

  currentOutlinePass = new OutlinePass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    scene,
    camera,
  )
  // tweak outline pass
  currentOutlinePass.edgeStrength = 10
  currentOutlinePass.edgeGlow = 0.0
  currentOutlinePass.edgeThickness = 0.1
  currentOutlinePass.visibleEdgeColor.set(0xffffff)
  currentOutlinePass.hiddenEdgeColor.set(0x00000000)
  effectComposer.addPass(currentOutlinePass)

  const crtPass = new ShaderPass(shaders.CRTShader)
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
  effectComposer.addPass(crtPass)
  currentCrtPass = crtPass

  effectComposer.addPass(new OutputPass())

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Draw(): void {
      playerInput.update()

      crtPass.uniforms.time.value = (Date.now() / 1000) % 1.0
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
      if (!state.gameStarted || (state.inDialogue && !state.outro)) camera.rotateY(-0.1 * simulation.ViewSync.DeltaTime)
      effectComposer.render()
    }
  })

  const resize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)
  }
  resize()
  window.addEventListener('resize', resize, false)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const sceneGltfOriginal = await map

  const sceneObject = SkeletonUtils.clone(sceneGltfOriginal)
  processAttributes(sceneObject, simulation, sceneEntId, false)
  shaders.applyInjectedMaterials(sceneObject)

  sceneObject.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false
      child.receiveShadow = false

      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material.side = THREE.DoubleSide
      }
    }
  })

  scene.add(sceneObject)

  const createFlashlight = () => {
    const flashlight = new THREE.SpotLight(0xffffff)
    flashlight.position.set(2, 3, -6)
    flashlight.castShadow = false
    flashlight.shadow.mapSize.set(4096, 4096)
    flashlight.shadow.camera.near = 0.1
    flashlight.shadow.camera.far = 30
    flashlight.shadow.camera.fov = 30
    flashlight.intensity = 8
    flashlight.decay = 0.999
    flashlight.angle = Math.PI * 0.35
    flashlight.penumbra = 1
    flashlight.shadow.bias = SHADOW_BIAS
    scene.add(flashlight)
    const target = new THREE.Object3D()
    scene.add(target)
    flashlight.target = target

    simulation.ViewSync.AddAuxiliaryView(new class FlashlightPositionManager extends View {
      public Draw(): void {
        const tempVec3 = new THREE.Vector3()
        camera.getWorldPosition(tempVec3)
        flashlight.position.copy(tempVec3)
        camera.getWorldDirection(tempVec3)
        flashlight.target.position.copy(tempVec3.add(camera.position))
        flashlight.target.updateMatrixWorld()
      }
    })

    return flashlight
  }

  simulation.ViewSync.AddAuxiliaryView(new class PlayerControlsManager extends View {
    public Draw(): void {
      if (state.gameStarted && !state.picking && !state.inDialogue && !state.inSettings && !state.outro && document.pointerLockElement === renderer.domElement) {
        simulationPlayerViews[simulation.SimulationIndex]?.enableControls()
      } else {
        simulationPlayerViews[simulation.SimulationIndex]?.disableControls()
      }
    }
  })

  const interactionsChangedHandler = (interactions: InteractionsChangedPayload) => {
    let closestInteraction = null

    for (const interaction of interactions) {
      if (!closestInteraction || interaction.angle < closestInteraction.angle) {
        closestInteraction = interaction
      }
    }

    const selectedObjects = closestInteraction?.command.Owner ? [closestInteraction.command.Owner] : []

    currentOutlinePass?.selectedObjects.splice(0, currentOutlinePass.selectedObjects.length)
    currentOutlinePass?.selectedObjects.push(...selectedObjects)
  }

  const simulationIndex = simulation.SimulationIndex

  until(() => Boolean(simulationPlayerViews[simulationIndex]?.interactionEmitter)).then(() => {
    simulationPlayerViews[simulationIndex]!.interactionEmitter.on("interactionsChanged", interactionsChangedHandler)
  })

  const cleanup = () => {
    simulationPlayerViews[simulation.SimulationIndex]?.interactionEmitter.off("interactionsChanged", interactionsChangedHandler)
    window.removeEventListener('resize', resize)
    scene.clear()
    effectComposer.dispose()
    simulation.ViewSync.Cleanup(simulation)
    simulation.Stop()
    currentOutlinePass = null
    currentCrtPass = null
  }

  return {
    scene,
    sceneObject,
    camera,
    simulation,
    effectComposer,
    crtPass,
    cleanup,
    sceneEntId,
    createFlashlight,
  }
}
