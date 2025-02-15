import * as shaders from '../shaders';
import * as THREE from 'three';

shaders.inject({
  uniforms: {
    celLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
    celLightColor: { value: new THREE.Color(0xffffff) },
    celAmbientLight: { value: new THREE.Color(0xffffff) },
    celSteps: { value: 3 }
  },
  vertex: [
    {
      marker: shaders.VERTEX_MARKER.UNIFORM,
      value: /* glsl */`
varying vec3 celNormal;
`
    },
    {
      marker: shaders.VERTEX_MARKER.PRE_QUANTIZATION,
      value: /* glsl */`
celNormal = normalize(normalMatrix * normal);
`
    },
  ],
  fragment: [
    {
      marker: shaders.FRAGMENT_MARKER.UNIFORM,
      value: /* glsl */`
uniform vec3 celLightDirection;
uniform vec3 celLightColor;
uniform vec3 celAmbientLight;
uniform int celSteps;
varying vec3 celNormal;
`
    },
    {
      marker: shaders.FRAGMENT_MARKER.PRE_QUANTIZATION,
      value: /* glsl */`
  // Compute diffuse lighting using celNormal
  float diff = max(dot(normalize(celNormal), normalize(celLightDirection)), 0.0);
  // Quantize the diffuse value for a cel-shaded effect
  diff = floor(diff * float(celSteps)) / float(celSteps);
  // Combine ambient and diffuse lighting
  vec3 lighting = celAmbientLight + celLightColor * diff;
  // Modulate the fragment color by the computed lighting
  gl_FragColor.rgb *= lighting;
`
    },
  ]
});
