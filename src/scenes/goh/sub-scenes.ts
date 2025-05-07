import { Simulation } from "../../simulation";
import { defer } from "../../utils/defer";

export type Awaitable<T> = PromiseLike<T> | T;

export type SubSceneCleanup = (() => Awaitable<void>) | void

export type SubSceneContext = Promise<void> & {
  End: () => void;
  shown: Promise<void>;
}

export interface SubSceneModule {
  init?: () => Awaitable<SubSceneCleanup>;
  cleanup?: () => Awaitable<void>;
  show: (context: SubSceneContext) => Awaitable<SubSceneCleanup>;
}

export interface InitializeSubSceneResult {
  loaded: boolean;
  ready: Promise<void>;
  scene?: SubSceneModule;
  Show: (simulation: Simulation) => SubSceneContext;
  Cleanup: () => void;
}

export function initializeSubScene(loader: () => Awaitable<SubSceneModule>): InitializeSubSceneResult {
  let loaded = false;
  let scene: SubSceneModule | undefined;
  let sceneCleanup: SubSceneCleanup;

  let sceneReady = defer<void>();
  sceneReady.promise.then(() => {
    if (scene?.init) {
      const result = scene.init();
      if (result instanceof Promise) {
        result.then((_cleanup) => {
          sceneCleanup = _cleanup;
          ready.resolve();
        });
      } else {
        sceneCleanup = result as SubSceneCleanup;
        ready.resolve();
      }
    } else {
      ready.resolve();
    }
  });

  let ready = defer<void>()
  ready.promise.then(() => {
    loaded = true;
  });

  // Load the scene module dynamically.
  const result = loader();
  if (result instanceof Promise) {
    result.then((module) => {
      scene = module;
      sceneReady.resolve();
    });
  } else {
    scene = result as SubSceneModule;
    sceneReady.resolve();
  }


  return {
    loaded,
    ready: ready.promise,
    scene,
    Show(simulation: Simulation): SubSceneContext {
      let resolve!: () => void;
      let cleanup: SubSceneCleanup;
      let shown = defer<void>();

      const promise = new Promise<void>((_resolve) => {
        resolve = _resolve;
      });

      const context = Object.assign(promise, {
        End() {
          if (cleanup) {
            const result = cleanup();
            if (result instanceof Promise) {
              result.then(() => resolve());
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        },
        shown: shown.promise,
      }) as SubSceneContext;

      ready.promise.then(async () => {
        if (!scene) throw new Error("Scene failed to load!");

        cleanup = await scene.show(context);
        shown.resolve();
        simulation.Stop();
      });

      promise.finally(() => {
        simulation.Start();
      });

      return context;
    },
    // Cleanup will make the scene no longer useable.
    // Currently does not account for if the scene is currently active.
    // Which will likely cause the game to brick if called in that case. but oh well.
    Cleanup() {
      void sceneCleanup?.();
      void scene?.cleanup?.();
    }
  }
}
