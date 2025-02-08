import * as React from "react"
import * as THREE from "three"

import { RENDERER } from "../../constants"
import { stopGameLoop } from "../simulation/loop"
import { loadAppropriateScene, Scene, unloadScene } from "../scenes"

export let canvas: HTMLCanvasElement = null!
export let renderer: THREE.WebGLRenderer = null!

export const Viewport: React.FC<{
  scene?: Scene
}> = (props) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (canvas) return
    if (!canvasRef.current) return

    canvas = canvasRef.current

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: RENDERER.antialias,
    })
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const resize = () => {
      if (RENDERER.limitResolution) {
        canvas.width = RENDERER.width
        canvas.height = window.innerHeight * (canvas.width / window.innerWidth)
      } else {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
      
      renderer.setSize(canvas.width, canvas.height)
    }

    window.addEventListener("resize", resize)
    resize()

    loadAppropriateScene(props.scene)

    return () => {
      unloadScene()

      window.removeEventListener("resize", resize)
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (renderer) {
        renderer.dispose()
      }

      stopGameLoop()
    }
  }, [])

  return (
    <canvas
      id="viewport"
      ref={canvasRef}
    />
  )
}
