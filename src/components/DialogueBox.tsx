import "./DialogueBox.css"
import * as React from "react"

let dialogue: React.ReactNode = undefined

export const setDialogue = (text: React.ReactNode) => {
  dialogue = text

  window.dispatchEvent(new Event("dialogue-updated"))
}

let gl: WebGL2RenderingContext = null!

const vertexShaderSource = /*glsl*/`
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
`;

const fragmentShaderSource = /*glsl*/`
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    float noise = random(st + u_time * 0.1);
    gl_FragColor = vec4(vec3(noise), 1.0 - st.y);
  }
`;

export const DialogueBox: React.FC = () => {
  const [text, setText] = React.useState<React.ReactNode>("")
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const handler = () => {
      setText(dialogue)
    }

    window.addEventListener("dialogue-updated", handler)

    return () => {
      window.removeEventListener("dialogue-updated", handler)
    }
  }, [])

  React.useEffect(() => {
    if (gl !== null || !ref.current) {
      return
    }

    gl = ref.current.getContext('webgl2', {
      alpha: true,
    })!

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) {
        throw new Error('Failed to create shader');
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
    
    function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
      const program = gl.createProgram();
      if (!program) {
        throw new Error('Failed to create program');
      }
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    }
    
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      throw new Error('Shader creation failed');
    }
    
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Program creation failed');
    }
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
    
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    function render(time: number) {
      gl.viewport(0, 0, ref.current!.width, ref.current!.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    
      gl.uniform2f(resolutionUniformLocation, ref.current!.width, ref.current!.height);
      gl.uniform1f(timeUniformLocation, time * 0.001);
    
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    
      requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);

    const resize = () => {
      ref.current!.width = window.innerWidth
      ref.current!.height = window.innerHeight

      gl.viewport(0, 0, ref.current!.width, ref.current!.height)

      gl.uniform2f(resolutionUniformLocation, ref.current!.width, ref.current!.height)
    }

    resize()

    window.addEventListener("resize", resize)
  }, [ref])

  return (
    <div id="dialogue-box" is-hidden={!text ? "true" : undefined}>
      <canvas className="background" ref={ref} />
      <p>
        {text}
      </p>
    </div>
  )
}
