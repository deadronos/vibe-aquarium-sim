# Asset transfer report

## Baseline (v0.1, before the asset optimization pass)

- Fish models: 4,173,384 raw bytes.
- Major JavaScript bundle: 1,409,849 gzip bytes.

## Optimization settings

- glTF Transform 4.5.0
- meshoptimizer 0.23.0
- sharp 0.35.4
- Simplify: weld + meshoptimizer simplifier, 1,500 triangles per fish, error limit 1%
- Meshopt compression level: high
- WebP quality: 82; effort: 6

## Post-build JavaScript

| File                         |     Raw bytes |  Gzip bytes |
| ---------------------------- | ------------: | ----------: |
| index-CL_hJCUd.js            |        78,771 |      27,009 |
| postprocessing-C5800JyJ.js   |       987,946 |     258,700 |
| r3f-8yBlt_En.js              |       173,298 |      51,102 |
| react-B3I4rNpi.js            |       178,720 |      55,544 |
| rolldown-runtime-QTnfLwEv.js |           694 |         422 |
| three-BNr5Xt0t.js            |       248,618 |     102,116 |
| **Total**                    | **1,668,047** | **494,893** |

## Post-build fish models

| File                |   Raw bytes |
| ------------------- | ----------: |
| Copilot3D-fish.glb  |     122,172 |
| Copilot3D-fish2.glb |      77,152 |
| Copilot3D-fish3.glb |     126,648 |
| **Total**           | **325,972** |

Critical first model: **Copilot3D-fish.glb** — **122,172 raw bytes**.
