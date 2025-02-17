import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadAudio, loadEquirectangularAsEnvMap, loadGltf, } from '../../graphics/loaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader, ShaderPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import { traverse } from "../../utils/traverse";
import * as state from "./state"
import { disableAllAnomalies, pickRandomAnomaly } from "./anomaly";
import { createFridge } from "../../entities/crazeoh/fridge";
import { createStove } from "../../entities/crazeoh/stove";
import { createMicrowave } from "../../entities/crazeoh/microwave";
import * as shaders from '../../graphics/shaders';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getAngle } from "../../utils/math";
import { createDoor } from "../../entities/crazeoh/door";
import { PlayerView } from "../../views/player";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { SimulationCommand } from "../../simulation/commands/_command";
import { CollidersDebugger } from "../../views/collidersDebugger";
import { JustPressedEvent, playerInput } from "../../input/player";
import "./scripts"

// import "../../graphics/injections/cel"
// import "../../graphics/injections/outline"

const SHADOW_BIAS = -0.0009;

const mapLoader = loadGltf("/3d/scenes/island/crazeoh.glb")

const windAudioPromise = loadAudio("/audio/sfx/wind.ogg", {
  loop: true,
})

const nightAmbianceAudioPromise = loadAudio("/audio/sfx/night_ambiance.ogg", {
  loop: true,
  detune: -200,
})

const cameraAudioPromise = loadAudio("/audio/sfx/camera.ogg", {})

const ceilingFanAudioPromise = loadAudio("/audio/sfx/ceiling_fan.ogg", {
  loop: true,
  positional: true,
})

const eatChipAudioPromise = loadAudio("/audio/sfx/eat_chip.ogg", {
  detune: -600,
  randomPitch: true,
  pitchRange: 400,
})

const heartbeatAudioPromise = loadAudio("/audio/sfx/heartbeat.ogg", {
  loop: true,
})

const garageScreamAudioPromise = loadAudio("/audio/sfx/garage_scream.ogg", {
  loop: true,
  positional: true,
  detune: -400,
})

const burgerkingAudioPromise = loadAudio("/audio/sfx/burgerking.ogg", {
  loop: false,
  positional: true,
})

const sniffAudioPromise = loadAudio("/audio/sfx/sniff.ogg", {
  randomPitch: true,
  pitchRange: 400,
})

garageScreamAudioPromise.then(audio => {
  audio.setVolume(0.1)
  audio.play()
})

eatChipAudioPromise.then(audio => {
  audio.setVolume(0.5)
})

cameraAudioPromise.then(audio => {
  audio.setVolume(0.3)
})

windAudioPromise.then(audio => {
  audio.setVolume(0.02)
  audio.play()
})

nightAmbianceAudioPromise.then(audio => {
  audio.setVolume(0.03)
  audio.play()
})

// functions to disable and enable #caseoh-loading via is-hidden attribute
const disableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "true")
}

const enableLoading = () => {
  const loading = document.getElementById("caseoh-loading")!
  loading.setAttribute("is-hidden", "false")
}

export let currentPlayerView: PlayerView | null = null

export const init = async () => {
  state.setAnomalyPosition(new THREE.Vector3(0, 0, 0))
  state.setFoundAnomaly(false)
  state.setTookPicture(false)
  state.setPlaying(false)

  enableLoading()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene)

  const listener = new THREE.AudioListener()
  camera.add(listener)

  const effectComposer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  effectComposer.addPass(renderPass)

  // const fxaaPass = new ShaderPass(FXAAShader)
  // effectComposer.addPass(fxaaPass)

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 0.95 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  effectComposer.addPass(crtPass);

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  player.setThirdPerson(false)
  player.setCameraHeight(2)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(2, 3, -6);

  spotLight.castShadow = false;

  spotLight.shadow.mapSize.width = 4096;
  spotLight.shadow.mapSize.height = 4096;

  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 30;
  spotLight.shadow.camera.fov = 30;
  spotLight.intensity = 3
  spotLight.decay = 0.7
  spotLight.angle = Math.PI * 0.35
  spotLight.penumbra = 1
  spotLight.shadow.bias = SHADOW_BIAS
  scene.add(spotLight);

  // add target to spotlight
  const target = new THREE.Object3D()
  scene.add(target)
  spotLight.target = target

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    // fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  }

  resize()

  window.addEventListener('resize', resize, false);

  const [
    sceneGltfOriginal,
    playerView,
  ] = await Promise.all([
    mapLoader,
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0]),
  ])

  currentPlayerView = playerView



  const sceneGltf = SkeletonUtils.clone(sceneGltfOriginal.scene)

  for (const child of traverse(sceneGltf)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true

      const material = child.material as THREE.Material
      material.shadowSide = THREE.DoubleSide
      material.side = THREE.DoubleSide
    }
  }

  processAttributes(sceneGltf, simulation, sceneEntId, false)

  shaders.applyInjectedMaterials(sceneGltf)

  scene.add(sceneGltf)

  let previousPlayStatus = false

  disableAllAnomalies(simulation)

  const detectPlayStateChange = async () => {
    if (state.playing === previousPlayStatus) {
      return
    }

    const cameraHint = document.querySelector(".caseoh-camera-hint") as HTMLElement

    if (state.playing) {
      const playerSpawnObject = scene.getObjectByName("PLAYER") as THREE.Mesh

      const playerPosition = playerSpawnObject.getWorldPosition(new THREE.Vector3())

      const playerEntId = playerView.EntId

      simulation.SimulationState.PhysicsRepository.SetPosition(playerEntId, [
        playerPosition.x,
        0,
        playerPosition.z,
      ])

      const lookTarget = scene.getObjectByName("base_BaseColorCuzov_0") as THREE.Mesh
      const lookTargetPosition = lookTarget.getWorldPosition(new THREE.Vector3())

      const yaw = Math.atan2(
        playerPosition.x - lookTargetPosition.x,
        playerPosition.z - lookTargetPosition.z,
      )

      const pitch = Math.atan2(
        lookTargetPosition.y - playerPosition.y,
        Math.sqrt(
          Math.pow(playerPosition.x - lookTargetPosition.x, 2) +
          Math.pow(playerPosition.z - lookTargetPosition.z, 2)
        )
      )

      playerSpawnObject.visible = false

      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"))

      playerView.enableControls()
      pickRandomAnomaly(simulation)

      if (!cameraHint.hasAttribute("is-hinting")) {
        cameraHint.setAttribute("is-hidden", "false")
        cameraHint.setAttribute("is-hinting", "true")

        setTimeout(() => {
          cameraHint.setAttribute("is-hinting", "false")
        }, 10000)
      }
    } else {
      playerView.disableControls()
      cameraHint.setAttribute("is-hidden", "true")
    }

    previousPlayStatus = state.playing
  }

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Update(): void {
      detectPlayStateChange()
    }

    public Draw(): void {
      camera.updateMatrixWorld()

      // For example, offset the spotlight from the camera:
      const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      spotLight.position.copy(cameraPosition).add(new THREE.Vector3(0, 0, 0));

      // Then update the target to point where the camera is looking:
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      spotLight.target.position.copy(cameraPosition).add(cameraDirection);
      spotLight.target.updateMatrixWorld();
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger())

  createFridge(simulation)
  createStove(simulation)
  createMicrowave(simulation)
  createDoor(simulation)

  const fanBlades = scene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh

  ceilingFanAudioPromise.then(audio => {
    audio.setVolume(1)
    fanBlades.add(audio.getPositionalAudio())
    audio.play()
  })

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);

      // rotate camera slowly around y axis
      if (!state.playing) {
        camera.rotateY(-0.0005)
      }

      fanBlades.rotateZ(0.06)

      effectComposer.render()
    }

    public Cleanup(): void {
      renderer.dispose()
    }
  })

  let shutterOn = false

  const justPressed = (payload: JustPressedEvent) => {
    if (state.gameStarted && !state.picking) {
      try {
        renderer.domElement.requestPointerLock()
      } catch { }
    }

    try {
      document.body.requestFullscreen()
    } catch { }

    if (state.playing) {
      playerView.enableControls();
    } else {
      return
    }

    if (shutterOn || document.pointerLockElement !== renderer.domElement || payload.action !== "mainAction1") {
      return
    }

    payload.consume()

    shutterOn = true

    cameraAudioPromise.then(audio => audio.play())

    const polaroid = document.querySelector(".caseoh-polaroid-overlay.ingame .background") as HTMLImageElement
    const polaroid2 = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay .background") as HTMLImageElement
    const dataUrl = renderer.domElement.toDataURL()

    polaroid.src = dataUrl
    polaroid2.src = dataUrl
    polaroid.parentElement!.setAttribute("is-hidden", "false")
    polaroid.parentElement!.setAttribute("shutter", "true")

    const playerEntId = playerView.EntId
    const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
    const targetPosition = state.anomalyPosition

    if (state.anomaly) {
      const angle = getAngle(targetPosition, new THREE.Vector3(
        playerPosition[0],
        playerPosition[1],
        playerPosition[2]
      ), camera)

      state.setFoundAnomaly(angle < 63)
    }

    state.setTookPicture(true)

    setTimeout(() => {
      polaroid.parentElement!.setAttribute("shutter", "false")

      shutterOn = false
    }, 2000)
  }

  playerInput.emitter.on("justpressed", justPressed)

  setTimeout(() => {
    disableLoading()
  }, 750)

  const eat = (food: string) => {
    const foodObject = scene.getObjectByName(food) as THREE.Mesh
    const endId = simulation.EntityRegistry.Create()
    simulation.SimulationState.PhysicsRepository.CreateComponent(endId)
    const position = foodObject.getWorldPosition(new THREE.Vector3())
    simulation.SimulationState.PhysicsRepository.AddBoxCollider(endId, [2, 2, 2], [
      position.x,
      position.y,
      position.z,
    ], undefined, true)
    simulation.SimulationState.SensorCommandRepository.CreateComponent(endId)
    simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
      entId: endId,
      executionMode: ExecutionMode.Interaction,
      once: true,
      command: new class extends SimulationCommand {
        public Execute(simulation: Simulation): void {
          foodObject.visible = false
          eatChipAudioPromise.then(audio => audio.play())
        }
      }
    })
  }

  eat("pizza")
  eat("burger")
  eat("Object_3")
  eat("muffin")
  eat("strawberyshake")
  eat("cereal")
  eat("buffet")
  eat("crazycola")
  eat("Object_4")
  eat("Object_4003")
  eat("bepis")
  eat("23b099929e614d9a927b4ec8f3d72063fbx")
  eat("Object_4011")

  heartbeatAudioPromise.then(audio => {
    audio.setVolume(0)
    audio.play()

    let ready = false

    const timeout = setTimeout(() => {
      ready = true
    }, 1000 * 120)

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Draw(): void {
        if (!state.anomaly || !ready) {
          audio.setVolume(0)

          return
        }

        const playerEntId = playerView.EntId
        const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)

        const distance = new THREE.Vector3(
          playerPosition[0] - state.anomalyPosition.x,
          playerPosition[1] - state.anomalyPosition.y,
          playerPosition[2] - state.anomalyPosition.z,
        ).length()

        const volume = Math.min(1, Math.max(0, 1 - distance / 6)) * 0.2

        audio.setVolume(volume)
      }

      public Cleanup(): void {
        try {
          clearTimeout(timeout)

          audio.stop()
        } catch { }
      }
    })
  })

  burgerkingAudioPromise.then(audio => {
    const object = scene.getObjectByName("Sketchfab_model001") as THREE.Mesh

    object.add(audio.getPositionalAudio())

    audio.setVolume(0.5)
  })

  {
    const globalPosition = scene.getObjectByName("Sketchfab_model001")!.getWorldPosition(new THREE.Vector3())
    const entId = simulation.EntityRegistry.Create()
    simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
    simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [2, 2, 2], [
      globalPosition.x,
      globalPosition.y,
      globalPosition.z,
    ], undefined, true)
    simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)
    simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
      entId,
      executionMode: ExecutionMode.Interaction,
      command: new class extends SimulationCommand {
        public Execute(simulation: Simulation): void {
          burgerkingAudioPromise.then(audio => audio.play())
        }
      }
    })
  }

  garageScreamAudioPromise.then(audio => {
    const positionalAudio = audio.getPositionalAudio()

    const object = scene.getObjectByName("Plane001_01_-_Default_0001") as THREE.Mesh

    object.add(positionalAudio)

    const objectPosition = object.getWorldPosition(new THREE.Vector3())

    // set volume to 0 if beyond 2 meters
    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Update(): void {
        const playerEntId = playerView.EntId
        const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)

        const distance = new THREE.Vector3(
          playerPosition[0] - objectPosition.x,
          playerPosition[1] - objectPosition.y,
          playerPosition[2] - objectPosition.z,
        ).length()

        if (distance > 5) {
          audio.setVolume(0)
        } else {
          audio.setVolume(0.1)
        }
      }

      public Cleanup(): void {
        audio.stop()
      }
    })
  })

  sniffAudioPromise.then(() => {
    let next = simulation.ViewSync.TimeMS + (1000 * 60 * 5 * Math.random())

    const sniff = () => {
      sniffAudioPromise.then(audio => {
        audio.setVolume(0.25)
        if (state.playing) {
          audio.play()
        }
      })

      next = simulation.ViewSync.TimeMS + (1000 * 60 * 5 * Math.random())
    }

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Update(): void {
        if (simulation.ViewSync.TimeMS > next) {
          sniff()
        }
      }

      public Cleanup(): void {
        sniffAudioPromise.then(audio => audio.stop())
      }
    })
  })

  simulation.Start()

  return () => {
    simulation.Stop()

    simulation.ViewSync.Cleanup(simulation)

    window.removeEventListener('resize', resize)

    playerInput.emitter.off("justpressed", justPressed)
  }
}
