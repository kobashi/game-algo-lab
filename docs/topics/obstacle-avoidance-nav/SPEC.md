# トピック仕様: 障害物回避（ナビ連携）

| 項目 | 値 |
|------|-----|
| id | `obstacle-avoidance-nav` |
| カテゴリ | ai-steering |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | steering-seek-flee, bfs |

## 学習目標
1. 大域経路（グリッド BFS）と局所ステアリングを組み合わせられる  
2. 経路ウェイポイントへ Seek しつつ壁を避ける流れを観察できる  
3. 経路なし直進 Seek との差を比較できる  
