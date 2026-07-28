# トピック仕様: ナビメッシュ入門（2D）

| 項目 | 値 |
|------|-----|
| id | `navmesh-intro` |
| カテゴリ | pathfinding |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | astar, coordinates |

## 学習目標
1. 歩行可能領域を多角形メッシュで表せると説明できる  
2. ポリゴン中心のグラフ上で経路を求められる  
3. 直線ショートカット（簡易 string pulling）で滑らかになると観察できる  
