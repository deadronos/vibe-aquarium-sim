import { CABINET, ROOM, TANK, TANK_ORIGIN } from '../config/scene';
import type { Viewpoint } from '../state/store';
import { BASE_FOV, frameShot } from './framing';
import type { Box, Framing } from './framing';

export type Shot = {
  position: [number, number, number];
  target: [number, number, number];
  range: number;
  bokeh: number;
  /** On narrow screens: room either side of the cabinet that must stay on screen (metres). */
  fit?: number;
  /** Fraction of each half-screen kept clear of the fitted cabinet. */
  margin?: number;
};

const [TX, TY, TZ] = TANK_ORIGIN;
const TANK_MID_Y = TY + TANK.waterLevel / 2;

export const SHOTS: Record<Exclude<Viewpoint, 'follow'>, Shot> = {
  sofa: {
    position: [0.55, 1.38, 2.3],
    target: [TX - 0.05, TANK_MID_Y + 0.08, TZ],
    range: 2.6,
    bokeh: 1.2,
    fit: 0.3,
  },
  tank: {
    position: [0.1, TANK_MID_Y + 0.08, TZ + 1.35],
    target: [TX, TANK_MID_Y, TZ],
    range: 0.9,
    bokeh: 2,
    // A close shot: the cabinet may run almost to the edges, which keeps 16:10 screens unchanged.
    fit: 0,
    margin: 0.01,
  },
  glass: {
    position: [0.22, TANK_MID_Y + 0.02, TZ + 0.62],
    target: [TX + 0.05, TANK_MID_Y - 0.02, TZ - 0.05],
    range: 0.35,
    bokeh: 3,
  },
  room: {
    position: [2.55, 1.85, 2.15],
    target: [-0.45, 0.95, -1.3],
    range: 4,
    bokeh: 0.6,
    fit: 0,
  },
};

const BOUNDARY_INSET = 0.25;
/** Where the camera may go: the room, inset from the walls, floor and ceiling. */
export const REACH: Box = {
  min: [-ROOM.width / 2 + BOUNDARY_INSET, 0.3, -ROOM.depth / 2 + BOUNDARY_INSET],
  max: [
    ROOM.width / 2 - BOUNDARY_INSET,
    ROOM.height - BOUNDARY_INSET,
    ROOM.depth / 2 - BOUNDARY_INSET,
  ],
};

/** Cabinet and tank, floor to lid, widened by `pad` either side. */
export const shotSubject = (pad: number): Box => ({
  min: [TX - CABINET.width / 2 - pad, 0, TZ - CABINET.depth / 2],
  max: [TX + CABINET.width / 2 + pad, TY + TANK.height + TANK.lidHeight, TZ + CABINET.depth / 2],
});

/** The shot's camera position and FOV for a screen of `aspect` (width / height). */
export const frameFor = (shot: Shot, aspect: number): Framing =>
  shot.fit === undefined
    ? { position: [...shot.position], fov: BASE_FOV }
    : frameShot(shot.position, shot.target, shotSubject(shot.fit), aspect, REACH, shot.margin);
