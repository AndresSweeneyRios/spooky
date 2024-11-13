import { rapierFinishedLoading } from '../simulation/repository/PhysicsRepository'

export const scenes = Object.freeze({
  gatesOfHeaven: () => import('./gatesOfHeaven'),
})

const DEFAULT_SCENE = scenes.gatesOfHeaven

let sceneCleanup: (() => void) | null = null

export const loadScene = async (scene: typeof DEFAULT_SCENE) => {
  try {
    await rapierFinishedLoading

    unloadScene()

    const sceneModule = await scene()

    sceneCleanup = await sceneModule.init()
  } catch (e) {
    console.error(e)
  }
}

export const unloadScene = () => {
  if (sceneCleanup) {
    sceneCleanup()
    sceneCleanup = null
  }
}

export const loadAppropriateScene = () => {
  void loadScene(DEFAULT_SCENE)
}
