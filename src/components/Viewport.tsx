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
      preserveDrawingBuffer: true,
    })
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const resize = () => {

      if (RENDERER.limitResolution) {
        const targetHeight = RENDERER.height; // your desired renderer height
        const windowHeight = window.innerHeight;
        let closestDivisibleHeight = 1;
        let smallestDiff = Infinity;

        // Iterate over all numbers from 1 to windowHeight
        for (let d = 1; d <= windowHeight; d++) {
          // Check if d is a divisor of windowHeight
          if (windowHeight % d === 0) {
            const diff = Math.abs(d - targetHeight);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestDivisibleHeight = d;
            }
          }
        }

        // Set the canvas dimensions based on the chosen height
        const aspectRatio = window.innerWidth / window.innerHeight;
        canvas.height = closestDivisibleHeight;
        canvas.width = closestDivisibleHeight * aspectRatio;
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
