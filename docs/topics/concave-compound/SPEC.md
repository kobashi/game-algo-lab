# トピック仕様: 凹形状の凸分割

| 項目 | 値 |
|------|-----|
| id | `concave-compound` |
| カテゴリ | physics |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | circle-collision, obb-sat |

## 学習目標
1. 凹多角形は複数の凸部品（複合コライダー）で近似できる  
2. 点-in-polygon と凸部品 AABB の役割分担を説明できる  
3. 単一 AABB では誤ヒットし得ることを比較できる  
