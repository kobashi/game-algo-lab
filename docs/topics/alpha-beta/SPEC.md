# トピック仕様: α-β 法

| 項目 | 値 |
|------|-----|
| id | `alpha-beta` |
| カテゴリ | game-tree |
| 状態 | implemented |
| 作成日 | 2026-07-17 |
| 依存 | Min-Max（必読） |

---

## 1. 学習目標

1. **α**（MAX が確保した下限）と **β**（MIN が確保した上限）を説明できる  
2. **β カット**（MAX で v≥β）と **α カット**（MIN で v≤α）がいつ起きるか追える  
3. 素の Min-Max と同じ値を返しつつ、**読まない葉**があることを理解する  

---

## 2. アルゴリズム概要

```
AlphaBeta(n, α, β):
  if 葉: return score
  if MAX:
    v = -∞
    for c in children:
      v = max(v, AlphaBeta(c, α, β))
      if v ≥ β: return v   // β カット
      α = max(α, v)
    return v
  if MIN:
    v = +∞
    for c in children:
      v = min(v, AlphaBeta(c, α, β))
      if v ≤ α: return v   // α カット
      β = min(β, v)
    return v
```

根の呼び出し: `AlphaBeta(root, −∞, +∞)`

---

## 3. 初期木の意図

Min-Max と同型に加え、MIN「手 B」に **読まれない葉**（高スコア）を置き、α カットを可視化する。

- A = min(3,12)=3 → 根 α=3  
- B: 8 のあと 2 で v=2 ≤ α → **残り葉を刈る**  
- C = min(4,6)=4 → 根 v=4  

---

## 4. 画面

- SVG 木 + α/β をステータス・スタックに表示  
- 刈られた節点をグレー表示  
- 結果で「評価した葉数」を Min-Max 全葉数と比較  

---

## 5. C#

`samples/AlphaBetaExample.cs`
