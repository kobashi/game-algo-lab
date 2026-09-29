# トピック仕様: 入力の基礎

| 項目 | 値 |
|------|-----|
| id | `input-basics` |
| カテゴリ | fundamentals |
| UI 型 | explain |
| 著者 | Grok4.5 |
| 状態 | implemented |
| **成熟度** | `revised` |
| 作成日 | 2026-07-22 |
| 最終改訂 | 2026-09-29: Charge は閾値で 1 回消費し、ゲージを空にして金色の弾を 1 発出す（`ConsumeCharge`）。2026-09-29: Fire は held のあいだ毎フレーム +1、Z の up で回数を 0 に戻す（`ApplyFire`）。2026-09-28: 提出課題と提出票を追加（js/platform/submission.js）。2026-09-27: Jump の down で箱が 0.48 秒の放物線を 1 回描く（押し続けでは着地後に跳ねない。空中の追加 down は着地後に 1 回ずつ続ける）。2026-09-27: 用語注を追加（js/platform/glossary.js）。2026-09-26: 帯グラフの時刻を、再生中の実経過と1ステップ分だけで進めるようにした（1歩の上限は再生速度に応じた間隔の2倍）。入門コースの課題カード追加（[入門コース改善計画](../../reviews/2026-09-26-intro-course-improvement-plan.md)） |
| 依存 | `game-loop`（毎フレーム更新の前提） |
| 正本 | §4 基礎実行モデル / HCI への入口 |

---

## 1. 学習目標

1. **押下中（held）** と **エッジ（down / up）** を区別して説明できる  
2. 毎フレーム `held` だけ見ると「押し続けで毎フレームジャンプ」が起きること、`down` エッジなら 1 回だけ反応することを観察できる  
3. **長押し（hold time）** が閾値を超えたときのトリガーを実装イメージできる  

---

## 2. なぜゲームで使うか

ジャンプ・攻撃・メニュー決定は「押した瞬間」に一度だけ発火させたい。移動は「押している間」。長押しはチャージ攻撃やスプリント。生の keydown 連打と held の混同はバグの温床。

---

## 3. アルゴリズム概要

各キー（仮想アクション）について前フレームの held を保持:

```
prev = wasHeld
held = isKeyDown(physical)
down = held && !prev    // 立ち上がりエッジ
up   = !held && prev    // 立ち下がりエッジ
if held: holdTime += dt
else: holdTime = 0
longPress = down? false : (held && holdTime >= threshold && !longFired)
```

デモ: 仮想アクション Jump / Fire / Move。  
- Jump: **down** のみで +1。箱はそのとき一度だけ跳ね、held のあいだは着地したまま  
- Fire: **held** で毎フレーム +1（連射の対比）。**up** で回数を 0 に戻す  
- Charge: **holdTime ≥ 閾値** で 1 回消費。ゲージを空にし、金色の弾を 1 発出す。押し続けても再発火しない  

---

## 4. 操作

| 操作 | 挙動 |
|------|------|
| 再生 | ポーリングループ（rAF） |
| 1フレーム | 現在のキー状態で 1 tick |
| リセット | カウンタ・状態クリア |
| キー | Space / Z / 矢印（フォーカス時） |
| 長押し閾値 | Charge が発火する holdTime（100〜1500ms、step 50） |
| 時間軸 | 横軸=時間の帯グラフ。down/up マーカー、長押し閾値の点線 |
| 再生速度 | 0.1〜1.0×（1.0＝等速）。表示の更新間隔を遅くする。長押し判定は壁時計の実時間 |
| URL | `longms` → `#long-ms`、`speed`。コピーボタンで現在値を共有 |
| 閾値 | 長押し ms |

---

## 5. ファイル

```
docs/topics/input-basics/SPEC.md
algorithms/input-basics.html
js/input-basics.js
js/maps/input-basics-config.js
samples/InputBasicsExample.cs
```
