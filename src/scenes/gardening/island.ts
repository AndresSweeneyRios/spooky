import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { NoiseMaterial } from '../../graphics/noise'; 
import { getRGBBits } from '../../graphics/quantize';
import { createParallaxWindowMaterial } from '../../graphics/parallaxWindow';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { CollidersDebugger } from '../../views/collidersDebugger';

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  player.setThirdPerson(true)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.6)
  scene.add(ambientLight)

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
    loadEquirectangularAsEnvMap("/3d/env/sky_mirror.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 1.0

      scene.environmentRotation.y = Math.PI / -4
      scene.backgroundRotation.y = Math.PI / -4
    }),

    loadGltf("/3d/scenes/island/island.glb")
  ])

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  scene.add(sceneGltf.scene)

  simulation.Start()

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  player.createPlayer(simulation, [0, 1, 0], [0, 0, 0])

  return () => {
    simulation.Stop()
  }
}
