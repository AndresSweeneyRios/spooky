import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ToggleFridge } from "../../simulation/commands/crazeoh/ToggleFridge";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";

export const createFridge = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new ToggleFridge(),
    once: false,
  })

  const fridgeObject = simulation.ThreeScene.getObjectByName("Fridge")!

  console.log(fridgeObject.position)

  const worldPosition = fridgeObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [1.5, 100, 1.5], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  return entId
}
