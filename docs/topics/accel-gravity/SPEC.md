# トピック仕様: 加速度と重力

| 項目 | 値 |
|------|-----|
| id | `accel-gravity` |
| カテゴリ | physics |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | velocity-motion, game-loop |

## 学習目標
1. `v += a·dt` と `p += v·dt` の二段更新を説明できる  
2. 重力定数を変えると放物線が変わることを観察できる  
3. 速度のみのモデル（velocity-motion）との違いを言える  

## 概要
加速度 a（主に重力 g）で速度を更新し、その速度で位置を更新。床バウンスは vy 反転×反発係数。
