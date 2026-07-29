# トピック仕様: Verlet 積分 · 距離拘束

| 項目 | 値 |
|------|-----|
| id | `verlet-integration` |
| カテゴリ | physics |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-29 |
| 依存 | velocity-motion, momentum-1d |

## 学習目標
1. 速度を陽に持たず位置履歴で積分できる（Verlet）  
2. 距離拘束の反復で棒・ロープが硬く見える  
3. 速度積分との違い（安定・拘束向き）を説明できる  
