# トピック仕様: Seek / Flee / Arrive

| 項目 | 値 |
|------|-----|
| id | `steering-seek-flee` |
| カテゴリ | ai-steering |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | velocity-motion, accel-decel |

## 学習目標
1. Seek は目標方向の希望速度へ舵力を出すと説明できる  
2. Flee は逆方向、Arrive は近距離で減速すると分かる  
3. 力ベクトルを画面上で観察できる  

## 概要
エージェント1体 + ターゲット（マウス/クリック）。モード切替で Seek/Flee/Arrive。
