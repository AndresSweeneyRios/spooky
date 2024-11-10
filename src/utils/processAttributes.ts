import type * as THREE from "three"
import { Simulation } from "../simulation"
import { vec3 } from "gl-matrix"
import { EntId } from "../simulation/EntityRegistry"
import { traverse } from "./traverse"
import { commands } from "../simulation/commands"

export const processAttributes = (object: THREE.Object3D, simulation: Simulation, entId: EntId) => {
  let removalList: THREE.Object3D[] = []

  for (const child of traverse(object)) {
    if (child.name === 'COLLIDERS') {
      simulation.SimulationState.PhysicsRepository.AddCollidersFromObject(entId, child)

      removalList.push(child)

      continue
    } else if (child.name === 'COMMANDS') {
      for (const command of child.children) {
        for (const commandName in commands) {
          if (command.name === commandName) {
            const commandClass = commands[commandName as keyof typeof commands]

            const commandInstance = new commandClass()

            commandInstance.Position = vec3.fromValues(
              command.position.x,
              command.position.y,
              command.position.z,
            )

            commandInstance.Rotation = vec3.fromValues(
              command.rotation.x,
              command.rotation.y,
              command.rotation.z,
            )

            commandInstance.EntId = entId

            simulation.SimulationState.Commands.push(commandInstance)
          }
        }
      }

      removalList.push(child)

      continue
    } else if (child.name === "SENSORS") {
      // simulation.SimulationState.PhysicsRepository.AddSensorsFromObject(entId, object)
  
      removalList.push(child)
  
      continue
    }
  }

  for (const child of removalList) {
    child.parent?.remove(child)
  }
}
