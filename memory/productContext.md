# Product Context

## Why this project exists

An aquarium is one of the most relaxing things to have in a room. Vibe Aquarium recreates that
feeling on a screen: not a tank floating in a void, but a tank that belongs to a lived-in room,
with light that changes through the day.

## How it should work

- The app opens on a seated "Sofa" view of the room with the tank as the focal point.
- The clock follows local time by default: sunlight crosses the floor through the window, the
  floor lamp comes on in the evening, and the tank LED runs 09:00–21:00 before switching to
  blue moonlight. Fish slow down and settle low at night.
- Visitors can feed the fish (click the water, F, or the Feed button), switch viewpoints (Sofa,
  Tank, Up close, Room, Follow a fish), scrub or speed up the clock, and turn on ambient sound.
- The HUD stays out of the way: it fades after a few seconds without input and can be hidden.

## User experience goals

- Calm first: soft motion, no sudden camera jumps (viewpoints ease between shots).
- Depth: water tint, caustics, light shafts, suspended particles and depth of field make the tank
  read as a volume of water.
- Runs well on ordinary hardware; degrades gracefully to Lite instead of stuttering.
