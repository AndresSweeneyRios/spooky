import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { processAttributes } from '../../utils/processAttributes';
import { traverse } from '../../utils/traverse';
import cityscapeWebp from '../../assets/3d/env/cityscape.webp';
import starterSceneGlb from '../../assets/3d/scenes/startscene/starterscenetest_OPTIMIZED.glb';
import { playerInput } from "../../input/player";
import { PlayerView } from "../../views/player";
import { initializeSubScene, InitializeSubSceneResult, SubSceneContext } from "./sub-scenes";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ToneMappingShader } from "../../graphics/toneMappingShader";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SobelOperatorShader } from "../../graphics/sobelOberatorShader";

const battleScene = initializeSubScene(() => import('./battle-scene'))

const SHADOW_BIAS = -0.0009

const toggleStartKey = (bool: boolean) => {
  document.querySelector("#spooky .temp-activate")?.setAttribute("is-hidden", bool ? "false" : "true")
}

const toggleLoading = (bool: boolean) => {
  document.querySelector("#spooky .temp-loading")?.setAttribute("is-hidden", bool ? "false" : "true")
}

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  const simulation = new Simulation(camera, scene)

  const effectComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 1.2 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 1.6 }
  ToneMappingShader.uniforms.contrastMidpoint = { value: 0.1 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.5, 0.6)
  effectComposer.addPass(bloomPass)

  const sobelPass = new ShaderPass(SobelOperatorShader);
  effectComposer.addPass(sobelPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.scanlineIntensity.value = 0.5
  crtPass.uniforms.rgbOffset = { value: new THREE.Vector3(0.00, 0.00, 0.00) }
  effectComposer.addPass(crtPass);

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  // add sun
  const sun = new THREE.DirectionalLight(0xddccee, 1.5)
  sun.position.set(0, 1000, 0)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  scene.add(sun)

  // add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
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

  const createFlashlight = () => {
    const flashlight = new THREE.SpotLight(0xffffff)
    flashlight.position.set(2, 3, -6)
    flashlight.castShadow = false
    flashlight.shadow.mapSize.set(4096, 4096)
    flashlight.shadow.camera.near = 0.1
    flashlight.shadow.camera.far = 30
    flashlight.shadow.camera.fov = 30
    flashlight.intensity = 3
    flashlight.decay = 0.99
    flashlight.angle = Math.PI * 0.35
    flashlight.penumbra = 1
    flashlight.shadow.bias = SHADOW_BIAS
    scene.add(flashlight)
    const target = new THREE.Object3D()
    scene.add(target)
    flashlight.target = target

    simulation.ViewSync.AddAuxiliaryView(new class FlashlightPositionManager extends View {
      public Draw(): void {
        const tempVec3 = new THREE.Vector3()
        camera.getWorldPosition(tempVec3)
        flashlight.position.copy(tempVec3)
        camera.getWorldDirection(tempVec3)
        flashlight.target.position.copy(tempVec3.add(camera.position))
        flashlight.target.updateMatrixWorld()
      }
    })

    return flashlight
  }

  createFlashlight()

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;
      effectComposer.render()
      playerInput.update();
    }
  })

  const [, sceneGltf] = await Promise.all([
    loadEquirectangularAsEnvMap(cityscapeWebp, THREE.LinearFilter, THREE.LinearFilter, renderer).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 1.0
      scene.environment = texture
      scene.environmentIntensity = 0.1
    }),

    loadGltf(starterSceneGlb)
  ])

  processAttributes(sceneGltf.scene, simulation, sceneEntId, false)

  scene.add(sceneGltf.scene)

  shaders.applyInjectedMaterials(sceneGltf.scene)

  const refocusHandler = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      try {
        renderer.domElement.requestPointerLock();

        // find player view
        const playerView = simulation.ViewSync.GetAllViews().find((view) => view instanceof PlayerView)

        if (playerView) {
          playerView.enableControls();
        }
      } catch { }
    }
    // try {
    //   if (document.fullscreenElement !== document.body) {
    //     requestFullscreen();
    //   }
    // } catch { }
  }

  window.addEventListener("click", refocusHandler)
  playerInput.emitter.on("justpressed", refocusHandler)

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    sobelPass.uniforms.resolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );
  }

  window.addEventListener('resize', resize, false);

  resize()

  simulation.Start()

  let subscene: SubSceneContext | null = null
  playerInput.emitter.on("justpressed", async (event) => {
    if (event.action !== "interact") return;
    if (subscene) return;
    toggleStartKey(false)
    toggleLoading(true)

    // Shows the scene.
    subscene = battleScene.Show(simulation);

    // Once the scene is shown we can disable the loading state.
    subscene.shown.then(() => {
      toggleLoading(false)
    })

    // Once the scene has hit its cleanup stage we can re-enable the start key.
    subscene.then(() => {
      toggleStartKey(true)
      subscene = null;
    });
  })

  return () => {
    simulation.Stop();
    window.removeEventListener('resize', resize)
    window.removeEventListener("click", refocusHandler)
    window.removeEventListener("keydown", refocusHandler)
    playerInput.emitter.off("justpressed", refocusHandler)
  }
}

