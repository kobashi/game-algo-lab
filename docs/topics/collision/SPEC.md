# トピック仕様: AABB 衝突判定

| 項目 | 値 |
|------|-----|
| id | `collision` |
| カテゴリ | physics |
| 状態 | implemented |
| 作成日 | 2026-07-17 |
| 依存 | — |

---

## 1. 学習目標

1. AABB が **min/max** で表せると説明できる  
2. **A. ポジティブ（重なり）** と **B. ネガティブ（分離）** の2通りで実装できる  
3. 両者がド・モルガンで同値であること、結果が一致することを確認できる  
4. 比較回数・論理演算・早期 return など **複雑度の目安** を並べて議論できる  
5. 2D を **軸投影（1D）** に分解して判定する流れを追える  

---

## 2. 画面方針（経路探索マップとは別）

本トピックはグリッド探索 UI を使わない。**説明特化レイアウト**:

| 領域 | 役割 |
|------|------|
| 2D ステージ | 2 つの AABB をドラッグして直感操作 |
| X / Y 投影レール | 各軸の 1D 区間と重なりを同時表示 |
| 判定チェックリスト | 条件式の真偽をライブ表示 |
| プリセット | 離隔・交差・接触・包含などの典型ケース |

再生＝自動で「離れる→近づく→交差」デモ。1ステップ＝判定条件を X→Y→結論の順にハイライト。

---

## 3. アルゴリズム（2 通り + 早期 return）

境界は **inclusive**（接したら当たり）。

### A. ポジティブ（重なり判定）

```
overlapX = A.maxX >= B.minX && A.minX <= B.maxX
overlapY = A.maxY >= B.minY && A.minY <= B.maxY
return overlapX && overlapY
```

### B. ネガティブ（分離判定）

```
separatedX = A.maxX < B.minX || A.minX > B.maxX
separatedY = A.maxY < B.minY || A.minY > B.maxY
return !(separatedX || separatedY)
```

### B′ 早期 return（実装でよく見る形）

```
if (A.maxX < B.minX) return false
if (A.minX > B.maxX) return false
if (A.maxY < B.minY) return false
if (A.minY > B.maxY) return false
return true
```

ド・モルガンより A ⇔ B ⇔ B′（同一の inclusive 定義下）。

---

## 4. C#

`samples/AabbExample.cs`

---

## 5. PLATFORM 差分

- 地図・コスト塗り・経路探索 DS は不使用  
- 共通: ヘッダー、details 解説、C# サンプル、再生/ステップ/リセットの操作感  
