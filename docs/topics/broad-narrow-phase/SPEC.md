# トピック仕様: Broad / Narrow Phase

| 項目 | 値 |
|------|-----|
| id | `broad-narrow-phase` |
| カテゴリ | spatial |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | uniform-grid, circle-collision |

## 学習目標
1. Broad は粗い候補抽出、Narrow は精密判定だと説明できる  
2. Broad 候補数 ≫ Narrow ヒット数になり得ることを観察できる  
3. 一様グリッドが Broad の一例だと接続できる  

## 概要
Broad=グリッド候補ペア（黄線）、Narrow=実際に重なるペア（赤）。件数を対比表示。
