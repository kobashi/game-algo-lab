# トピック仕様: ゲームロジックのテスト

| 項目 | 値 |
|------|-----|
| id | `unit-test-gameplay` |
| カテゴリ | quality |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-28 |
| 依存 | collision, momentum-1d |

## 学習目標
1. 描画なしで純関数のゲームロジックを検証できる  
2. 衝突・ダメージなど境界ケースを表で PASS/FAIL できる  
3. ブラウザでも同じアサーションを回せる（Node 文化と接続）  
