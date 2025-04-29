import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadFbx, loadGltf, loadTiledJSON } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { createGarden } from '../../entities/garden';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import { CollidersDebugger } from "../../views/collidersDebugger";
import { vec3 } from "gl-matrix";
import * as Tiled from "../../graphics/tiledJson"

const SUN_OFFSET = 1000
const SHADOW_MAP_SIZE = renderer.capabilities.maxTextureSize;
const SHADOW_CAMERA_NEAR = 0.1;
const SHADOW_CAMERA_FAR = 2000;
const SHADOW_CAMERA_LEFT = -100;
const SHADOW_CAMERA_RIGHT = 100;
const SHADOW_CAMERA_TOP = 100;
const SHADOW_CAMERA_BOTTOM = -100;
const SHADOW_BIAS = -0.00004;

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
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

  const [, island] = await Promise.all([
    loadEquirectangularAsEnvMap("./3d/env/fantasy_sky_2.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 0.9
    }),

    loadTiledJSON("./3d/maps/island.json")
  ])

  for (const mesh of island.meshes) {
    shaders.applyInjectedMaterials(mesh)

    scene.add(mesh)
  }

  for (const boxCollider of island.boxColliders) {
    simulation.SimulationState.PhysicsRepository.AddBoxCollider(sceneEntId, boxCollider.halfExtents, boxCollider.position)
  }

  for (const spawnPoint of island.spawnPoints) {
    const [x, y, z] = spawnPoint
    const position = vec3.fromValues(x, y, z)
    player.createPlayer(simulation, position, [0, 0, 0])

    break;
  }

  for (const plot in island.plots) {
    const [x, y, z] = island.plots[plot]

    const size = Tiled.PLOT_SIZE

    const position = vec3.fromValues(x + (size / 2), y, z + (size / 2))

    createGarden(simulation, position)
  }

  simulation.Start()

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  return () => {
    simulation.Stop()
  }
}
