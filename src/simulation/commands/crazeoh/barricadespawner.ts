import type { Simulation } from "../..";
import { View } from "../../View";
import { SimulationCommand } from "../_command";
import * as THREE from "three";

export class barricadespawner extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    if (this.Position === null || this.Rotation === null) {
      throw new Error("Position and Rotation must be set before executing SpawnBarricade");
    }

    const position = this.Position

    let spawned = false

    let interloper: (typeof import("../../../scenes/crazeoh/interloper")) | null = null

    import("../../../scenes/crazeoh/interloper").then(interloperModule => {
      interloper = interloperModule;
    })

    const entId = simulation.EntityRegistry.Create()
    simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
    // simulation.SimulationState.PhysicsRepository.SetPosition(entId, position)

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Draw(simulation: Simulation, lerpFactor: number): void {
        if (spawned || !interloper?.pizzaEaten) return

        spawned = true

        simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [4, 100, 4], [
          position[0],
          position[1],
          position[2]
        ], undefined, false)

        // Dynamically import the HeadView
        import("../../../views/crazeoh/barricade").then(({ BarricadeView: _ }) => {
          const BarricadeView = _ as typeof import("../../../views/crazeoh/barricade").BarricadeView;
          const view = new BarricadeView(simulation, entId,
            [
              position[0],
              position[1] - 0.1,
              position[2]
            ],
            [
              0,
              -0.27 * Math.PI,
              0
            ],
            [2.2, 2.2, 2.2]
          );

          const initialIntensity = interloper!.currentCrtPass!.uniforms["noiseIntensity"].value

          simulation.ViewSync.AddAuxiliaryView(new class extends View {
            public Draw(simulation: Simulation, lerpFactor: number): void {
              if (!view.barricade || !interloper!.currentCrtPass) return

              // Calculate distance from player to barricade
              const playerVec = simulation.Camera.position.clone();
              const barricadePos = new THREE.Vector3(position[0], position[1], position[2]);
              const distanceToPlayer = barricadePos.distanceTo(playerVec);

              // Distance factor: 1 when far away, 0 when close
              const distanceFactor = Math.min(1, Math.max(0, distanceToPlayer / 15));

              // Scale noise intensity based on distance:
              // - At max distance: use initialIntensity
              // - At min distance: use initialIntensity * 3
              const noiseValue = initialIntensity * (1 + 15 * (1 - distanceFactor));

              // Apply the noise effect
              interloper!.currentCrtPass.uniforms["noiseIntensity"].value = noiseValue;
            }
          })

          simulation.ViewSync.AddAuxiliaryView(view);
        });
      }
    })
  }
}
