// NoiseWarpMaterial.js
//
// UV-warping ShaderMaterial using periodic fractal Perlin noise
//
// Adjustable parameters:
//   map       – texture (default null)
//   intensity – warp strength (default 0.04)
//   scale     – noise feature size (default 4.0)
//   speed     – animation speed (default 0.4)
//   tint      – vec3 RGB tint multiplier (default white)
//   opacity   – alpha multiplier (default 1.0)

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js';

export function createNoiseMaterial(options) {

  const map       = options.map       !== undefined ? options.map       : null;
  const intensity = options.intensity !== undefined ? options.intensity : 0.04;
  const scale     = options.scale     !== undefined ? options.scale     : 4.0;
  const speed     = options.speed     !== undefined ? options.speed     : 0.4;
  const tint      = options.tint      !== undefined ? options.tint      : new THREE.Color(1,1,1);
  const opacity   = options.opacity   !== undefined ? options.opacity   : 1.0;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uScale;
    uniform float uSpeed;
    uniform vec3 uTint;
    uniform float uOpacity;

    varying vec2 vUv;

    float rand(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec2 randomGradient(vec2 p) {
      float r = rand(p) * 6.28318530718;
      return vec2(cos(r), sin(r));
    }

    float perlinPeriodic(vec2 p, vec2 period) {
      vec2 pi0 = mod(floor(p), period);
      vec2 pi1 = mod(pi0 + 1.0, period);
      vec2 pf = fract(p);

      vec2 g00 = randomGradient(pi0);
      vec2 g10 = randomGradient(vec2(pi1.x, pi0.y));
      vec2 g01 = randomGradient(vec2(pi0.x, pi1.y));
      vec2 g11 = randomGradient(pi1);

      vec2 d00 = pf - vec2(0.0, 0.0);
      vec2 d10 = pf - vec2(1.0, 0.0);
      vec2 d01 = pf - vec2(0.0, 1.0);
      vec2 d11 = pf - vec2(1.0, 1.0);

      float v00 = dot(g00, d00);
      float v10 = dot(g10, d10);
      float v01 = dot(g01, d01);
      float v11 = dot(g11, d11);

      vec2 w = pf * pf * (3.0 - 2.0 * pf);

      float x0 = mix(v00, v10, w.x);
      float x1 = mix(v01, v11, w.x);
      return mix(x0, x1, w.y);
    }

    float fbmPeriodic(vec2 p, vec2 period) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;

      for (int i = 0; i < 3; i++) {
        vec2 pp = p * frequency;
        vec2 per = period * frequency;
        value += amplitude * perlinPeriodic(pp, per);

        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv;

      vec2 animated = uv * uScale + vec2(uTime * uSpeed, 0.0);
      vec2 basePeriod = vec2(4.0, 4.0);

      float n1 = fbmPeriodic(animated, basePeriod);
      float n2 = fbmPeriodic(animated + vec2(10.73, 4.89), basePeriod);

      vec2 offset = uIntensity * vec2(n1, n2);
      vec2 warpedUv = clamp(uv + offset, 0.0, 1.0);

      vec4 color = texture2D(uTexture, warpedUv);

      // Apply tint + opacity
      color.rgb *= uTint;
      color.a   *= uOpacity;

      gl_FragColor = color;
    }
  `;

  const uniforms = {
    uTexture:   { value: map },
    uTime:      { value: 0 },
    uIntensity: { value: intensity },
    uScale:     { value: scale },
    uSpeed:     { value: speed },
    uTint:      { value: tint },
    uOpacity:   { value: opacity }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  // convenience
  material.setTexture   = v => material.uniforms.uTexture.value = v;
  material.setIntensity = v => material.uniforms.uIntensity.value = v;
  material.setScale     = v => material.uniforms.uScale.value = v;
  material.setSpeed     = v => material.uniforms.uSpeed.value = v;
  material.setTint      = v => material.uniforms.uTint.value = v;
  material.setOpacity   = v => material.uniforms.uOpacity.value = v;

  return material;
}
