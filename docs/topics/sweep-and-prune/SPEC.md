# トピック仕様: Sweep and Prune

| 項目 | 値 |
|------|-----|
| id | `sweep-and-prune` |
| カテゴリ | spatial |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | broad-narrow-phase |

## 学習目標
1. 1 軸上の区間をソートし、重なる区間だけを候補にできる  
2. 総当たりより候補が減ることを観察できる  
3. 軸の選び方の直感を持てる  

## 概要
AABB を X 軸でソートし、sweep で active 集合から候補ペアを生成。Y でも重なるものだけヒット。
