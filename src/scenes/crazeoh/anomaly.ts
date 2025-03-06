import { NoiseMaterial } from "../../graphics/noise"
import type { Simulation } from "../../simulation"
import { EntId } from "../../simulation/EntityRegistry"
import { EntityView } from "../../simulation/EntityView"
import { View } from "../../simulation/View"
import { traverse } from "../../utils/traverse"
import * as state from "./state"
import * as THREE from 'three'
import type { loadAudio } from "../../graphics/loaders"
import { getAngle } from "../../utils/math"

const loaderPromise = import("../../graphics/loaders")

const monitorAudioPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/weba.ogg', {
    loop: true,
    positional: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const keyboardAudioPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/keyboard_typing.ogg', {
    loop: true,
    positional: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const clockAudioPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/clock.ogg', {
    loop: true,
    positional: true,
    volume: 0.1,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

interface Anomaly {
  Id: number
  Description?: string
  Enable(simulation: Simulation): THREE.Vector3
  Disable(simulation: Simulation): void
}

const FrenchFries: Anomaly = {
  Id: 1,

  Description: "FUCKASS BITCH ",

  Enable(simulation: Simulation) {
    const fries = simulation.ThreeScene.getObjectByName('fries')!.getObjectByProperty('type', 'Mesh') as THREE.Mesh
    fries.scale.set(0.5, 0.5, 0.5)

    return fries.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
  },
}

const SeveredHand: Anomaly = {
  Id: 2,

  Enable(simulation: Simulation) {
    const hand = simulation.ThreeScene.getObjectByName('hand')!

    hand.visible = true

    return hand.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const hand = simulation.ThreeScene.getObjectByName('hand')!

    hand.visible = false
  },
}

const FanFast: Anomaly = {
  Id: 3,

  Enable(simulation: Simulation) {
    const fanBlades = simulation.ThreeScene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh

    simulation.ViewSync.AddAuxiliaryView(new class Fan extends View {
      public Draw() {
        fanBlades.rotateZ(0.12)
      }
    })

    return fanBlades.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
  },
}

const ClockSix: Anomaly = {
  Id: 4,

  Enable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('6_0002') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('6_0003') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('6_0001') as THREE.Mesh

    clock1.visible = true
    clock2.visible = true
    clock3.visible = true

    return clock1.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('6_0002') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('6_0003') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('6_0001') as THREE.Mesh

    clock1.visible = false
    clock2.visible = false
    clock3.visible = false
  },
}

const Demon: Anomaly = {
  Id: 5,

  Enable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('demon') as THREE.Mesh

    demon.visible = true

    return demon.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('demon') as THREE.Mesh


    demon.visible = false
  },
}

// hour hand_0
// minute hand_0
// second hand_0

let clockView: View | null = null

const ClockSpinFast: Anomaly = {
  Id: 6,

  Enable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('hour_hand_0') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('minute_hand_0') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('second_hand_0') as THREE.Mesh

    if (clockView) {
      simulation.ViewSync.DestroyAuxiliaryView(simulation, clockView.Symbol)
    }

    clockView = new class Clock extends View {
      public Draw() {
        clock1.rotateZ(0.035)
        clock2.rotateZ(0.035 * 2)
        clock3.rotateZ(0.035 * 3)
      }
    }

    simulation.ViewSync.AddAuxiliaryView(clockView)

    return clock1.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('hour_hand_0') as THREE.Mesh;
    const clock2 = simulation.ThreeScene.getObjectByName('minute_hand_0') as THREE.Mesh;
    const clock3 = simulation.ThreeScene.getObjectByName('second_hand_0') as THREE.Mesh;

    clockAudioPromise.then((audio) => {
      const now = new Date();
      const millisecondsUntilNextSecond = 1000 - now.getMilliseconds();

      setTimeout(() => {
        clock1.add(audio.getPositionalAudio());
        audio.play();
      }, millisecondsUntilNextSecond);
    })

    if (clockView) {
      simulation.ViewSync.DestroyAuxiliaryView(simulation, clockView.Symbol)
    }

    clockView = new class ClockView extends View {
      public Draw() {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = (now.getMinutes() - 5 + 60) % 60;
        const seconds = (now.getSeconds() - 3 + 60) % 60;

        const targetHourRotation = -hours * (Math.PI / 6);
        const targetMinuteRotation = -minutes * (Math.PI / 30) + 1;
        const targetSecondRotation = -seconds * (Math.PI / 30) + 2;

        clock1.rotation.z = targetHourRotation
        clock2.rotation.z = targetMinuteRotation
        clock3.rotation.z = targetSecondRotation
      }
    }

    simulation.ViewSync.AddAuxiliaryView(clockView);
  },
}

const Monitors: Anomaly = {
  Id: 7,

  Enable(simulation: Simulation) {
    const small = simulation.ThreeScene.getObjectByName('smallmonitorscreen') as THREE.Mesh
    const big = simulation.ThreeScene.getObjectByName('bigmonitorscreen') as THREE.Mesh

    small.material = NoiseMaterial
    big.material = NoiseMaterial

    return simulation.ThreeScene.getObjectByName('Bigmonitorstand')!.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const small = simulation.ThreeScene.getObjectByName('smallmonitorscreen') as THREE.Mesh
    const big = simulation.ThreeScene.getObjectByName('bigmonitorscreen') as THREE.Mesh

    const material = new THREE.MeshBasicMaterial({ color: 0x000000 })

    small.material = material
    big.material = material
  },
}

const RedDemon: Anomaly = {
  Id: 8,

  Enable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('reddemon') as THREE.Mesh

    demon.visible = true

    simulation.ViewSync.AddAuxiliaryView(new class RedDemonView extends View {
      public Draw() {
        // always face player
        let playerEntId: EntId | null = null

        for (const entId of simulation.SimulationState.SensorTargetRepository.Entities) {
          playerEntId = entId
          break
        }

        if (!playerEntId) {
          return
        }

        // get position of player
        const player = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
        const playerPosition = new THREE.Vector3(player[0], player[1], player[2])

        // get position of demon
        const demonPosition = demon.getWorldPosition(new THREE.Vector3())

        // get rotation of demon to direction
        const rotationMatrix = new THREE.Matrix4().lookAt(demonPosition, playerPosition, new THREE.Vector3(0, 1, 0))
        demon.setRotationFromMatrix(rotationMatrix)

        demon.rotateX(-Math.PI / 2)
      }
    })


    return demon.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('reddemon') as THREE.Mesh

    demon.visible = false
  }
}

const Head: Anomaly = {
  Id: 9,

  Enable(simulation: Simulation) {
    const head = simulation.ThreeScene.getObjectByName('Object_2009') as THREE.Mesh

    head.visible = true

    const microwave = simulation.ThreeScene.getObjectByName('Microwave001') as THREE.Mesh

    return microwave.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const head = simulation.ThreeScene.getObjectByName('Object_2009') as THREE.Mesh

    head.visible = false
  }
}

const KitchenKnife: Anomaly = {
  Id: 10,

  Enable(simulation: Simulation) {
    const knife = simulation.ThreeScene.getObjectByName('Knife_Knife_0') as THREE.Mesh

    knife.visible = true

    return knife.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const knife = simulation.ThreeScene.getObjectByName('Knife_Knife_0') as THREE.Mesh

    knife.visible = false
  }
}

const Feet: Anomaly = {
  Id: 11,

  Enable(simulation: Simulation) {
    const feet = simulation.ThreeScene.getObjectByName('feet') as THREE.Mesh

    feet.visible = true

    return feet.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const feet = simulation.ThreeScene.getObjectByName('feet') as THREE.Mesh

    feet.visible = false
  }
}

const CoatHanger: Anomaly = {
  Id: 12,

  Enable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('coathanger') as THREE.Mesh
    const realCoatHanger = simulation.ThreeScene.getObjectByName('realcoathanger') as THREE.Mesh

    coatHanger.visible = true
    realCoatHanger.visible = false

    return coatHanger.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('coathanger') as THREE.Mesh
    const realCoatHanger = simulation.ThreeScene.getObjectByName('realcoathanger') as THREE.Mesh

    coatHanger.visible = false
    realCoatHanger.visible = true
  }
}
const BurgerLevitate: Anomaly = {
  Id: 13,

  Enable(simulation: Simulation) {
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh;
    const entId = simulation.EntityRegistry.Create();

    // Gather all child meshes of the burger.
    const meshes: THREE.Mesh[] = [];
    for (const child of traverse(burger)) {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    }

    // Sort meshes by world z position (largest z first).
    meshes.sort((a, b) => {
      const aPos = a.getWorldPosition(new THREE.Vector3());
      const bPos = b.getWorldPosition(new THREE.Vector3());
      return bPos.z - aPos.z;
    });

    // Save each mesh’s original global position.
    const originalPositionMap = new Map<number, THREE.Vector3>();
    for (const mesh of meshes) {
      originalPositionMap.set(mesh.id, mesh.getWorldPosition(new THREE.Vector3()));
    }

    // Pick a base position (using a known ingredient).
    const baseMesh = meshes.find(mesh => mesh.name === 'Patty2_PattyA_0');
    const basePosition = baseMesh
      ? baseMesh.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3();

    simulation.ViewSync.AddEntityView(
      new class BurgerView extends EntityView {
        constructor() {
          super(entId);
        }

        public Draw(simulation: Simulation, lerpFactor: number): void {
          // Get the player entity.
          let playerEntId: EntId | null = null;
          for (const id of simulation.SimulationState.SensorTargetRepository.Entities) {
            playerEntId = id;
            break;
          }
          if (!playerEntId) return;

          // Get the player's global position.
          const playerPosArray = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId);
          const playerPosition = new THREE.Vector3(playerPosArray[0], playerPosArray[1], playerPosArray[2]);

          const distance = playerPosition.distanceTo(basePosition);
          const enabled = distance < 2;

          // Define how much each ingredient should move upward.
          const verticalOffsetPerIngredient = 0.1; // adjust as needed

          for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const originalPos = originalPositionMap.get(mesh.id);
            if (!originalPos) continue;

            // Start with the original global position.
            const desiredGlobalPos = originalPos.clone();

            // Only modify the y component to move straight up (or down).
            if (enabled) {
              desiredGlobalPos.y += i * verticalOffsetPerIngredient;
            }
            // Else: if not enabled, desiredGlobalPos stays at the original position.

            // Convert desired global position into the mesh's local space.
            const desiredLocalPos = desiredGlobalPos.clone();
            if (mesh.parent) {
              mesh.parent.worldToLocal(desiredLocalPos);
            }

            // Smoothly interpolate the mesh's local position toward the desired position.
            mesh.position.lerp(desiredLocalPos, 0.1);
          }
        }
      }()
    );

    return burger.getWorldPosition(new THREE.Vector3());
  },

  Disable(simulation: Simulation) {
  }
}

const Keyboard: Anomaly = {
  Id: 14,

  Enable(simulation: Simulation) {
    const keyboard = simulation.ThreeScene.getObjectByName('keyboard') as THREE.Mesh

    const audioPromise = keyboardAudioPromise.then((audio) => {
      keyboard.add(audio.getPositionalAudio())
      audio.play()
      audio.setVolume(2.0)

      return audio
    })

    // add auxiliary view
    simulation.ViewSync.AddAuxiliaryView(new class KeyboardView extends View {
      public Draw() {
        let playerEntId: EntId | null = null

        for (const entId of simulation.SimulationState.SensorTargetRepository.Entities) {
          playerEntId = entId
          break
        }

        if (!playerEntId) {
          return
        }

        const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
        const keyboardPosition = keyboard.getWorldPosition(new THREE.Vector3())
        const camera = simulation.Camera

        const angle = getAngle(keyboardPosition, new THREE.Vector3(
          playerPosition[0],
          playerPosition[1],
          playerPosition[2]
        ), camera)

        audioPromise.then((audio) => {
          if (angle > 90) {
            audio.setVolume(2.0)
          } else {
            audio.setVolume(0.0)
          }
        })
      }
    })

    return keyboard.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    keyboardAudioPromise.then((audio) => {
      audio.stop()
      audio.setVolume(0.0)
    })
  }
}

const Pitchfork: Anomaly = {
  Id: 15,

  Enable(simulation: Simulation) {
    const pitchfork = simulation.ThreeScene.getObjectByName('pitchfork') as THREE.Mesh
    const leftfork = simulation.ThreeScene.getObjectByName('leftfork') as THREE.Mesh

    pitchfork.visible = true
    leftfork.visible = false


    return pitchfork.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const pitchfork = simulation.ThreeScene.getObjectByName('pitchfork') as THREE.Mesh
    const leftfork = simulation.ThreeScene.getObjectByName('leftfork') as THREE.Mesh

    pitchfork.visible = false
    leftfork.visible = true
  }
}

// pPlane1_Poster_01_Mat_0.001
const Poster = {
  Id: 16,

  Enable(simulation: Simulation) {
    const poster = simulation.ThreeScene.getObjectByName('pPlane1_Poster_01_Mat_0001') as THREE.Mesh

    poster.visible = true

    return poster.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const poster = simulation.ThreeScene.getObjectByName('pPlane1_Poster_01_Mat_0001') as THREE.Mesh

    poster.visible = false
  }
}

//lburger on, burger off
const LettuceBurger: Anomaly = {
  Id: 17,

  Enable(simulation: Simulation) {
    const lburger = simulation.ThreeScene.getObjectByName('lburger') as THREE.Mesh
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh

    lburger.visible = true
    burger.visible = false

    return lburger.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const lburger = simulation.ThreeScene.getObjectByName('lburger') as THREE.Mesh
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh

    lburger.visible = false
    burger.visible = true
  }
}

// reallabel off, fakelabel on
const RealLabel: Anomaly = {
  Id: 18,

  Enable(simulation: Simulation) {
    const reallabel = simulation.ThreeScene.getObjectByName('fakelabel') as THREE.Mesh
    const fakelabel = simulation.ThreeScene.getObjectByName('reallabel') as THREE.Mesh

    reallabel.visible = false
    fakelabel.visible = true

    return fakelabel.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const reallabel = simulation.ThreeScene.getObjectByName('fakelabel') as THREE.Mesh
    const fakelabel = simulation.ThreeScene.getObjectByName('reallabel') as THREE.Mesh

    reallabel.visible = true
    fakelabel.visible = false
  }
}

// glock
const Glock: Anomaly = {
  Id: 19,

  Enable(simulation: Simulation) {
    const glock = simulation.ThreeScene.getObjectByName('glock') as THREE.Mesh

    glock.visible = true

    return glock.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const glock = simulation.ThreeScene.getObjectByName('glock') as THREE.Mesh

    glock.visible = false
  }
}

// can_bepis_0.001
const CanBepis: Anomaly = {
  Id: 20,

  Enable(simulation: Simulation) {
    const can = simulation.ThreeScene.getObjectByName('longbepis') as THREE.Mesh

    can.visible = true

    return can.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const can = simulation.ThreeScene.getObjectByName('longbepis') as THREE.Mesh

    can.visible = false
  }
}

// bloodshake on, milkshake off

const Bloodshake: Anomaly = {
  Id: 21,

  Enable(simulation: Simulation) {
    const bloodshake = simulation.ThreeScene.getObjectByName('bloodshake') as THREE.Mesh
    const milkshake = simulation.ThreeScene.getObjectByName('milkshake') as THREE.Mesh

    bloodshake.visible = true
    milkshake.visible = false

    return bloodshake.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const bloodshake = simulation.ThreeScene.getObjectByName('bloodshake') as THREE.Mesh
    const milkshake = simulation.ThreeScene.getObjectByName('milkshake') as THREE.Mesh

    bloodshake.visible = false
    milkshake.visible = true
  }
}

const FakeBuffet: Anomaly = {
  Id: 22,

  Enable(simulation: Simulation) {
    const fakeb1 = simulation.ThreeScene.getObjectByName('fakeb1') as THREE.Mesh
    const fakeb2 = simulation.ThreeScene.getObjectByName('fakeb2') as THREE.Mesh
    const fakeb3 = simulation.ThreeScene.getObjectByName('fakeb3') as THREE.Mesh
    const fakeb4 = simulation.ThreeScene.getObjectByName('fakeb4') as THREE.Mesh
    const object = simulation.ThreeScene.getObjectByName('Object_53002') as THREE.Mesh

    fakeb1.visible = true
    fakeb2.visible = true
    fakeb3.visible = true
    fakeb4.visible = true
    object.visible = true

    return object.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const fakeb1 = simulation.ThreeScene.getObjectByName('fakeb1') as THREE.Mesh
    const fakeb2 = simulation.ThreeScene.getObjectByName('fakeb2') as THREE.Mesh
    const fakeb3 = simulation.ThreeScene.getObjectByName('fakeb3') as THREE.Mesh
    const fakeb4 = simulation.ThreeScene.getObjectByName('fakeb4') as THREE.Mesh
    const object = simulation.ThreeScene.getObjectByName('Object_53002') as THREE.Mesh

    fakeb1.visible = false
    fakeb2.visible = false
    fakeb3.visible = false
    fakeb4.visible = false
    object.visible = false
  }
}

// object called eyeball
const Eyeball: Anomaly = {
  Id: 23,

  Enable(simulation: Simulation) {
    const eyeball = simulation.ThreeScene.getObjectByName('eyeball') as THREE.Mesh

    eyeball.visible = true

    return eyeball.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const eyeball = simulation.ThreeScene.getObjectByName('eyeball') as THREE.Mesh

    eyeball.visible = false
  }
}

// now one called Body_Lores_GEO
const CaseohCorner: Anomaly = {
  Id: 24,

  Enable(simulation: Simulation) {
    const body = simulation.ThreeScene.getObjectByName('Body_Lores_GEO') as THREE.Mesh
    const eye = simulation.ThreeScene.getObjectByName('Circle001') as THREE.Mesh

    body.visible = true
    eye.visible = true

    return new THREE.Vector3(9, 4.5, -15)
  },

  Disable(simulation: Simulation) {
    const body = simulation.ThreeScene.getObjectByName('Body_Lores_GEO') as THREE.Mesh
    const eye = simulation.ThreeScene.getObjectByName('Circle001') as THREE.Mesh

    body.visible = false
    eye.visible = false
  }
}

// now, Plane001_01_-_Default_0001 and up_glass_0001
const CaseohExtraThicc: Anomaly = {
  Id: 25,

  Enable(simulation: Simulation) {
    const curtain = simulation.ThreeScene.getObjectByName('Plane001_01_-_Default_0001') as THREE.Mesh
    const glass = simulation.ThreeScene.getObjectByName('up_glass_0001') as THREE.Mesh
    const glass2 = simulation.ThreeScene.getObjectByName('dow_glass_0001') as THREE.Mesh
    const frame = simulation.ThreeScene.getObjectByName('up_f_0001') as THREE.Mesh
    const frame2 = simulation.ThreeScene.getObjectByName('dow_f_0001') as THREE.Mesh

    // spawn a point light at -40,17,0 XYZ
    const light = new THREE.PointLight(0xffffff, 10, 30, 0.1)
    light.position.set(-40, 17, 0)
    simulation.ThreeScene.add(light)

    curtain.visible = false
    glass.visible = false
    glass2.visible = false
    frame.visible = false
    frame2.visible = false

    return glass.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const curtain = simulation.ThreeScene.getObjectByName('Plane001_01_-_Default_0001') as THREE.Mesh
    const glass = simulation.ThreeScene.getObjectByName('up_glass_0001') as THREE.Mesh
    const glass2 = simulation.ThreeScene.getObjectByName('dow_glass_0001') as THREE.Mesh
    const frame = simulation.ThreeScene.getObjectByName('up_f_0001') as THREE.Mesh
    const frame2 = simulation.ThreeScene.getObjectByName('dow_f_0001') as THREE.Mesh

    curtain.visible = true
    glass.visible = true
    glass2.visible = true
    frame.visible = true
    frame2.visible = true
  }
}

const CaseohSlide: Anomaly = {
  Id: 26,

  Enable(simulation: Simulation) {
    const body = simulation.ThreeScene.getObjectByName('Body_Lores_GEO001') as THREE.Mesh;
    const eye = simulation.ThreeScene.getObjectByName('Circle002') as THREE.Mesh;

    if (!body || !eye) {
      console.error("Required objects not found in the scene.");
      throw new Error("Required objects not found in the scene.");
    }

    // Make sure the objects are visible.
    body.visible = true;
    eye.visible = true;

    const rootBone = body.parent!.parent!.getObjectByName('root_1') as THREE.Bone;

    const initialRootBoneX = rootBone.position.x;

    class CaseohSlideView extends View {
      public Draw() {
        // Get the camera's world position.
        const playerPos = simulation.Camera.getWorldPosition(new THREE.Vector3());
        // If your scene is set up such that the camera's z is negative, invert it to get a positive value.
        const playerZ = -playerPos.z;

        // Define the minimum and maximum z values for the effect.
        const MIN = 1;
        const MAX = 9;

        // Normalize player's z between MIN and MAX.
        let normalized = (playerZ - MIN) / (MAX - MIN);
        normalized = Math.min(Math.max(normalized, 0), 1);
        // Invert to get deltaX: when playerZ == MIN, deltaX is 1; when playerZ == MAX, deltaX is 0.
        const deltaX = 1.0 - normalized;

        // Update the x positions based on the delta.
        rootBone.position.x = initialRootBoneX + deltaX * 100;
      }
    }

    simulation.ViewSync.AddAuxiliaryView(new CaseohSlideView());

    return new THREE.Vector3(2, 2, -5);
  },

  Disable(simulation: Simulation) {
    const body = simulation.ThreeScene.getObjectByName('Body_Lores_GEO001') as THREE.Mesh;
    const eye = simulation.ThreeScene.getObjectByName('Circle002') as THREE.Mesh;

    if (body) body.visible = false;
    if (eye) eye.visible = false;
  }
}

const ShadowMan1: Anomaly = {
  Id: 27,

  Enable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = true

    const position = mesh.getWorldPosition(new THREE.Vector3())
    position.y += 1

    return position
  },

  Disable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = false
  }
}

const ShadowMan2: Anomaly = {
  Id: 28,

  Enable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman2') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = true

    const position = mesh.getWorldPosition(new THREE.Vector3())
    position.y += 1

    return position
  },

  Disable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman2') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = false
  }
}
const ShadowMan3: Anomaly = {
  Id: 29,

  Enable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman3') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = true

    const position = mesh.getWorldPosition(new THREE.Vector3())
    position.y += 1

    return position
  },

  Disable(simulation: Simulation) {
    const shadowMan = simulation.ThreeScene.getObjectByName('shadowman3') as THREE.Object3D
    const mesh = shadowMan.getObjectByProperty('type', 'Mesh') as THREE.Mesh

    mesh.visible = false
  }
}

const WaterBottleEggplant: Anomaly = {
  Id: 29,

  Enable(simulation: Simulation) {
    const waterBottle = simulation.ThreeScene.getObjectByName('waterbottle') as THREE.Mesh
    const eggplant = simulation.ThreeScene.getObjectByName('eggplant') as THREE.Mesh

    waterBottle.visible = false
    eggplant.visible = true

    return eggplant.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const waterBottle = simulation.ThreeScene.getObjectByName('waterbottle') as THREE.Mesh
    const eggplant = simulation.ThreeScene.getObjectByName('eggplant') as THREE.Mesh

    waterBottle.visible = true
    eggplant.visible = false
  }
}

const AnomalyPainting: Anomaly = {
  Id: 30,

  Enable(simulation: Simulation) {
    const painting = simulation.ThreeScene.getObjectByName('painting') as THREE.Mesh
    const anomalypainting = simulation.ThreeScene.getObjectByName('anomalypainting') as THREE.Mesh

    painting.visible = false
    anomalypainting.visible = true

    return anomalypainting.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const painting = simulation.ThreeScene.getObjectByName('painting') as THREE.Mesh
    const anomalypainting = simulation.ThreeScene.getObjectByName('anomalypainting') as THREE.Mesh

    painting.visible = true
    anomalypainting.visible = false
  }
}

export const DEFAULT_ANOMALIES: Array<Anomaly> = [
  FrenchFries,
  Keyboard,
  ClockSpinFast,
  Monitors,
  CaseohSlide,
  SeveredHand,
  ClockSix,
  Demon,
  // RedDemon,
  Head,
  KitchenKnife,
  Feet,
  CoatHanger,
  Eyeball,
  BurgerLevitate,
  Pitchfork,
  Poster,
  RealLabel,
  Glock,
  CanBepis,
  LettuceBurger,
  FakeBuffet,
  CaseohCorner,
  CaseohExtraThicc,
  ShadowMan1,
  ShadowMan2,
  ShadowMan3,
  WaterBottleEggplant,
  AnomalyPainting,
]

export const getHighestAnomalyId = () => {
  let highestId = 0

  for (const anomaly of DEFAULT_ANOMALIES) {
    if (anomaly.Id > highestId) {
      highestId = anomaly.Id
    }
  }

  return highestId
}

const anomalies: typeof DEFAULT_ANOMALIES = []

export let currentAnomalyIndex = 0
export let currentAnomalyId = 0

export const disableAllAnomalies = (simulation: Simulation) => {
  for (const anomaly of DEFAULT_ANOMALIES) {
    anomaly?.Disable(simulation)
  }

  Bloodshake.Disable(simulation)
  FanFast.Disable(simulation)
  RedDemon.Disable(simulation)
}

export const pickRandomAnomaly = (simulation: Simulation): void => {
  disableAllAnomalies(simulation)

  if (anomalies.length === 0) {
    anomalies.push(...DEFAULT_ANOMALIES)
  }

  if (!state.isTutorial && Math.random() < 0.2) {
    state.setAnomaly(false)

    // console.log('No anomaly this time')

    return
  }

  const randomIndex = state.isTutorial ? 0 : Math.floor(Math.random() * anomalies.length)

  currentAnomalyIndex = randomIndex

  const anomaly = anomalies[randomIndex]

  currentAnomalyId = anomaly.Id

  state.setAnomaly(true)
  state.setFoundAnomaly(false)

  const position = anomaly.Enable(simulation)

  state.setAnomalyPosition(position)

  // console.log('Anomaly:', anomaly.Id)
}

export const removeCurrentAnomaly = () => {
  anomalies.splice(currentAnomalyIndex, 1)
}
