import * as THREE from 'three';

export function createParallaxWindowMaterial(envMap: THREE.CubeTexture, camera: THREE.Camera) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      envMap: { value: envMap },
      cameraPosition: { value: new THREE.Vector3() },
      rotationMatrix: { value: new THREE.Matrix3() }, // Pass the rotation matrix as a uniform 
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, // Pass the resolution
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      varying vec3 vWorldPosition;
      uniform samplerCube envMap;
      uniform mat3 rotationMatrix;
      uniform vec2 resolution;

      void main() {
        // Calculate the view direction
        vec3 viewDir = normalize(vWorldPosition - cameraPosition);
        
        // Apply rotation to the view direction
        vec3 rotatedViewDir = rotationMatrix * viewDir;

        // Sample the cubemap using the rotated direction
        vec4 interiorColor = textureCube(envMap, rotatedViewDir);

        // Output the final color with tapered alpha
        gl_FragColor = vec4(interiorColor.rgb, interiorColor.a);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true, // Allow for transparency to simulate glass
  });

  const updateCameraPosition = () => {
    material.uniforms.cameraPosition.value.copy(camera.position)
    material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
  }
  
  const setRotationMatrix = (rotationMatrix: THREE.Matrix3) => {
    material.uniforms.rotationMatrix.value.copy(rotationMatrix)
  }

  return {
    material,
    updateCameraPosition,
    setRotationMatrix,
  }
}
