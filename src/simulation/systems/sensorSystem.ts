import { SimulationState } from "../SimulationState";
import { SimulationCommandWithTarget } from "../commands/_command";
import { ExecutionMode, SensorCommand } from "../repository/SensorCommandRepository";

export const sensorSystem = (state: SimulationState) => {
  for (const entId of state.SensorCommandRepository.Entities) {
    const sensors = state.PhysicsRepository.GetSensors(entId)

    const immediateCommandMap = new Map<symbol, Readonly<[symbol, SensorCommand]>[]>()
    const interactionCommandMap = new Map<symbol, Readonly<[symbol, SensorCommand]>[]>()

    for (const sensor of sensors) {
      for (const { symbol, command } of state.SensorCommandRepository.GetCommandsForSensor(entId, sensor)) {
        if (command.ExecutionMode === ExecutionMode.Immediate) {
          if (!immediateCommandMap.has(sensor)) {
            immediateCommandMap.set(sensor, [])
          }

          immediateCommandMap.get(sensor)!.push([symbol, command])
        } else if (command.ExecutionMode === ExecutionMode.Interaction) {
          if (!interactionCommandMap.has(sensor)) {
            interactionCommandMap.set(sensor, [])
          }

          interactionCommandMap.get(sensor)!.push([symbol, command])
        }
      }
    }

    let availableInteractions: symbol[] = []

    for (const sensor of sensors) {
      if (!immediateCommandMap.has(sensor) && !interactionCommandMap.has(sensor)) {
        continue
      }

      let touchingTarget = false

      for (const target of state.SensorTargetRepository.Entities) {
        if (state.PhysicsRepository.GetIsSensorCollidingWithTarget(entId, sensor, target)) {
          touchingTarget = true
          break
        }
      }

      if (!touchingTarget) {
        continue
      }

      if (immediateCommandMap.has(sensor)) {
        for (const [commandSymbol, { Command, Once }] of immediateCommandMap.get(sensor)!) {
          if (Command instanceof SimulationCommandWithTarget) {
            Command.TargetEntId = entId
          }

          state.Commands.push(Command)
  
          if (Once) {
            state.SensorCommandRepository.DeleteSensorCommand(entId, commandSymbol)
          }
        }
      }

      if (interactionCommandMap.has(sensor)) {
        for (const [, { Command }] of interactionCommandMap.get(sensor)!) {
          if (Command instanceof SimulationCommandWithTarget) {
            Command.TargetEntId = entId
          }
        }

        availableInteractions.push(...interactionCommandMap.get(sensor)!.map(([symbol]) => symbol))
      }
    }

    state.SensorCommandRepository.SetAvailableInteractions(entId, availableInteractions)
  }
}