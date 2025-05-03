import * as THREE from 'three'
import { renderer } from '../../components/Viewport'
import { Simulation } from '../../simulation'
import { loadAudio, loadGltf } from '../../graphics/loaders'
import * as player from '../../entities/player'
import { currentPlayerView } from "../../views/player"
import * as state from "./state"
import { SimulationCommand } from "../../simulation/commands/_command"
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository"
import { initScene } from "./initScene"
import interloperGlb from '../../assets/3d/scenes/island/interloper_OPTIMIZED.glb'
import aveMarisStellaMp3 from '../../assets/audio/music/AveMarisStella.mp3'
import eatChipOgg from '../../assets/audio/sfx/eat_chip.ogg'
import { hideMainMenu } from "../../pages/Caseoh"

const loadingEl = document.getElementById("caseoh-loading")
const splashEl = document.getElementById("splash")

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true")
  splashEl?.setAttribute("is-hidden", "true")
}

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false")
}

const mapLoader = loadGltf(interloperGlb).then(gltf => gltf.scene)

const music = loadAudio(aveMarisStellaMp3, {
  loop: true,
  positional: false,
  volume: 0.0,
})

const tempVec3 = new THREE.Vector3()

export let pizzaEaten = false

const eat = (food: string, simulation: Simulation, scene: THREE.Scene) => {
  const foodObject = scene.getObjectByName(food) as THREE.Mesh
  if (!foodObject) {
    console.warn(`Food object "${food}" not found in scene`)
    return
  }

  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  foodObject.getWorldPosition(tempVec3)
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [2, 2, 2], [tempVec3.x, tempVec3.y, tempVec3.z], undefined, true)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const command = new class extends SimulationCommand {
    public Owner: THREE.Object3D = foodObject

    public Execute(): void {
      foodObject.visible = false

      if (food === "pizza") {
        pizzaEaten = true
      }

      loadAudio(eatChipOgg, {
        detune: -600,
        randomPitch: true,
        pitchRange: 400,
        volume: 0.1,
      }).then(audio => audio.play())

      music.then(audio => audio.stop())
    }
  }

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    once: true,
    command: command,
    owner: foodObject,
  })
}

export const init = async () => {
  enableLoading()

  const { scene, simulation, cleanup, createFlashlight } = await initScene(mapLoader)

  await Promise.all([
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ])

  // Delay music start by 2 seconds
  setTimeout(() => {
    music.then(audio => audio.play())

    // ease volume up to 0.2 over 2 seconds
    const fadeInDuration = 30000
    const fadeInInterval = 50
    const fadeInStep = 0.05 / (fadeInDuration / fadeInInterval)
    let currentVolume = 0.0
    const fadeInIntervalId = setInterval(() => {
      currentVolume += fadeInStep
      if (currentVolume >= 0.05) {
        currentVolume = 0.05
        clearInterval(fadeInIntervalId)
      }
      music.then(audio => audio.setVolume(currentVolume))
    }, fadeInInterval)
  }, 2000)

  eat("pizza", simulation, scene)

  createFlashlight()

  simulation.Start()

  state.setGameStarted(true)
  hideMainMenu()

  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      currentPlayerView!.disableControls()
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      currentPlayerView!.enableControls()
    }
  }

  document.addEventListener("pointerlockchange", handlePointerLock)

  disableLoading()

  currentPlayerView!.enableControls()

  return () => {
    if (music.then) music.then(audio => audio.stop())
    document.removeEventListener("pointerlockchange", handlePointerLock)
    cleanup()
  }
}
