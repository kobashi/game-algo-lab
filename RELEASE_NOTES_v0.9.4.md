# Game Algo Lab v0.9.4 — 試作版（Preview）

**基礎実行モデル**カテゴリを新設し、入口トピック 3 本を追加した試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.4

## 新規カテゴリ: 基礎実行モデル

学習順: **ゲームループ → 時間管理 → 入力の基礎** →（予定）座標 → 乱数

### ゲームループ (`game-loop`)
- 可変 / 固定 timestep を跳ねるボールで比較
- 人工遅延・MAX_STEPS（スパイラル・オブ・デス防止）
- https://kobashi.github.io/game-algo-lab/algorithms/game-loop.html

### 時間管理 (`time-management`)
- 壁時計 vs ゲーム内時間
- time scale（スロー / 早送り）とポーズ
- https://kobashi.github.io/game-algo-lab/algorithms/time-management.html

### 入力の基礎 (`input-basics`)
- held / down / up エッジと長押し
- Jump=edge、Fire=held 連射（対比）、Charge=長押し、Move=held
- https://kobashi.github.io/game-algo-lab/algorithms/input-basics.html

## その他（v0.9.3 以降の本線）

- 双方向探索、ゲーム木 UI 改善、ロードマップ低優先整理は v0.9.3 に含む

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED（**21** トピック ready）
