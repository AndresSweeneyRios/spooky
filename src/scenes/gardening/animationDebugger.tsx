import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import ReactDOM from 'react-dom';
import React from 'react';
import { playAnimation } from '../../animation/animationPlayer';

export const init = async () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene)
  camera.position.set(0, 0.5, 2)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      renderer.render(scene, camera)
    }
  
    public Cleanup(): void {
      renderer.dispose()
    }
  })

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  resize()
  
  window.addEventListener('resize', resize, false);

  const [, playerModelGLTF, animationListJSON] = await Promise.all([
    loadEquirectangularAsEnvMap("/3d/env/sky_mirror.webp", THREE.LinearFilter, THREE.LinearFilter).then((texture) => {
      scene.background = texture
      scene.backgroundIntensity = 0.0
      scene.environment = texture
      scene.environmentIntensity = 1.0

      scene.environmentRotation.y = Math.PI / -4
      scene.backgroundRotation.y = Math.PI / -4
    }),

    loadGltf("/3d/entities/fungi.glb"),

    fetch("/3d/animations/_list.json").then((response) => response.json())
  ])

  const animationList = animationListJSON as { [directory: string]: string[] }

  type AnimationObject = { directory: string, name: string, clip: THREE.AnimationClip }
  
  const animationMap = new Map<string, AnimationObject[]>()

  const fullPaths = Object.entries(animationList).flatMap(([directory, files]) => files.map((file) => `/3d/animations/${directory}/${file}`))

  fullPaths.sort()

  const [...animationObjects] = await Promise.all(fullPaths.map(async (path) => {
    const animation = await loadGltf(path)

    const filename = path.split('/').pop() as string

    const directory = path.split('/').slice(-2)[0]

    return animation.animations.map((clip) => {
      const clipName = clip.name

      if (!animationMap.has(directory)) {
        animationMap.set(directory, [] as AnimationObject[])
      }

      const object: AnimationObject = { directory: directory, name: `${filename} - ${clipName}`, clip }

      return object
    })
  }))

  animationObjects.forEach((objects) => {
    objects.forEach((object) => {
      animationMap.get(object.directory)?.push(object)
    })
  })

  const playerModel = SkeletonUtils.clone(playerModelGLTF.scene)

  scene.add(playerModel)

  let rotationEnabled = false

  const playerView = new class PlayerView extends View {
    public Draw(simulation: Simulation): void {
      if (rotationEnabled) {
        playerModel.rotateY(simulation.SimulationState.DeltaTime)
      }
    }

    public Cleanup(): void {
    }
  }

  const skinnedMeshes = [] as THREE.SkinnedMesh[]

  playerModel.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) {
      skinnedMeshes.push(object)
    }
  })

  const playClip = (clip: THREE.AnimationClip) => {
    for (const skinnedMesh of skinnedMeshes) {
      playAnimation(skinnedMesh, clip)
    }
  }

  for (const [, animations] of animationMap.entries()) {
    for (const { clip } of animations) {
      playClip(clip)

      break
    }

    break
  }

  const serialize = () => {
    const serialized: Record<string, any> = {}

    for (const [directory, animations] of animationMap.entries()) {
      for (const { name, clip } of animations) {
        serialized[`${directory}/${name}`] = THREE.AnimationClip.toJSON(clip)
      }
    }

    return {
      names: Object.keys(serialized),
      json: JSON.stringify(serialized),
    }
  }

  const generateBody = () => {
    const serialized = serialize()

    const typescript = `
export type AnimationKey = ${serialized.names.map((name) => `'${name}'`).join(' | ')}
`

    return {
      typescript,
      json: serialized.json,
    }
  }

  const publish = async () => {
    try {
      const response = await fetch('http://localhost:8888/update-animations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateBody()),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }
    } catch (error) {
      console.error(error)
    }
  }

  const debugMenuHtmlElement = document.createElement('div')
  debugMenuHtmlElement.id = 'animation-debugger'
  document.body.appendChild(debugMenuHtmlElement)

  const styleElement = document.createElement('style')
  styleElement.innerHTML = /* css */`
    #animation-debugger {
      color: white;
      font-size: 12px;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      font-family: sans-serif;
    }

    #animation-debugger-controls {
      display: flex;
      padding: 2em;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 1em;
      width: 30em;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      overflow-y: scroll;
    }

    #animation-debugger button {
      text-align: left;
      cursor: pointer;
      padding: 0.5em;
      border: 1px solid rgb(100, 100, 100);
      outline: none;
      background-color: rgba(50, 50, 50);
      color: white;
      font-family: inherit;
      font-weight: bold;
      font-size: 0.9em;
      letter-spacing: 0.01em;
    }
  `
  document.head.appendChild(styleElement)

  const Component = () => {
    const [_, setUpdate] = React.useState(0)
    const [loading, setLoading] = React.useState(false)

    const publishReactive = async () => {
      try {
        setLoading(true)
  
        await publish()
  
        setLoading(false)
      } catch (error) {
        console.error(error)
      }
    }

    if (loading) {
      return <>Loading...</>
    }

    return <>
      <div id="animation-debugger-controls">
        <h1>Animation Debugger</h1>
        {Array.from(animationMap.entries()).map(([directory, animations]) => (<>
          <h2 key={directory}>{directory}</h2>
          {animations.map(({ name, clip }) => (
            <button key={directory+name} onClick={() => playClip(clip)}>{name}</button>
          ))}
        </>))}
      </div>

      <button 
        onClick={() => {
          rotationEnabled = !rotationEnabled
          setUpdate((prev) => prev + 1)
        }}
        style={{ 
          position: 'absolute', 
          bottom: '1em', 
          right: '1em',
          fontSize: '2em',
        }}
      >{
        rotationEnabled ? 'Disable Rotation' : 'Enable Rotation'
      }</button>

      {/* publish button */}

      <button 
        onClick={publishReactive}
        style={{ 
          position: 'absolute', 
          bottom: '4em', 
          right: '1em',
          fontSize: '2em',
        }}
      >
        Publish
      </button>
    </>
  }

  ReactDOM.render(<Component />, debugMenuHtmlElement)

  simulation.ViewSync.AddAuxiliaryView(playerView)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
