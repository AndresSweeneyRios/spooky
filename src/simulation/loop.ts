import type { Simulation } from ".";
import { Tick } from "./systems";

// Define the FPS constant
const FPS = 1000 / 60;
export const MAX_ALLOWED_PAUSE = 1000;

// Function to start the game loop
export function startGameLoop(simulation: Simulation) {
  if (simulation.IsRunning) return;

  simulation.IsRunning = true;
  simulation.LastFrameTime = Date.now();
  gameLoop(simulation);
}

// Function to stop the game loop
export function stopGameLoop(simulation: Simulation) {
  simulation.IsRunning = false;
}

// Game loop function
function gameLoop(simulation: Simulation) {
  if (!simulation.IsRunning) return;

  const currentTime = Date.now();
  let deltaTime = currentTime - simulation.LastFrameTime;

  // If the pause is too long, reset the accumulated time
  if (deltaTime > MAX_ALLOWED_PAUSE) {
    simulation.AccumulatedTime = 0; // Reset accumulated time
    simulation.LastFrameTime = currentTime;
    deltaTime = 0;
  }

  // Update game logic here
  simulation.AccumulatedTime += deltaTime;

  while (simulation.AccumulatedTime >= FPS) {
    // Update game logic here
    simulation.AccumulatedTime -= FPS;

    const deltaTime = FPS / 1000;

    updateGameLogic(simulation, deltaTime);
  }

  simulation.ViewSync.Draw(simulation, simulation.AccumulatedTime / FPS);

  // Render game graphics here
  simulation.LastFrameTime = currentTime;

  // Call the game loop again
  requestAnimationFrame(() => gameLoop(simulation));
}

// Function to update the game logic independently
export function updateGameLogic(simulation: Simulation, deltaTime: number) {
  simulation.SimulationState.DeltaTime = deltaTime;

  for (const command of simulation.SimulationState.Commands) {
    command.Execute(simulation);
  }

  simulation.SimulationState.Commands = [];

  Tick(simulation.SimulationState);

  simulation.ViewSync.Update(simulation);
}
