import { describe, it, expect } from 'vitest';
import { SpatialGrid } from '../src/utils/SpatialGrid';
import { Vector3 } from 'three';

describe('SpatialGrid', () => {
  it('correctly adds and queries items', () => {
    const grid = new SpatialGrid<string>(1.0);
    const pos1 = new Vector3(0.5, 0.5, 0.5);
    const pos2 = new Vector3(1.5, 0.5, 0.5);

    grid.add(pos1, 'item1');
    grid.add(pos2, 'item2');

    const results1: string[] = [];
    grid.queryCallback(pos1, 0.6, (item) => results1.push(item));
    expect(results1).toContain('item1');
    expect(results1).toContain('item2');

    const results2: string[] = [];
    grid.queryCallback(new Vector3(10, 10, 10), 0.5, (item) => results2.push(item));
    expect(results2).toHaveLength(0);
  });

  it('benchmarks add and query operations', () => {
    const grid = new SpatialGrid<number>(1.5);
    const count = 5000;
    const items: { pos: Vector3; id: number }[] = [];

    // Simple LCG for deterministic "random" numbers
    let seed = 12345;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      items.push({
        pos: new Vector3((random() - 0.5) * 10, (random() - 0.5) * 4, (random() - 0.5) * 4),
        id: i,
      });
    }

    const start = performance.now();

    // Add
    for (let i = 0; i < count; i++) {
      grid.add(items[i].pos, items[i].id);
    }

    // Query
    let hitCount = 0;
    const queryRadius = 1.0;
    for (let i = 0; i < count; i++) {
      grid.queryCallback(items[i].pos, queryRadius, () => {
        hitCount++;
      });
    }

    const end = performance.now();
    const duration = end - start;
    console.log(
      `BENCHMARK: SpatialGrid operation took: ${duration.toFixed(3)}ms for ${count} items. Hits: ${hitCount}`
    );

    expect(hitCount).toBeGreaterThan(count);
  });
});
