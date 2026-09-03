# トピック仕様: ステートマシン

| 項目 | 値 |
|------|-----|
| id | `fsm` |
| カテゴリ | patterns |
| 状態 | implemented |
| 成熟度 | revised |
| 作成日 | 2026-07-17 |
| 最終改訂 | 2026-09-03 |
| 依存 | — |

---

## 1. 学習目標

1. **状態（State）** と **遷移（Transition）** と **イベント（Event）** を区別できる  
2. 「今いる状態」によって、同じ入力でも次状態が違うと説明できる  
3. ゲームキャラの行動（待機・移動・攻撃など）を FSM でモデル化できる  
4. 不正な遷移（定義にないイベント）が無視されることを観察できる  
5. 遷移を1本変えると、初期状態から到達できなくなる状態が出ることがある、と観察できる  

---

## 2. 画面方針（経路探索マップではない）

| 領域 | 役割 |
|------|------|
| 状態図（SVG） | 節点=状態、矢印=遷移。現在状態を強調。初期状態から到達できない状態は灰色 |
| キャラプレビュー | 状態に応じた簡単な見た目・ラベル |
| イベントボタン | 入力を発火（Move / Stop / Jump / Attack / Hit …） |
| 遷移表 | from × event → to |
| 履歴 | 直近の状態列 |

自動デモ: イベント列を順に流す。1ステップ = 次のイベント1つ。

---

## 3. モデル（教材用キャラ）

状態: `Idle`, `Walk`, `Jump`, `Attack`, `Hurt`, `Dead`

イベント例: `Move`, `Stop`, `Jump`, `Land`, `Attack`, `AttackEnd`, `Hit`, `Recover`, `Kill`

遷移は設定ファイル `js/maps/fsm-config.js` で定義。config は既定値として残し、デモ側で上書きする（ファイルは書き換えない）。

---

## 4. アルゴリズム（遷移）

```
onEvent(e):
  key = (current, e)
  if transitions has key:
    current = transitions[key]
    record history
  else:
    // 無視（または self）
```

到達不能: 初期状態から、上書き後の遷移をたどって到達できない状態。図上は灰色。

---

## 5. 調整パラメータ

| コントロール | 内容 |
|---|---|
| 初期状態 | select（`states` のキー）。既定 `Idle` |
| 遷移の上書き | from / event / to の3つの select で **1本だけ** 書き換える。既定は config 先頭の `Idle|Move → Walk`（上書きしても同じなので従来どおり） |
| デモのイベント列 | テキスト。カンマ区切り。既定は `demoScript` |

- 遷移表の全編集 UI は作らない  
- イベント列に空要素や未知のイベント id がある入力は**却下して警告**。clamp しない。脚本は既定に戻す  
- リセットは実行位置だけ戻す。初期状態・上書き・脚本は維持する  
- URL: `initial`, `from`, `ev`, `to`, `script`  

---

## 6. C#

`samples/FsmExample.cs`

---

## 7. PLATFORM 差分

- グリッド地図・コスト塗りは不使用  
- 説明特化レイアウト（状態図 + イベント + 表）  
- URL は `applyParamsToControls` / `mountShareLink`。`script` は `kind: "text"`  
