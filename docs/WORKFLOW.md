# Git 運用と分業ワークフロー

最終更新: 2026-07-17

---

## 1. リポジトリの正

| 項目 | 方針 |
|------|------|
| 既定ブランチ | `main` |
| `main` の意味 | **いつでも Pages 公開してよい** 状態 |
| タグ | 教材の区切りで `vX.Y.Z`（例: v1.0.0） |
| リモート | GitHub（未設定なら `scripts/publish-github.sh` または手動） |

ローカルだけの作業でも、**意味のある単位でコミット**する。  
セッション引き継ぎは `HANDOFF.md`、方針の正本は `docs/`。

---

## 2. ブランチ命名

| 種類 | パターン | 例 |
|------|----------|-----|
| トピック新規 | `topic/<id>` | `topic/minimax` |
| トピック改善 | `fix/<id>-...` / `feat/<id>-...` | `feat/bfs-multi-goal` |
| 共通基盤 | `platform/<short>` | `platform/paint-module` |
| ドキュメントのみ | `docs/<short>` | `docs/catalog-game-tree` |

1 ブランチ = 1 目的。基盤リファクタとトピック新規を混ぜない。

---

## 3. コミットメッセージ（推奨）

```
feat(bfs): 複数ゴール G の配置に対応
fix(ds-viz): ツリーのはみ出しを修正
docs: ゲーム木カタログを追加
platform: ペイント共通化の第一歩
chore: .gitignore 更新
```

プレフィックス: `feat` / `fix` / `docs` / `platform` / `chore` / `refactor`

---

## 4. 分業ロール

| ロール | 責務 | 主な成果物 |
|--------|------|------------|
| **仕様** | 学習目標・操作・画面・成功条件を決める | `docs/topics/<id>/SPEC.md` |
| **実装（UI/可視化）** | HTML/CSS/キャンバス・ステップ再生 | `algorithms/` `js/` `css/` |
| **実装（アルゴリズム）** | 探索本体・正しさ・エッジケース | `js/<id>.js` |
| **C# サンプル** | 受講生向け核ロジック | `samples/*.cs` |
| **レビュー** | PLATFORM 準拠・教材として通じるか | PR コメント |

少人数では1人が複数ロールを兼ねてよい。**兼ねる場合も SPEC を先に書く**。

---

## 5. トピック実装フロー（標準）

```
① カタログ登録（ready: false）
      ↓
② SPEC 作成（templates/SPEC.md をコピー）
      ↓
③ SPEC レビュー（学習目標・操作が固まっているか）
      ↓
④ ブランチ topic/<id> で実装
      ↓
⑤ チェックリスト消化（templates/CHECKLIST.md）
      ↓
⑥ main へマージ → ready: true
      ↓
⑦ HANDOFF / CATALOG / README を更新（**成熟度**も CATALOG と `TOPICS.maturity` を揃える）
```

成熟度（一発 / 調整 / 安定）の定義: [topics/MATURITY.md](./topics/MATURITY.md)。  
改訂を入れたら `oneshot` → `revised`。授業据え置きなら `stable`。

### ⑤ の最低確認

- [ ] ローカル `http.server` でトップ → デモが開く  
- [ ] 再生・1ステップ・リセットが動く  
- [ ] モバイル幅でも操作が使える  
- [ ] `TOPICS` の `ready` / `category` / **`maturity`** と CATALOG・実ページが一致  
- [ ] PLATFORM の用語・レイアウトから大きく外れていない  
- [ ] ステータス・再生・乱数・木レイアウト等を **platform に寄せた**（コピペ増殖していない）  


---

## 6. 基盤変更フロー

共有モジュールを触るとき:

1. 影響デモをリストする（`ready: true` 全件が対象になりがち）  
2. 小さく分割してマージ（巨大 PR を避ける）  
3. `docs/PLATFORM.md` を更新  
4. 可能なら代表デモ（BFS + A* + DFS）を手で確認  

---

## 7. ドキュメントの置き場

| 種類 | 場所 |
|------|------|
| 方針・ロードマップ | `docs/ROADMAP.md` |
| 共通仕様 | `docs/PLATFORM.md` |
| 本ファイル | `docs/WORKFLOW.md` |
| トピック一覧 | `docs/topics/CATALOG.md` |
| トピック仕様 | `docs/topics/<id>/SPEC.md` |
| セッション引き継ぎ | `HANDOFF.md`（作業メモ） |
| 利用者向け入口 | `README.md` |

SPEC はコードより先か、**遅くとも実装 PR と同じタイミング**で main に入れる。

---

## 8. GitHub Pages / リリース

```bash
# 認証後
./scripts/publish-github.sh [repo-name]
```

- Pages: `main` / root  
- Release: `RELEASE_NOTES_vX.Y.Z.md` を用意してタグとセット  

---

## 9. やってはいけないこと

- `main` に動かないデモを `ready: true` で載せる  
- SPEC なしで大きなトピックを直 push  
- `git push --force` を共有ブランチに使う  
- 生成物・秘密情報・巨大バイナリを不用意にコミット  

---

## クイックコマンド

```bash
cd ~/Project
git status
git checkout -b topic/example
# ... 編集 ...
git add -A
git commit -m "feat(example): 初回デモ骨格"
git checkout main
git merge topic/example
```
