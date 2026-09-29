import { BoxGeometry, BufferGeometry, PlaneGeometry } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { TANK_DIMENSIONS } from '../../config/constants';

export const BACKPLATE_Z = -TANK_DIMENSIONS.depth / 2 + TANK_DIMENSIONS.wallThickness * 0.55;

export const CAUSTICS_OVERLAY_INSET = 0.003;

export const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const geo = new BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return geo;
};

export const createGlassWallGeometry = (
  width: number,
  height: number,
  depth: number,
  wallThickness: number
): BufferGeometry => {
  const back = createWall(
    width + wallThickness * 2,
    height,
    wallThickness,
    0,
    0,
    -depth / 2 - wallThickness / 2
  );
  const front = createWall(
    width + wallThickness * 2,
    height,
    wallThickness,
    0,
    0,
    depth / 2 + wallThickness / 2
  );
  const right = createWall(wallThickness, height, depth, width / 2 + wallThickness / 2, 0, 0);
  const left = createWall(wallThickness, height, depth, -width / 2 - wallThickness / 2, 0, 0);

  const parts = [back, front, right, left];
  const merged = BufferGeometryUtils.mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged || new BufferGeometry();
};

export const createCausticsOverlayGeometry = (
  width: number,
  height: number,
  depth: number
): BufferGeometry => {
  const floor = new PlaneGeometry(width, depth);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, -height / 2 + CAUSTICS_OVERLAY_INSET, 0);

  const back = new PlaneGeometry(width, height);
  // Keep the depth-tested overlay on the visible face of the opaque backing.
  back.translate(0, 0, BACKPLATE_Z + CAUSTICS_OVERLAY_INSET);

  const front = new PlaneGeometry(width, height);
  front.rotateY(Math.PI);
  front.translate(0, 0, depth / 2 - CAUSTICS_OVERLAY_INSET);

  const right = new PlaneGeometry(depth, height);
  right.rotateY(-Math.PI / 2);
  right.translate(width / 2 - CAUSTICS_OVERLAY_INSET, 0, 0);

  const left = new PlaneGeometry(depth, height);
  left.rotateY(Math.PI / 2);
  left.translate(-width / 2 + CAUSTICS_OVERLAY_INSET, 0, 0);

  const parts = [floor, back, front, right, left];
  const merged = BufferGeometryUtils.mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged || new BufferGeometry();
};
