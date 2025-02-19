import React from "react"
import { setDialogue, timedDialogue } from "../../components/DialogueBox"
import * as state from "./state"
import { JustPressedEvent, playerInput } from "../../input/player"
import { Simulation } from "../../simulation"
import { createCaseoh } from "../../entities/crazeoh/caseoh"
import { currentCrtPass, currentPlayerView, disableLoading, enableLoading } from "."
import * as THREE from "three"

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
  const dialogueTexts = state.isTutorial ? [
    // <>You had a childhood friend nicknamed Craze, an <b>obese</b> kid who dreamed of becoming a famous streamer.</>,
    // <>He finally made it big — millions of views, sponsors, fans spamming “W” in chat.</>,
    // <>But then he changed.</>,
    // <>He stopped replying to messages, his streams grew eerie, and he’d just stare at the screen. Viewers left; mods vanished.</>,
    // <>One day, his stream cut off mid-broadcast, and he disappeared.</>,
    // <>As his old friend, you go to check on him.</>,
    // <>The front door is unlocked, and everything seems normal — <i>for now.</i></>,
    <i>[Be alert: <b>rooms can change</b>. If you notice anything strange, <b>take a photo</b>. Look around thoroughly, then <b>return to your car</b> to proceed.]</i>,
  ] : [
    <b>(Something feels off. Maybe I should look around.)</b>
  ]

  for (const text of dialogueTexts) {
    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }

  setDialogue("")
}

const outro = async (simulation: Simulation) => {
  enableLoading()

  state.setOutro(true)

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

  for (const text of [
    <>Why did it have to end like this?</>,
    <>My neon haven... my last refuge, McDonald's.</>,
    <i>Now swallowed by the void.</i>,
  ]) {
    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }

  setDialogue("")

  currentCrtPass!.uniforms["noiseIntensity"].value = 1.0

  mesh.translateZ(6)

  await new Promise(resolve => setTimeout(resolve, 500))

  currentCrtPass!.uniforms["noiseIntensity"].value = 0.6

  for (const text of [
    <>I wandered through the ruins, chasing echoes of a lost past.</>,
    <>In that silence, a presence stirred—a whisper of something both ancient and profound.</>,
  ]) {
    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }

  mesh.translateZ(5)

  currentCrtPass!.uniforms["noiseIntensity"].value = 1.0

  await new Promise(resolve => setTimeout(resolve, 1000))

  currentCrtPass!.uniforms["noiseIntensity"].value = 2.0

  for (const text of [
    <span style={{ fontSize: "1em"}}><b>Not salvation, nor damnation... but a call from beyond the mortal veil.</b></span>,
    <>It beckoned me toward shadows where faith and fear entwine.</>,
    <>A new chapter begins, unfolding into realms where every secret is drenched in divine mystery.</>,
  ]) {
    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }

  location.assign("./spooky")
}

const winScript: Record<number, typeof intro> = {
  // 0: intro,
  0: outro,
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

      state.setInDialogue(false)
    }
  } catch (e) {
    console.error(e)
  }
}
