import * as THREE from 'three'

const mixerMap = new Map<string, THREE.AnimationMixer>()
const activeAction = new Map<string, THREE.AnimationAction>()

const CROSSFADE_DURATION = 0.15

export const playAnimation = async (model: THREE.SkinnedMesh, clip: THREE.AnimationClip, timeScale = 1) => {
  try {
    if (!mixerMap.has(model.uuid)) {
      mixerMap.set(model.uuid, new THREE.AnimationMixer(model))
    }
  
    const mixer = mixerMap.get(model.uuid)!
  
    const action = mixer.clipAction(clip)
    action.timeScale = timeScale

    action.reset()
    action.play()
    mixer.update(0)

    if (activeAction.has(model.uuid)) {
      const previousAction = activeAction.get(model.uuid)!
      previousAction.crossFadeTo(action, CROSSFADE_DURATION, false)
      mixer.update(0)
    }
  
    activeAction.set(model.uuid, action)
  } catch (error) {
    console.error(error)
  }
}

let previousTime = performance.now()
let deltaTime = 0

const loop = (time: DOMHighResTimeStamp) => {
  requestAnimationFrame(loop);

  deltaTime = (time - previousTime) / 1000

  try {
    mixerMap.forEach((mixer) => {
      mixer.update(deltaTime)
    })
  } catch (error) {
    console.error(error)
  }
  
  previousTime = time
};

requestAnimationFrame(loop)