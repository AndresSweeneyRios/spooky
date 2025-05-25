import * as THREE from 'three'
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadEquirectangularAsEnvMap, loadGltf } from '../../graphics/loaders';
import * as shaders from '../../graphics/shaders';
import { processAttributes } from '../../utils/processAttributes';
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { playerInput } from "../../input/player";
import { ToneMappingShader } from "../../graphics/toneMappingShader";
import { SobelOperatorShader } from "../../graphics/sobelOberatorShader";
import skyMirrorWebp from '../../assets/3d/env/sky_mirror.webp';
import stairsGlb from '../../assets/3d/scenes/stairs/stairs.glb';
import dmtPng from '../../assets/3d/env/dmt.png';
import wornShutterPng from '../../assets/3d/textures/worn_shutter_diff_1k.png';
import wiringsPng from '../../assets/3d/textures/wirings.png';
import squogPng from '../../assets/3d/textures/squog.png';
import trashJpg from '../../assets/3d/textures/ultra-realistic-textures-trash-set-pbr-3d-model-max-obj-fbx-blend-tbscene-2617076592.jpg';
import { getRGBBits } from "../../graphics/quantize";
import { createParallaxWindowMaterial } from "../../graphics/parallaxWindow";
import { NoiseMaterial } from '../../graphics/noise';
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export let currentCrtPass: ShaderPass | null = null

const toggleBattleTrack = (bool: boolean) => {
  document.querySelector("#spooky #battle-track")?.setAttribute("is-hidden", bool ? "false" : "true")
}

import * as midi from '../../audio/midi';
import fastbeatWav from '../../assets/audio/music/dracbattle.wav';
import fastbeatMidURL from '../../assets/audio/music/dracbattle.mid';
import { SubSceneContext } from "../goh/sub-scenes";
import { createDrac } from "../../entities/lordOfHosts/drac";

async function doBeatMap(onNoteTime: (note: midi.Note) => void = () => { }) {
  const noteElementMap = new Map<symbol, HTMLElement>();
  const noteMap = new Map<symbol, midi.Note>();

  const dpad = document.getElementById("dpad");
  if (!dpad) {
    throw new Error("Dpad not found");
  }

  // Ideally in the future this should be in the in the simulation loop or pausable.
  // Also this should probably be inspected. The hitboxes feel super off.
  for await (const notes of midi.playNotesOnce(fastbeatWav, fastbeatMidURL, 2000, 999, 2000, 300, 200, onNoteTime)) {
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

        button.style.fill = "white"
        button.style.fillOpacity = "1"
      }

      const noteElement = noteElementMap.get(note.note)!;

      noteElement.style.left = `${note.percentage}%`;
    }

    // Cleanup
    for (const [note, noteElement] of noteElementMap) {
      if (notes.every(n => n.note !== note)) {
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

let drac: Awaited<ReturnType<typeof createDrac>> | null = null;

export async function init() {
  console.log("Initializing the battle scene!")
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
  simulation = new Simulation(camera, scene);

  // --- Triplanar Sphere Setup ---
  const textureLoader = new THREE.TextureLoader();
  const [texGrunge, texBio, texPsy, texTrash] = await Promise.all([
    textureLoader.loadAsync(wornShutterPng),
    textureLoader.loadAsync(wiringsPng),
    textureLoader.loadAsync(squogPng),
    textureLoader.loadAsync(trashJpg)
  ]);

  texGrunge.wrapS = texGrunge.wrapT = THREE.RepeatWrapping;
  texBio.wrapS = texBio.wrapT = THREE.RepeatWrapping;
  texPsy.wrapS = texPsy.wrapT = THREE.RepeatWrapping;
  texTrash.wrapS = texTrash.wrapT = THREE.RepeatWrapping;
  texGrunge.repeat.set(6, 6);
  texBio.repeat.set(6, 6);
  texPsy.repeat.set(6, 6);
  texTrash.repeat.set(6, 6);

  const triplanarMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tGrunge: { value: texGrunge },
      tBio: { value: texBio },
      tPsy: { value: texPsy },
      tTrash: { value: texTrash },
      scale: { value: 1.5 },
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: /*glsl*/`
      varying vec3 vPosition;
      void main() {
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/`
      uniform float scale;
      uniform float time;
      uniform vec2 resolution;
      varying vec3 vPosition;

      // Hash and noise helpers
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(sin(p.x * 41.23 + p.y * 17.17) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      // Fractal Brownian Motion for clouds
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // Use screen space for stars
        vec2 screenUv = gl_FragCoord.xy / resolution.xy - time * 0.3;
        float aspect = resolution.x / resolution.y;
        float t = time * 0.12;

        // --- Nebula/gas clouds with parallax (multiple layers) ---
        // Layer 1: closest, strong parallax
        vec2 uv1 = (gl_FragCoord.xy / resolution * 10.0) + vPosition.xy * 0.12 + time * 0.1;
        uv1.y /= aspect;
        float cloud1 = fbm(uv1 * 2.5 + t * 0.7);

        // Layer 2: mid, moderate parallax
        vec2 uv2 = (gl_FragCoord.xy / resolution * 7.0) + vPosition.xy * 0.06 - time * 0.05;
        uv2.y /= aspect;
        float cloud2 = fbm(uv2 * 4.0 - t * 0.4 + 10.0);

        // Layer 3: far, subtle parallax
        vec2 uv3 = (gl_FragCoord.xy / resolution * 4.0) + vPosition.xy * 0.02 - time * 0.02;
        uv3.y /= aspect;
        float cloud3 = fbm(uv3 * 1.2 + t * 0.2 - 20.0);

        float nebula = pow(cloud1, 1.7) * 0.7 + pow(cloud2, 2.2) * 0.5 + pow(cloud3, 1.1) * 0.6;
        nebula = clamp(nebula, 0.0, 1.0);

        // Colorful nebula palette
        vec3 col1 = vec3(0.7, 0.2, 0.5) * 0.8; // purple
        vec3 col2 = vec3(0.1, 0.4, 0.7) * 0.1; // blue
        vec3 col3 = vec3(0.9, 0.5, 0.3) * 0.8; // pink
        vec3 col4 = vec3(0.8, 0.2, 0.6) * 0.3; // pale yellow
        vec3 nebulaColor = mix(col1, col2, cloud1);
        nebulaColor = mix(nebulaColor, col3, cloud2 * 0.7);
        nebulaColor = mix(nebulaColor, col4, cloud3 * 0.5);
        nebulaColor *= 0.7 + 0.5 * nebula;

        // --- Compose background ---
        vec3 bg = nebulaColor;

        // Gamma correction
        bg = pow(clamp(bg, 0.0, 1.0), vec3(2.2));
        gl_FragColor = vec4(bg, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false
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
    triplanarMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    requestAnimationFrame(updateTriplanarUniforms);
  }
  requestAnimationFrame(updateTriplanarUniforms);

  window.addEventListener('resize', () => {
    triplanarMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  });

  effectComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  ToneMappingShader.uniforms.contrast = { value: 1.07 }
  ToneMappingShader.uniforms.saturation = { value: 0.95 }
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 }
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.5, 0.6)
  effectComposer.addPass(bloomPass)

  sobelPass = new ShaderPass(SobelOperatorShader);
  effectComposer.addPass(sobelPass);

  crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.scanlineIntensity.value = 0.5
  effectComposer.addPass(crtPass);
  currentCrtPass = crtPass

  const outputPass = new OutputPass()
  effectComposer.addPass(outputPass)

  const sceneEntId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)

  const [_drac] = await Promise.all([
    createDrac(simulation)
  ])

  drac = _drac;

  drac.meshPromise.then((mesh) => {
    mesh.position.set(0, 0, -4);
    mesh.rotation.set(Math.PI / -2, 0, 0)
  })

  simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
    public Draw(): void {
      scene.environmentRotation.y += 0.0002
      scene.backgroundRotation.y += 0.0002

      crtPass.uniforms.time.value = Date.now() / 1000.0 % 1.0;

      effectComposer.render();
      playerInput.update();
    }
  })

  return () => {
    console.log("Cleaning up battle scene!")
    simulation.ViewSync.Cleanup(simulation);
  }
}

// We don't want to load assets in the show function or if we do we want to load them non-blocking then inject them into the scene later
// If we wait for asset initialization in here then there will be significant lag on scene switch. We want to load all assets in the above init function.
export async function show(context: SubSceneContext) {
  console.log("Showing battle scene!");

  toggleBattleTrack(true)

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height)

    sobelPass.uniforms.resolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    // fxaaPass.material.uniforms['resolution'].value.set(1 / renderer.domElement.width, 1 / renderer.domElement.height)
  }

  window.addEventListener('resize', resize, false);

  resize()

  simulation.Start();
  doBeatMap(() => {
    drac?.StrikePose();
  }).then(() => {
    console.log("Beatmap done!")
    context.End();
  })

  return () => {
    window.removeEventListener('resize', resize, false);
    simulation.Stop();
    toggleBattleTrack(false);
  }
}
