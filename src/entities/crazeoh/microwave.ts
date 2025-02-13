import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ToggleMicrowave } from "../../simulation/commands/crazeoh/ToggleMicrowave";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { MicrowaveView } from "../../views/crazeoh/microwave";

export const createMicrowave = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const microwaveObject = simulation.ThreeScene.getObjectByName("Microwave")!

  const microwaveView = new MicrowaveView(microwaveObject, simulation)
  simulation.ViewSync.AddAuxiliaryView(microwaveView)

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new ToggleMicrowave(microwaveView),
    once: false,
  })

  const worldPosition = microwaveObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [3, 100, 3], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  return entId
}
