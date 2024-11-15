import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../graphics/loaders';
import * as shaders from '../graphics/shaders';
import { processAttributes } from '../utils/processAttributes';
import { CollidersDebugger } from '../views/collidersDebugger';
import { traverse } from '../utils/traverse';

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.0)
  scene.add(ambientLight)

  // add sun
  // const sun = new THREE.DirectionalLight(0xffffff, 1.0)
  // sun.position.set(0, 1, 0)
  // sun.castShadow = true
  // scene.add(sun)

  // sun.shadow.mapSize.width = 1024; // Higher values provide better shadow quality
  // sun.shadow.mapSize.height = 1024;
  // sun.shadow.camera.near = 0.5; // Adjust as needed
  // sun.shadow.camera.far = 500;  // Adjust as needed

  // // For directional lights, configure the shadow camera frustum
  // sun.shadow.camera.left = -10;
  // sun.shadow.camera.right = 10;
  // sun.shadow.camera.top = 10;
  // sun.shadow.camera.bottom = -10;

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      renderer.render(scene, camera)
    }
  
    public Cleanup(): void {
      renderer.dispose()
    }
  })
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, false);
  const [, sceneGltf] = await Promise.all([
    loadEquirectangularAsEnvMap("/3d/env/cityscape.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 0.6

      scene.environmentRotation.y = Math.PI / -4
      scene.backgroundRotation.y = Math.PI / -4
    }),

    loadGltf("/3d/scenes/startscene/starterscene.glb")
  ])

  for (const child of traverse(sceneGltf.scene)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
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
