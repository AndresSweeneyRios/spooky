import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { ThroneView } from '../views/throne';
import { loadEquirectangularAsEnvMap, loadGltf, loadPMREM, loadTexture, loadVideoTexture } from '../graphics/loaders';
import { createPlayer } from '../entities/player';
import { vec3 } from 'gl-matrix';
import * as shaders from '../graphics/shaders';
import { NoiseMaterial } from '../graphics/noise'; 
import { getRGBBits } from '../graphics/quantize';
import { createParallaxWindowMaterial } from '../graphics/parallaxWindow';

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
    // loadPMREM("/3d/hdr/sky.hdr")
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

    if (object.name === "stairs_1") {
      const cube = object as THREE.Mesh

      requestAnimationFrame(() => {
        const shader = shaders.getShader(cube)
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

  const throneView = new ThroneView(scene)
  simulation.ViewSync.AddAuxiliaryView(throneView)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
