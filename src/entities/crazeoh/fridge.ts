import { Vector3 } from "three";
import type { Simulation } from "../../simulation";
import { ToggleFridge } from "../../simulation/commands/crazeoh/ToggleFridge";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { FridgeView } from "../../views/crazeoh/fridge";
import { loadAudio } from "../../graphics/loaders";

const fridgeAudioPromise = loadAudio("/audio/sfx/old_fridge.ogg", {
  loop: true,
  positional: true,
})

export const createFridge = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  const fridgeObject = simulation.ThreeScene.getObjectByName("Fridge")!

  const fridgeView = new FridgeView(fridgeObject, simulation)
  simulation.ViewSync.AddAuxiliaryView(fridgeView)

  fridgeAudioPromise.then(audio => {
    audio.setVolume(1.5)
    audio.play()
    fridgeObject.add(audio.getPositionalAudio())
  })

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    command: new ToggleFridge(fridgeView),
    once: false,
  })

  const worldPosition = fridgeObject.getWorldPosition(new Vector3())

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [3, 100, 3], [
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ], undefined, true)

  return entId
}
