import * as shaders from "../shaders";

shaders.inject({
  uniforms: {
    throneEye: { value: false },
  },

  fragment: [
    {
      marker: shaders.FRAGMENT_MARKER.UNIFORM,
      value: /* glsl */ `
uniform bool throneEye;
`,
    },
    {
      marker: shaders.FRAGMENT_MARKER.POST_QUANTIZATION,
      value: /* glsl */ `
if (throneEye) {
  vec4 color = gl_FragColor;
  // increase exposure
  color.b *= 1.7;
  color.r *= 1.7;
  color.g *= 1.7;
  gl_FragColor = color;
}
      `,
    },
  ],
});
