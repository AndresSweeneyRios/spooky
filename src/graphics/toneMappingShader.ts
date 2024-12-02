const ToneMappingShader = {
  uniforms: {
    tDiffuse: { value: null },
    toneMappingExposure: { value: 0.8 },
  },
  vertexShader: /*glsl*/`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /*glsl*/`
    uniform sampler2D tDiffuse;
    uniform float toneMappingExposure;
    varying vec2 vUv;

    vec3 toneMapACESFilm(vec3 color) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 hdrColor = color.rgb * toneMappingExposure; // Apply exposure
      vec3 ldrColor = toneMapACESFilm(hdrColor); // Apply ACES Film tone mapping
      gl_FragColor = vec4(ldrColor, color.a); // Preserve alpha
    }
  `,
};

export default ToneMappingShader;