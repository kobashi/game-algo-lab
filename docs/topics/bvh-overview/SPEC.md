# トピック仕様: BVH 概説

| 項目 | 値 |
|------|-----|
| id | `bvh-overview` |
| カテゴリ | spatial |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | quadtree, broad-narrow-phase |

## 学習目標
1. BVH は物体の AABB を階層にまとめた木だと説明できる  
2. クエリ AABB と交差しない枝を剪定できることを観察できる  
3. 四分木（空間固定分割）との違いを言える  

## 概要
葉=各オブジェクト AABB。親=子の AABB 合併。上から構築し、クエリ矩形で候補を数える。
