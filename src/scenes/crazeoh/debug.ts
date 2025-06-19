import * as THREE from 'three'
import * as player from '../../entities/player'
import * as state from "./state"
import { setGravity } from "../../simulation/repository/PhysicsRepository"
import { initScene } from "./initScene"
import { hideMainMenu } from "../../pages/Caseoh"
import { createCaseoh } from "../../entities/crazeoh/caseoh"
import { View } from "../../simulation/View"

// Cache frequently accessed DOM elements
const loadingEl = document.getElementById("caseoh-loading")
const splashEl = document.getElementById("splash")

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true")
  splashEl?.setAttribute("is-hidden", "true")
}

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false")
}

const mapLoader = Promise.resolve(new THREE.Object3D())

export const init = async () => {
  enableLoading()

  setGravity(-0.2)

  player.setThirdPerson(false)
  player.setCameraHeight(2)

  const { scene, camera, simulation, cleanup, createFlashlight } = await initScene(mapLoader)

  state.setGameStarted(true)
  hideMainMenu()

  const view = await createCaseoh(simulation)
  await view.meshPromise

  // rotate view draw function
  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Draw(): void {
      view.mesh!.rotateY(-1 * simulation.ViewSync.DeltaTime)
    }
  })

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
  scene.add(ambientLight)

  camera.position.set(0, 1, 3)

  simulation.Start()

  disableLoading()

  return () => {
    cleanup()
  }
}
