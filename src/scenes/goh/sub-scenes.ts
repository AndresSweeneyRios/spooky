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

export const afterAwaitable = <T>(value: Awaitable<T>, callback: ((value: T) => void)) => {
  if (value instanceof Promise) {
    value.then(callback);
  } else {
    callback(value as T);
  }
}

export function initializeSubScene(loader: () => Awaitable<SubSceneModule>): InitializeSubSceneResult {
  let loaded = false;
  let scene: SubSceneModule | undefined;
  let sceneCleanup: SubSceneCleanup;

  // Once the scene is ready and init has been called we will set loaded to true.
  let ready = defer<void>()
  ready.promise.then(() => {
    loaded = true;
  });

  // Once the module is loaded we will call init if it exists.
  let moduleLoaded = defer<void>();
  moduleLoaded.promise.then(() => {
    afterAwaitable(scene!.init?.(), (result) => {
      sceneCleanup = result;
      ready.resolve();
    });
  });

  // Load the scene module dynamically.
  afterAwaitable(loader(), (module) => {
    scene = module;
    moduleLoaded.resolve();
  })


  return {
    loaded,
    ready: ready.promise,
    scene,
    Show(simulation: Simulation): SubSceneContext {
      const lifecycle = defer<void>();
      const shown = defer<void>();
      let cleanup: SubSceneCleanup;

      // Create a context appending some helpful methods to the promise.
      // lifecycle will resolve once the scene is done. Shown will resolve once the scene is shown.
      const context = Object.assign(lifecycle.promise, {
        End() {
          afterAwaitable(cleanup?.(), () => {
            lifecycle.resolve();
          });
        },
        shown: shown.promise,
      }) as SubSceneContext;

      // Once our scene is ready we can call show.
      ready.promise.then(async () => {
        // Show can return a lifecycle cleanup function.
        cleanup = await scene!.show(context);
        shown.resolve();

        // We want to pause the passed simulation so this scene can take over.
        simulation.Stop();
      });

      // Once this scene ends we want to resume the original simulation.
      lifecycle.promise.finally(() => {
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
