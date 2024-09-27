import * as React from "react"
import * as THREE from "three"

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
    })

    renderer.autoClear = false;

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      renderer.setSize(window.innerWidth, window.innerHeight)
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
