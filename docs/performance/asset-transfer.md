# Asset transfer report

## Baseline (v0.1, before the asset optimization pass)

- Fish models: 4,173,384 raw bytes.
- Major JavaScript bundle: 1,409,849 gzip bytes.

## Optimization settings

- glTF Transform 4.5.0
- meshoptimizer 0.23.0
- sharp 0.35.4
- Meshopt compression level: high
- WebP quality: 82; effort: 6

## Post-build JavaScript

| File                         |     Raw bytes |  Gzip bytes |
| ---------------------------- | ------------: | ----------: |
| index-D1I2QU53.js            |        76,806 |      26,150 |
| postprocessing-C5800JyJ.js   |       987,946 |     258,700 |
| r3f-8yBlt_En.js              |       173,298 |      51,102 |
| react-B3I4rNpi.js            |       178,720 |      55,544 |
| rolldown-runtime-QTnfLwEv.js |           694 |         422 |
| three-BNr5Xt0t.js            |       248,618 |     102,116 |
| **Total**                    | **1,666,082** | **494,034** |

## Post-build fish models

| File                |   Raw bytes |
| ------------------- | ----------: |
| Copilot3D-fish.glb  |     143,492 |
| Copilot3D-fish2.glb |      94,096 |
| Copilot3D-fish3.glb |     158,220 |
| **Total**           | **395,808** |

Critical first model: **Copilot3D-fish.glb** — **143,492 raw bytes**.
