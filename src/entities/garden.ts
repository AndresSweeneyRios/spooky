import type { vec3 } from 'gl-matrix';
import type { Simulation } from '../simulation';

export const createGarden = (simulation: Simulation, position: vec3) => {
  const entId = simulation.EntityRegistry.Create();

  import('../views/garden').then((exports) => {
    new exports.GardenView(entId, simulation, position);
  })

  return entId;
}
