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
import { createCaseoh } from "../../entities/caseoh";

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
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  // camera.position.set(2, 1.4, -5)

  camera.rotateY(-Math.PI / 2)

  // const ambientLight = new THREE.AmbientLight(0xffffff, 0)
  // scene.add(ambientLight)

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

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      effectComposer.render()

      // rotate camera slowly around y axis
      // camera.rotateY(-0.0005)
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
      scene.environmentIntensity = 1.0
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

  scene.add(sceneGltf.scene)

  simulation.Start()

  player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])

  createCaseoh(simulation)

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  return () => {
    simulation.Stop()
  }
}
