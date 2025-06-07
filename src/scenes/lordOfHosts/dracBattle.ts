import * as THREE from "three";
import { renderer } from "../../components/Viewport";
import { Simulation } from "../../simulation";
import { View } from "../../simulation/View";
import { loadEquirectangularAsEnvMap, loadGltf } from "../../graphics/loaders";
import * as shaders from "../../graphics/shaders";
import { processAttributes } from "../../utils/processAttributes";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { playerInput } from "../../input/player";
import { ToneMappingShader } from "../../graphics/toneMappingShader";
import { SobelOperatorShader } from "../../graphics/sobelOberatorShader";
import skyMirrorWebp from "../../assets/3d/env/sky_mirror.webp";
import stairsGlb from "../../assets/3d/scenes/stairs/stairs.glb";
import dmtPng from "../../assets/3d/env/dmt.png";
import acid1Webp from "../../assets/3d/throne/ACID1.webp";
import acid2Webp from "../../assets/3d/throne/ACID2.webp";
import acid3Webp from "../../assets/3d/throne/ACID3.webp";
import { getRGBBits } from "../../graphics/quantize";
import { createParallaxWindowMaterial } from "../../graphics/parallaxWindow";
import { NoiseMaterial } from "../../graphics/noise";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export let currentCrtPass: ShaderPass | null = null;

const toggleBattleTrack = (bool: boolean) => {
  document
    .querySelector("#spooky #battle-track")
    ?.setAttribute("is-hidden", bool ? "false" : "true");
};

import * as midi from "../../audio/midi";
import fastbeatWav from "../../assets/audio/music/dracbattle.wav";
import fastbeatMidURL from "../../assets/audio/music/dracbattle.mid";
import { SubSceneContext } from "../goh/sub-scenes";
import { createDrac } from "../../entities/lordOfHosts/drac";

async function doBeatMap(onNoteTime: (note: midi.Note) => void = () => {}) {
  const noteElementMap = new Map<symbol, HTMLElement>();
  const noteMap = new Map<symbol, midi.Note>();

  const dpad = document.getElementById("dpad");
  if (!dpad) {
    throw new Error("Dpad not found");
  }

  // Ideally in the future this should be in the in the simulation loop or pausable.
  // Also this should probably be inspected. The hitboxes feel super off.
  for await (const notes of midi.playNotesOnce(
    fastbeatWav,
    fastbeatMidURL,
    2000,
    999,
    2000,
    300,
    200,
    onNoteTime
  )) {
    for (const note of notes) {
      noteMap.set(note.note, note);

      if (!noteElementMap.has(note.note)) {
        const noteElement = dpad.cloneNode(true) as HTMLElement;
        noteElement.style.right = "0";
        noteElement.style.left = "auto";
        noteElement.style.opacity = "1";
        noteElement.classList.add("note");
        noteElement.id = "";
        dpad.parentElement!.appendChild(noteElement);
        noteElementMap.set(note.note, noteElement);

        const up = noteElement.querySelector(".up") as SVGPathElement;
        const down = noteElement.querySelector(".down") as SVGPathElement;
        const left = noteElement.querySelector(".left") as SVGPathElement;
        const right = noteElement.querySelector(".right") as SVGPathElement;
        const middle = noteElement.querySelector(".middle") as SVGPathElement;

        const buttonTypeMap = {
          [midi.ButtonType.Up]: up,
          [midi.ButtonType.Down]: down,
          [midi.ButtonType.Left]: left,
          [midi.ButtonType.Right]: right,
          [midi.ButtonType.Middle]: middle,
        };

        const button = buttonTypeMap[note.button];

        button.style.fill = "white";
        button.style.fillOpacity = "1";
      }

      const noteElement = noteElementMap.get(note.note)!;

      noteElement.style.left = `${note.percentage}%`;
    }

    // Cleanup
    for (const [note, noteElement] of noteElementMap) {
      if (notes.every((n) => n.note !== note)) {
        noteElementMap.delete(note);

        if (!noteMap.has(note)) {
          continue;
        }

        noteElement.style.left = "0";

        if (noteMap.get(note)!.hit) {
          noteElement.setAttribute("hit", "true");
        } else {
          noteElement.setAttribute("hit", "false");
        }

        setTimeout(() => {
          noteElement.remove();
        }, 500);
      }
    }
  }
}

let camera: THREE.PerspectiveCamera;
let simulation: Simulation;
let scene: THREE.Scene;
let effectComposer: EffectComposer;
let crtPass: ShaderPass;
let sobelPass: ShaderPass;

export let triplanarMaterial: THREE.ShaderMaterial;
let drac: Awaited<ReturnType<typeof createDrac>> | null = null;

export async function init() {
  console.log("Initializing the battle scene!");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  simulation = new Simulation(camera, scene);

  // --- Triplanar Sphere Setup ---

  const textureLoader = new THREE.TextureLoader();

  // Load throne acid textures (prefer webp)
  const [texAcid1, texAcid2, texAcid3] = await Promise.all([
    textureLoader.loadAsync(acid1Webp),
    textureLoader.loadAsync(acid2Webp),
    textureLoader.loadAsync(acid3Webp),
  ]);

  for (const tex of [texAcid1, texAcid2, texAcid3]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
  }

  triplanarMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tAcid1: { value: texAcid1 },
      tAcid2: { value: texAcid2 },
      tAcid3: { value: texAcid3 },
      scale: { value: 1.5 },
      time: { value: 0 },
      resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      poseHue: { value: 0.0 },
    },
    vertexShader: /*glsl*/ `
      varying vec3 vPosition;
      void main() {
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/ `
      uniform float scale;
      uniform float time;
      uniform float poseHue;
      uniform vec2 resolution;
      uniform sampler2D tAcid1;
      uniform sampler2D tAcid2;
      uniform sampler2D tAcid3;
      varying vec3 vPosition;

      // Simple 2D value noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      // Fewer octaves for performance
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 3; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 screenUv = gl_FragCoord.xy / resolution.xy;
        float aspect = resolution.x / resolution.y;
        float t = time * 0.12;

        // --- Simplified and optimized cloud/gas and blending ---
        // Standard UVs, no poseSeed
        vec2 uv = (gl_FragCoord.xy / resolution * 6.0) + vPosition.xy * 0.08 + time * 0.08;
        uv.y /= aspect;
        float cloud = fbm(uv * 2.0 + t * 0.5);

        // Use a single set of UVs for all textures, with slight offsets
        vec2 acid1Uv = uv * 0.32 + time * 0.03;
        vec2 acid2Uv = uv * 0.73 - time * 0.02 + 0.1;
        vec2 acid3Uv = uv * 0.24 + time * 0.01 - 0.2;

        vec3 acid1Col = texture2D(tAcid1, acid1Uv).rgb;
        vec3 acid2Col = texture2D(tAcid2, acid2Uv).rgb;
        vec3 acid3Col = texture2D(tAcid3, acid3Uv).rgb;

        // Blend textures simply
        vec3 texBlend = acid1Col * (cloud * 0.7) + acid2Col * (cloud * 0.5) + acid3Col * (cloud * 0.4);
        texBlend /= (cloud * 0.7 + cloud * 0.5 + cloud * 0.4 + 0.0001);

        // --- Rotate hue in HSV, do not colorize ---
        // Convert texBlend to HSV
        float cmax = max(texBlend.r, max(texBlend.g, texBlend.b));
        float cmin = min(texBlend.r, min(texBlend.g, texBlend.b));
        float delta = cmax - cmin;
        float h = 0.0;
        if (delta > 0.00001) {
          if (cmax == texBlend.r) {
            h = mod((texBlend.g - texBlend.b) / delta, 6.0);
          } else if (cmax == texBlend.g) {
            h = ((texBlend.b - texBlend.r) / delta) + 2.0;
          } else {
            h = ((texBlend.r - texBlend.g) / delta) + 4.0;
          }
          h /= 6.0;
          if (h < 0.0) h += 1.0;
        }
        float s = (cmax <= 0.0) ? 0.0 : (delta / cmax);
        float v = cmax;
        // Rotate hue, add poseHue for drastic change
        h = mod(h + time * 0.03 + poseHue, 1.0);
        // Convert back to RGB
        float c = v * s;
        float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
        float m = v - c;
        vec3 rgb;
        if (0.0 <= h && h < 1.0/6.0)      rgb = vec3(c, x, 0.0);
        else if (1.0/6.0 <= h && h < 2.0/6.0) rgb = vec3(x, c, 0.0);
        else if (2.0/6.0 <= h && h < 3.0/6.0) rgb = vec3(0.0, c, x);
        else if (3.0/6.0 <= h && h < 4.0/6.0) rgb = vec3(0.0, x, c);
        else if (4.0/6.0 <= h && h < 5.0/6.0) rgb = vec3(x, 0.0, c);
        else                                rgb = vec3(c, 0.0, x);
        rgb += m;

        // Gamma correction only
        rgb = pow(clamp(rgb, 0.0, 1.0), vec3(2.2));
        gl_FragColor = vec4(rgb, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false,
  });

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 64),
    triplanarMaterial
  );
  sphere.position.set(0, 2, -6);
  scene.add(sphere);

  // Animate shader uniforms
  function updateTriplanarUniforms() {
    triplanarMaterial.uniforms.time.value = performance.now() * 0.001;
    triplanarMaterial.uniforms.resolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
    requestAnimationFrame(updateTriplanarUniforms);
  }
  requestAnimationFrame(updateTriplanarUniforms);

  window.addEventListener("resize", () => {
    triplanarMaterial.uniforms.resolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  });

  effectComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  ToneMappingShader.uniforms.contrast = { value: 1.07 };
  ToneMappingShader.uniforms.saturation = { value: 0.95 };
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 };
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,
    0.5,
    0.6
  );
  effectComposer.addPass(bloomPass);

  sobelPass = new ShaderPass(SobelOperatorShader);
  effectComposer.addPass(sobelPass);

  crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.scanlineIntensity.value = 0.5;
  effectComposer.addPass(crtPass);
  currentCrtPass = crtPass;

  const outputPass = new OutputPass();
  effectComposer.addPass(outputPass);

  const sceneEntId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const [_drac] = await Promise.all([createDrac(simulation)]);

  drac = _drac;

  drac.meshPromise.then((mesh) => {
    mesh.rotation.set(Math.PI / -2 + 0.5, 0, 0.5);
    drac!.meshOffset[2] = -2;
    drac!.meshOffset[1] = 0.3;
  });

  simulation.ViewSync.AddAuxiliaryView(
    new (class ThreeJSRenderer extends View {
      public Draw(): void {
        scene.environmentRotation.y += 0.0002;
        scene.backgroundRotation.y += 0.0002;

        crtPass.uniforms.time.value = (Date.now() / 1000.0) % 1.0;

        effectComposer.render();
        playerInput.update();
      }
    })()
  );

  return () => {
    console.log("Cleaning up battle scene!");
    simulation.ViewSync.Cleanup(simulation);
  };
}

// We don't want to load assets in the show function or if we do we want to load them non-blocking then inject them into the scene later
// If we wait for asset initialization in here then there will be significant lag on scene switch. We want to load all assets in the above init function.
export async function show(context: SubSceneContext) {
  console.log("Showing battle scene!");

  toggleBattleTrack(true);

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(
      renderer.domElement.width,
      renderer.domElement.height
    );
    effectComposer.setSize(
      renderer.domElement.width,
      renderer.domElement.height
    );

    sobelPass.uniforms.resolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    // fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  };

  window.addEventListener("resize", resize, false);

  resize();

  simulation.Start();

  // Local poseHue for shader, self-contained
  let poseHue = 0.0;
  if (triplanarMaterial && triplanarMaterial.uniforms.poseHue) {
    triplanarMaterial.uniforms.poseHue.value = poseHue;
  }

  doBeatMap(() => {
    drac?.StrikePose();
    // Drastically change the shader hue on StrikePose
    poseHue = Math.random();
    if (triplanarMaterial && triplanarMaterial.uniforms.poseHue) {
      triplanarMaterial.uniforms.poseHue.value = poseHue;
    }
  }).then(() => {
    console.log("Beatmap done!");
    context.End();
  });

  return () => {
    window.removeEventListener("resize", resize, false);
    simulation.Stop();
    toggleBattleTrack(false);
  };
}
