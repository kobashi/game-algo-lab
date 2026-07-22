# トピック仕様: 時間管理

| 項目 | 値 |
|------|-----|
| id | `time-management` |
| カテゴリ | fundamentals（基礎実行モデル） |
| UI 型 | explain |
| 著者 | Grok4.5 |
| 状態 | implemented |
| **成熟度** | `oneshot` |
| 作成日 | 2026-07-22 |
| 最終改訂 | 2026-07-22 |
| 依存 | `game-loop`（フレームと dt の前提） |
| 正本 | §4 基礎実行モデル |

---

## 1. 学習目標

1. **壁時計（real time）** と **ゲーム内時間（game time）** を区別して説明できる  
2. **time scale**（1=等倍、0=ポーズ、&lt;1=スロー、&gt;1=早送り）が `scaledDt = realDt × scale` として更新に効くことを観察できる  
3. ポーズ中はシミュレーションが進まず、解除後も破綻なく再開できることを確認できる  

---

## 2. なぜゲームで使うか

メニュー表示、ヒットストップ、スローモーション、デバッグの早送りはすべて「時間の倍率」で統一すると実装が単純になる。物理や AI は game time、UI は real time で動かす、といった分離の入口。

---

## 3. アルゴリズム概要

```
realDt = now - last
if paused:
  scaledDt = 0
else:
  scaledDt = realDt * timeScale

gameTime += scaledDt
update(world, scaledDt)   // アニメ・物理は scaledDt
// UI の点滅などは realDt でもよい（本デモでは game 側に集中）
```

デモ世界: 往復するキャラ（x 位置）、gameTime で駆動する回転マーカ。

---

## 4. 画面と操作

| 操作 | 挙動 |
|------|------|
| 再生 / 一時停止 | ループ。一時停止は scale を維持したままループ停止でも可。**ポーズ**は scale と独立トグル |
| 1フレーム | realDt≈16.7ms を 1 回適用（ポーズ中も scale に従う） |
| リセット | 時刻・位置クリア |
| タイムスケール | 0〜3（0 でもポーズボタンと同義になりうるが、ポーズは明示フラグ） |
| ポーズ | game 時間停止（scale 値は保持） |

表示: 壁時計経過、ゲーム内経過、現在 scale、scaledDt ログ。

---

## 5. ファイル

```
docs/topics/time-management/SPEC.md
algorithms/time-management.html
js/time-management.js
js/maps/time-management-config.js
samples/TimeManagementExample.cs
```
