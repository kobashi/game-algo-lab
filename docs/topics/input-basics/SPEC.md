# トピック仕様: 入力の基礎

| 項目 | 値 |
|------|-----|
| id | `input-basics` |
| カテゴリ | fundamentals |
| UI 型 | explain |
| 著者 | Grok4.5 |
| 状態 | implemented |
| **成熟度** | `oneshot` |
| 作成日 | 2026-07-22 |
| 最終改訂 | 2026-07-22 |
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
- Jump: **down** のみで +1  
- Fire: **held** で毎フレーム連射（対比）  
- Charge: **holdTime ≥ 閾値** で 1 回チャージ完了  

---

## 4. 操作

| 操作 | 挙動 |
|------|------|
| 再生 | ポーリングループ（rAF） |
| 1フレーム | 現在のキー状態で 1 tick |
| リセット | カウンタ・状態クリア |
| キー | Space / Z / 矢印（フォーカス時） |
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
