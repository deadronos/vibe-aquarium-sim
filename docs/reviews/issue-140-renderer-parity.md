# Issue 140: WebGPU ghosting and renderer parity

## Investigation

Deterministic captures were taken with the new `?testHarness=1` surface, which
freezes the school and pins fish to scripted poses so WebGL and WebGPU render the
exact same transforms. At `quality=low` and `quality=high`, with frozen poses,
fast scripted motion, and re-settled frames:

- No persistent trails or ghost copies appear on either backend. The vacated
  region returns to the empty-reference frame within animation noise, and two
  settled frames are stable to <0.1% changed pixels.
- The instanced fish mesh updates every slot each frame, so the historical
  WebGPU double-image is not reproducible on current `main`.

The real, reproducible renderer defect was **exposure**: at the same camera,
seed, quality, and frozen poses, the WebGPU tank averaged ~74 luminance versus
~52 on WebGL (~40% brighter, washed out).

## Root cause

The custom GLSL materials wrote `gl_FragColor` directly and never ran three's
output pipeline, while their WebGPU node-material equivalents
(`WaterVolumeNodeMaterial`, `WaterSurfaceNodeMaterial`,
`TankCausticsNodeMaterial`, `ParticleNodeMaterial`) are tone-mapped and
color-space converted. The room and fish use built-in materials and matched
exactly; only the custom effect materials diverged.

Affected shaders: `waterShader`, `waterSurfaceShader`, `causticsShader`, and the
`AmbientParticles` fragment shader.

## Fix

Append the managed-output chunks to each custom fragment shader:

```glsl
gl_FragColor = vec4(...);

#include <tonemapping_fragment>
#include <colorspace_fragment>
```

Three resolves these to identity while rendering into a linear render target,
so post-processing on WebGL is unaffected, and to the configured tone
map/output color space when rendering to screen. WebGL now matches built-in
materials and the WebGPU node path.

Measured tank-region luminance (8-bit, `quality=high`, frozen poses):

| Region          | WebGL before | WebGPU before | Δ    | WebGL after | WebGPU after | Δ   |
| --------------- | ------------ | ------------- | ---- | ----------- | ------------ | --- |
| tank center     | 52.5         | 73.8          | 21.3 | 72.1        | 73.8         | 1.7 |
| tank backplate  | 57.5         | 82.8          | 25.3 | 76.4        | 82.8         | 6.4 |
| room background | 18.9         | 19.0          | 0.1  | 18.9        | 19.0         | 0.1 |

## Repeatable coverage

`tests/e2e/renderer-parity.spec.ts` drives both backends through the harness and
asserts, from the captured pixels:

- the vacated region matches the empty reference far more than the
  fish-present frame (no persistent ghost),
- consecutive settled frames are temporally stable (no trails),
- WebGPU and WebGL tank luminance is within 25% relative.

The spec fails on the pre-fix shaders (relative exposure 0.283) and passes after
the fix (~0.03). It runs in the existing `test:smoke` job, including CI's
software-WebGPU path.
