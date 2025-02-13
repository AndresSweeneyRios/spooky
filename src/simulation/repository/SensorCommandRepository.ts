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
  public Commands: symbol[] = []
  public AvailableInteractions: symbol[] = []
}

export class SensorCommandRepository extends SimulationRepository<SensorCommandComponent> {
  public SensorCommandMap = new Map<symbol, Readonly<SensorCommand>>()
  public SymbolEntIdMap = new Map<symbol, EntId>()

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

    this.SensorCommandMap.set(symbol, Object.freeze({
      Command: command,
      ExecutionMode: executionMode,
      Sensors: sensors,
      Once: once,
    }))

    this.SymbolEntIdMap.set(symbol, entId)

    component.Commands.push(symbol)
  }

  public DeleteSensorCommand(entId: EntId, symbol: symbol) {
    const component = this.entities.get(entId)!

    this.SensorCommandMap.delete(symbol)

    component.AvailableInteractions = component.AvailableInteractions.filter((s) => s !== symbol)
  }

  public GetCommandsForSensor(entId: EntId, sensor: symbol): { symbol: symbol, command: Readonly<SensorCommand> }[] {
    const component = this.entities.get(entId)!
    const result: { symbol: symbol, command: Readonly<SensorCommand> }[] = []

    for (const symbol of component.Commands) {
      const command = this.SensorCommandMap.get(symbol)!

      if (command.Sensors === undefined || command.Sensors.includes(sensor)) {
        result.push({
          symbol,
          command,
        })
      }
    }

    return result
  }

  public GetAvailableInteractions(entId: EntId) {
    const component = this.entities.get(entId)!

    return component.AvailableInteractions.map((symbol) => {
      const command = this.SensorCommandMap.get(symbol)!.Command
      const entId = this.SymbolEntIdMap.get(symbol)!

      return {
        command,
        entId,
      }
    })
  }

  public PushAvailableInteractions(entId: EntId, commands: symbol[]) {
    const component = this.entities.get(entId)!

    component.AvailableInteractions.push(...commands)
  }

  public ClearAvailableInteractions(entId: EntId) {
    const component = this.entities.get(entId)!

    component.AvailableInteractions = []
  }

  public static Factory() {
    return new SensorCommandRepository(new SensorCommandComponent())
  }
}
