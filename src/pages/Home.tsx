import "./Home.css";
import React, { Fragment } from 'react';
import _SVG from 'react-inlinesvg';
import TripshredSvg from '../assets/icons/tripshred.svg';

const SVG = _SVG as any;

const splash = document.getElementById('splash');
if (splash) {
  splash.setAttribute('is-hidden', 'true');
}

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
  const gl = canvas.getContext('webgl2')!;
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

  const acid1 = new Image();
  acid1.src = "./3d/throne/ACID1.webp"
  const acid2 = new Image();
  acid2.src = "./3d/throne/smpte.png"

  const texturePromiseAll = Promise.all<HTMLImageElement>([
    new Promise((resolve) => {
      acid1.onload = () => resolve(acid1)
    }),
    new Promise((resolve) => {
      acid2.onload = () => resolve(acid2)
    }),
  ])

  // Vertex shader: renders a full-screen quad.
  const vertexShaderSource: string = /* glsl */ `
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
uniform sampler2D acid1Texture;
uniform sampler2D acid2Texture;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 centeredUv = vec2((uv.x - 0.5) * aspect + 0.5, uv.y + 0.5);

  // Precompute time factors.
  float t0 = uTime * 0.002;
  float t1 = uTime * 0.0005;
  float negT0 = -t0;

  // Compute acid3 UV and sample.
  vec2 acid3Uv = (centeredUv + vec2(t0, t1)) / 2.0;
  vec4 acid3 = texture2D(acid1Texture, acid3Uv);

  // Compute acid1b UV and sample.
  vec2 acid1bUv = vec2(
    1.0 - (centeredUv.x + negT0) / 4.0,
    (centeredUv.y + acid3.r * 0.1 + negT0) / 4.0
  );
  vec4 acid1b = texture2D(acid1Texture, acid1bUv);

  // Compute acid2 UV and sample.
  vec2 acid2Uv = vec2(
    uv.x + acid1b.r * 0.3,
    1.0 - centeredUv.y / 1.77
  );
  vec4 acid2 = texture2D(acid2Texture, acid2Uv);

  gl_FragColor = acid2;
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
  const acid1TextureLocation = gl.getUniformLocation(program, "acid1Texture")
  const acid2TextureLocation = gl.getUniformLocation(program, "acid2Texture")

  // Set uniform values.
  if (uTimeLocation) {
    gl.uniform1f(uTimeLocation, 0.0);
  }

  if (uResolutionLocation) {
    gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
  }

  texturePromiseAll.then(([acid1, acid2, acid3]) => {
    const acid1Texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, acid1Texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, acid1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(acid1TextureLocation, 0);

    const acid2Texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, acid2Texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, acid2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(acid2TextureLocation, 1);
  })

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
    const homeBackground = document.getElementById('home-background');

    if (homeBackground) {
      createInfiniteLoopingNeonFractal(homeBackground);
    }
  }, [])

  return (
    <Fragment>
      <div id="home">
        <div className="main">
          <div className="landing">
            <SVG src={TripshredSvg} />
          </div>
          <div style={{ flexDirection: 'row' }}>
            <div className="screenshot" >
              <img src="./screenshots/crazeoh.webp" alt="A CrazeOh screenshot" />
            </div>
            <div className="separator"></div>
            <div style={{ alignItems: 'flex-start' }}>
              <h1>CrazeOh</h1>
              <p>Home is where the heart is.</p>
            </div>
          </div>
          <div style={{ flexDirection: 'row-reverse' }}>
            <div className="screenshot" >
              <img src="./screenshots/crazeoh.webp" alt="A CrazeOh screenshot" />
            </div>
            <div className="separator"></div>
            <div style={{ alignItems: 'flex-end' }} className="mobile-align-start">
              <h1>CrazeOh</h1>
              <p>Home is where the heart is.</p>
            </div>
          </div>
          <footer>
            <ul>
              <li>
                <a href="https://tripshred.com">
                  Copyright &copy; TripShred {new Date().getFullYear()}
                </a>
              </li>
              <li>
                <a href="#">
                  Patreon
                </a>
              </li>
              <li>
                <a href="#">
                  Steam
                </a>
              </li>
              <li>
                <a href="#">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#">
                  Discord
                </a>
              </li>
              <li>
                <a href="#">
                  Bluesky
                </a>
              </li>
              <li>
                <a style={{ fontWeight: 600, color: "white" }} href="mailto:contact@tripshred.com">
                  contact@tripshred.com
                </a>
              </li>
            </ul>
          </footer>
        </div>
        {React.useMemo(() => {
          return <div id="home-background"></div>
        }, [])}
      </div>
    </Fragment>
  )
}