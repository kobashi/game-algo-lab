# トピック仕様: UI 描画（Canvas・Anchor・Pivot）

| 項目 | 値 |
|------|-----|
| id | `gfx-ui-canvas` |
| カテゴリ | graphics |
| 状態 | implemented |
| 成熟度 | revised（修正4・更新 2026-09-26） |
| 最終改訂 | 2026-09-26: Pivot X / Y の 0 が既定の 0.5 に置き換わっていたのを修正。入門コースの課題カード追加（[入門コース改善計画](../../reviews/2026-09-26-intro-course-improvement-plan.md)） |
| 作成日 | 2026-07-28 |
| 依存 | coordinates, gfx-sprite-2d |

## 学習目標
1. Anchor が親矩形のどの点に貼るかを説明できる  
2. Pivot が要素自身の原点であることを観察できる  
3. 解像度（キャンバスサイズ）を変えても Anchor 付き UI が端に追従することを確認できる  

## 操作
- Anchor プリセット、Pivot スライダー
- 仮想解像度切替
- 幅の連続スライダー（320〜960 step 10）で崩れる瞬間を見る
- 比較用に左上アンカーの要素を同時表示
- ドラッグでオフセット
- URL: `res,vieww,anchor,px,py`

## 成功条件
Anchor=右下 + Pivot=中心で、解像度変更後も角付近に張り付く。
