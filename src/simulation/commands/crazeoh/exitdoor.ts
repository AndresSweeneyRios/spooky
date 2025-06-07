import type { Simulation } from "../..";
import { SimulationCommand } from "../_command";
import * as state from "../../../scenes/crazeoh/state";
import { loadScene, scenes } from "../../../scenes";
import { ExecutionMode } from "../../repository/SensorCommandRepository";
import { Vector3 } from "three";
import { View } from "../../View";
import { loadAudio } from "../../../graphics/loaders";
import doorOpenOgg from "../../../assets/audio/sfx/door_open.ogg";

const doorOpenAudio = loadAudio(doorOpenOgg, {
  volume: 0.7,
  loop: false,
  positional: false,
});

export class exitdoor extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    const exitdoor = simulation.ThreeScene.getObjectByName("exitdoor")!;
    const entId = simulation.EntityRegistry.Create();
    simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
    simulation.SimulationState.PhysicsRepository.CreateComponent(entId);

    const worldPosition = exitdoor.getWorldPosition(new Vector3());

    simulation.SimulationState.PhysicsRepository.AddBoxCollider(
      entId,
      [3, 100, 3],
      [worldPosition.x, worldPosition.y, worldPosition.z],
      undefined,
      true
    );

    let interloper: typeof import("../../../scenes/crazeoh/interloper") | null =
      null;

    import("../../../scenes/crazeoh/interloper").then((interloperModule) => {
      interloper = interloperModule;
    });

    let addedCommand = false;

    simulation.ViewSync.AddAuxiliaryView(
      new (class extends View {
        public Draw(simulation: Simulation, lerpFactor: number): void {
          if (addedCommand || !interloper?.pizzaEaten) return;

          addedCommand = true;

          simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
            entId: entId,
            executionMode: ExecutionMode.Interaction,
            once: false,
            owner: exitdoor,

            command: new (class extends SimulationCommand {
              public Execute(simulation: Simulation): void {
                state.incrementWins();

                document
                  .querySelector("#caseoh-loading")!
                  .setAttribute("is-hidden", "false");

                simulation.ViewSync.Cleanup(simulation);

                doorOpenAudio.then((audio) => {
                  audio.play();
                });

                setTimeout(() => {
                  loadScene(scenes.crazeoh);
                }, 500);
              }
            })(),
          });
        }
      })()
    );
  }
}
