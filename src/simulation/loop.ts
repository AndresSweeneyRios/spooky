import type { Simulation } from ".";
import { Tick } from "./systems";

// Frame duration in milliseconds and seconds
const FRAME_DURATION_MS = 1000 / 60;
const FRAME_DURATION_S = FRAME_DURATION_MS / 1000;
export const MAX_ALLOWED_PAUSE = 1000;

// Function to start the game loop
export function startGameLoop(simulation: Simulation) {
  if (simulation.IsRunning) return;
  simulation.IsRunning = true;
  simulation.LastFrameTime = performance.now();
  requestAnimationFrame(gameLoop.bind(null, simulation));
}

// Function to stop the game loop
export function stopGameLoop(simulation: Simulation) {
  simulation.IsRunning = false;
}

// Game loop function
function gameLoop(simulation: Simulation, now: number) {
  if (!simulation.IsRunning) return;
  const viewSync = simulation.ViewSync;
  // time since last frame
  let dtMs = now - simulation.LastFrameTime;
  simulation.LastFrameTime = now;
  // drop large pauses
  if (dtMs > MAX_ALLOWED_PAUSE) {
    simulation.AccumulatedTime = 0;
    dtMs = 0;
  }
  // accumulate time
  simulation.AccumulatedTime += dtMs;
  // fixed-step updates
  while (simulation.AccumulatedTime >= FRAME_DURATION_MS) {
    simulation.AccumulatedTime -= FRAME_DURATION_MS;
    updateGameLogic(simulation, FRAME_DURATION_S);
  }
  // render interpolation
  viewSync.Draw(simulation, simulation.AccumulatedTime / FRAME_DURATION_MS);
  // schedule next
  requestAnimationFrame(gameLoop.bind(null, simulation));
}

// Function to update the game logic independently
export function updateGameLogic(simulation: Simulation, deltaTime: number) {
  const state = simulation.SimulationState;
  state.DeltaTime = deltaTime;
  // execute and clear commands
  const cmds = state.Commands;
  for (const cmd of cmds) {
    cmd.Execute(simulation);
  }
  cmds.length = 0;
  // advance simulation systems
  Tick(state);
  simulation.ViewSync.Update(simulation);
}
