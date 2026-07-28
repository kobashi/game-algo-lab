# トピック仕様: 衝突応答

| 項目 | 値 |
|------|-----|
| id | `collision-response` |
| カテゴリ | physics |
| UI 型 | explain |
| 状態 | implemented |
| 成熟度 | oneshot |
| 作成日 | 2026-07-27 |
| 依存 | circle-collision, friction-bounce |

## 学習目標
1. めり込みを法線方向に押し戻す（位置補正）ができる  
2. 相対速度の法線成分から反発インパルスを与えられる  
3. 判定だけ（circle-collision）との違いを言える  

## 概要
2円の動力学。重なり検出 → 分離 → 法線インパルス（反発係数 e）。
