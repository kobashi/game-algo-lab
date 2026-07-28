# トピック仕様: Wander / Obstacle Avoidance

| 項目 | 値 |
|------|-----|
| id | `steering-wander-avoid` |
| カテゴリ | ai-steering |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | steering-seek-flee |

## 学習目標
1. Wander は前方円上の揺らぎ点を Seek すると説明できる  
2. 障害物が視野内にあるとき横へ避ける力が出ると観察できる  
3. 2 力の合成で「うろつきつつぶつからない」動きになる  

## 概要
Reynolds 風 Wander + 簡易 Obstacle Avoidance（前方円と障害円の重なり）。
