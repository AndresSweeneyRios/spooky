import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { ThroneView } from '../views/throne';
import { loadPMREM } from '../graphics/loaders';
import { createPlayer } from '../entities/player';

export const init = async () => {
  const scene = new THREE.Scene()
  const simulation = new Simulation()

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      renderer.render(scene, camera)
    }
  
    public Cleanup(): void {
      renderer.dispose()
    }
  })

  const ambientLight = new THREE.AmbientLight(0xff0000, 0.1)
  scene.add(ambientLight)

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, false);

  // add red ambient light
  
  // add sun
  // const sun = new THREE.DirectionalLight(0xffffff, 10.0)
  // sun.position.set(0, 1, 0)
  // scene.add(sun)

  await loadPMREM("/3d/hdr/sky.hdr").then((texture) => {
    scene.background = texture
    scene.environment = texture
    scene.environmentIntensity = 1.0
  })

  const throneView = new ThroneView(scene)

  throneView.scene.position.set(0, 0, -5)

  simulation.ViewSync.AddAuxiliaryView(throneView)

  createPlayer(simulation, camera)

  simulation.Start()

  return () => {
    simulation.Stop()
  }
}
