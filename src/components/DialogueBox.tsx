import "./DialogueBox.css"
import * as React from "react"

let dialogue: React.ReactNode = undefined

export const setDialogue = (text: React.ReactNode) => {
  dialogue = text

  window.dispatchEvent(new Event("dialogue-updated"))
}

/**
 * Recursively extracts the full text content from a React node.
 */
function getFullText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (React.isValidElement(node)) {
    return React.Children.toArray(node.props.children)
      .map(getFullText)
      .join('')
  }
  return ''
}

/**
 * Recursively clones a React node tree, but only “reveals”
 * up to revealCount characters from any text (or number) nodes.
 * Once revealCount runs out in a text node, a cursor element is inserted
 * and no further content (or siblings) is rendered.
 *
 * @param node The React node to clone.
 * @param revealCount The number of characters to reveal.
 * @returns A tuple of the new node and the remaining character count.
 */
function cloneWithReveal(
  node: React.ReactNode,
  revealCount: number
): [React.ReactNode, number] {
  // Handle strings and numbers (treated as text)
  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node)
    if (text.length <= revealCount) {
      // Fully revealed text node.
      return [text, revealCount - text.length]
    } else {
      // Partially reveal the text and insert the cursor immediately after.
      const revealedText = text.slice(0, revealCount)
      const cursor = <span className="cursor">❚</span>
      return [<>{revealedText}{cursor}</>, 0]
    }
  }

  // Handle valid React elements
  if (React.isValidElement(node)) {
    if (!node.props.children) return [node, revealCount]

    const childrenArray = React.Children.toArray(node.props.children)
    const newChildren: React.ReactNode[] = []

    // Process each child until we run out of characters to reveal.
    for (const child of childrenArray) {
      if (revealCount <= 0) {
        // Once we've hit the unrevealed point, stop processing further children.
        break
      }
      const [newChild, remaining] = cloneWithReveal(child, revealCount)
      newChildren.push(newChild)
      revealCount = remaining
      // If the current child ended with a cursor (i.e. revealCount is 0), break out.
      if (revealCount <= 0) break
    }

    // Clone the element with the partially revealed children.
    return [React.cloneElement(node, { ...node.props }, newChildren), revealCount]
  }

  // For other node types (e.g. booleans, null), return as-is.
  return [node, revealCount]
}

/**
 * A generator that “reveals” a React node gradually.
 * Each yield returns a new React node with additional characters shown.
 *
 * Usage Example:
 *   for (const partial of proceduralDialogue(myStyledText)) {
 *     // Render `partial` in your component.
 *   }
 */
export function* proceduralDialogue(node: React.ReactNode) {
  const fullText = getFullText(node)
  const totalLength = fullText.length

  // Yield intermediate states with increasing revealed character counts.
  for (let i = 0; i < totalLength; i++) {
    const [revealedNode] = cloneWithReveal(node, i)
    yield revealedNode
  }

  // Final yield without the cursor.
  yield node
}


export async function* timedDialogue({
  texts,
  ms = 30,
}: {
  texts: React.ReactNode[]
  ms?: number
}) {
  let parts: React.ReactNode[] = new Array(texts.length)
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
