# トピック仕様: Min-Max 探索

| 項目 | 値 |
|------|-----|
| id | `minimax` |
| カテゴリ | game-tree |
| 状態 | implemented |
| 作成日 | 2026-07-17 |
| 依存 | AND-OR（真偽の木）を先に見ると理解が速い |

---

## 1. 学習目標

1. **MAX 節点**は自分（最大化）、**MIN 節点**は相手（最小化）と説明できる  
2. 葉の**局面評価値**を、親が max / min で吸い上げる流れを追える  
3. AND-OR の「真偽」が、Min-Max では「数値の優劣」に一般化されると説明できる  
4. 素の Min-Max は**全子を読む**（枝刈りは次の α-β）と理解できる  

---

## 2. なぜゲームで使うか

交互着手・完全情報のゲーム（将棋・オセロ等）で「相手も最善を取る前提」の読みの基本形。

---

## 3. アルゴリズム概要

```
Minimax(n):
  if n が葉: return n.score
  if n が MAX:
    v = -∞
    for c in children:
      v = max(v, Minimax(c))
    return v
  if n が MIN:
    v = +∞
    for c in children:
      v = min(v, Minimax(c))
    return v
```

- 探索順: 深さ優先・子は左から右  
- 本デモでは α-β 枝刈りは**しない**（全葉を評価しうる）

---

## 4. 画面と操作

- SVG ゲーム木: MAX / MIN / 葉、評価値、評価中ハイライト、最善枝  
- 再生 / 1ステップ / リセット、速度  
- DS: コールスタック、確定した v  

---

## 5. 初期データ

`js/maps/minimax-tree.js` — 2 手読みの小さな対戦木

---

## 6. C#

`samples/MinimaxExample.cs`

---

## 7. PLATFORM 差分

グリッド地図なし（ゲーム木）。レイアウト骨格は準拠。
