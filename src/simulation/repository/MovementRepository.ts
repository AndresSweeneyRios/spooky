import {
  SimulationRepository,
  SimulationComponent,
} from "./_repository"

import {
  EntId,
} from "../EntityRegistry"

import {
  vec3,
} from "gl-matrix"

class MovementComponent extends SimulationComponent {
  public direction: vec3 = vec3.create()
  public speed: number = 0
  public lockVerticalMovement = false
}

export class MovementRepository extends SimulationRepository<MovementComponent> {
  public SetDirection(entId: EntId, direction: vec3) {
    this.entities.get(entId)!.direction = direction
  }

  public GetDirection(entId: EntId) {
    const direction = this.entities.get(entId)!.direction

    return vec3.clone(direction)
  }

  public SetSpeed(entId: EntId, speed: number) {
    this.entities.get(entId)!.speed = speed
  }

  public GetSpeed(entId: EntId) {
    return this.entities.get(entId)!.speed
  }

  public SetLockVerticalMovement(entId: EntId, lockVerticalMovement: boolean) {
    this.entities.get(entId)!.lockVerticalMovement = lockVerticalMovement
  }

  public GetLockVerticalMovement(entId: EntId) {
    return this.entities.get(entId)!.lockVerticalMovement
  }

  public static Factory() {
    return new MovementRepository(new MovementComponent())
  }
}
