import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { Exit } from "../../simulation/commands/crazeoh/Exit";

export const createDoor = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const doorObject = simulation.ThreeScene.getObjectByName("DOOR")!

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new Exit(),
    once: false,
  })

  const worldPosition = doorObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [3, 100, 3], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  doorObject.visible = false

  return entId
}
