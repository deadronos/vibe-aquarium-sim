import { PerspectiveCamera, Vector3 } from 'three';
import { getAquariumCameraFraming, resizeAquariumCamera } from '../src/components/cameraFraming';
import { TANK_DIMENSIONS } from '../src/config/constants';

describe('aquarium camera framing', () => {
  test('preserves positive user zoom and the orbit target across rotation', () => {
    const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 100);
    const target = new Vector3(0.4, -0.1, 0.3);
    camera.position.copy(target).add(new Vector3(0, 0, 6));
    camera.lookAt(target);
    const portraitDistance = getAquariumCameraFraming(390, 844, 50).distance;
    const zoomRatio = camera.position.distanceTo(target) / portraitDistance;
    const landscapeDistance = resizeAquariumCamera(camera, target, portraitDistance, 844, 390);
    expect(camera.position.z).toBeGreaterThan(target.z);
    expect(camera.position.distanceTo(target) / landscapeDistance).toBeCloseTo(zoomRatio);
    resizeAquariumCamera(camera, target, landscapeDistance, 390, 844);
    expect(camera.position.distanceTo(target)).toBeCloseTo(6);
  });

  test.each([
    [1200, 800],
    [390, 844],
    [320, 568],
    [844, 390],
  ])('keeps all tank corners visible and clear of the phone rail at %ix%i', (width, height) => {
    const { distance, offsetX, reservedRight } = getAquariumCameraFraming(width, height, 50);
    const camera = new PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, distance);
    camera.setViewOffset(width, height, offsetX, 0, width, height);
    camera.updateMatrixWorld();
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const corner = new Vector3(
            x * (TANK_DIMENSIONS.width / 2 + TANK_DIMENSIONS.wallThickness),
            (y * TANK_DIMENSIONS.height) / 2,
            z * (TANK_DIMENSIONS.depth / 2 + TANK_DIMENSIONS.wallThickness)
          ).project(camera);
          const screenX = ((corner.x + 1) * width) / 2;
          expect(screenX).toBeGreaterThan(0);
          expect(screenX).toBeLessThan(width - reservedRight);
          expect(Math.abs(corner.y)).toBeLessThan(1);
        }
  });

  test('preserves the desktop opening distance', () => {
    expect(getAquariumCameraFraming(1200, 800, 50).distance).toBe(4.5);
  });
});
