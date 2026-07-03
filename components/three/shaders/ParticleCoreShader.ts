export const particleCoreVertexShader = `
uniform float uTime;
uniform float uSize;
uniform float uNoiseForce;
uniform float uCoreOpacity;

attribute vec3 aRandom;
attribute float aPhase;

varying float vPhase;
varying float vOpacity;

void main() {
  vPhase = aPhase;
  vec3 p = position;

  // Chaotic drift — scaled by uNoiseForce
  // At 1.0: particles fly chaotically; at 0.0: they settle into place
  float driftX = sin(uTime * 0.4 + aPhase * 2.0) * 1.5;
  float driftY = cos(uTime * 0.3 + aPhase) * 1.5;
  float driftZ = sin(uTime * 0.5 - aPhase) * 1.5;

  p += aRandom * vec3(driftX, driftY, driftZ) * uNoiseForce;

  // Breathing pulse — gentler when settled
  float breatheScale = 0.3 + uNoiseForce * 0.7;
  float breathing = sin(uTime * 1.4 + aPhase) * 0.18 * breatheScale;
  p += normalize(position + 0.0001) * breathing;

  // Opacity passed to fragment
  vOpacity = uCoreOpacity;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = (uSize / -mvPosition.z) * (1.0 + breathing * 0.6);
}
`

export const particleCoreFragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uCoreOpacity;

varying float vPhase;
varying float vOpacity;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;

  float alpha = smoothstep(0.5, 0.0, d);
  vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vPhase));

  gl_FragColor = vec4(col, alpha * 0.85 * vOpacity);
}
`
