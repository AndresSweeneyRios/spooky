import * as React from "react"
import * as THREE from "three"

import { RENDERER } from "../../constants"

export let canvas: HTMLCanvasElement = null!
export let renderer: THREE.WebGLRenderer = null!



export const Viewport: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (canvas) return
    if (!canvasRef.current) return

    canvas = canvasRef.current

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: RENDERER.antialias,
    })

    const resize = () => {
      canvas.width = RENDERER.width
      canvas.height = window.innerHeight * (RENDERER.width / window.innerWidth)

      renderer.setSize(canvas.width, canvas.height)
    }

    window.addEventListener("resize", resize)
    resize()

    return () => {
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
    />
  )
}
