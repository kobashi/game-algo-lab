# トピック仕様: Leader Following

| 項目 | 値 |
|------|-----|
| id | `steering-leader` |
| カテゴリ | ai-steering |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | steering-seek-flee, boids |

## 学習目標
1. 追従点はリーダーの後ろオフセットだと説明できる  
2. 近すぎると減速、離れすぎると Seek すると観察できる  
3. 複数フォロワーが列をなす様子を見られる  

## 概要
リーダー（操作 or 自動）と複数フォロワー。オフセット点へ Arrive。
