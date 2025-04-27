import type { Simulation } from "../..";
import { View } from "../../View";
import { SimulationCommand } from "../_command";
import * as THREE from "three";

export class SpawnEnforcer extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    if (this.Position === null || this.Rotation === null) {
      throw new Error("Position and Rotation must be set before executing SpawnEnforcer");
    }

    const position = this.Position
    const rotation = this.Rotation

    // Dynamically import the HeadView
    import("../../../views/head").then(({ HeadView: _ }) => {
      const HeadView = _ as typeof import("../../../views/head").HeadView;
      const enforcerView = new HeadView(simulation.ThreeScene, simulation.Camera);

      enforcerView.position.set(
        position[0],
        position[1] + 0.5,
        position[2]
      )

      simulation.ViewSync.AddAuxiliaryView(new class extends View {
        public Draw(simulation: Simulation, lerpFactor: number): void {
          const playerVec = simulation.Camera.position.clone();

          const rotation = new THREE.Matrix4().lookAt(
            enforcerView.position,
            playerVec,
            new THREE.Vector3(0, 1, 0)
          );

          enforcerView.rotation.setFromRotationMatrix(rotation);

          // Apply additional -90 degree rotation around Y axis
          const additionalRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
          enforcerView.rotation.multiply(additionalRotation);

        }
      })

      simulation.ViewSync.AddAuxiliaryView(enforcerView);
    });
  }
}
