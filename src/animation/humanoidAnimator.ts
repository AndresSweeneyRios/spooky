import * as THREE from 'three';
import { loadGltf } from '../graphics/loaders';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';


export const getHumanoidAnimator = async (simulation: Simulation, skinnedMesh: THREE.SkinnedMesh) => {
  // const { animations } = await humanoidBasicAnimationsGLB

  // const mixer = new THREE.AnimationMixer(skinnedMesh)

  // const action = mixer.clipAction(animations[0])
  // action.play()

  // const view = new class HumanoidAnimator extends View {
  //   public Draw(): void {
  //     mixer.update(simulation.SimulationState.DeltaTime)
  //   }

  //   public Cleanup(): void {
  //     mixer.stopAllAction()
  //   }
  // }

  // simulation.ViewSync.AddAuxiliaryView(view)
}
