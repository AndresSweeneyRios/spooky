import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import ReactDOM from 'react-dom';
import React from 'react';

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

  const mixers = [] as THREE.AnimationMixer[]

  let rotationEnabled = false

  const playerView = new class PlayerView extends View {
    public Draw(simulation: Simulation): void {
      if (rotationEnabled) {
        playerModel.rotateY(simulation.SimulationState.DeltaTime)
      }

      mixers.forEach((mixer) => {
        mixer.update(simulation.SimulationState.DeltaTime)
      })
    }

    public Cleanup(): void {
    }
  }

  playerModel.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) {
      const mixer = new THREE.AnimationMixer(object)
      mixers.push(mixer)
    }
  })

  const actions = [] as THREE.AnimationAction[]

  const playAnimation = (clip: THREE.AnimationClip) => {
    actions.forEach((action) => action.stop())

    mixers.forEach((mixer) => {
      const action = mixer.clipAction(clip)
      action.play()

      action.timeScale = 0.4

      actions.push(action)
    })

    mixers.forEach((mixer) => {
      mixer.update(0)
    })
  }

  for (const [, animations] of animationMap.entries()) {
    for (const { clip } of animations) {
      playAnimation(clip)

      break
    }

    break
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

  // render react componen
  const Component = () => {
    const [_, setUpdate] = React.useState(0)

    return <>
      <div id="animation-debugger-controls">
        <h1>Animation Debugger</h1>
        {Array.from(animationMap.entries()).map(([directory, animations]) => (<>
          <h2>{directory}</h2>
          {animations.map(({ name, clip }) => (
            <button onClick={() => playAnimation(clip)}>{name}</button>
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
    </>
  }

  ReactDOM.render(<Component />, debugMenuHtmlElement)

  simulation.ViewSync.AddAuxiliaryView(playerView)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
