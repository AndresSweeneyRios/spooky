import * as shaders from "../shaders";
import * as THREE from "three";

shaders.inject({
  uniforms: {
    useOutline: { value: true },
    outlineThickness: { value: 0.02 },
    outlineColor: { value: new THREE.Color(0x000000) },
  },
  vertex: [
    {
      marker: shaders.VERTEX_MARKER.UNIFORM,
      value: /* glsl */ `
uniform bool useOutline;
uniform float outlineThickness;
`,
    },
    {
      marker: shaders.VERTEX_MARKER.PRE_QUANTIZATION,
      value: /* glsl */ `
  // When outlining is enabled, offset vertices along their normals.
  if (useOutline) {
    vec3 transformedNormal = normalize(normalMatrix * normal);
    mvPosition.xyz += transformedNormal * outlineThickness;
  }
`,
    },
  ],
  fragment: [
    {
      marker: shaders.FRAGMENT_MARKER.UNIFORM,
      value: /* glsl */ `
uniform bool useOutline;
uniform vec3 outlineColor;
`,
    },
    {
      marker: shaders.FRAGMENT_MARKER.POST_QUANTIZATION,
      value: /* glsl */ `
  // Only override the color for back-facing fragments (which are typically the outline)
  if (useOutline && !gl_FrontFacing) {
    gl_FragColor = vec4(outlineColor, gl_FragColor.a);
  }
`,
    },
  ],
});
