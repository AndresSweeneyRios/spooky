import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../graphics/loaders';
import * as shaders from '../graphics/shaders';
import { processAttributes } from '../utils/processAttributes';
import { CollidersDebugger } from '../views/collidersDebugger';
import { traverse } from '../utils/traverse';
import cityscapeWebp from '../assets/3d/env/cityscape.webp';
import starterSceneGlb from '../assets/3d/scenes/startscene/starterscene.glb';
import { ToneMappingShader } from "../graphics/toneMappingShader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  const effectComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 0.95 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.5, 0.6)
  effectComposer.addPass(bloomPass)

  const sobelPass = new ShaderPass(SobelOperatorShader);
  effectComposer.addPass(sobelPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.scanlineIntensity.value = 0.5
  effectComposer.addPass(crtPass);

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  // scene.add(ambientLight)

  // add sun
  const sun = new THREE.DirectionalLight(0xddccee, 0.6)
  sun.position.set(0, 1000, 0)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  scene.add(sun)

  // add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  sun.shadow.mapSize.width = 1920; // Higher values provide better shadow quality
  sun.shadow.mapSize.height = 1920;
  sun.shadow.camera.near = 0.1; // Adjust as needed
  sun.shadow.camera.far = 5000;  // Adjust as needed
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.bias = -0.001;

  // scene.fog = new THREE.Fog( 0x000000, 0.1, 10 );
  // scene.fog = new THREE.FogExp2( 0x000000, 0.02 );

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      effectComposer.render()
    }
  })

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, false);
  const [, sceneGltf] = await Promise.all([
    loadEquirectangularAsEnvMap(cityscapeWebp, THREE.LinearFilter, THREE.LinearFilter, renderer).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 1.0
    }),

    loadGltf(starterSceneGlb)
  ])

  const scale = 0.6

  for (const child of traverse(sceneGltf.scene)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      const material = child.material as THREE.Material
      material.shadowSide = THREE.DoubleSide

      const geometry = child.geometry as THREE.BufferGeometry;

      if (geometry && geometry.attributes.position) {
        const positions = geometry.attributes.position.array; // Float32Array of positions

        // Scale down all vertices by scale
        for (let i = 0; i < positions.length; i++) {
          positions[i] *= scale;
        }

        // Mark the position attribute as needing an update
        geometry.attributes.position.needsUpdate = true;

        // Optionally, recompute bounding volumes
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }

      // Adjust the object's position (if needed, avoid double-scaling!)
      child.position.multiplyScalar(scale);
    }
  }

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  scene.add(sceneGltf.scene)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  simulation.Start()

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  return () => {
    simulation.Stop()
  }
}
