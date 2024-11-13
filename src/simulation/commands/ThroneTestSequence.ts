import { Simulation } from "..";
import { createThrone } from "../../entities/throne";
import { SimulationCommand } from "./_command";

export class ThroneTestSequence extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    createThrone(simulation, this.Position!);
  }
}
