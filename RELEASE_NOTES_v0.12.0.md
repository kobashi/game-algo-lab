# Game Algo Lab v0.12.0 — 試作版（Preview）

**ready 95 → 110**。候補調査（CANDIDATE）に基づく **Sprint S1〜S5** を一通り実装した拡張リリースです。  
範囲外（本格 anti-cheat・実サーバ等）は ROADMAP §4.2 にメモのみ。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.12.0

## 本版の主な内容（v0.11.1 以降）

### ドキュメント・方針
- `docs/topics/CANDIDATE_TOPICS.md` — 追加候補調査と Sprint 案
- `docs/ROADMAP.md` §4 — サイト範囲 / 範囲外メモ（商業 anti-cheat 等）
- ready 表記の同期（CATALOG · HANDOFF · index · README）

### Sprint S1（ready 99）
| id | 要約 |
|----|------|
| `cellular-automata` | 洞窟生成 CA |
| `spatial-hash` | 空間ハッシュ 3×3 |
| `sprite-anim-fsm` | スプライトクリップ × FSM |
| `dirty-flag` | Dirty Flag 変換キャッシュ |

### Sprint S2（ready 102）
| id | 要約 |
|----|------|
| `navmesh-intro` | 2D ナビメッシュ · string pull |
| `flow-field` | コスト場 + 多数エージェント |
| `utility-ai` | 効用スコア arg max |

### Sprint S3（ready 105）
| id | 要約 |
|----|------|
| `wfc-intro` | Wave Function Collapse 入門 |
| `verlet-integration` | Verlet + 距離拘束ロープ |
| `jps` | Jump Point Search · A* 比較 |

### Sprint S4（ready 107）
| id | 要約 |
|----|------|
| `snapshot-interp` | スナップショット遅延補間 |
| `interest-mgmt` | AOI 関心管理 · B/s |

### Sprint S5（ready 110）
| id | 要約 |
|----|------|
| `influence-map` | 脅威/興味スカラー場 |
| `poisson-disk` | Poisson disk サンプリング |
| `decision-tree` | 決定木（ルール AI） |

## 現状サマリ

| 項目 | 値 |
|------|-----|
| ready トピック | **110** |
| 本線カテゴリ | 一通りデモあり + S1〜S5 拡張 |
| 当面未実装 | path-compare · game-tree-engine（アイディアメモ）· E2E · i18n |
| 範囲外メモ | 本格 anti-cheat · 実マルチプレイ本番 等（ROADMAP §4.2） |

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 次の候補

- CANDIDATE 優先度 B 続き（theta-star · blackboard · goap-lite 等）
- oneshot → revised / stable
- 計測パネル統一 ·「戻る」操作
- 正式版に向けた mature 選定

---

prerelease / 試作版。前版: [v0.11.1](https://github.com/kobashi/game-algo-lab/releases/tag/v0.11.1)。
