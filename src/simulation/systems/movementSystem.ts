import { SimulationState } from "../SimulationState";
import { vec3 } from "gl-matrix";

export const movementSystem = (state: SimulationState) => {
  for (const entId of state.TransformRepository.Entities) {
    const position = state.TransformRepository.GetPosition(entId)
    const speed = state.MovementRepository.GetSpeed(entId)
    const direction = state.MovementRepository.GetDirection(entId)
    const lockVerticalMovement = state.MovementRepository.GetLockVerticalMovement(entId)

    if (speed === 0 || vec3.length(direction) === 0) {
      continue;
    }

    const newPosition = vec3.fromValues(
      position[0] + direction[0] * speed,
      position[1] + direction[1] * speed,
      position[2] + direction[2] * speed,
    );

    if (lockVerticalMovement) {
      newPosition[1] = position[1];
    }

    state.TransformRepository.SetPosition(entId, newPosition);
  }
}
