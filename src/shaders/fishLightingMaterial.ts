import * as THREE from 'three';

export const VIBE_FISH_LIGHTING_MARKER = '// VIBE_RIM_LIGHTING';

export interface VibeFishLightingUniforms {
  vibeRimColor: { value: THREE.Color };
  vibeRimStrength: { value: number };
  vibeRimPower: { value: number };
  vibeSSSColor: { value: THREE.Color };
  vibeSSSStrength: { value: number };
  vibeSSSPower: { value: number };
}

export const DEFAULT_VIBE_FISH_RIM_STRENGTH = 0.12;
export const DEFAULT_VIBE_FISH_RIM_POWER = 2.2;
export const DEFAULT_VIBE_FISH_SSS_STRENGTH = 0.06;
export const DEFAULT_VIBE_FISH_SSS_POWER = 1.4;

const DEFAULT_RIM_COLOR = new THREE.Color('#eaf6ff');
const DEFAULT_SSS_COLOR = new THREE.Color('#ffb18a');

type FishLightingUserData = {
  vibeFishLighting?: {
    uniforms: VibeFishLightingUniforms;
  };
};

const createUniforms = (): VibeFishLightingUniforms => ({
  vibeRimColor: { value: DEFAULT_RIM_COLOR.clone() },
  vibeRimStrength: { value: DEFAULT_VIBE_FISH_RIM_STRENGTH },
  vibeRimPower: { value: DEFAULT_VIBE_FISH_RIM_POWER },
  vibeSSSColor: { value: DEFAULT_SSS_COLOR.clone() },
  vibeSSSStrength: { value: DEFAULT_VIBE_FISH_SSS_STRENGTH },
  vibeSSSPower: { value: DEFAULT_VIBE_FISH_SSS_POWER },
});

const injectRimAndSSS = (shader: THREE.Shader) => {
  // Idempotency: onBeforeCompile can run multiple times (program cache, renderer reuse).
  // If we've already injected our chunk, skip to avoid duplicating uniforms/logic.
  if (shader.fragmentShader.includes(VIBE_FISH_LIGHTING_MARKER)) return;

  const hasCommon = shader.fragmentShader.includes('#include <common>');
  const hasOutput = shader.fragmentShader.includes('#include <output_fragment>');
  if (!hasCommon || !hasOutput) return;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>\n${VIBE_FISH_LIGHTING_MARKER}\nuniform vec3 vibeRimColor;\nuniform float vibeRimStrength;\nuniform float vibeRimPower;\nuniform vec3 vibeSSSColor;\nuniform float vibeSSSStrength;\nuniform float vibeSSSPower;\n`
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <output_fragment>',
    `\n${VIBE_FISH_LIGHTING_MARKER}\nvec3 vibeN = normalize( normal );\nvec3 vibeV = normalize( vViewPosition );\nfloat vibeNdotV = saturate( dot( vibeN, vibeV ) );\n\n// Subtle rim (fresnel-ish)\nfloat vibeRim = pow( 1.0 - vibeNdotV, vibeRimPower ) * vibeRimStrength;\noutgoingLight += vibeRimColor * vibeRim;\n\n// Faux wrap/SSS tint (soft edge lift)\nfloat vibeSSS = pow( 1.0 - vibeNdotV, vibeSSSPower ) * vibeSSSStrength;\noutgoingLight += vibeSSSColor * vibeSSS;\n\n#include <output_fragment>`
  );
};

const enhanceSingle = (source: THREE.Material) => {
  const cloned = source.clone();
  const uniforms = createUniforms();

  const prevOnBeforeCompile = cloned.onBeforeCompile;
  cloned.onBeforeCompile = (shader, renderer) => {
    prevOnBeforeCompile?.(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    injectRimAndSSS(shader);
  };

  // Ensure program cache differentiates the modified shader.
  // @ts-expect-error - customProgramCacheKey exists on Material in runtime Three.
  cloned.customProgramCacheKey = () => 'vibe_fish_rim_sss_v1';

  (cloned.userData as FishLightingUserData).vibeFishLighting = { uniforms };

  return { material: cloned, uniforms };
};

export function enhanceFishMaterialWithRimAndSSS(material: THREE.Material): {
  material: THREE.Material;
  uniforms: VibeFishLightingUniforms;
};
export function enhanceFishMaterialWithRimAndSSS(material: THREE.Material[]): {
  material: THREE.Material[];
  uniforms: VibeFishLightingUniforms[];
};
export function enhanceFishMaterialWithRimAndSSS(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    const enhanced = material.map((m) => enhanceSingle(m));
    return {
      material: enhanced.map((e) => e.material),
      uniforms: enhanced.map((e) => e.uniforms),
    };
  }

  return enhanceSingle(material);
}
