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
      if (!RENDERER.limitResolution) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        renderer.setSize(window.innerWidth, window.innerHeight)
        return
      }

      // Helper to ensure an even number
      const ensureEven = (value: number) => value % 2 === 0 ? value : value - 1;
    
      // Get window dimensions (ensured even)
      const windowWidth = ensureEven(window.innerWidth);
      const windowHeight = ensureEven(window.innerHeight);
      const targetHeight = RENDERER.height; // desired downscaled renderer height
    
      // Compute the GCD of windowWidth and windowHeight
      const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
      const commonDivisor = gcd(windowWidth, windowHeight);
    
      // Gather all divisors of the commonDivisor.
      // Each divisor S is a candidate integer scale factor.
      let candidateScaleFactors: number[] = [];
      for (let i = 1; i <= commonDivisor; i++) {
        if (commonDivisor % i === 0) {
          candidateScaleFactors.push(i);
        }
      }
    
      // Now choose the S that makes canvas.height = windowHeight/S as close as possible to targetHeight.
      let bestS = candidateScaleFactors[0];
      let bestDiff = Infinity;
      for (const s of candidateScaleFactors) {
        const candidateCanvasHeight = windowHeight / s; // integer because s divides windowHeight
        const diff = Math.abs(candidateCanvasHeight - targetHeight);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestS = s;
        }
      }
    
      // Now, set the canvas resolution based on the chosen scale factor.
      const canvasHeight = windowHeight / bestS;
      const canvasWidth  = windowWidth / bestS;
    
      // These are the low-resolution (downscaled) dimensions used for rendering
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    
      // For display, set the CSS size to the full window dimensions.
      // (This causes the browser to scale up the canvas by an integer factor of bestS.)
      canvas.parentElement!.style.width  = `${windowWidth}px`;
      canvas.parentElement!.style.height = `${windowHeight}px`;
    
      // Update your renderer with the canvas's pixel dimensions.
      renderer.setSize(canvas.width, canvas.height);
    
      console.log(`Window: ${windowWidth}x${windowHeight}, Canvas: ${canvasWidth}x${canvasHeight}, Scale Factor: ${bestS}`);
    };
    

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
