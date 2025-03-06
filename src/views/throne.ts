import { Simulation } from "../simulation";
import * as THREE from "three";
import { loadGltf, loadTexture, loadTextureAsync } from "../graphics/loaders";
import * as shaders from "../graphics/shaders";
import { traverse } from "../utils/traverse";
import { processAttributes } from "../utils/processAttributes";
import { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import { vec3 } from "gl-matrix";
import { renderer } from "../components/Viewport";
import { currentCrtPass } from "../scenes/gatesOfHeaven";

const gltfPromise = loadGltf("./3d/throne.glb")

// const battlesphereMaterial = new THREE.ShaderMaterial({
//   uniforms: {
//     time: { value: 0 },
//     resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
//     acid1: { value: new THREE.Texture() },
//     acid2: { value: new THREE.Texture() },
//     acid3: { value: new THREE.Texture() }
//   },
//   vertexShader: /*glsl*/`
//     varying vec2 vUv;
//     varying vec3 vNormal;
//     varying vec3 vPosition;

//     void main() {
//       vUv = uv;
//       vNormal = normal;
//       vPosition = position;

//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   fragmentShader: /*glsl*/`
// uniform float time;
// uniform vec2 resolution;
// uniform sampler2D acid1;
// uniform sampler2D acid2;
// uniform sampler2D acid3;

// varying vec2 vUv;

// const float PI = 3.14159265359;
// const float LOWER_THRESHOLD = 0.4;
// const float UPPER_THRESHOLD = 0.9;
// const float OFFSET_SCALE = 0.03;

// // Crude hue shift approximation for low-res dirty graphics.
// // Cycles through the channels using a smooth sine-based offset.
// vec3 hueShiftApprox(vec3 color, float angle) {
//   float offset = 0.5 + 0.5 * sin(angle);
//   return vec3(
//     mix(color.r, color.g, offset),
//     mix(color.g, color.b, offset),
//     mix(color.b, color.r, offset)
//   );
// }

// void main() {
//   // Flip vUv for acid1 sampling.
//   vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

//   // Precompute aspect and screen-space UVs.
//   float aspect = resolution.x / resolution.y;
//   vec2 uvScreen = gl_FragCoord.xy / resolution.xy;
//   vec2 uvScreen2 = uvScreen;

//   // Precompute time multipliers.
//   float t005 = time * 0.005;
//   float t02  = time * 0.02;
//   float sin018 = sin(time * 0.018);
//   float cos02  = cos(time * 0.02);

//   // Modify uvScreen for acid2 sampling.
//   uvScreen.x = (uvScreen.x - t005) * aspect;
//   uvScreen.y += sin018;
//   uvScreen.x -= t02;

//   // Modify uvScreen2 for acid3 sampling.
//   uvScreen2.x = (uvScreen2.x + t005) * aspect;
//   uvScreen2.y -= cos02;
//   uvScreen2.x += t02;

//   // Sample acid1 and invert its color.
//   vec4 acid1Color = texture2D(acid1, uvScreen);
//   // acid1Color.rgb = 1.0 - acid1Color.rgb;

//   // Sample acid2 for the UV offset and apply a slower hue shift.
//   float hueAngle2 = time * (PI / 18.0);
//   vec4 acid2Sample = texture2D(acid2, uvScreen);
//   // acid2Sample.rgb = hueShiftApprox(acid2Sample.rgb, hueAngle2);

//   // Use acid2's red/green channels as an offset.
//   vec2 uvOffset = (acid2Sample.rg - 0.5) * OFFSET_SCALE;

//   // Offset acid3's UV with the computed offset.
//   vec2 acid3UV = uvScreen2 + uvOffset;

//   // Sample acid3 and apply a faster hue shift.
//   float hueAngle3 = time * (PI / 9.0);
//   vec4 acid3Color = texture2D(acid3, acid3UV);
//   // acid3Color.rgb = hueShiftApprox(acid3Color.rgb, hueAngle3);

//   // Composite: difference blend between acid1 and acid3.
//   vec4 compColor = acid3Color;

//   // Compute luminance.
//   float lum = dot(compColor.rgb, vec3(0.299, 0.587, 0.114));
//   if (lum < LOWER_THRESHOLD || lum > UPPER_THRESHOLD) {
//     discard;
//   }

//   // Add a subtle pulsating effect.
//   float pulse = 0.8 + 0.2 * sin(time * 2.0);

//   // Final color composition.
//   gl_FragColor = vec4(lum / compColor.r * pulse, lum * pulse * 0.1, lum * pulse * 0.1, 1.0);
// }

//   `
// })

const battlesphereMaterial = new THREE.MeshBasicMaterial()

battlesphereMaterial.side = THREE.DoubleSide

const loadAcidTexture = async (uniformName: string, path: string) => {
  const texture = await loadTextureAsync(path)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 16
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true

  // battlesphereMaterial.uniforms[uniformName].value = texture
  battlesphereMaterial.needsUpdate = true
}

// loadAcidTexture("acid1", "./3d/throne/ACID1.webp")
// loadAcidTexture("acid2", "./3d/throne/ACID2.webp")
// loadAcidTexture("acid3", "./3d/throne/ACID3.webp")

export class ThroneView extends EntityView {
  throne: THREE.Object3D | null = null
  scene: THREE.Scene
  circles: THREE.Mesh[] | null = null
  eye: THREE.Mesh | null = null
  throneYPosition = 0
  battleSphere: THREE.Mesh | null = null

  async init(simulation: Simulation, entId: EntId, startPosition: vec3) {
    const gltf = await gltfPromise

    this.throne = gltf.scene.clone()

    shaders.applyInjectedMaterials(this.throne)

    for (const child of traverse(this.throne)) {
      if (!this.throne) {
        continue
      }

      if (child.name === "BATTLESPHERE" && child instanceof THREE.Mesh) {
        child.material = battlesphereMaterial
        this.battleSphere = child
        child.visible = false
      }

      if (child.name === "eye") {
        const eye = child as THREE.Mesh

        this.eye = eye

        shaders.waitForShader(eye).then((shader) => {
          shader.uniforms.throneEye = { value: true }

          shaders.recursivelyManipulateMaterial(eye, (material) => {
            material.needsUpdate = true
          })
        })
      }

      if (child.name === "circles") {
        this.circles = child.children as THREE.Mesh[]

        for (let i = 0; i < 4; i++) {
          this.circles[i].rotation.x = Math.PI / 2

          this.circles[i].position.set(0, 0, 0)
        }
      }
    }

    this.throne.position.set(startPosition[0], startPosition[1] + 30, startPosition[2])

    processAttributes(this.throne, simulation, entId, true)

    this.scene.add(this.throne);
  }

  constructor(simulation: Simulation, entId: EntId, startPosition: vec3) {
    super(entId)
    this.scene = simulation.ThreeScene
    this.init(simulation, entId, startPosition).catch(console.error)

    currentCrtPass!.uniforms.rgbOffset.value = new THREE.Vector2(0.000, 0.000)
    currentCrtPass!.uniforms.noiseIntensity = { value: 0.6 }
    // currentCrtPass!.uniforms.scanlineIntensity = { value: 0.8 }
    // currentCrtPass!.uniforms.curvature.value = 0.2
    // currentCrtPass!.uniforms.edgeScale.value = 0.9
  }

  // Rotate it slowly
  public Draw(simulation: Simulation, lerpFactor: number): void {
    if (!this.circles) return
    if (!this.eye) return
    if (!this.battleSphere) return

    for (let i = 0; i < this.circles.length; i++) {
      const circle = this.circles[i]

      // use i to generate a unique rotation for each circle
      // this is a biblically accurate Throne, with 4 circles spinning in opposite directions
      circle.rotation.y += (0.002 * (i + 1)) * (i % 2 === 0 ? 1 : -1)
    }

    this.throneYPosition += simulation.SimulationState.DeltaTime * 2

    this.circles[0].rotation.x += 0.007
    this.circles[1].rotation.z -= 0.001
    this.circles[2].rotation.x -= 0.003
    this.circles[3].rotation.z += 0.002

    this.eye.rotation.y += 0.01
    this.eye.position.y = Math.sin(this.throneYPosition) * 2

    // battlesphereMaterial.uniforms.time.value = simulation.ViewSync.TimeMS / 1000

    this.battleSphere.rotateY(+0.0003)
    this.battleSphere.rotateZ(+0.0003)
  }

  public Resize() {
    // battlesphereMaterial.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
  }

  public Cleanup(simulation: Simulation): void {
    if (this.throne) {
      this.scene.remove(this.throne)
    }
  }
}
