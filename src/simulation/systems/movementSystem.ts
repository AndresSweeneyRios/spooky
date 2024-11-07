import { SimulationState } from "../SimulationState";
import { vec3 } from "gl-matrix";

const GRAVITY = -9.81;

export const movementSystem = (state: SimulationState) => {
  for (const entId of state.MovementRepository.Entities) {
    // state.PhysicsRepository.StopMovement(entId);

    const speed = state.MovementRepository.GetSpeed(entId);
    const direction = state.MovementRepository.GetDirection(entId);
    const lockVerticalMovement = state.MovementRepository.GetLockVerticalMovement(entId);

    if (speed === 0 || vec3.length(direction) === 0) {
      continue;
    }

    // Normalize the direction vector to ensure uniform speed
    const normalizedDirection = vec3.normalize(vec3.create(), direction);

    // If vertical movement is locked, zero out the Y component before scaling
    if (lockVerticalMovement) {
      normalizedDirection[1] = 0;
      vec3.normalize(normalizedDirection, normalizedDirection); // Re-normalize after adjustment
    }

    const movement = vec3.scale(vec3.create(), normalizedDirection, speed * state.DeltaTime);

    state.PhysicsRepository.TryMoveCharacterController(entId, movement);
  }
};