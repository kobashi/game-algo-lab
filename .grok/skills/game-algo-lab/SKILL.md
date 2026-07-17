---
name: game-algo-lab
description: >
  Game Algo Lab（ゲームアルゴリズム可視化教材）の開発工程一式。
  トピック追加（SPEC・scaffold・platform）、共通基盤の拡張、Git 運用、
  GitHub Pages / 試作 Release 公開、スモーク確認までを案内する。
  Use when the user runs /game-algo-lab, or mentions Game Algo Lab, 教材トピック追加,
  pathfinding/game-tree demos, js/platform, publish-github, GitHub Pages 試作公開,
  HANDOFF, TOPIC_SCAFFOLD, or continuing work in ~/Project for this curriculum site.
metadata:
  short-description: "Game Algo Lab 教材開発工程"
---

# Game Algo Lab — 開発工程 Skill

このリポジトリ専用。**人間向け正本は `docs/`**。本 Skill はエージェントの作業手順。

開始時は必ず読む（存在すれば）:

1. `HANDOFF.md`
2. `docs/ROADMAP.md`（バックログ含む）
3. 作業対象に応じ `docs/PLATFORM.md` / `docs/WORKFLOW.md` / `docs/templates/TOPIC_SCAFFOLD.md`

ローカルパス想定: リポジトリ root（例: `~/Project`）。

---

## 0. プロジェクト前提（崩さない）

| 項目 | 方針 |
|------|------|
| 形態 | **静的** HTML/CSS/JS（ES modules）。ビルドツール必須化しない |
| 公開 | **GitHub Pages** — `main` ブランチ / `/ (root)` |
| 受講 | C# 例は `samples/`（デモと 1:1 厳密対応は不要） |
| 日本語 | UI 文言は日本語固定 |
| ローカル確認 | `python3 -m http.server 8080`（`file://` 禁止）。**常時起動は不要** |
| 健全性 | `python3 scripts/smoke-platform.py` |

### 着手保留（実装しない・提案のみなら ROADMAP を指す）

- **E2E**（Playwright 等）
- **i18n**（多言語 UI）

詳細: `docs/ROADMAP.md` の「今後の課題（バックログ）」。

---

## 1. セッション開始チェックリスト

```text
[ ] HANDOFF.md / ROADMAP を読む
[ ] git status / ブランチ確認（main は Pages 公開可能な状態を保つ）
[ ] 作業目的を分類: トピック新規 | トピック改善 | platform | docs | 公開
[ ] 対応する docs を開く（下表）
```

| 目的 | 読む |
|------|------|
| トピック追加 | `TOPIC_SCAFFOLD.md`, `templates/SPEC.md`, `PLATFORM.md` |
| 基盤変更 | `PLATFORM.md`, `js/platform/README.md` |
| Git / 分業 | `WORKFLOW.md` |
| 公開 | `scripts/publish-github.sh`, `RELEASE_NOTES_*.md` |

---

## 2. トピック追加（標準フロー）

**SPEC を先に書く。** 実装と同時でもよいが、学習目標・操作・成功条件なしで巨大実装しない。

```text
① カタログ: docs/topics/CATALOG.md に行追加（ready 未）
② SPEC: docs/templates/SPEC.md → docs/topics/<id>/SPEC.md
③ ブランチ: topic/<id> または feat/<id>-...
④ 実装: algorithms/ + js/ + maps/ + samples/
⑤ js/main.js の TOPICS（category, badge, ready）
⑥ CHECKLIST.md を消化
⑦ ready: true、HANDOFF / README を短く更新
⑧ python3 scripts/smoke-platform.py
⑨ main へマージ（または直接 main の場合は小さくコミット）
```

### 2.1 決めること（着手前）

| 項目 | 例 |
|------|-----|
| id | 英小文字・ハイフン（`spatial-hash`） |
| カテゴリ | 経路探索 / ゲーム木 / 物理・判定 / 設計パターン / 新規 |
| UI 型 | `pathfinding` \| `game-tree` \| `explain` |

### 2.2 UI 型

| 型 | 使うもの | 使わないもの |
|----|----------|--------------|
| **pathfinding** | グリッド、`map-format`、`bindMapPaint`、`drawPathfindingGrid` | 無理なゲーム木 SVG |
| **game-tree** | `layoutTree`、コールスタック系 `ds-viz` | 経路探索グリッドの流用 |
| **explain** | 説明特化レイアウト（AABB/FSM を参考） | 地図ペイントの無理な流用 |

### 2.3 必須ファイル

```text
docs/topics/<id>/SPEC.md
algorithms/<id>.html
js/<id>.js
js/maps/<id>-*.js     # 任意
samples/<Name>Example.cs
```

### 2.4 HTML シェル（ビルド不要）

```html
<header class="site-header" id="site-header" data-nav="pathfinding|game-tree|explain" data-active="<id>"></header>
…
<footer class="site-footer" id="site-footer" data-note="任意"></footer>
<script type="module" src="../js/<id>.js"></script>
```

JS 先頭:

```js
import { mountTopicShellFromDataset, … } from "./platform/index.js";
mountTopicShellFromDataset();
```

### 2.5 共通基盤を使う（コピペ禁止）

足りない処理は **先に `js/platform/` に API を足し**、`PLATFORM.md` と `js/platform/README.md` を同じ変更で更新する。

よく使う import:

```js
import {
  mountTopicShellFromDataset,
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  bindMapPaint,           // 経路探索
  layoutTree, applySvgSize, // ゲーム木
  mulberry32,             // 乱択
  drawPathfindingGrid,
  drawScorePair,
} from "./platform/index.js";
```

経路探索の再生速度（スライダー大＝速い）:

```js
createPlayback({
  btnPlay, speedEl,
  delayFromSpeed: (v) => 450 - v,
  onTick: () => stepOnce(),
});
```

操作 id 慣習: `btn-play`, `btn-step`, `btn-reset`, `speed`, `status`, `result-compare`, `csharp-sample`, `ds-panels`, `paint-tools`。

### 2.6 登録

- `js/main.js` … `TOPICS` に `id`, `title`, `description`, `href`, `badge`, `category`, `ready`, **`maturity`**
- `docs/topics/CATALOG.md` … ready・**成熟度**・改訂メモ
- 完了時 `HANDOFF.md` を短く更新

**成熟度**（`docs/topics/MATURITY.md`）:

| コード | 表示 | いつ |
|--------|------|------|
| `oneshot` | 一発未調整 | 初回実装のまま |
| `revised` | 改訂・調整 | 教材・機能の意図した改訂後 |
| `stable` | 安定版 | 授業据え置き決定後（破壊的変更を避ける） |

新規は通常 `oneshot`。基盤寄せだけなら oneshot のまま可。

詳細雛形: **`docs/templates/TOPIC_SCAFFOLD.md`**。
---

## 3. 共通基盤（platform）変更

```text
[ ] 影響する ready デモを列挙
[ ] 小さく PR / コミット（トピック新規と混ぜない）
[ ] 代表デモを手で確認（例: BFS + A* + ゲーム木1 + AABB）
[ ] docs/PLATFORM.md と js/platform/README.md を更新
[ ] python3 scripts/smoke-platform.py
```

ブランチ例: `platform/<short>`。

---

## 4. Git 運用

| 種類 | ブランチ |
|------|----------|
| トピック新規 | `topic/<id>` |
| 改善 | `feat/<id>-...` / `fix/<id>-...` |
| 基盤 | `platform/<short>` |
| 文書のみ | `docs/<short>` |

コミットプレフィックス: `feat` / `fix` / `docs` / `platform` / `chore` / `refactor`  
例: `feat(bfs): 複数ゴールに対応`

`main` = **いつでも Pages に出してよい** 状態を保つ。

---

## 5. GitHub Pages / 試作 Release

現行の試作タグ例: **`v0.9.0`**（prerelease）。正式版は別途 `v1.0.0` 等。

```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth status || gh auth login -h github.com -p https -w
./scripts/publish-github.sh game-algo-lab v0.9.0
# 新バージョン時: RELEASE_NOTES_<tag>.md を用意してから
# ./scripts/publish-github.sh game-algo-lab vX.Y.Z
```

スクリプトが行うこと:

1. リポジトリ作成（未作成時）・`main` push  
2. タグ push  
3. Pages（`main` / root）  
4. GitHub Release（`--prerelease`、ノートファイル指定）

公開後 URL 例（アカウント依存）:

- Pages: `https://<user>.github.io/game-algo-lab/`  
- Release: `…/releases/tag/<tag>`

Pages 404 時: Settings → Pages → branch `main`, folder `/ (root)`。

**ローカルサーバは公開用に常時不要。** 手元確認のときだけ `python3 -m http.server 8080`。

---

## 6. 検証

必須に近い:

```bash
python3 scripts/smoke-platform.py
```

手元 UI:

```bash
python3 -m http.server 8080
# トップ → 対象デモ → 再生/1ステップ/リセット
```

E2E フレームワークは導入しない（バックログ）。

---

## 7. 完了時の後始末

```text
[ ] smoke-platform パス
[ ] ready と実ファイル一致
[ ] HANDOFF の「最終更新」と要点を更新
[ ] 公開したなら HANDOFF に Pages / Release URL
[ ] ユーザーに確認 URL と変更概要を伝える
```

---

## 8. 参照インデックス（正本）

| パス | 内容 |
|------|------|
| `HANDOFF.md` | セッション引き継ぎ・実装一覧 |
| `docs/ROADMAP.md` | 方針・フェーズ・**E2E/i18n バックログ** |
| `docs/PLATFORM.md` | 共通仕様・platform 層 |
| `docs/WORKFLOW.md` | Git・分業 |
| `docs/topics/CATALOG.md` | トピック状態 |
| `docs/templates/*` | SPEC / CHECKLIST / SCAFFOLD |
| `js/platform/` | 共有 JS API |
| `scripts/publish-github.sh` | Pages + Release |
| `scripts/smoke-platform.py` | 構造スモーク |

---

## 9. エージェント向け注意

- ドキュメントの **長文を SKILL に複製しすぎない**。手順と禁止事項を優先し、詳細はファイルを `read` する。  
- 破壊的 git（force push、hard reset）はユーザー確認なしで行わない。  
- `gh` 未ログインならログイン手順を示し、認証後に publish を続ける。  
- 新トピックでグリッドを説明 UI に無理流用しない（AABB/FSM の型を参考）。  
- 共通処理のコピペ増殖を見つけたら platform 抽出を提案または実施する。  
