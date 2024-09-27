import type { Simulation } from ".";
import { Tick } from "./systems";

// Define the FPS constant
const FPS = 1000 / 30;

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
  const deltaTime = (currentTime - lastFrameTime)
  
  // Update game logic here

  accumulatedTime += deltaTime;

  while (accumulatedTime >= FPS) {
    // Update game logic here
    accumulatedTime -= FPS;

    Tick(simulation.SimulationState);

    simulation.ViewSync.Update(simulation);
  }

  simulation.ViewSync.Draw(simulation, accumulatedTime / FPS);
  
  // Render game graphics here
  
  lastFrameTime = currentTime;
  
  // Call the game loop again
  requestAnimationFrame(() => gameLoop(simulation));
}
