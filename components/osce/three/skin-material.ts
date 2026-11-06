import * as THREE from "three"

// Modellen saknar UV-koordinater och textur, så färgen målas i fragmentskuggningen
// utifrån kroppens position (modellkoordinater, 1 enhet ≈ 8,5 cm).
// Det ger skarpa detaljer utan att filen blir större.

const PAINT = /* glsl */ `
varying vec3 vObj;
float gCloth = 0.0;
uniform vec3 uSkin, uBlush, uShorts, uHair, uAreola;

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float blob(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.6, 1.0, length((p - c) / r)); }

vec3 paintBody(vec3 p, out float rough) {
  float ax = abs(p.x);
  float front = step(0.0, p.z);
  float mottle = noise(p * 1.3) * 0.6 + noise(p * 4.0) * 0.4;
  vec3 c = uSkin * (0.95 + 0.1 * mottle);

  // Rodnad där huden är tunn eller blodfylld
  float blush = smoothstep(10.8, 9.4, p.y) * step(3.0, ax);
  blush = max(blush, smoothstep(1.6, 0.4, p.y));
  blush = max(blush, blob(vec2(ax, p.y), vec2(1.05, 5.4), vec2(0.9, 0.9)) * front);
  blush = max(blush, blob(vec2(ax, p.y), vec2(0.62, 18.75), vec2(0.45, 0.4)) * step(0.3, p.z));
  c = mix(c, uBlush, blush * 0.3);

  // Bröstvårtor och vårtgårdar (I4 medioklavikulärt)
  c = mix(c, uAreola, blob(vec2(ax, p.y), vec2(0.94, 15.86), vec2(0.21, 0.21)) * front * 0.8);
  c = mix(c, uAreola * 0.75, blob(vec2(ax, p.y), vec2(0.94, 15.86), vec2(0.08, 0.08)) * front);

  // Naveln
  c = mix(c, uAreola * 0.7, blob(p.xy, vec2(0.0, 12.0), vec2(0.09, 0.14)) * front);

  rough = 0.52 + 0.1 * mottle;

  // Ansikte: ögonbryn, slutna ögon och läppar (uppmätta på modellens profil)
  float face = step(0.45, p.z) * step(17.9, p.y) * step(p.y, 20.0);
  float browY = 19.6 + 0.07 * (1.0 - pow((ax - 0.42) / 0.26, 2.0));
  float brow = (1.0 - smoothstep(0.035, 0.065, abs(p.y - browY))) * smoothstep(0.16, 0.2, ax) * smoothstep(0.7, 0.64, ax);
  c = mix(c, uHair * (0.8 + 0.4 * noise(p * 22.0)), brow * face * 0.92);
  float lidY = 19.33 + 0.03 * (1.0 - pow((ax - 0.41) / 0.19, 2.0));
  float lash = (1.0 - smoothstep(0.012, 0.03, abs(p.y - lidY))) * smoothstep(0.21, 0.24, ax) * smoothstep(0.61, 0.58, ax);
  c = mix(c, uHair * 0.7, lash * face);
  float lidShade = blob(vec2(ax, p.y), vec2(0.41, 19.42), vec2(0.22, 0.13));
  c = mix(c, uBlush * 0.85, lidShade * face * 0.16);
  float lips = blob(p.xy, vec2(0.0, 18.6), vec2(0.34, 0.135));
  c = mix(c, uBlush * 0.88, lips * face * 0.72);
  float mouth = (1.0 - smoothstep(0.008, 0.025, abs(p.y - 18.6 - 0.02 * ax * ax))) * smoothstep(0.32, 0.27, ax);
  c = mix(c, uAreola * 0.55, mouth * face);

  // Kort hår
  float hair = smoothstep(19.7, 19.95, p.y - p.z * 0.35);
  hair = max(hair, smoothstep(0.05, -0.15, p.z - 0.55 + (19.9 - p.y) * 0.9) * step(18.2, p.y));
  c = mix(c, uHair * (0.8 + 0.5 * noise(p * 14.0)), hair);
  rough = mix(rough, 0.8, hair);

  // Shorts
  float top = 10.5 + 0.05 * sin(p.x * 2.0);
  float shorts = smoothstep(top + 0.02, top - 0.02, p.y) * smoothstep(7.25, 7.3, p.y) * step(ax, 3.0);
  float band = shorts * smoothstep(top - 0.34, top - 0.3, p.y);
  c = mix(c, uShorts * (0.96 + 0.08 * noise(p * 9.0)), shorts);
  c = mix(c, uShorts * 0.6, band);
  rough = mix(rough, 0.92, shorts);
  gCloth = shorts;
  return c;
}
`

export function createSkinMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.55,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color("#ffb99a"),
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
  })
  material.onBeforeCompile = shader => {
    shader.uniforms.uSkin = { value: new THREE.Color("#cf9877") }
    shader.uniforms.uBlush = { value: new THREE.Color("#d9806e") }
    shader.uniforms.uShorts = { value: new THREE.Color("#1f2d46") }
    shader.uniforms.uHair = { value: new THREE.Color("#3a2a20") }
    shader.uniforms.uAreola = { value: new THREE.Color("#a5684f") }
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;")
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${PAINT}`)
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat paintRough; diffuseColor.rgb = paintBody(vObj, paintRough);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = paintRough;")
      .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= 1.0 - gCloth;\n#endif")
  }
  return material
}
