import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../graphics/loaders';
import * as shaders from '../graphics/shaders';
import { NoiseMaterial } from '../graphics/noise'; 
import { getRGBBits } from '../graphics/quantize';
import { createParallaxWindowMaterial } from '../graphics/parallaxWindow';
import { processAttributes } from '../utils/processAttributes';
import { CollidersDebugger } from '../views/collidersDebugger';

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.6)
  scene.add(ambientLight)

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

    loadGltf("/3d/scenes/stairs/stairs.glb")
  ])

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  scene.add(sceneGltf.scene)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  sceneGltf.scene.traverse((object) => {
    if (object.name === "Skull009") {
      const skull = object as THREE.Mesh
      skull.material = NoiseMaterial;
    }

    if (object.name === "stairs_1") {
      const cube = object as THREE.Mesh

      shaders.waitForShader(cube).then((shader) => {
        const bits = getRGBBits(64)
        shader.uniforms.colorBitsR = { value: bits.r }
        shader.uniforms.colorBitsG = { value: bits.g }
        shader.uniforms.colorBitsB = { value: bits.b }
      })
    }

    if (object.name === "Plane001" && object.parent!.name === "arc") {
      const plane = object as THREE.Mesh

      loadEquirectangularAsEnvMap("/3d/env/dmt.png").then((envMap) => {
        const parallax = createParallaxWindowMaterial(envMap, camera)

        plane.material = parallax.material

        let rotationX = 46
        let rotationY = 90
        let rotationZ = 28

        simulation.ViewSync.AddAuxiliaryView(new class ParallaxWindowView extends View {
          public Draw(simulation: Simulation): void {
            parallax.updateCameraPosition()

            rotationX += 0.05 * simulation.SimulationState.DeltaTime
            rotationY -= 0.03 * simulation.SimulationState.DeltaTime
            rotationZ += 0.01 * simulation.SimulationState.DeltaTime

            const euler = new THREE.Euler(rotationX, rotationY, rotationZ, 'XYZ')

            const mat4 = new THREE.Matrix4()
            mat4.makeRotationFromEuler(euler)

            const rotationMatrix = new THREE.Matrix3()
            rotationMatrix.setFromMatrix4(mat4)

            parallax.setRotationMatrix(rotationMatrix)
          }
        })
      })
    }
  })

  simulation.Start()

  simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  return () => {
    simulation.Stop()
  }
}
