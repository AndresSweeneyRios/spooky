import type { Simulation } from "..";
import { createPlayer } from "../../entities/player";
import { SimulationCommand } from "./_command";

export class SpawnPlayer extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    if (this.Position === null || this.Rotation === null) {
      throw new Error("Position and Rotation must be set before executing SpawnPlayer");
    }

    createPlayer(simulation, this.Position, this.Rotation).then((view) => {
      view.enableControls()
    }).catch(console.error);
  }
}
