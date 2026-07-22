# Game Algo Lab v0.9.3 — 試作版（Preview）

v0.9.2（MCTS）に続く試作リリース。**双方向探索**の追加、ゲーム木 UI の横幅改善、
公開 URL のドキュメント整備、ロードマップ上の低優先項目の整理を含みます。

## 公開方法

- **Source**: ブランチ `main` / フォルダ `/ (root)`
- **教材トップ**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.3

## 本版の主な追加・変更

### 新規トピック

- **双方向探索**（`bidirectional-search`）
  - S から前向き / 全 G から後ろ向きの双方向 BFS
  - 出会点で経路接合、一方向 BFS との展開数比較
  - 拡張方策: 小さいフロンティア優先 / 交互
  - デモ: `algorithms/bidirectional-search.html`

### UI

- ゲーム木 SVG を親幅フィット（横スクロール抑制）
- ゲーム木デモで画面横幅をほぼ一杯に使うレイアウト

### ドキュメント・運用

- GitHub Pages URL を README / docs 索引 / リポジトリ About に明記
- Fable5 レビューと成熟度の突き合わせ監査を `MATURITY.md` に記録
- `path-compare`（経路同時比較）・`game-tree-engine`（共通探索エンジン）を
  **アイディアメモ・低優先**（当面 SPEC/実装しない）へ整理

## v0.9.2 までの主な内容（再掲）

- MCTS（三目並べ題材）
- 実在ゲーム4本: 三目並べ / ニム / 割り箸 / 4×4オセロ
- 教材品質改訂（深さ3標準木など）

詳細は `RELEASE_NOTES_v0.9.2.md` / `RELEASE_NOTES_v0.9.1.md` を参照。

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED（18 トピック ready）

## 学習のつながり（経路探索）

```
BFS → DFS → ダイクストラ → 最良優先 → A* → 双方向探索
```
