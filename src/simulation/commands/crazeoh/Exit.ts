import type { Simulation } from "../..";
import { SimulationCommand } from "../_command";

export class Exit extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    console.log("Exiting");
  }
}
