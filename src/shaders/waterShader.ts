export const waterVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 safeNormalize(vec3 v) {
  // Avoid division-by-zero inside normalize() on some drivers (ANGLE/D3D).
  // max() prevents inversesqrt(0).
  return v * inversesqrt(max(dot(v, v), 1e-12));
}

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = safeNormalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const waterFragmentShader = `
uniform float time;
uniform vec3 waterColor;
uniform float opacity;
uniform float causticsScale;
uniform float causticsSpeed;
uniform float causticsIntensity;
uniform float volumeSpecularStrength;
uniform float volumeShimmerStrength;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 safeNormalize(vec3 v) {
  // Avoid division-by-zero inside normalize() on some drivers (ANGLE/D3D).
  return v * inversesqrt(max(dot(v, v), 1e-12));
}

// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){
  // Clamp to avoid division by zero and improve precision
  r = max(r, vec4(1e-6));
  // Keep constants at float-like precision to reduce ANGLE/D3D double-precision warnings.
  return 1.7928429 - 0.8537347 * r;
}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0.0 + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  // Add epsilon to avoid division by zero
  norm = max(norm, vec4(1e-8));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  // Base depth gradient (y is vertical)
  // Assuming tank height around 2.0 (-1 to 1)
  float depth = smoothstep(-1.0, 1.0, vPosition.y);
  vec3 gradientColor = mix(waterColor * 0.5, waterColor * 1.5, depth);

  // Caustics pattern
  float noise = snoise(vec3(vPosition.x * causticsScale, vPosition.y * causticsScale + time * causticsSpeed, vPosition.z * causticsScale));
  float caustics = smoothstep(0.4, 0.6, noise) * causticsIntensity; // Sharpen noise for caustic look

  // Fresnel
  vec3 viewDir = safeNormalize(vViewPosition);
  // Clamp dot product to avoid negative values from floating point errors
  float dotValue = max(dot(viewDir, vNormal), 0.0);
  float fresnel = pow(1.0 - dotValue, 3.0);

  // Optional volume upgrade: subtle specular + shimmer (strengths are 0 when disabled)
  vec3 upgradedNormal = vNormal;
  if (volumeShimmerStrength > 0.0) {
    float shimmer = snoise(vec3(
      vPosition.x * 1.4 + time * 0.25,
      vPosition.y * 1.1 + time * 0.18,
      vPosition.z * 1.4 - time * 0.22
    ));
    upgradedNormal = safeNormalize(vNormal + volumeShimmerStrength * 0.18 * vec3(shimmer, shimmer * 0.5, -shimmer));
  }

  float volumeSpec = 0.0;
  if (volumeSpecularStrength > 0.0) {
    vec3 lightDir = safeNormalize(vec3(0.25, 1.0, 0.15));
    vec3 halfDir = safeNormalize(lightDir + viewDir);
    // Sharper spec helps suggest a “liquid” highlight.
    float rawSpec = pow(max(dot(upgradedNormal, halfDir), 0.0), 48.0);
    volumeSpec = rawSpec * (0.25 + 0.75 * fresnel) * volumeSpecularStrength;
  }

  // Combine
  vec3 finalColor = gradientColor + vec3(caustics) + fresnel * 0.2 + vec3(volumeSpec);

  gl_FragColor = vec4(finalColor, opacity * (0.6 + 0.4 * fresnel));
}
`;
