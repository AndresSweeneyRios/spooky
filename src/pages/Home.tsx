import "./Home.css";
import React, { Fragment } from 'react';

function createInfiniteLoopingNeonFractal(parentElement: HTMLElement) {
  if (!parentElement) {
    console.error('Parent element is null');
    return;
  }

  // Create and style the canvas, then append it to the parent element.
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  parentElement.appendChild(canvas);

  // Initialize WebGL.
  const gl = canvas.getContext('webgl')!;
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  // Resize canvas to match parent size.
  function resize() {
    canvas.width = parentElement.clientWidth;
    canvas.height = parentElement.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Vertex shader: renders a full-screen quad.
  const vertexShaderSource: string = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Fragment shader: infinite looping Mandelbox fractal with neon colors.
  const fragmentShaderSource: string = /* glsl */ `
#ifdef GL_ES
precision highp float;
#endif

uniform float uTime;
uniform vec2 uResolution;

// --- Constants ---
const float CELL_SIZE = 5.0;
const float OFFSET_SCALE = 2.0;
const float BOX_SIZE = 0.5;
const int MAX_STEPS = 70;
const float MIN_DIST = 0.1;
const float MAX_DIST = 100.0;
const float SPEED_FACTOR = 0.15;
const float ROTATION_FACTOR = 0.01;
const float FOCAL_ANGLE = 90.0;
const float NEAR_CLIP = 3.0; // Added near clip plane

// --- Utility Functions ---

// Hash function to generate a random vector for each cell
vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453);
}

// Signed Distance Function for a Box
float boxSDF(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, vec3(0.0))) + min(max(d.y, max(d.x, d.z)), 0.0);
}

// --- Scene Description ---

// Scene's Signed Distance Function (SDF)
float sceneSDF(vec3 p) {
    // Determine the cell and local position within the cell
    vec3 cell = floor(p / CELL_SIZE);
    vec3 local = mod(p, CELL_SIZE) - 0.5 * CELL_SIZE;

    // Apply a random offset to each cell
    vec3 offset = (hash3(cell) - 0.5) * OFFSET_SCALE;
    local += offset;

    // Return the SDF of the box within the cell
    return boxSDF(local, vec3(BOX_SIZE));
}

// --- Ray Marching ---

// Ray marching algorithm
float rayMarch(vec3 ro, vec3 rd) {
    float t = NEAR_CLIP; // Start at the near clip plane
    for (int i = 0; i < MAX_STEPS; i++) {
        // Calculate the distance to the scene at the current point
        float d = sceneSDF(ro + rd * t);

        // If we're close enough to the surface, return the distance
        if (d < MIN_DIST) return t;

        // Advance along the ray
        t += d * 0.5;

        // If we've gone too far, stop
        if (t > MAX_DIST) break;
    }
    return t; // Return the total distance traveled
}

// --- Main Shader Program ---

void main() {
    // Normalize pixel coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    // --- Camera Setup ---
    // Animate camera rotation
    float angle = uTime * ROTATION_FACTOR;
    vec3 ro = vec3(cos(angle) * 30.0, 0.0, sin(angle) * 30.0);

    // Animate camera position
    ro += vec3(sin(uTime * 0.1 * SPEED_FACTOR) * 18.0);

    // Calculate camera direction vectors
    vec3 forward = normalize(vec3(0.0) - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    // --- Ray Direction ---
    // Calculate ray direction based on field of view
    float focalLength = 1.0 / tan(radians(FOCAL_ANGLE) * 0.5);
    vec3 rd = normalize(uv.x * right + uv.y * up + focalLength * forward);

    // --- Ray March and Shade ---
    // Perform ray marching
    float t = rayMarch(ro, rd);
    vec3 pos = ro + rd * t;

    // --- Coloring based on cell ---
    float cellVal = sin(dot(floor(pos / CELL_SIZE), vec3(1.0)) * 1.57);
    vec3 baseColor = mix(vec3(0.0), vec3(1.0,1.0,0.0), cellVal);

    // Output final color
    gl_FragColor = vec4(baseColor, 1.0);
}
  `;

  // Helper: compile a shader of a given type.
  function compileShader(type: number, source: string): WebGLShader | null {
    const shader: WebGLShader | null = gl.createShader(type);
    if (!shader) {
      console.error('Failed to create shader');
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Compile and link shaders.
  const vertexShader: WebGLShader | null = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader: WebGLShader | null = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    console.error('Failed to compile shaders');
    return;
  }

  const program: WebGLProgram | null = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Define a full-screen quad (two triangles).
  const vertices: Float32Array = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
  ]);
  const vertexBuffer: WebGLBuffer | null = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Bind the vertex attribute.
  const aPositionLocation: number = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPositionLocation);
  gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

  // Get uniform locations.
  const uTimeLocation: WebGLUniformLocation | null = gl.getUniformLocation(program, "uTime");
  const uResolutionLocation: WebGLUniformLocation | null = gl.getUniformLocation(program, "uResolution");

  // Animation loop.
  let startTime: number = Date.now();
  function render() {
    const currentTime: number = (Date.now() - startTime) / 100.0;
    if (uTimeLocation) {
      gl.uniform1f(uTimeLocation, currentTime);
    }
    if (uResolutionLocation) {
      gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

export default function Home() {
  React.useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.remove();
    }

    const homeBackground = document.getElementById('home-background');

    if (homeBackground) {
      createInfiniteLoopingNeonFractal(homeBackground);
    }
  }, [])

  return (
    <Fragment>
      <div id="home">
        {React.useMemo(() => {
          return <div id="home-background"></div>
        }, [])}
      </div>
    </Fragment>
  )
}