import type * as THREE from "three"
import type { Simulation } from "../simulation"
import type { EntId } from "../simulation/EntityRegistry"
import { traverse } from "./traverse"
import { commands } from "../simulation/commands"

export const processAttributes = (object: THREE.Object3D, simulation: Simulation, entId: EntId, addRigidBody: boolean) => {
  let removalList: THREE.Object3D[] = []

  for (const child of traverse(object)) {
    if (child.name === 'ORIGIN') {
      object.position.set(child.position.x, child.position.y, child.position.z)
      object.translateX(-child.position.x)
      object.translateY(-child.position.y)
      object.translateZ(-child.position.z)

      removalList.push(child)

      continue
    } else if (child.name === 'COLLIDERS' || child.name.includes('COLLIDER')) {
      simulation.SimulationState.PhysicsRepository.AddCollidersFromObject(entId, child, addRigidBody)

      removalList.push(child)

      continue
    } else if (child.name === 'COMMANDS') {
      for (const command of child.children) {
        for (const commandName in commands) {
          if (command.name === commandName) {
            const commandClass = commands[commandName as keyof typeof commands]

            const commandInstance = new commandClass()

            commandInstance.Position = [
              command.position.x,
              command.position.y,
              command.position.z,
            ]

            commandInstance.Rotation = [
              command.rotation.x,
              command.rotation.y,
              command.rotation.z,
            ]

            commandInstance.EntId = entId

            simulation.SimulationState.Commands.push(commandInstance)
          }
        }
      }

      removalList.push(child)

      continue
    } else if (child.name === "SENSORS") {
      const isSensor = true

      simulation.SimulationState.PhysicsRepository.AddCollidersFromObject(entId, child, addRigidBody, isSensor)

      removalList.push(child)

      continue
    }
  }

  for (const child of removalList) {
    child.visible = false
  }
}
