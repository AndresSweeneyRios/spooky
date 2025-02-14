import type { Simulation } from "../..";
import { MicrowaveView } from "../../../views/crazeoh/microwave";
import { SimulationCommand } from "../_command";

export class ToggleMicrowave extends SimulationCommand {
  constructor(private microwaveView: MicrowaveView) {
    super();
  }

  public Execute(simulation: Simulation): void {
    this.microwaveView.Toggle();
  }
}
