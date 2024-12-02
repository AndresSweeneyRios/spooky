import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { createGarden } from '../../entities/garden';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';

const SUN_OFFSET = 1000
const SHADOW_MAP_SIZE = 4096;
const SHADOW_CAMERA_NEAR = 0.1;
const SHADOW_CAMERA_FAR = 2000;
const SHADOW_CAMERA_LEFT = -20;
const SHADOW_CAMERA_RIGHT = 20;
const SHADOW_CAMERA_TOP = 20;
const SHADOW_CAMERA_BOTTOM = -20;
const SHADOW_BIAS = -0.00004;

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 1.5, 0.6)
  effectComposer.addPass(bloomPass)

  const fxaaPass = new ShaderPass(FXAAShader)
  fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
  effectComposer.addPass(fxaaPass)

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  player.setThirdPerson(true)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(0, SUN_OFFSET, 0)
  sun.castShadow = true
  scene.add(sun)

  sun.shadow.intensity = 0.6
  
  const sunTarget = new THREE.Object3D()
  sunTarget.position.set(0, 0, 0)
  scene.add(sunTarget)
  
  sun.target = sunTarget
  
  sun.shadow.mapSize.width = SHADOW_MAP_SIZE;
  sun.shadow.mapSize.height = SHADOW_MAP_SIZE;
  sun.shadow.camera.near = SHADOW_CAMERA_NEAR;
  sun.shadow.camera.far = SHADOW_CAMERA_FAR;
  sun.shadow.camera.left = SHADOW_CAMERA_LEFT;
  sun.shadow.camera.right = SHADOW_CAMERA_RIGHT;
  sun.shadow.camera.top = SHADOW_CAMERA_TOP;
  sun.shadow.camera.bottom = SHADOW_CAMERA_BOTTOM;
  sun.shadow.bias = SHADOW_BIAS;
  
  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      sun.position.copy(camera.position)
      sun.target.position.copy(camera.position)
      sun.position.y += SUN_OFFSET
      sun.shadow.camera.position.copy(camera.position)
      // renderer.render(scene, camera)
      effectComposer.render()
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

  const [, sceneGltf] = await Promise.all([
    loadEquirectangularAsEnvMap("/3d/env/fantasy_sky_2.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 0.9
    }),

    loadGltf("/3d/scenes/island/island.glb")
  ])

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  // sceneGltf.scene.visible = false

  shaders.applyInjectedMaterials(sceneGltf.scene)

  scene.add(sceneGltf.scene)
  simulation.Start()

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  player.createPlayer(simulation, [0, 1, 0], [0, 0, 0])

  createGarden(simulation, [0, 0, -10])

  return () => {
    simulation.Stop()
  }
}
