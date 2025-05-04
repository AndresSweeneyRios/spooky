import React from "react"
import { setDialogue, timedDialogue } from "../../components/DialogueBox"
import * as state from "./state"
import { waitForAction } from "../../input/player"
import { Simulation } from "../../simulation"
import { createCaseoh } from "../../entities/crazeoh/caseoh"
import { carIdling, ceilingFanAudioPromise, disableLoading, enableLoading, garageScreamAudioPromise, ventAudioPromise, windAudioPromise } from "."
import { loadAudio, loadTexture } from "../../graphics/loaders"
import * as THREE from "three"
import { fridgeAudioPromise } from "../../entities/crazeoh/fridge"
import { clockAudioPromise } from "./anomaly"
import { unloadScene } from ".."
import { renderer } from "../../components/Viewport"

import voiceOgg from '../../assets/audio/sfx/voice.ogg';
import noiseOgg from '../../assets/audio/sfx/noise.ogg';
import oofOgg from '../../assets/audio/sfx/oof.ogg';
import loudOgg from '../../assets/audio/sfx/loud.ogg';
import screamOgg from '../../assets/audio/sfx/scream.ogg';
import outroOgg from '../../assets/audio/sfx/outro.ogg';
import eatChipOgg from '../../assets/audio/sfx/eat_chip.ogg';
import caseohLiveWebp from '../../assets/screenshots/caseoh_live.webp';
import { simulationPlayerViews } from "../../views/player"
import { currentCrtPass } from "./initScene"

const loaderPromise = import("../../graphics/loaders")

const voicePromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio(voiceOgg, {
    loop: false,
    positional: false,
    volume: 0.2,
    detune: -500,
    pitchRange: 500,
    randomPitch: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const noisePromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio(noiseOgg, {
    loop: true,
    positional: false,
    volume: 0.1,
    detune: -500,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const oofPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio(oofOgg, {
    loop: false,
    positional: false,
    volume: 0.1,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const loudPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio(loudOgg, {
    loop: false,
    positional: false,
    volume: 0.3,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const screamPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio(screamOgg, {
    loop: false,
    positional: false,
    volume: 0.7,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

let voiceTimeout: NodeJS.Timeout | null = null

const startLoopingVoice = async () => {
  const voice = await voicePromise

  voice.play()

  voiceTimeout = setTimeout(() => {
    startLoopingVoice()
  }, 100)
}

const stopLoopingVoice = async () => {
  await voicePromise

  clearTimeout(voiceTimeout!)
}

const playDialogueWithVoice = async (texts: React.ReactNode[]) => {
  for (const text of texts) {
    startLoopingVoice()

    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }

    stopLoopingVoice()
    
    await waitForAction()
  }
}

export const intro = async (simulation: Simulation) => {
  const explainer = document.getElementById("caseoh-explainer")!
  explainer.setAttribute("is-hidden", "false")

  const dialogueTexts = [
    <i>[<b>Examine your surroundings</b>, they change each round.]</i>,
    <i>[Then, <b>take a photo</b> of the giant french fries. This is called an <b>anomaly</b>, you will find more later.]</i>,
    <i>[When you're done, <b>return to your car</b> to end the round.]</i>,
  ]

  await playDialogueWithVoice(dialogueTexts)

  explainer.setAttribute("is-hidden", "true")
}

export const introNoAnomaly = async (simulation: Simulation) => {
  const dialogueTexts = [
    <i>[NOTE: <b>There is no anomaly this round</b>.]</i>,
    <i>[Return to your car when you're ready.]</i>,
  ]

  await playDialogueWithVoice(dialogueTexts)
}
    
const caseohLiveTexture = loadTexture(caseohLiveWebp)

const outro = async (simulation: Simulation) => {
  enableLoading()

  state.setOutro(true)

  const view = await createCaseoh(simulation)
  const mesh = await view.meshPromise
  mesh.position.set(1.977, 0, -7.22);
  mesh.rotateY(THREE.MathUtils.degToRad(180))
  const playerEntId = simulationPlayerViews[simulation.SimulationIndex]!.EntId
  simulation.SimulationState.PhysicsRepository.SetPosition(playerEntId, [2, 0.2, -19.4886])
  simulation.Camera.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(-180), 0, "YXZ"))
  
  disableLoading()

  ;[fridgeAudioPromise,garageScreamAudioPromise,carIdling,windAudioPromise].forEach(promise => promise.then(audio => audio.stop()))

  // await playDialogueWithVoice([
  //   // <>Why did it have to end like this?</>,
  //   // <>My neon haven... my last refuge, McDonald's.</>,
  //   // <i>Now swallowed by the void.</i>,
  // ])

  setDialogue("")

  await new Promise(resolve => setTimeout(resolve, 2000))

  currentCrtPass!.uniforms["noiseIntensity"].value = 1.0

  mesh.translateZ(6)

  // noisePromise.then(noise => noise.play())
  // loudPromise.then(loud => loud.play())

  // await new Promise(resolve => setTimeout(resolve, 500))

  // noisePromise.then(noise => noise.stop())
  // loudPromise.then(loud => loud.stop())

  currentCrtPass!.uniforms["noiseIntensity"].value = 0.6

  // await playDialogueWithVoice([
  //   <>I wandered through the ruins, chasing echoes of a lost past.</>,
  //   <>In that silence, a presence stirred—a whisper of something both ancient and profound.</>,
  // ])

  // await new Promise(resolve => setTimeout(resolve, 12000))

  mesh.translateZ(5)
  mesh.translateY(-0.3)

  currentCrtPass!.uniforms["noiseIntensity"].value = 1.0
  
  noisePromise.then(noise => noise.play())
  loudPromise.then(loud => loud.play())

  await new Promise(resolve => setTimeout(resolve, 500))

  noisePromise.then(noise => noise.stop())
  loudPromise.then(loud => loud.stop())

  currentCrtPass!.uniforms["noiseIntensity"].value = 1.1
  currentCrtPass!.uniforms["scanlineIntensity"].value = 1.0
  currentCrtPass!.uniforms["rgbOffset"].value.set(0.003, 0.003)

  // await playDialogueWithVoice([
  //   <span style={{ fontSize: "1em"}}><b>Not salvation, nor damnation... but a call from beyond the mortal veil.</b></span>,
  //   <>It beckoned me toward shadows where faith and fear entwine.</>,
  //   <>A new chapter begins, unfolding into realms where every secret is drenched in divine mystery.</>,
  // ])

  setDialogue("")

  // await new Promise(resolve => setTimeout(resolve, 1000))

  // DEFAULT_ANOMALIES.forEach(anomaly => anomaly.Enable(simulation))

  // await new Promise(resolve => setTimeout(resolve, 5000))

  // oofPromise.then(oof => oof.play())

  mesh.translateZ(0.5)
  // currentCrtPass!.uniforms["rgbOffset"].value.set(0.01, 0.01)

  // loudPromise.then(loud => loud.play())
  screamPromise.then(scream => scream.play())

  await new Promise(resolve => setTimeout(resolve, 1000))

  // bigmonitorscreen
  const bigScreen = simulation.ThreeScene.getObjectByName("bigmonitorscreen")
  // Animate player movement from 4.0 to 3.1 on x-axis
  const startX = 4.0;
  const endX = 3.1;
  const duration = 15000; // 15 seconds
  const startTime = Date.now();
  
  const animatePosition = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Applying cubic ease-in: f(t) = t³
    const easedProgress = Math.pow(progress, 3);
    const currentX = startX + (endX - startX) * easedProgress;
    
    simulation.SimulationState.PhysicsRepository.SetPosition(
      playerEntId, 
      [currentX, 0.2, -5.7]
    );
    
    if (progress < 1) {
      requestAnimationFrame(animatePosition);
    }
  };
  
  animatePosition();

  simulation.Camera.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(-90), 0, "YXZ"))

  if (bigScreen instanceof THREE.Mesh) {
    bigScreen.visible = true

    caseohLiveTexture.center.set(0.5, 0.5); // Set rotation center to middle of texture
    caseohLiveTexture.rotation = -Math.PI / 2;   // Already in radians (180 degrees)
    caseohLiveTexture.wrapS = THREE.RepeatWrapping; // Repeat the texture in the S direction
    caseohLiveTexture.wrapT = THREE.RepeatWrapping;
    caseohLiveTexture.repeat.set(-1, 1); // Flip the texture horizontally
    caseohLiveTexture.needsUpdate = true;   // Ensure the texture updates

    bigScreen.material = new THREE.MeshBasicMaterial({
      map: caseohLiveTexture,
      side: THREE.DoubleSide,
      color: 0xffffff,
    })

    bigScreen.material.needsUpdate = true
  }

  currentCrtPass!.uniforms["noiseIntensity"].value = 0.3
  currentCrtPass!.uniforms["scanlineIntensity"].value = 0.0
  currentCrtPass!.uniforms["rgbOffset"].value.set(0.000, 0.000)

  await new Promise(resolve => setTimeout(resolve, 15000))

  loadAudio(outroOgg, {
    volume: 0.3,
    loop: false,
  }).then(audio => {
    audio.play();
  });

  mesh.position.set(endX, -0.5, -5.7)
  mesh.rotation.y = THREE.MathUtils.degToRad(90)

  // flip the camera 180 degrees
  simulation.Camera.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(90), 0, "YXZ"))

  // move the player position X to 4.0
  simulation.SimulationState.PhysicsRepository.SetPosition(playerEntId, [4.0, 0.2, -5.7])

  await new Promise(resolve => setTimeout(resolve, 10000))

  // stop all sounds
  ;[fridgeAudioPromise,garageScreamAudioPromise,carIdling,windAudioPromise,
    ceilingFanAudioPromise, clockAudioPromise, ventAudioPromise,
  ].forEach(promise => promise.then(audio => audio.stop()))

  loadAudio(eatChipOgg, {
    volume: 0.3,
    loop: false,
    positional: false,
  }).then(audio => {
    audio.play()
  })

  unloadScene()

  renderer.clear()

  document.exitPointerLock()

  await new Promise(resolve => {})

  // location.assign("/spooky")
}

const winScript: Record<number, typeof intro> = {
  0: intro,
  1: introNoAnomaly,
  20: outro,
}

export const executeWinScript = async (simulation: Simulation) => {
  const index = state.wins

  if (state.winScriptIndex >= index) {
    return
  }

  try {
    if (!state.isTutorial) {
      state.incrementWinScriptIndex()
    }

    if (winScript[index]) {
      state.setInDialogue(true)

      await winScript[index](simulation)

      setDialogue("")

      state.setInDialogue(false)
    }
  } catch (e) {
    console.error(e)
  }
}
