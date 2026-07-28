# トピック仕様: 円同士・円と AABB

| 項目 | 値 |
|------|-----|
| id | `circle-collision` |
| カテゴリ | physics |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | collision (AABB) |

## 学習目標
1. 円同士は中心距離 ≤ r1+r2 で重なりと判定できる  
2. 円と AABB は最近点への距離で判定できる（Clamp）  
3. AABB の軸投影判定との使い分けを言える  

## 概要
ドラッグ可能な円と矩形。円-円 / 円-AABB の結果と公式をライブ表示。
