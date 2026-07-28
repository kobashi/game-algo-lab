# Game Algo Lab v0.11.1 — 試作版（Preview）

**ready 95** を維持しつつ、**ドキュメントの実装状況表記を同期**し、**経路探索の疑似コード行同期**を完成させたメンテナンズリリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.11.1

## 本版の主な内容（v0.11.0 以降）

### ドキュメント同期
- `docs/ROADMAP.md` — カテゴリ・Phase D を **実装済** に更新（古い「一部企画中」を解消）
- §2.4 を「企画中予約表」から **実装状態付き対応表**（ready 95）へ
- `docs/topics/CATALOG.md` — 企画中フッターを廃止し、未実装は path-compare 等のみと明記
- トップ `#curriculum` — 「企画中」バッジを **デモあり** に変更（本線は実装済み）
- `README.md` / `docs/README.md` / `HANDOFF.md` の Release URL を最新に

### 機能（経路探索）
- `createPseudocode`（`js/platform/pseudocode.js`）
- BFS / DFS / Dijkstra / 最良優先 / A* / **双方向** の **6 本すべて**で実行ステップと疑似コード行が同期

## 現状サマリ

| 項目 | 値 |
|------|-----|
| ready トピック | 95 |
| 本線カテゴリ | 一通りデモあり |
| 当面未実装 | path-compare · game-tree-engine（アイディアメモ）· E2E · i18n |

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 次の候補

- oneshot → revised / stable 選定
- 計測パネル統一・「戻る」操作
- ゲーム木への疑似コード横展開

---

prerelease / 試作版。前版: [v0.11.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.11.0)。
