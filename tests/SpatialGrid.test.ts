import { describe, it, expect } from 'vitest';
import { SpatialGrid } from '../src/utils/SpatialGrid';
import { Vector3 } from 'three';

describe('SpatialGrid Unit Tests', () => {
  it('correctly adds and queries items using the query method', () => {
    const grid = new SpatialGrid<string>(1.0);
    const pos1 = new Vector3(0.5, 0.5, 0.5);
    const pos2 = new Vector3(1.5, 0.5, 0.5);

    grid.add(pos1, 'item1');
    grid.add(pos2, 'item2');

    const results = grid.query(pos1, 0.6);
    expect(results).toContain('item1');
    expect(results).toContain('item2');
    expect(results.length).toBe(2);

    const emptyResults = grid.query(new Vector3(10, 10, 10), 0.5);
    expect(emptyResults).toHaveLength(0);
  });

  it('clears the grid correctly', () => {
    const grid = new SpatialGrid<string>(1.0);
    grid.add(new Vector3(0, 0, 0), 'item1');

    expect(grid.query(new Vector3(0, 0, 0), 1).length).toBe(1);

    grid.clear();

    expect(grid.query(new Vector3(0, 0, 0), 1).length).toBe(0);
  });

  it('handles negative coordinates correctly', () => {
    const grid = new SpatialGrid<string>(1.0);
    const pos = new Vector3(-0.5, -0.5, -0.5);
    grid.add(pos, 'negative');

    const results = grid.query(pos, 0.5);
    expect(results).toContain('negative');
  });

  it('handles boundaries correctly', () => {
    const cellSize = 10;
    const grid = new SpatialGrid<string>(cellSize);

    // Items at the edge of cells
    const pos1 = new Vector3(9.9, 0, 0);
    const pos2 = new Vector3(10.1, 0, 0);

    grid.add(pos1, 'left');
    grid.add(pos2, 'right');

    // Querying around the boundary should return both if radius is large enough
    const results = grid.query(new Vector3(10, 0, 0), 1);
    expect(results).toContain('left');
    expect(results).toContain('right');
  });

  it('handles large coordinates within supported range', () => {
     const grid = new SpatialGrid<string>(10);
     const pos = new Vector3(1000, 1000, 1000);
     grid.add(pos, 'far');

     const results = grid.query(pos, 10);
     expect(results).toContain('far');
  });
});
