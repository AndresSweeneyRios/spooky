import "./DialogueBox.css"
import * as React from "react"

let dialogue: React.ReactNode = undefined

export const setDialogue = (text: React.ReactNode) => {
  dialogue = text

  window.dispatchEvent(new Event("dialogue-updated"))
}

export function* proceduralDialogue(text: string) {
  let display = text

  for (let i = 0; i < text.length - 1; i++) {
    display = text.slice(0, i + 1) + "❚"
    yield display
  }

  yield text // Final yield without the bar character
}

export async function* timedDialogue({
  texts,
  ms = 30,
}: {
  texts: string[]
  ms?: number
}) {
  let parts: string[] = new Array(texts.length)
  parts.fill("")

  for (let i = 0; i < texts.length; i++) {
    const generator = proceduralDialogue(texts[i])

    for (let value of generator) {
      parts[i] = value
      yield parts

      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}

export const DialogueBox: React.FC = () => {
  const [text, setText] = React.useState<React.ReactNode>("")

  React.useEffect(() => {
    const handler = () => {
      setText(dialogue)
    }

    window.addEventListener("dialogue-updated", handler)

    return () => {
      window.removeEventListener("dialogue-updated", handler)
    }
  }, [])

  return (
    <div id="dialogue-box" is-hidden={!text ? "true" : undefined}>
      <p>
        {text}
      </p>
    </div>
  )
}
