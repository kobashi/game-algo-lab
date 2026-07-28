# トピック仕様: 摩擦・反発

| 項目 | 値 |
|------|-----|
| id | `friction-bounce` |
| カテゴリ | physics |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | accel-gravity |

## 学習目標
1. 床バウンスで法線方向速度が反発係数で縮むことを説明できる  
2. 接地中の摩擦で水平速度が減衰することを観察できる  
3. 反発 0 / 摩擦 0 の極端ケースの違いを言える  

## 概要
重力下のボール。床ヒット時 `vy = -vy * restitution`、接地中は `vx *= (1 - friction*dt)`。
