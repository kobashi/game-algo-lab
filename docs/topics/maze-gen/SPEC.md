# トピック仕様: 迷路生成

| 項目 | 値 |
|------|-----|
| id | `maze-gen` |
| カテゴリ | procgen（プロシージャル） |
| UI 型 | explain / グリッド可視化 |
| 著者 | Grok4.5 |
| 状態 | implemented |
| **成熟度** | `oneshot` |
| 作成日 | 2026-07-23 |
| 最終改訂 | 2026-07-23 |
| 依存 | `rng-seed`（シード）、`dfs`/`bfs`（探索との接続） |
| 正本 | §4 プロシージャル・確率・バランス |

---

## 1. 学習目標

1. 迷路を **セル間の壁の有無**として表し、生成が「壁を壊して道を伸ばす」過程だと説明できる  
2. **Recursive Backtracker（DFS）** と **Prim 風** の広がり方の違いを観察できる  
3. **同じシード**なら同じ迷路が再現し、アルゴリズムが違うと構造が変わることを確認できる  

---

## 2. なぜゲームで使うか

ローグライク・ダンジョンの通路生成の入口。決定論シードで「友達と同じダンジョン」やデバッグ再現が可能。生成後に BFS で到達性を検証する流れは `constrained-gen` への橋。

---

## 3. アルゴリズム概要

グリッドは奇数サイズのセル（通路）と壁の交互表現、またはセル中心グラフの壁フラグ。

### Recursive Backtracker
```
stack = [start]
visit start
while stack:
  c = stack.top
  if unvisited neighbor:
    remove wall between c and n
    visit n; push n
  else:
    pop  // backtrack
```

### Prim 風（ frontier 集合）
```
visit start; frontier = neighbors of start
while frontier:
  pick random f from frontier
  connect to a random visited neighbor
  visit f; expand frontier
```

乱数: `mulberry32(seed)`。

---

## 4. 操作

| 操作 | 挙動 |
|------|------|
| アルゴリズム | DFS backtracker / Prim |
| シード | 数値・+1・ランダム |
| サイズ | 奇数セル数（例 11〜31） |
| 再生 / 1ステップ | 生成過程を可視化 |
| リセット | 空の迷路に戻す |
| 生成（一括） | 最後まで生成 |

---

## 5. ファイル

```
docs/topics/maze-gen/SPEC.md
algorithms/maze-gen.html
js/maze-gen.js
js/maps/maze-gen-config.js
samples/MazeGenExample.cs
```
