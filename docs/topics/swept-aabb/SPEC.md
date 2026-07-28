# トピック仕様: Swept AABB / TOI

| 項目 | 値 |
|------|-----|
| id | `swept-aabb` |
| カテゴリ | physics |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | collision, raycast-shapes |

## 学習目標
1. 離散判定は高速移動で壁を貫通（トンネリング）し得ると観察できる  
2. Swept は移動区間 [0,1] の最初の衝突時刻 t を求めると説明できる  
3. ヒット時刻で位置を止めると貫通が防げる  

## 概要
動く AABB と静的障害。離散 vs Swept をトグル比較。速度を上げると差が顕著。
