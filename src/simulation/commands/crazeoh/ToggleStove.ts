import type { Simulation } from "../..";
import { StoveView } from "../../../views/crazeoh/stove";
import { SimulationCommand } from "../_command";

export class ToggleStove extends SimulationCommand {
  constructor(private stoveView: StoveView) {
    super();
  }

  public Execute(simulation: Simulation): void {
    this.stoveView.Toggle();
  }
}
