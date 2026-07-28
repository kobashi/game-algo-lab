# トピック仕様: 回転中の衝突

| 項目 | 値 |
|------|-----|
| id | `rotating-collision` |
| カテゴリ | physics |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | rotational-motion, obb-sat, collision-response |

## 学習目標
1. 回転する OBB 同士を SAT で毎フレーム判定できる  
2. 重なり時に中心方向へ押し戻し、角速度も減衰できる  
3. 回転を無視した AABB 近似との違いを観察できる  
