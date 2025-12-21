Summary Verification (multithreading README)

Accurate: it provides a pooled spawn() API and move() for passing arguments (ArrayBuffers are transferable; other values are cloned), plus worker reuse/affinity for repeated functions. citeturn0open5turn0open6turn0open9
Accurate: sync primitives include Mutex, RwLock, Semaphore, Condvar, and Barrier. citeturn0open2
Accurate with a nuance: SharedJsonBuffer is a SharedArrayBuffer-backed JSON-like shared state helper; synchronization primitives are separate but can be combined for safe mutation. citeturn0open7turn0open2
Accurate: bounded MPMC channels with async send/recv are included. citeturn0open8
Accurate: dynamic imports inside worker functions are supported via relative path remapping. citeturn0open1
Accurate: targets Browser/Node/Deno/Bun, and SharedArrayBuffer features require cross‑origin isolation in browsers. citeturn0open0turn0open7
Offloaded boids + water force math to multithreading workers, keeping ECS→Physics flow intact and removing main‑thread water systems to avoid double application. Main changes are in BoidsSystem.tsx, simulationWorker.ts, and App.tsx, with new design/task records in memory/.

Changes

Added worker kernel that computes boid steering, food seeking, water current, and drag in simulationWorker.ts.
Refactored BoidsSystem.tsx to snapshot ECS data, spawn a worker job, apply results on the next fixed step, and handle food removal/effects.
Removed WaterCurrentSystem/WaterResistanceSystem wiring from App.tsx to avoid double forces.
Documented requirements/design/task progress in requirements.md, DES014-worker-simulation-offload.md, and TASK012-worker-offload-multithreading.md.
Tests

npm run format
npm run lint -- --max-warnings=0 (npm warns about --max-warnings config, but lint completed)
Next steps

If you want zero‑copy shared state, we can add COOP/COEP headers and switch to SharedArrayBuffer/SharedJsonBuffer for the worker inputs.
Profile worker latency at higher fish counts to see if we should allow double-buffered in‑flight jobs.