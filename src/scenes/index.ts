import { rapierFinishedLoading } from '../simulation/repository/PhysicsRepository'

export const scenes = Object.freeze({
  gatesOfHeaven: () => import('./gatesOfHeaven'),
  island: () => import('./gardening/island'),
  city: () => import('./city'),
})

const DEFAULT_SCENE = scenes.island

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
  const url = new URL(window.location.href)
  const scene = url.searchParams.get('scene')

  if (scene) {
    const sceneFn = scenes[scene as keyof typeof scenes]

    if (sceneFn) {
      loadScene(sceneFn)
      return
    }
  }

  void loadScene(DEFAULT_SCENE)
}
