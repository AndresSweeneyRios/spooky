import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { ThroneView } from '../views/throne';
import { loadGltf, loadPMREM } from '../graphics/loaders';
import { createPlayer } from '../entities/player';
import { vec3 } from 'gl-matrix';

export const init = async () => {
  const scene = new THREE.Scene()
  const simulation = new Simulation()

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      renderer.render(scene, camera)
      scene.environmentRotation.y += 0.0002
      scene.backgroundRotation.y += 0.0002
    }
  
    public Cleanup(): void {
      renderer.dispose()
    }
  })

  const ambientLight = new THREE.AmbientLight(0xff0000, 0.5)
  scene.add(ambientLight)

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, false);

  // add red ambient light
  
  // add sun
  // const sun = new THREE.DirectionalLight(0xffffff, 10.0)
  // sun.position.set(0, 1, 0)
  // scene.add(sun)

  const [, sceneGltf] = await Promise.all([
    loadPMREM("/3d/hdr/sky.hdr").then((texture) => {
      scene.background = texture
      scene.environment = texture
      scene.environmentIntensity = 1.0
    }),

    loadGltf("/3d/scenes/stairs/stairs.glb")
  ])

  for (const object of sceneGltf.scene.children[0].children) {
    if (object.name === 'COLLIDERS') {
      object.visible = false

      simulation.SimulationState.PhysicsRepository.AddSceneColliders(sceneEntId, object)

      continue
    }

    if (object.name === 'COMMANDS') {
      object.visible = false

      for (const command of object.children) {
        if (command.name === 'SPAWN') {
          createPlayer(simulation, camera, vec3.fromValues(
            command.position.x,
            command.position.y,
            command.position.z,
          ))
        }
      }

      continue
    }
  }

  scene.add(sceneGltf.scene)

  // const throneView = new ThroneView(scene)
  // throneView.scene.position.set(0, 0, -5)
  // simulation.ViewSync.AddAuxiliaryView(throneView)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
