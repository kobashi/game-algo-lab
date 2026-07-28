# Game Algo Lab v0.11.0 — 試作版（Preview）

**ready 95 トピック**（v0.10.0 時点の 67 から +28）。  
Wave F（サウンド · ゲーム CG · 通信）を入口から本線まで一通り埋めた大型試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.11.0

## 本版の主な追加（v0.10.0 以降）

### プロシージャル
- `balance-sim` — 簡易戦闘 N 回 · 勝率バー

### サウンド（一通り）
- `sfx-events` · `sfx-voice-limit` · `sfx-randomize` · `sfx-spatial` · `sfx-material`
- `audio-bus-ducking` — Master / BGM / SE · ダック
- `bgm-loop` · `bgm-quantize` · `bgm-transition-compare` · `bgm-interactive`

### ゲーム CG（一通り）
- `gfx-gpu-concepts` · `gfx-sprite-2d` · `gfx-camera`
- `gfx-animation-vfx` · `gfx-lighting-alpha` · `gfx-postprocess`
- `gfx-lod-culling` · `gfx-ui-canvas` · `gfx-mesh-uv`
- **統合**: 計画 id `gfx-coordinates` → 既存 `coordinates` を正とし、CG 導線を追加

### 通信・データ（一通り）
- `net-p2p-demo` · `net-prediction` · `net-client-server`
- `net-sync-modes` · `net-anti-cheat` · `net-db-transaction`

### その他（v0.10.0 直後〜）
- `accessibility-basics` · `unit-test-gameplay` · `obstacle-avoidance-nav` など

## 成熟度

| コード | 件数（目安） |
|--------|----------------|
| oneshot | 多数（新規 Wave F） |
| revised | 14（経路探索・ゲーム木改訂 + coordinates 統合） |
| stable | 0 |

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 使い方

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## 次の候補

- oneshot トピックの教材改訂（`revised` 昇格）
- 授業据え置きトピックの `stable` 選定
- 疑似コード同期・E2E / i18n は引き続きバックログ

---

prerelease / 試作版。正式版は別途 `v1.0.0` 等を検討。
