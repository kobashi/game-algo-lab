# トピック仕様: ゲームループ

| 項目 | 値 |
|------|-----|
| id | `game-loop` |
| カテゴリ | fundamentals（基礎実行モデル） |
| UI 型 | explain（非マップ・キャンバス + 計測） |
| 著者 | Grok4.5 |
| 状態 | implemented |
| **成熟度** | `oneshot` |
| 作成日 | 2026-07-22 |
| 最終改訂 | 2026-07-22 |
| 依存 | —（カテゴリ入口） |
| 正本 | §4 基礎実行モデル |

---

## 1. 学習目標

1. 1 フレームが **入力 → 更新 → 描画** の繰り返しであることを説明できる  
2. **可変 timestep**（そのフレームの実経過時間 dt で 1 回更新）と **固定 timestep**（固定 Δt を溜めて複数回更新）の違いを観察できる  
3. 重いフレームで固定 step が積み上がると **スパイラル・オブ・デス**（1 フレーム内の更新回数が膨らむ）が起きうることと、**最大ステップ数クランプ**の役割を説明できる  

---

## 2. なぜゲームで使うか

ゲームは「壁時計」と「シミュレーション時計」がずれる。フレーム落ち・PC 差・タブ復帰で dt が跳ねると、物理が爆発したり再生速度が変わったりする。ループの設計はその土台。

---

## 3. アルゴリズム概要

### 可変 timestep

```
loop:
  dt = now - last
  last = now
  update(world, dt)   // 1 回
  render(world)
```

### 固定 timestep（アキュムレータ）

```
loop:
  dt = now - last
  last = now
  acc += min(dt, maxFrame)   // 巨大 dt を抑える任意
  steps = 0
  while acc >= FIXED_DT and steps < MAX_STEPS:
    update(world, FIXED_DT)
    acc -= FIXED_DT
    steps++
  alpha = acc / FIXED_DT     // 描画補間用（v1 は表示のみ）
  render(world)              // v1 は補間なしでも可
```

- デモの「世界」: 1 次元の跳ねるボール（位置 x、速度 v、床で反射）  
- 重いフレームの模擬: 人工遅延 ms を足して dt を膨らませる  

---

## 4. 画面と操作

### 可視化

- キャンバス: ボール位置（固定/可変で色分け or モード切替）  
- タイムライン風ログ: 直近フレームの realDt / update 回数 / accumulator  
- フェーズ表示: 更新中 / 描画中（1 ステップ実行時）

### 操作

| 操作 | 挙動 |
|------|------|
| 再生 | 実時間ループ（requestAnimationFrame 相当の setTimeout 連鎖 or rAF） |
| 1ステップ | 1 フレーム分を手動実行 |
| リセット | 位置・速度・統計クリア |
| モード | 可変 / 固定 |
| FIXED_DT | 1/30〜1/120 相当（ms） |
| 人工遅延 | 0〜80ms（重いフレーム模擬） |
| MAX_STEPS | 1〜16（スパイラル防止） |

---

## 5. 成功定義

- 可変: フレームごとに update 1 回、遅延を上げるとボールの挙動が粗くなる/跳ね方が変わる様子が分かる  
- 固定: 遅延があっても物理の 1 ステップは FIXED_DT 固定。MAX_STEPS を下げると更新が追いつかずログに警告  
- C# サンプルに可変/固定の核を載せる  

---

## 6. ファイル

```
docs/topics/game-loop/SPEC.md
algorithms/game-loop.html
js/game-loop.js
js/maps/game-loop-config.js
samples/GameLoopExample.cs
```

ナビ: `data-nav="explain"` に fundamentals を足すか、explain グループに game-loop を追加。  
カテゴリ表示名: **基礎実行** / badge 同様。

---

## 7. カテゴリ内の学習順（メモ）

```
game-loop → time-management → input-basics → coordinates → rng-seed
```

本トピックが入口。time-management は dt/ポーズ/スローを本デモの発展として接続。
