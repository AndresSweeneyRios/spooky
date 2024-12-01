import * as THREE from 'three'

const mixerMap = new Map<string, THREE.AnimationMixer>()
const activeActions = new Map<string, symbol[]>()
const actionMap = new Map<symbol, THREE.AnimationAction>()
const actionStartTime = new Map<symbol, number>()

const INTERPOLATION_DURATION = 2000
const TIME_SCALE = 0.001

export const easeElastic = (x: number) => {
  const c4 = (2 * Math.PI) / 3

  return x === 0
    ? 0
    : x === 1
    ? 1
    : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
}

const timing = easeElastic

export const playAnimation = async (model: THREE.SkinnedMesh, clip: THREE.AnimationClip, once = false, playNext?: THREE.AnimationClip[]) => {
  try {
    if (!mixerMap.has(model.uuid)) {
      mixerMap.set(model.uuid, new THREE.AnimationMixer(model))
    }
  
    const mixer = mixerMap.get(model.uuid)!
  
    const action = mixer.clipAction(clip)
    action.timeScale = TIME_SCALE
  
    const actionId = Symbol()
    actionMap.set(actionId, action)
  
    if (!activeActions.has(model.uuid)) {
      activeActions.set(model.uuid, [])
    }

    const actionIds = activeActions.get(model.uuid)!

    const now = performance.now()

    if (actionIds.length === 2) {
      const [one] = actionIds

      const oneAction = actionMap.get(one)!

      oneAction.stop()

      actionIds.shift()
      actionStartTime.delete(one)
      actionMap.delete(one)

      tick(now)

      mixer.update(0)
    }
  
    actionIds.push(actionId)
    actionStartTime.set(actionId, now)
  
    if (once) {
      const oldClip = actionMap.get(actionId)!.getClip()
  
      await new Promise<void>((resolve) => {
        const loop = (time: DOMHighResTimeStamp) => {
          if (!activeActions.has(model.uuid)) {
            resolve()
  
            return
          }

          const startTime = actionStartTime.get(actionId)!
  
          const timeElapsed = time - startTime
          const duration = clip.duration + INTERPOLATION_DURATION * 2 * 1000
  
          if (timeElapsed > duration) {
            resolve()
          }
        }
  
        requestAnimationFrame(loop)
      })
  
      const actionIds = activeActions.get(model.uuid)!
  
      if (actionIds.length === 0) {
        const nextClip = playNext?.shift()
  
        playAnimation(model, nextClip || oldClip, true, playNext)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

let previousTime = performance.now()

const tick = (time: DOMHighResTimeStamp) => {

  for (const [modelUuid, actionIds] of activeActions) {
    if (actionIds.length === 0) {
      continue
    }
    
    const actions = actionIds.map((id) => actionMap.get(id)!);
  
    if (actionIds.length === 1) {
      const action = actions[0];
      action.setEffectiveWeight(1);
  
      if (!action.isRunning()) {
        action.reset();
        action.play();
      }
  
      continue
    }
  
    const nextAction = actions[1];
  
    if (!nextAction.isRunning()) {
      nextAction.reset();
      nextAction.play();
    }
  
    const nextTimeStart = actionStartTime.get(actionIds[1])!;
  
    const timeElapsed = time - nextTimeStart;
    const timeFraction = Math.min(timeElapsed / INTERPOLATION_DURATION, 1);
    const timeFractionEased = timing(timeFraction);
  
    actions[0].setEffectiveWeight(1 - timeFractionEased);
    actions[1].setEffectiveWeight(timeFractionEased);
  
    if (timeFraction >= 1) {
      const completedActionId = actionIds.shift()!
      activeActions.set(modelUuid, [...actionIds]);
  
      const completedAction = actionMap.get(completedActionId)!;
      completedAction.stop();
  
      actionMap.delete(completedActionId);
      actionStartTime.delete(completedActionId);
  
      if (actionIds.length > 0) {
        const nextActionId = actionIds[1];
        const nextActionStartTime = performance.now();
        actionStartTime.set(nextActionId, nextActionStartTime);
      } else {
        activeActions.delete(modelUuid);
      }
    }
  }
}

const loop = (time: DOMHighResTimeStamp) => {
  try {
    tick(time)

    const deltaTime = time - previousTime
  
    mixerMap.forEach((mixer) => {
      mixer.update(deltaTime)
    })
  } catch (error) {
    console.error(error)
  }
  
  previousTime = time

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop)
