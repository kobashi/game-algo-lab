# Game Algo Lab v0.13.0 — 試作版（Preview）

授業課題向けに、**URL クエリでデモの初期パラメータを指定**できるようにした基盤リリースです。  
ready トピック数は **110** のまま（新規デモなし）。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.13.0

## 本版の主な内容（v0.12.0 以降）

### 共通基盤
- `js/platform/url-params.js` — `applyParamsToControls` / `buildShareUrl` / `mountShareLink`
- 範囲外・不明値は **clamp せず却下**し、`#status` に日本語警告
- 共有 URL は「この設定のURLをコピー」押下時だけ生成（`history` は書き換えない）
- 既定値と同じキーは URL に付けない。既定オンの checkbox をオフにした `0` は残す

### 先行適用（3 トピック）

| id | 例 |
|----|-----|
| `rng-seed` | `?algo=lcg&a=13&c=5&m=24&seed=0&n=64`（周期 24 の課題例） |
| `tic-tac-toe` | `?ab=1&memo=1&sym=0` |
| `coyote-time` | `?coyote=1&ms=200` / オフは `?coyote=0` |

残り 107 トピックへの展開は未着手（1 学期運用してから判断）。

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 次の候補

- 授業運用後、対象トピックを増やすか判断
- CANDIDATE 優先度 B 続き
- oneshot → revised / stable

---

prerelease / 試作版。前版: [v0.12.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.12.0)。
