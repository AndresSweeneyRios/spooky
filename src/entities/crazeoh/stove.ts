import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ToggleStove } from "../../simulation/commands/crazeoh/ToggleStove";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { StoveView } from "../../views/crazeoh/stove";

export const createStove = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const stoveObject = simulation.ThreeScene.getObjectByName("Stove001")!

  const stoveView = new StoveView(stoveObject, simulation)
  simulation.ViewSync.AddAuxiliaryView(stoveView)

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new ToggleStove(stoveView),
    once: false,
  })

  const worldPosition = stoveObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [3, 100, 3], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  return entId
}
