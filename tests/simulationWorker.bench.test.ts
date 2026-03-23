import { describe, it, expect } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import type { SimulationInput } from '../src/workers/boids/types';

describe('simulationWorker benchmark', () => {
    it('benchmarks worker performance with many boids', () => {
        const fishCount = 5000;
        const positions = new Float32Array(fishCount * 3);
        const velocities = new Float32Array(fishCount * 3);
        const modelIndices = new Int32Array(fishCount);

        for (let i = 0; i < fishCount; i++) {
            const b = i * 3;
            positions[b] = (Math.random() - 0.5) * 100;
            positions[b + 1] = (Math.random() - 0.5) * 40;
            positions[b + 2] = (Math.random() - 0.5) * 100;

            velocities[b] = (Math.random() - 0.5) * 5;
            velocities[b + 1] = (Math.random() - 0.5) * 5;
            velocities[b + 2] = (Math.random() - 0.5) * 5;
            modelIndices[i] = i % 3;
        }

        const input: SimulationInput = {
            fishCount,
            positions,
            velocities,
            modelIndices,
            species: [
                { maxSpeed: 0.5, maxForce: 0.6, neighborDist: 0.5, separationDist: 0.2, weights: { separation: 2.5, alignment: 1.0, cohesion: 1.2 } },
                { maxSpeed: 0.35, maxForce: 0.4, neighborDist: 0.7, separationDist: 0.3, weights: { separation: 2.0, alignment: 1.0, cohesion: 1.0 } },
                { maxSpeed: 0.25, maxForce: 0.3, neighborDist: 0.4, separationDist: 0.4, weights: { separation: 3.0, alignment: 0.5, cohesion: 0.5 } }
            ],
            foodCount: 10,
            foodPositions: new Float32Array(30),
            time: 1.0,
            boids: {
                neighborDist: 10,
                separationDist: 5,
                maxSpeed: 5,
                maxForce: 0.1,
            },
            bounds: { x: 50, y: 20, z: 50 },
            water: { density: 1, dragCoefficient: 0.01, crossSectionArea: 1 },
            current: {
                strength: 0.03,
                frequency1: 0.2,
                frequency2: 0.13,
                spatialScale1: 0.5,
                spatialScale2: 0.3,
            },
        } as SimulationInput;

        const iterations = 50;

        // Warmup
        simulateStep(input);

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            input.time += 1 / 60;
            simulateStep(input);
        }
        const end = performance.now();

        const duration = end - start;
        const avgDuration = duration / iterations;

        console.log(`BENCHMARK: simulationWorker took ${duration.toFixed(2)}ms for ${iterations} frames (${avgDuration.toFixed(2)}ms/frame) with ${fishCount} fish.`);

        // An average frame should definitely be under 100ms for this optimization test
        expect(avgDuration).toBeLessThan(100);
    });
});
