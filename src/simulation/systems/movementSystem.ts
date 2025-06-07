import { SimulationState } from "../SimulationState";
import { vec3 } from "gl-matrix";
import { StatType } from "../repository/StatRepository";

export const movementSystem = (state: SimulationState) => {
  for (const entId of state.MovementRepository.Entities) {
    // state.PhysicsRepository.StopMovement(entId);

    const speed = state.StatRepository.GetStatComputedValue(
      entId,
      StatType.SPEED
    );
    const direction = state.MovementRepository.GetDirection(entId);
    const lockVerticalMovement =
      state.MovementRepository.GetLockVerticalMovement(entId);

    state.MovementRepository.SetPreviousDirection(entId, direction);

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

    const movement = vec3.scale(
      vec3.create(),
      normalizedDirection,
      speed * state.DeltaTime
    );

    state.PhysicsRepository.TryMoveCharacterController(entId, movement);
  }
};
