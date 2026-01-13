export const causticsVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

vec3 safeNormalize(vec3 v) {
  return v * inversesqrt(max(dot(v, v), 1e-12));
}

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Approximate world normal; safeNormalize avoids driver edge cases.
  vWorldNormal = safeNormalize(mat3(modelMatrix) * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const causticsFragmentShader = `
uniform float time;
uniform float intensity;
uniform float scale;
uniform float speed;
uniform vec3 color;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){
  r = max(r, vec4(1e-6));
  return 1.7928429 - 0.8537347 * r;
}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  norm = max(norm, vec4(1e-8));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  // 3D noise in world space so the pattern is continuous across walls/floor.
  vec3 p = vWorldPosition * scale;
  p.y += time * speed;

  // A bit of domain-warping for more organic caustics.
  float warp = snoise(p * 0.35);
  float n = snoise(p + vec3(warp * 0.6));

  // Remap [-1, 1] -> [0, 1]
  float nn = n * 0.5 + 0.5;

  // Caustic lines: sharpen the brighter parts.
  float caustics = smoothstep(0.58, 0.88, nn);
  caustics = caustics * caustics;

  // Subtle reduction on vertical walls.
  float surfaceFade = 0.6 + 0.4 * abs(vWorldNormal.y);

  float strength = caustics * intensity * surfaceFade;
  vec3 outColor = color * strength;

  gl_FragColor = vec4(outColor, strength);
}
`;
