# トピック仕様: ECS 入門

| 項目 | 値 |
|------|-----|
| id | `ecs-intro` |
| カテゴリ | patterns |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | component-vs-inheritance |

## 学習目標
1. Entity は ID、Component はデータ、System は処理だと説明できる  
2. 同じ System が複数 Entity に同じ処理を適用する様子を見られる  
3. 継承ツリーとの違い（データ駆動）を言える  

## 概要
小さな World: Entity 表 + コンポーネント列 + Move/Render 相当の System 実行ログ。
