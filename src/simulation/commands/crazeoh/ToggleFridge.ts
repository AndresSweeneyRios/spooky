import type { Simulation } from "../..";
import { FridgeView } from "../../../views/crazeoh/fridge";
import { SimulationCommand } from "../_command";

export class ToggleFridge extends SimulationCommand {
  constructor(private fridgeView: FridgeView) {
    super();
  }

  public Execute(simulation: Simulation): void {
    this.fridgeView.Toggle();
  }
}
