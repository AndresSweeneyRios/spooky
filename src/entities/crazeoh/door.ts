import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { Exit } from "../../simulation/commands/crazeoh/Exit";
import { EntityView } from "../../simulation/EntityView";
import * as state from "../../scenes/crazeoh/state";

export const createDoor = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const doorObject = simulation.ThreeScene.getObjectByName("DOOR")!

  const command = simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new Exit(),
    once: false,
    owner: simulation.ThreeScene.getObjectByName("car")!,
  })

  // simulation.ViewSync.AddEntityView(new class DoorView extends EntityView {
  //   constructor() {
  //     super(entId)
  //   }

  //   public Update() {
  //     simulation.SimulationState.SensorCommandRepository.SetCommandEnabled(command, state.tookPicture)
  //   }
  // })

  const worldPosition = doorObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [3, 100, 3], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  doorObject.visible = false

  return entId
}
