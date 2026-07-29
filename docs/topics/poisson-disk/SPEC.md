# トピック仕様: Poisson disk サンプリング

| 項目 | 値 |
|------|-----|
| id | `poisson-disk` |
| カテゴリ | procgen |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-29 |
| 依存 | rng-seed, weighted-random |

## 学習目標
1. 点同士の最小距離を保つ配置だと説明できる  
2. グリッド加速 + アクティブリストの Bridson 法を観察できる  
3. 一様乱択より空間が「満遍なく」埋まることを比較できる  
