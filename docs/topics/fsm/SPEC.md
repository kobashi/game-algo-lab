# トピック仕様: ステートマシン

| 項目 | 値 |
|------|-----|
| id | `fsm` |
| カテゴリ | patterns |
| 状態 | implemented |
| 作成日 | 2026-07-17 |
| 依存 | — |

---

## 1. 学習目標

1. **状態（State）** と **遷移（Transition）** と **イベント（Event）** を区別できる  
2. 「今いる状態」によって、同じ入力でも次状態が違うと説明できる  
3. ゲームキャラの行動（待機・移動・攻撃など）を FSM でモデル化できる  
4. 不正な遷移（定義にないイベント）が無視されることを観察できる  

---

## 2. 画面方針（経路探索マップではない）

| 領域 | 役割 |
|------|------|
| 状態図（SVG） | 節点=状態、矢印=遷移。現在状態を強調 |
| キャラプレビュー | 状態に応じた簡単な見た目・ラベル |
| イベントボタン | 入力を発火（Move / Stop / Jump / Attack / Hit …） |
| 遷移表 | from × event → to |
| 履歴 | 直近の状態列 |

自動デモ: イベント列を順に流す。1ステップ = 次のイベント1つ。

---

## 3. モデル（教材用キャラ）

状態: `Idle`, `Walk`, `Jump`, `Attack`, `Hurt`, `Dead`

イベント例: `Move`, `Stop`, `Jump`, `Land`, `Attack`, `AttackEnd`, `Hit`, `Recover`, `Kill`

遷移は設定ファイル `js/maps/fsm-config.js` で定義。

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

---

## 5. C#

`samples/FsmExample.cs`

---

## 6. PLATFORM 差分

- グリッド地図・コスト塗りは不使用  
- 説明特化レイアウト（状態図 + イベント + 表）  
