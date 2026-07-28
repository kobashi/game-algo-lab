# トピック仕様: ビヘイビアツリー

| 項目 | 値 |
|------|-----|
| id | `behavior-tree` |
| カテゴリ | ai-steering |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | fsm |

## 学習目標
1. Selector / Sequence の成功・失敗の伝播を説明できる  
2. 条件ノードと行動ノードの違いを追える  
3. FSM との対比（状態遷移表 vs 木の優先度）を言える  

## 概要
小型 BT: 敵が見える→Chase、見えなければ Patrol。ティックごとの結果を木に着色。
