import { TANK_DIMENSIONS } from '../config/constants';
import type { PerspectiveCamera, Vector3 } from 'three';

export const getAquariumCameraFraming = (width: number, height: number, fov: number) => {
  // Match the mobile HUD breakpoint and leave its right-hand rail unobstructed.
  const reservedRight = width <= 520 || (width > height && height <= 520) ? 100 : 0;
  const aspect = Math.max(1, width - reservedRight) / Math.max(1, height);
  const halfFovTangent = Math.tan((fov * Math.PI) / 360);
  const halfWidth = TANK_DIMENSIONS.width / 2 + TANK_DIMENSIONS.wallThickness;
  const frontZ = TANK_DIMENSIONS.depth / 2 + TANK_DIMENSIONS.wallThickness;
  const fitDistance =
    frontZ +
    Math.max(halfWidth / (halfFovTangent * aspect), TANK_DIMENSIONS.height / 2 / halfFovTangent) *
      1.1;
  return { distance: Math.max(4.5, fitDistance), offsetX: reservedRight / 2, reservedRight };
};

export const resizeAquariumCamera = (
  camera: PerspectiveCamera,
  target: Vector3,
  previousDistance: number,
  width: number,
  height: number
) => {
  const { distance, offsetX } = getAquariumCameraFraming(width, height, camera.fov);
  // Scale the user's current orbit distance, not a fixed additive delta:
  // a zoomed camera must never cross its target during a portrait/landscape swap.
  camera.position
    .sub(target)
    .multiplyScalar(distance / previousDistance)
    .add(target);
  camera.lookAt(target);
  camera.setViewOffset(width, height, offsetX, 0, width, height);
  camera.updateMatrixWorld();
  return distance;
};
