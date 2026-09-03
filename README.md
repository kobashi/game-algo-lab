# Game Algo Lab

ゲームプログラミングのアルゴリズムを、**可視化**と**インタラクティブ操作**で学ぶ教材サイトです。

GitHub Pages での公開を前提に、ビルド不要の静的サイト（HTML / CSS / JavaScript）で構成しています。  
開発・拡張の方針と分業の進め方は **`docs/`** にまとめています。

## 公開サイト（GitHub Pages）

| | URL |
|--|-----|
| **教材トップ** | https://kobashi.github.io/game-algo-lab/ |
| リポジトリ | https://github.com/kobashi/game-algo-lab |
| 最新試作 Release | https://github.com/kobashi/game-algo-lab/releases/tag/v0.16.0 |

**ready 110 トピック**。経路探索・ゲーム木・物理・空間・AI・設計・品質・HCI・プロシージャル・**サウンド**・**ゲーム CG**・**通信**まで一通り揃い、Sprint S5（影響マップ・Poisson・決定木）まで追加済みです。  
`rng-seed` / `tic-tac-toe` / `coyote-time` / `game-loop` / `velocity-motion` / `accel-gravity` / `gfx-ui-canvas` / `gfx-camera` / `input-basics` / `circle-collision` / `sfx-events` は URL クエリで初期パラメータを指定できます（授業課題の設定提出用）。

主なデモ例:

- [経路探索 — BFS](https://kobashi.github.io/game-algo-lab/algorithms/bfs.html)（疑似コード行同期: 経路探索 6 本すべて）
- [三目並べ](https://kobashi.github.io/game-algo-lab/algorithms/tic-tac-toe.html)
- [モンテカルロ木探索 (MCTS)](https://kobashi.github.io/game-algo-lab/algorithms/mcts.html)
- [GPU パイプライン](https://kobashi.github.io/game-algo-lab/algorithms/gfx-gpu-concepts.html)
- [P2P 観察](https://kobashi.github.io/game-algo-lab/algorithms/net-p2p-demo.html)
- [レイヤー型 BGM](https://kobashi.github.io/game-algo-lab/algorithms/bgm-interactive.html)

## できること

- 経路探索（BFS → A* など）をステップ実行・再生で観察
- グリッド上のコスト・壁・**複数ゴール**を編集して挙動を確認
- ゲーム木・実在ルール題材（三目並べ、MCTS、ニム、割り箸、4×4オセロ など）
- 物理・空間分割・ステアリング・ECS・セーブ/リプレイ
- サウンド（SFX〜レイヤー BGM）、CG（スプライト〜ポスト/LOD/UI/Mesh）、通信（遅延〜DB/チート検証）
- トピックをカテゴリ単位で増やし、共通 UI で統一感を保つ
- [入門コース](https://kobashi.github.io/game-algo-lab/courses/intro.html)（13本を学ぶ順に）から始められる

## ローカルで見る

```bash
cd ~/Project
python3 -m http.server 8080
```

ブラウザで http://localhost:8080 を開いてください（ES modules のため `file://` は非推奨）。

健全性チェック:

```bash
python3 scripts/smoke-platform.py
```

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
│   ├── platform/     # ★ 共通基盤（再生・乱数・疑似コード・木レイアウト等）
│   ├── maps/         # 初期データ
│   ├── ds-viz.js / map-format.js / main.js
│   └── <topic>.js    # トピック固有
├── samples/          # C# 実装例
├── docs/             # 方針・仕様・スキャフォールド
├── scripts/
├── HANDOFF.md
└── README.md
```
