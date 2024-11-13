import { Simulation } from "..";
import { createThrone } from "../../entities/throne";
import { ExecutionMode } from "../repository/SensorCommandRepository";
import { LogCommand } from "./Log";
import { SimulationCommand } from "./_command";

export class ThroneTestSequence extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    const entId = createThrone(simulation, this.Position!);

    simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
      entId,
      command: new LogCommand("WEEEEOOOOOO"),
      executionMode: ExecutionMode.Immediate,
      once: true,
    })
  }
}
