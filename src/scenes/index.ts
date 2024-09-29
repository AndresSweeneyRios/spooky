import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { startGameLoop } from '../simulation/loop';
import { ThroneView } from '../views/throne';
import { HeadView } from '../views/head';

const simulation = new Simulation()

const scene = new THREE.Scene()

// ambient light

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3.5;
// camera.position.y = 5;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}, false);

// simulation.ViewSync.AddAuxiliaryView(new ThroneView(scene))
simulation.ViewSync.AddAuxiliaryView(new HeadView(scene))

simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
  public Draw(): void {
    renderer.render(scene, camera)
  }

  public Cleanup(): void {
    renderer.dispose()
  }
})

startGameLoop(simulation)
