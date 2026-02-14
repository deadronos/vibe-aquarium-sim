const chainable = () => {
  const proxy = new Proxy(() => {}, {
    get: () => chainable(),
    apply: () => chainable(),
  });
  return proxy;
};

export const color = chainable;
export const float = chainable;
export const vec3 = chainable;
export const positionLocal = chainable;
export const time = chainable;
export const uv = chainable;
export const mix = chainable;
export const max = chainable;
export const dot = chainable;
export const pow = chainable;
export const smoothstep = chainable;
export const normalize = chainable;
export const normalView = chainable;
export const positionView = chainable;
export const mx_noise_vec3 = chainable;
export const sin = chainable;
export const vec4 = chainable;
export const positionWorld = chainable;
export const normalWorld = chainable;
export const abs = chainable;
export const attribute = chainable;
export const mod = chainable;
export const fract = chainable;
export const cos = chainable;
