import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { ThroneView } from '../views/throne';
import { loadGltf, loadPMREM, loadTexture, loadVideoTexture } from '../graphics/loaders';
import { createPlayer } from '../entities/player';
import { vec3 } from 'gl-matrix';
import * as shaders from '../graphics/shaders';
import { NoiseMaterial } from '../graphics/noise'; 

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

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.6)
  scene.add(ambientLight)

  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, false);

  // add sun
  // const sun = new THREE.DirectionalLight(0xffffff, 3.0)
  // sun.position.set(0, 1, 0)
  // scene.add(sun)

  const [, sceneGltf] = await Promise.all([
    loadPMREM("/3d/hdr/sky.hdr").then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 1.0

      scene.environmentRotation.y = Math.PI / 4
      scene.backgroundRotation.y = Math.PI / 4
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
          ), vec3.fromValues(
            command.rotation.x,
            command.rotation.y,
            command.rotation.z,
          ))
        }
      }

      continue
    }
  }

  scene.add(sceneGltf.scene)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  // load texture https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/SMPTE_Color_Bars.svg/1280px-SMPTE_Color_Bars.svg.png

  // const smpteTexture = loadTexture("https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/SMPTE_Color_Bars.svg/1280px-SMPTE_Color_Bars.svg.png")
  // const staticTexture = loadVideoTexture("/3d/videos/static_optimized.webm")

  console.log(sceneGltf.scene)

  sceneGltf.scene.traverse((object) => {
    if (object.name === "Skull009") {
      const skull = object as THREE.Mesh
      skull.material = NoiseMaterial;
    }

    if (object.name === "Cube001" && object.parent!.name === "stairs") {
      const cube = object as THREE.Mesh

      requestAnimationFrame(() => {
        shaders.getShader(cube).uniforms.colorBits = { value: 64 }
      })
    }
  })

  const throneView = new ThroneView(scene)
  simulation.ViewSync.AddAuxiliaryView(throneView)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
