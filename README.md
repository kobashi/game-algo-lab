# Game Algo Lab

ゲームプログラミングのアルゴリズムを、**可視化**と**インタラクティブ操作**で学ぶ教材サイトです。

GitHub Pages での公開を前提に、ビルド不要の静的サイト（HTML / CSS / JavaScript）で構成しています。  
開発・拡張の方針と分業の進め方は **`docs/`** にまとめています。

## できること

- 経路探索（BFS → A* など）をステップ実行・再生で観察
- グリッド上のコスト・壁・**複数ゴール**を編集して挙動を確認
- トピックをカテゴリ単位で増やし、共通 UI で統一感を保つ

## ローカルで見る

```bash
cd ~/Project
python3 -m http.server 8080
```

ブラウザで http://localhost:8080 を開いてください（ES modules のため `file://` は非推奨）。

## Git で管理する

このディレクトリは Git リポジトリです（既定ブランチ: `main`）。

```bash
git status
git checkout -b topic/your-topic   # トピック作業例
# 編集後
git add -A
git commit -m "feat(your-topic): 概要"
```

| やりたいこと | 読む文書 |
|--------------|----------|
| **計画の正本**（構想・第1〜5期） | [docs/interactive_game_programming_material_plan.docx](docs/interactive_game_programming_material_plan.docx)（策定 2026年7月） |
| 方針要約・実装対応・バックログ | [docs/ROADMAP.md](docs/ROADMAP.md) |
| UI・ファイル配置の共通ルール | [docs/PLATFORM.md](docs/PLATFORM.md) |
| ブランチ・PR・実装手順 | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| トピック一覧と状態 | [docs/topics/CATALOG.md](docs/topics/CATALOG.md) |
| 新トピックの仕様の書き方 | [docs/templates/SPEC.md](docs/templates/SPEC.md) |
| セッション引き継ぎ | [HANDOFF.md](HANDOFF.md) |

**新トピックの標準フロー**: カタログ登録（`ready: false`）→ SPEC → 実装ブランチ → チェックリスト → `ready: true`。

## フォルダ構成

```
Project/
├── index.html
├── algorithms/       # 各デモ HTML
├── css/style.css     # 共通スタイル
├── js/
│   ├── platform/     # ★ 共通基盤（再生・乱数・木レイアウト等）
│   ├── maps/         # 初期データ
│   ├── ds-viz.js / map-format.js / main.js
│   └── <topic>.js    # トピック固有
├── samples/          # C# 実装例
├── docs/             # 方針・仕様・スキャフォールド
├── scripts/
├── HANDOFF.md
└── README.md
```

新規トピック: [docs/templates/TOPIC_SCAFFOLD.md](docs/templates/TOPIC_SCAFFOLD.md)  

共通基盤の健全性チェック:

```bash
python3 scripts/smoke-platform.py
```

ブラウザ E2E や i18n（多言語）は **今後の課題**（未着手）。方針は [docs/ROADMAP.md](docs/ROADMAP.md) を参照。

## GitHub Pages への公開（試作版）

静的サイトのため **Source = `main` ブランチ / `/ (root)`** で公開します。

1. GitHub にログインしたうえでリポジトリを push  
2. **Settings → Pages** → Deploy from a branch → `main` / `/ (root)`  
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/`

### 一括公開（推奨）

```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth login -h github.com -p https -w   # 未ログイン時
./scripts/publish-github.sh game-algo-lab v0.9.0
```

- リポジトリ作成（未作成時）・`main` push・Pages 有効化・**試作 Release（prerelease）** を行います  
- 現行の試作タグ: **`v0.9.0`**（リリースノート: `RELEASE_NOTES_v0.9.0.md`）

## 実装済みトピック（経路探索）

| トピック | 内容 |
|---------|------|
| 幅優先探索 (BFS) | 歩数最少。Queue で広げる |
| 深さ優先探索 (DFS) | 再帰で深く潜る。コールスタックとバックトラック |
| ダイクストラ法 | 優先度 = g。コスト最少 |
| 最良優先探索 | 優先度 = h。見積りのみ |
| A* 探索 | f = g + h |

地図: ゴール `G` は **複数可**（いずれかに到達で成功）。ペイントの **G** で追加・削除。

## ゲーム木（実装中）

| トピック | 状態 |
|----------|------|
| AND-OR 探索 | **実装済** — `algorithms/and-or.html` |
| Min-Max 探索 | **実装済** — `algorithms/minimax.html` |
| α-β 法 | **実装済** — `algorithms/alpha-beta.html` |
| モンテカルロ法 | **実装済** — `algorithms/monte-carlo.html` |
| 多腕バンディット | **実装済** — `algorithms/multi-armed-bandit.html` |

| カテゴリ | トピック | 状態 |
|----------|----------|------|
| 物理・判定 | AABB 衝突判定 | **実装済** — 軸投影の説明 UI（マップ探索ではない） |
| 設計パターン | ステートマシン | **実装済** — 状態図・イベント・遷移表（非マップ） |

詳細は [docs/topics/CATALOG.md](docs/topics/CATALOG.md)。

## 初期地図の編集

エディタで `js/maps/*-map.js` の `INITIAL_MAP` を編集（行の文字数を揃える）。

記号: `S` スタート / `G` ゴール（複数可） / `#` 壁 / `.` コスト1 / `0` `1` `2` / `n` コスト-1

## ライセンス

教材・学習用途を想定。必要に応じて後からライセンスを明記してください。
