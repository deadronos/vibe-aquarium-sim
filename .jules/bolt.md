## 2025-12-16 - Spatial Hashing Key Optimization

**Learning:** Replacing string keys (e.g., "1,2,3") with integer hashes in high-frequency spatial loops eliminates string allocation overhead. Even when keys exceed Smi range (requiring doubles), it avoids the expensive string interning/creation process.
**Action:** Use integer packing for Grid/Map keys in render loops.
