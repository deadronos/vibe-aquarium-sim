# Asset transfer report

## Baseline

- Fish models: 4,173,384 raw bytes.
- Major JavaScript bundle: 1,409,849 gzip bytes.

## Optimization settings

- glTF Transform 4.5.0
- meshoptimizer 0.23.0
- sharp 0.35.4
- Meshopt compression level: high
- WebP quality: 82; effort: 6

## Post-build JavaScript

| File                         |     Raw bytes |    Gzip bytes |
| ---------------------------- | ------------: | ------------: |
| SimulationScene-CCmQ_URH.js  |        92,404 |        28,959 |
| boids.worker-BzFvhpQq.js     |         9,187 |         3,042 |
| index-Bg3z09lx.js            |        19,906 |         6,389 |
| miniplex-CcSsTDiU.js         |        15,321 |         3,691 |
| r3f-drei-BBowdFUa.js         |     1,102,772 |       295,112 |
| rapier-OqXz4Tqe.js           |     2,259,862 |       843,205 |
| rolldown-runtime-QTnfLwEv.js |           694 |           423 |
| vendor-CjzUeMs7.js           |       813,431 |       231,758 |
| **Total**                    | **4,313,577** | **1,412,579** |

## Post-build fish models

| File                |   Raw bytes |
| ------------------- | ----------: |
| Copilot3D-fish.glb  |     143,492 |
| Copilot3D-fish2.glb |      94,096 |
| Copilot3D-fish3.glb |     158,220 |
| **Total**           | **395,808** |

Critical first model: **Copilot3D-fish.glb** — **143,492 raw bytes**.
