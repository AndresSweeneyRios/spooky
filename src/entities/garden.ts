import { vec3 } from 'gl-matrix';
import type { Simulation } from '../simulation';

const SIZE = 2;

export const createGarden = (simulation: Simulation, position: vec3) => {
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);

  const boxColliderHalfExtends = vec3.fromValues(SIZE / 2, SIZE / 2, SIZE / 2);

  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, boxColliderHalfExtends, vec3.add(
    vec3.create(), position, [0, SIZE / 2, 0]
  ));

  import('../views/garden').then((exports) => {
    new exports.GardenView(entId, simulation, position);
  })

  return entId;
}
