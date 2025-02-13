import type { Simulation } from "../..";
import { SimulationCommand } from "../_command";

export class ToggleFridge extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    console.log("Fridge toggled");
  }
}
