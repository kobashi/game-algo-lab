# トピック仕様: コマンドパターン

| 項目 | 値 |
|------|-----|
| id | `command-pattern` |
| カテゴリ | patterns |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | event-system（疎結合の文脈） |

## 学習目標
1. 操作を「実行可能なオブジェクト」に包むと Undo ができると説明できる  
2. 履歴スタックの push / pop を観察できる  
3. 直接状態書き換えとの違いを言える  

## 概要
Move / Paint コマンドが `execute` / `undo` を持つ。履歴に積み、Undo で逆再生。
