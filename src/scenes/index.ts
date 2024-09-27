import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { startGameLoop } from '../simulation/loop';

const simulation = new Simulation()

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

simulation.ViewSync.AddAuxiliaryView(new class CubeView extends View {
  cube: THREE.Mesh = null!

  constructor() {
    super()

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    this.cube = new THREE.Mesh(geometry, material);
    scene.add(this.cube);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    this.cube.rotation.x += 0.01
    this.cube.rotation.y += 0.01
  }
})

simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
  public Draw(simulation: Simulation, lerpFactor: number): void {
    renderer.render(scene, camera)
  }
  public Cleanup(simulation: Simulation): void {
    renderer.dispose()
  }
})

startGameLoop(simulation)
