export const ToneMappingShader = {
  uniforms: {
    tDiffuse: { value: null },
    toneMappingExposure: { value: 0.8 },
    saturation: { value: 0.8 },
    contrast: { value: 1.02 },
    contrastMidpoint: { value: 0.5 },
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
    uniform float saturation;
    uniform float contrast;
    uniform float contrastMidpoint;
    varying vec2 vUv;

    vec3 toneMapACESFilm(vec3 color) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
    }

    vec3 setSaturation(vec3 color, float saturation) {
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      
      return mix(vec3(luminance), color, saturation);
    }

    vec3 setContrast(vec3 color, float contrast, float midpoint) {
      return mix(vec3(midpoint), color, contrast);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 hdrColor = color.rgb * toneMappingExposure; // Apply exposure
      vec3 ldrColor = toneMapACESFilm(hdrColor); // Apply ACES Film tone mapping
      vec3 saturationColor = setSaturation(ldrColor, saturation); // Apply saturation
      vec3 contrastColor = setContrast(saturationColor, contrast, contrastMidpoint); // Apply contrast
      gl_FragColor = vec4(contrastColor, color.a); // Preserve alpha
    }
  `,
};
