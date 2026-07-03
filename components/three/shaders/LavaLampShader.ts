export const lavaLampVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const lavaLampFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uBreath;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.05;
    amp *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // Faster drift for visible fluid flow
  float slow = uTime * 0.12;
  vec2 driftA = vec2(slow * 0.7, slow * 0.5);
  vec2 driftB = vec2(-slow * 0.6, slow * 0.8);

  float n1 = fbm(uv * 1.6 + driftA);
  float n2 = fbm(uv * 2.4 - driftB + 4.2);
  float n3 = fbm(uv * 1.1 + vec2(n1, n2) * 0.8 + uBreath * 0.4);

  // Animated color shift over time
  float hueShift = sin(uTime * 0.08) * 0.15 + 0.5;

  vec3 color0 = vec3(0.020, 0.015, 0.060);
  vec3 color1 = mix(
    vec3(0.106, 0.067, 0.227),
    vec3(0.180, 0.050, 0.200),
    hueShift
  );
  vec3 color2 = vec3(0.010, 0.100, 0.100);
  vec3 color3 = vec3(1.000, 0.369, 0.592);

  vec3 col = mix(color0, color1, smoothstep(0.1, 0.8, n1));
  col = mix(col, color2, smoothstep(0.3, 0.85, n2));
  float pinkMask = smoothstep(0.55, 0.95, n3) * (0.35 + uBreath * 0.35);
  col = mix(col, color3, pinkMask * 0.6);

  // Radial alpha fade — wide, soft falloff so no hard edges
  float dist = length(uv);
  float alpha = 1.0 - smoothstep(0.15, 1.0, dist);
  alpha = smoothstep(0.0, 0.4, alpha);

  // Inner glow
  col *= 0.7 + 0.4 * (1.0 - dist * 0.4);

  gl_FragColor = vec4(col, alpha);
}
`

export const lavaLampUniforms = {
  uTime: { value: 0 },
  uBreath: { value: 0 },
}
