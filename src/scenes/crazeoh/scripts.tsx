import React from "react"
import { setDialogue, timedDialogue } from "../../components/DialogueBox"
import * as state from "./state"
import { JustPressedEvent, playerInput } from "../../input/player"
import { Simulation } from "../../simulation"
import { createCaseoh } from "../../entities/crazeoh/caseoh"
import { carIdling, ceilingFanAudioPromise, currentCrtPass, currentPlayerView, disableLoading, enableLoading, garageScreamAudioPromise, windAudioPromise } from "."
import type { loadAudio } from "../../graphics/loaders"
import * as THREE from "three"
import { fridgeAudioPromise } from "../../entities/crazeoh/fridge"
import { DEFAULT_ANOMALIES } from "./anomaly"
import { loadScene, scenes } from ".."

const loaderPromise = import("../../graphics/loaders")

const voicePromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/voice.ogg', {
    loop: false,
    positional: false,
    volume: 0.2,
    detune: -500,
    pitchRange: 500,
    randomPitch: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const noisePromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/noise.ogg', {
    loop: true,
    positional: false,
    volume: 0.1,
    detune: -500,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const oofPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/oof.ogg', {
    loop: false,
    positional: false,
    volume: 0.1,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const loudPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/loud.ogg', {
    loop: false,
    positional: false,
    volume: 0.3,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const screamPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/scream.ogg', {
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

const waitForAction = () => new Promise<void>(resolve => {
  const handler = (payload: JustPressedEvent) => {
    if (payload.action !== "mainAction1") {
      return
    }

    playerInput.emitter.off("justpressed", handler)

    resolve()
  }

  playerInput.emitter.on("justpressed", handler)
})

export const intro = async (simulation: Simulation) => {
  if (!state.isTutorial) {
    state.setInDialogue(false)

    return
  }

  // id caseoh-explainer
  const explainer = document.getElementById("caseoh-explainer")!
  explainer.setAttribute("is-hidden", "false")

  const dialogueTexts = [
    // <>You had a childhood friend nicknamed Craze, an <b>obese</b> kid who dreamed of becoming a famous streamer.</>,
    // <>He finally made it big — millions of views, sponsors, fans spamming “W” in chat.</>,
    // <>But then he changed.</>,
    // <>He stopped replying to messages, his streams grew eerie, and he’d just stare at the screen. Viewers left; mods vanished.</>,
    // <>One day, his stream cut off mid-broadcast, and he disappeared.</>,
    // <>As his old friend, you go to check on him.</>,
    // <>The front door is unlocked, and everything seems normal — <i>for now.</i></>,
    // <i>[Be alert: <b>objects can change</b>. If you notice anything strange, <b>take a photo</b>. Look around thoroughly, then <b>return to your car</b> to proceed.]</i>,
    <i>[<b>Examine your surroundings</b>, they change each round.]</i>,
    <i>[Then, <b>take a photo</b> of the giant french fries. This is called an <b>anomaly</b>, you will find more later.]</i>,
    <i>[When you're done, <b>return to your car</b> to end the round.]</i>,
  ]

  await playDialogueWithVoice(dialogueTexts)

  explainer.setAttribute("is-hidden", "true")
}

const outro = async (simulation: Simulation) => {
  enableLoading()

  state.setOutro(true)
  state.setPicking(false)
  state.setInDialogue(true)

  setInterval(() => {
    currentPlayerView!.disableControls()
  }, 10)

  const view = await createCaseoh(simulation)
  const mesh = await view.meshPromise
  mesh.position.set(1.977, 0, -7.22);
  mesh.rotateY(THREE.MathUtils.degToRad(180))
  const playerEntId = currentPlayerView!.EntId
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
  
  location.assign("/spooky")
}

const basement = async (simulation: Simulation) => {
  await loadScene(scenes.interloper)
}

const dropper = async (simulation: Simulation) => {
  await loadScene(scenes.dropper)
}

const winScript: Record<number, typeof intro> = {
  // 0: intro,
  // 20: outro,
  0: basement,
  10: dropper,
}

export const executeWinScript = async (simulation: Simulation) => {
  const index = state.wins

  if (state.winScriptIndex >= index) {
    return
  }

  try {
    if (winScript[index]) {
      state.setInDialogue(true)

      if (!state.isTutorial) {
        state.incrementWinScriptIndex()
      }

      await winScript[index](simulation)

      setDialogue("")

      state.setInDialogue(false)
    }
  } catch (e) {
    console.error(e)
  }
}
