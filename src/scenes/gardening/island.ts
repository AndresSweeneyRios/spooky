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

  // const ambientLight = new THREE.AmbientLight(0xffffff, 1.1)
  // scene.add(ambientLight)

  const sun = new THREE.DirectionalLight(0xffaaaa, 2)
  sun.position.set(0, 1000, 0)
  // sun.target.position.set(0, 0, 0)
  // sun.shadow.camera.position.set(0, 1000, 0)
  // sun.shadow.camera.lookAt(0, 0, 0)
  // sun.position.set(0, 0, 0)
  sun.castShadow = true
  scene.add(sun)

  // const lightHelper = new THREE.DirectionalLightHelper(sun, 5);
  // scene.add(lightHelper);

  // const sunShadowCameraHelper = new THREE.CameraHelper(sun.shadow.camera);
  // scene.add(sunShadowCameraHelper);

  sun.shadow.mapSize.width = 4096; // Higher values provide better shadow quality
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 0.1; // Adjust as needed
  sun.shadow.camera.far = 2000;  // Adjust as needed
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.bias = -0.0001;

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      sun.shadow.camera.position.set(camera.position.x, camera.position.y, camera.position.z)
      // sun.shadow.camera.lookAt(0, 0, 0)
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
      scene.environmentIntensity = 0.9

      scene.environmentRotation.y = Math.PI / -4
      scene.backgroundRotation.y = Math.PI / -4
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

  return () => {
    simulation.Stop()
  }
}
