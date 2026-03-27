import { useEffect } from 'react';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from '../config/constants';
import { world } from '../store';
import type { Entity } from '../store';

export const Spawner = () => {
    useEffect(() => {
        const spawnedEntities: Entity[] = [];

        // Spawn 30 fish
        for (let i = 0; i < 30; i++) {
            const entity = world.add({
                isFish: true,
                isBoid: true,
                position: new Vector3(
                    (Math.random() - 0.5) * (SIMULATION_BOUNDS.x * 2),
                    (Math.random() - 0.5) * (SIMULATION_BOUNDS.y * 2),
                    (Math.random() - 0.5) * (SIMULATION_BOUNDS.z * 2)
                ),
                velocity: new Vector3(
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 1
                ),
                steeringForce: new Vector3(),
                externalForce: new Vector3(),
                targetVelocity: new Vector3(),
                excitementLevel: 0,
                modelIndex: Math.floor(Math.random() * 3) as 0 | 1 | 2,
                excitementDecay: 0,
            });
            spawnedEntities.push(entity);
        }

        // Spawn Decorations (Tasteful Scatter)
        const spawnDecoration = (type: 'seaweed' | 'coral' | 'rock', count: number) => {
            for (let i = 0; i < count; i++) {
                const x = (Math.random() - 0.5) * (TANK_DIMENSIONS.width - 0.4); // Margin from walls
                const z = (Math.random() - 0.5) * (TANK_DIMENSIONS.depth - 0.4);
                const y = -TANK_DIMENSIONS.height / 2; // On the floor

                // Seed decoration properties at spawn time (pure, non-render code)
                let decorationProps: Record<string, unknown> = {};
                if (type === 'seaweed') {
                    decorationProps = {
                        blades: [
                            { height: 0.4 + Math.random() * 0.2, offset: 0, phase: Math.random() * Math.PI * 2 },
                            {
                                height: 0.3 + Math.random() * 0.15,
                                offset: 0.05,
                                phase: Math.random() * Math.PI * 2,
                            },
                            {
                                height: 0.35 + Math.random() * 0.15,
                                offset: -0.04,
                                phase: Math.random() * Math.PI * 2,
                            },
                        ],
                    };
                } else if (type === 'coral') {
                    const colors = ['#ff6b6b', '#ff8e72', '#ffa07a', '#e056fd'];
                    decorationProps = { color: colors[Math.floor(Math.random() * colors.length)] };
                } else if (type === 'rock') {
                    const s = 0.8 + Math.random() * 0.4;
                    const gray = 0.3 + Math.random() * 0.2;
                    decorationProps = { scale: s, color: new THREE.Color(gray, gray * 0.95, gray * 0.9) };
                }

                const entity = world.add({
                    isDecoration: true,
                    decorationType: type,
                    position: new Vector3(x, y, z),
                    decorationProps,
                });
                spawnedEntities.push(entity);
            }
        };

        spawnDecoration('seaweed', 5);
        spawnDecoration('coral', 5);
        spawnDecoration('rock', 5);

        if (typeof window !== 'undefined') {
            window.__vibe_addFish = (n: number) => {
                let added = 0;
                for (let i = 0; i < n; i++) {
                    const entity = world.add({
                        isFish: true,
                        isBoid: true,
                        position: new Vector3(
                            (Math.random() - 0.5) * (SIMULATION_BOUNDS.x * 2),
                            (Math.random() - 0.5) * (SIMULATION_BOUNDS.y * 2),
                            (Math.random() - 0.5) * (SIMULATION_BOUNDS.z * 2)
                        ),
                        velocity: new Vector3(
                            (Math.random() - 0.5) * 1,
                            (Math.random() - 0.5) * 1,
                            (Math.random() - 0.5) * 1
                        ),
                        steeringForce: new Vector3(),
                        externalForce: new Vector3(),
                        targetVelocity: new Vector3(),
                        excitementLevel: 0,
                modelIndex: Math.floor(Math.random() * 3) as 0 | 1 | 2,
                        excitementDecay: 0,
                    });
                    spawnedEntities.push(entity);
                    added++;
                }
                return added;
            };
        }

        return () => {
            // Cleanup dynamically spawned entities on unmount
            spawnedEntities.forEach((ent) => {
                if (world.has(ent)) {
                    world.remove(ent);
                }
            });
            if (typeof window !== 'undefined') {
                delete (window as any).__vibe_addFish;
            }
        };
    }, []);
    return null;
};
