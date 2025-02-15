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
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ToneMappingShader } from "../graphics/toneMappingShader";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/Addons.js";
import { SobelOperatorShader } from "../graphics/sobelOberatorShader";

// import "../graphics/injections/cel"
// import "../graphics/injections/outline"

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  const fxaaPass = new ShaderPass(FXAAShader)
  effectComposer.addPass(fxaaPass)

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

  const ambientLight = new THREE.AmbientLight(0xff44444, 0.6)
  scene.add(ambientLight)

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    sobelPass.uniforms.resolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  }

  window.addEventListener('resize', resize, false);

  resize()

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

  scene.add(sceneGltf.scene)

  simulation.Start()

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      scene.environmentRotation.y += 0.0002
      scene.backgroundRotation.y += 0.0002

      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;

      effectComposer.render()
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  return () => {
    simulation.Stop()
  }
}
