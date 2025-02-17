import React from "react"
import { setDialogue, timedDialogue } from "../../components/DialogueBox"
import * as state from "./state"
import { JustPressedEvent, playerInput } from "../../input/player"

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

export const intro = async () => {
  const dialogueTexts = [
    "You had a fat friend in school — you and the guys used to call him Craze.",
    "He wasn’t the coolest, but he was funny, ate a lot, and had a dream: to become a big streamer.",
    "One day, he finally blew up — millions of views, sponsorships, fans spamming \"W\" in chat. He made it.",
    "But something changed.",
    "CrazeOh wasn’t the same anymore.",
    "He stopped responding to messages.",
    "His streams got weirder and weirder.",
    "Eventually, he’d sit there — staring at the screen — without talking.",
    "Viewers started disappearing from chat, and the mods vanished from Discord.",
    "Then, one day, his stream cut off mid-broadcast... and he was never seen again.",
    "You, as his old friend, decide to go check on him.",
    "You arrive at his house and find the door unlocked.",
    "But when you walk in...",
    "...",
    "[Pay attention — rooms change.]",
    "[If you see something weird, take a photo.]",
    "[Everything is normal right now, have a look around.]",
    "[Return to your car to proceed.]"
  ]

  for (const text of dialogueTexts) {
    for await (const parts of timedDialogue({ texts: [text] })) {
      setDialogue(<>{parts[0]}</>)
    }
    await waitForAction()
  }
  setDialogue("")
}

const winScript: Record<number, typeof intro> = {
  0: intro,
}

export const executeWinScript = async () => {
  const index = state.wins

  if (state.winScriptIndex >= index) {
    return
  }

  try {
    if (winScript[index]) {
      state.setInDialogue(true)

      state.incrementWinScriptIndex()

      await winScript[index]()

      state.setInDialogue(false)
    }
  } catch (e) {
    console.error(e)
  }
}
