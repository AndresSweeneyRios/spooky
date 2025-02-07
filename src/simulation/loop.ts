import type { Simulation } from ".";
import { Tick } from "./systems";

// Define the FPS constant
// const FPS = 1000 / 120;
const FPS = 1000 / 60;
export const MAX_ALLOWED_PAUSE = 1000;

// Variables to keep track of the game loop
let isRunning = false;
let lastFrameTime = 0;
let accumulatedTime = 0;

// Function to start the game loop
export function startGameLoop(simulation: Simulation) {
  if (isRunning) return;

  isRunning = true;
  lastFrameTime = Date.now();
  gameLoop(simulation);
}

// Function to stop the game loop
export function stopGameLoop() {
  isRunning = false;
}

// Game loop function
function gameLoop(simulation: Simulation) {
  if (!isRunning) return;

  const currentTime = Date.now();
  let deltaTime = (currentTime - lastFrameTime)

  // If the pause is too long, reset the accumulated time
  if (deltaTime > MAX_ALLOWED_PAUSE) {
    accumulatedTime = 0; // Reset accumulated time
    lastFrameTime = currentTime;
    deltaTime = 0;
  }

  // Update game logic here
  accumulatedTime += deltaTime;

  while (accumulatedTime >= FPS) {
    // Update game logic here
    accumulatedTime -= FPS;

    simulation.SimulationState.DeltaTime = FPS / 1000;

    for (const command of simulation.SimulationState.Commands) {
      command.Execute(simulation)
    }

    simulation.SimulationState.Commands = []

    Tick(simulation.SimulationState);

    simulation.ViewSync.Update(simulation);
  }

  simulation.ViewSync.Draw(simulation, accumulatedTime / FPS);

  // Render game graphics here
  lastFrameTime = currentTime;

  // Call the game loop again
  requestAnimationFrame(() => gameLoop(simulation));
}
