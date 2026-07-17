# Game Algo Lab v0.9.0 — 試作版（Preview）

GitHub Pages での公開・授業試用を想定した **試作リリース** です。  
API や URL の安定保証はありません。フィードバックを受けて v1.0.0 に向けて直します。

## 公開方法

- **Source**: ブランチ `main` / フォルダ `/ (root)`
- **URL 例**: `https://<user>.github.io/game-algo-lab/`
- 静的サイト（ビルド不要）。ES modules のためローカルは `python3 -m http.server` 推奨

## 実装済みトピック

### 経路探索
- BFS / DFS / ダイクストラ / 最良優先 / A*
- 地図ペイント（コスト・壁・**複数ゴール G**）
- DS 可視化・C# サンプル

### ゲーム木
- AND-OR / Min-Max / α-β / モンテカルロ / 多腕バンディット

### その他
- AABB 衝突判定（重なり判定と分離判定の比較教材）
- ステートマシン（状態図・イベント・遷移表）

## 共通基盤（試作時点）

- `js/platform/` … 再生・乱数・木レイアウト・地図塗り・グリッド下地・ヘッダー/フッター
- トップはカテゴリ別にトピック表示
- 新規トピック手順: `docs/templates/TOPIC_SCAFFOLD.md`
- 健全性: `python3 scripts/smoke-platform.py`

## 既知の制限・今後

- **E2E 自動テスト** / **i18n（多言語）** は未着手（`docs/ROADMAP.md` バックログ）
- 試作のため仕様・UI は変更される可能性があります

## ローカル確認

```bash
cd ~/Project   # または clone したリポジトリ
python3 -m http.server 8080
# http://localhost:8080
```
