import {
  Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';

export * from 'three';

export const RenderTarget = WebGLRenderTarget;

export class WebGPURenderer extends WebGLRenderer {}

export class Node {}

export const NodeUpdateType = {
  NONE: 0,
  OBJECT: 1,
  FRAME: 2,
  RENDER: 3,
} as const;

export {
  MeshBasicMaterial as MeshBasicNodeMaterial,
  MeshStandardMaterial as MeshStandardNodeMaterial,
  MeshPhysicalMaterial as MeshPhysicalNodeMaterial,
  PointsMaterial as PointsNodeMaterial,
  Material as NodeMaterial,
};
