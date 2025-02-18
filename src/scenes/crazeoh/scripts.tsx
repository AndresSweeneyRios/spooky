import React from "react"
import { setDialogue, timedDialogue } from "../../components/DialogueBox"
import * as state from "./state"
import { JustPressedEvent, playerInput } from "../../input/player"
import { Simulation } from "../../simulation"

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
  const dialogueTexts = [
    ""
  ]

  for (const text of dialogueTexts) {
    for await (const parts of timedDialogue({ texts: [text], ms: 25 })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }
}

const winScript: Record<number, typeof intro> = {
  0: intro,
  10: outro,
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
