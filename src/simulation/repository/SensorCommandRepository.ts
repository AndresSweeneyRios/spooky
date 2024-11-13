import { EntId } from "../EntityRegistry"
import { SimulationCommand } from "../commands/_command"
import {
  SimulationRepository,
  SimulationComponent,
} from "./_repository"

export enum ExecutionMode {
  Immediate = 0,
  Interaction = 1,
}

export interface SensorCommand {
  Command: SimulationCommand
  ExecutionMode: ExecutionMode
  Sensors: symbol[] | undefined
  Once: boolean
}

class SensorCommandComponent extends SimulationComponent {
  public Commands = new Map<symbol, Readonly<SensorCommand>>()
  public AvailableInteractions: symbol[] = []
}

export class SensorCommandRepository extends SimulationRepository<SensorCommandComponent> {
  public AddSensorCommand({
    entId, 
    command, 
    executionMode,
    sensors = undefined,
    once = false,
  }: {
    entId: EntId
    command: SimulationCommand
    executionMode: ExecutionMode
    sensors?: symbol[]
    once?: boolean
  }) {
    const component = this.entities.get(entId)!

    const symbol = Symbol()
    
    component.Commands.set(symbol, Object.freeze({
      Command: command,
      ExecutionMode: executionMode,
      Sensors: sensors,
      Once: once,
    }))
  }

  public DeleteSensorCommand(entId: EntId, symbol: symbol) {
    const component = this.entities.get(entId)!

    component.Commands.delete(symbol)

    component.AvailableInteractions = component.AvailableInteractions.filter((s) => s !== symbol)
  }

  public *GetCommandsForSensor(entId: EntId, sensor: symbol) {
    const component = this.entities.get(entId)!

    for (const [symbol, command] of component.Commands) {
      if (command.Sensors === undefined || command.Sensors.includes(sensor)) {
        yield {
          symbol,
          command,
        }
      }
    }
  }

  public SetAvailableInteractions(entId: EntId, commands: symbol[]) {
    const component = this.entities.get(entId)!

    component.AvailableInteractions = [...commands]
  }

  public static Factory() {
    return new SensorCommandRepository(new SensorCommandComponent())
  }
}
