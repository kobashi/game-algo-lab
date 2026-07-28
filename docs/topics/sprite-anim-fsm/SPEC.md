# トピック仕様: スプライトアニメ × FSM

| 項目 | 値 |
|------|-----|
| id | `sprite-anim-fsm` |
| カテゴリ | graphics |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | gfx-sprite-2d, fsm |

## 学習目標
1. 状態ごとにアニメクリップ（フレーム列）を切り替えられる  
2. 入力イベントで idle/run/jump 等へ遷移できる  
3. FSM とスプライト表示が接続していると説明できる  
