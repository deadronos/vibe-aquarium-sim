import { Vector3 } from 'three';
import { world } from '../store';
import { SIMULATION_BOUNDS } from '../config/constants';

export const FeedingController = () => {
  return (
    <mesh
      position={[0, 0, SIMULATION_BOUNDS.z + 0.1]}
      onClick={(e) => {
        // Prevent clicking through to other things if necessary
        e.stopPropagation();

        world.add({
          isFood: true,
          position: new Vector3(e.point.x, e.point.y, e.point.z),
          velocity: new Vector3(0, -0.5, 0), // Small downward velocity
        });
      }}
    >
      {/* Large plane to cover the view */}
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
