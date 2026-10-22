import * as THREE from 'three';

/** World-space point the camera is looking at; post-processing keeps it in focus. */
export const focus = {
  point: new THREE.Vector3(),
  /** World units around the focus point that stay sharp. */
  range: 2,
  bokeh: 1.5,
};
