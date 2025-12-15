import { Vector3 } from 'three';

export class SpatialGrid<T> {
  private cellSize: number;
  private buckets: Map<string, T[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  // Convert 3D position to a unique string key "x,y,z"
  private getKey(pos: Vector3): string {
    const x = Math.floor(pos.x / this.cellSize);
    const y = Math.floor(pos.y / this.cellSize);
    const z = Math.floor(pos.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  // Get keys for all cells touching the query sphere
  private getKeysForRange(pos: Vector3, radius: number): string[] {
    const keys: string[] = [];
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          keys.push(`${x},${y},${z}`);
        }
      }
    }
    return keys;
  }

  clear() {
    this.buckets.clear();
  }

  add(pos: Vector3, item: T) {
    const key = this.getKey(pos);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(item);
  }

  // Optimize: Use a callback to avoid array allocation
  queryCallback(pos: Vector3, radius: number, callback: (item: T) => void) {
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x},${y},${z}`;
          const items = this.buckets.get(key);
          if (items) {
            for (let i = 0; i < items.length; i++) {
              callback(items[i]);
            }
          }
        }
      }
    }
  }

  query(pos: Vector3, radius: number): T[] {
    const results: T[] = [];
    const keys = this.getKeysForRange(pos, radius);

    // Use a Set if you need to deduplicate items that might be in multiple buckets
    // (though in this implementation, an item is only added to ONE bucket based on its center).
    // So simple concatenation is fine.

    for (const key of keys) {
      const items = this.buckets.get(key);
      if (items) {
        for (const item of items) {
          results.push(item);
        }
      }
    }
    return results;
  }
}
