import { Simulation } from "../../simulation";
import { defer } from "../../utils/defer";

export type Awaitable<T> = PromiseLike<T> | T;

export type SubSceneContext = Promise<void> & {
  End: () => void;
}

export interface SubSceneModule {
  init?: () => Awaitable<void>;
  show: (context: SubSceneContext) => Awaitable<() => Awaitable<void>>;
}

export interface InitializeSubSceneResult {
  loaded: boolean;
  scene?: SubSceneModule;
  Show: (simulation: Simulation) => SubSceneContext;
}

export function initializeSubScene(loader: () => Awaitable<SubSceneModule>): InitializeSubSceneResult {
  let loaded = false;
  let scene: SubSceneModule | undefined;

  let sceneReady = defer<void>();
  sceneReady.promise.then(() => {
    if (scene?.init) {
      const result = scene.init();
      if (result instanceof Promise) {
        result.then(() => {
          ready.resolve();
        });
      } else {
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
    scene,
    Show(simulation: Simulation): SubSceneContext {
      let resolve!: () => void;
      let cleanup: () => Awaitable<void> | undefined;

      const promise = new Promise<void>((_resolve) => {
        resolve = _resolve;
      });

      const context = Object.assign(promise, {
        End() {
          if (!cleanup) {
            throw new Error("You attempted to end a scene that never fully started!");
          }

          const result = cleanup();
          if (result instanceof Promise) {
            result.then(() => resolve());
          } else {
            resolve();
          }
        }
      }) as SubSceneContext;

      ready.promise.then(async () => {
        if (!scene) throw new Error("Scene failed to load!");

        simulation.Stop();
        cleanup = await scene.show(context);
      });

      promise.finally(() => {
        simulation.Start();
      });

      return context;
    }
  }
}
