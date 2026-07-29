# 追加候補トピック調査メモ

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-07-28 |
| 目的 | ready **95** 到達後、**まだ盛り込めそうな教材トピック**を調査し、優先度付きで記録する |
| 実装の正 | [CATALOG.md](./CATALOG.md) · `js/main.js` の `TOPICS` |
| 対応表 | [../ROADMAP.md](../ROADMAP.md) §2.4 |
| 本メモの位置づけ | **調査・予約**。SPEC 未作成。着手時は TOPIC_SCAFFOLD に従う |

---

## 1. 調査の前提

### 1.1 サイト制約（盛り込みやすさの判定軸）

| 制約 | 意味 |
|------|------|
| 静的 HTML/CSS/JS | 実サーバ・DB・マルチプレイ本番は疑似に留める |
| 可視化優先 | 内部状態（DS・ベクトル・スコア・パケット）が見えること |
| ビルド不要 | 外部エンジン必須トピックは避ける or 概念デモに落とす |
| 日本語 UI | 操作文言は日本語 |
| 工数感 | E = 半日〜1日 / M = 数日 / H = 1 週間級 |

### 1.2 既に厚い領域（新規より改訂優先）

| 領域 | ready の厚み | 新規の余地 |
|------|--------------|------------|
| 経路探索（グリッド） | BFS〜双方向 + 疑似コード | 薄い（拡張は JPS/NavMesh など） |
| ゲーム木・完全情報 | Min-Max〜オセロ/MCTS | 薄い（不完全情報は別系統） |
| 物理 2D 基本 | 擬似〜SAT/Swept/回転 | 中（関節・Verlet 等） |
| 空間分割 | 総当たり〜BVH | 薄い（空間ハッシュの明示が余白） |
| ステアリング | Seek〜ナビ連携 | 中（Flow field / Utility） |
| Audio / Graphics / Net | Wave F 一通り | 中（穴埋め・発展） |

### 1.3 既知のアイディアメモ（着手保留）

| id | 状態 | メモ |
|----|------|------|
| `path-compare` | 低優先 | 同一地図の同時比較 UI |
| `game-tree-engine` | 低優先 | 共通 solver 抽象 |
| E2E / i18n | バックログ | [ROADMAP §5](../ROADMAP.md) |

---

## 2. 推奨候補（静的サイト適合・教材効果が高い）

優先度: **A** = 次スプリント候補 · **B** = 中期 · **C** = 余裕があれば  
適合: 静的可視化との相性

### 2.1 優先度 A（次に盛り込みやすい）

| id 案 | タイトル | カテゴリ | 難度 | 依存・前段 | 学習ゴール（要約） | 適合 | 根拠・メモ |
|-------|----------|----------|------|------------|-------------------|------|------------|
| `navmesh-intro` | ナビメッシュ入門（2D） | 経路探索 / AI | **M** | A* · coordinates | 歩行可能多角形 → グラフ化 → 経路 → **string pulling（funnel）** | 高 | **実装済**（2026-07-28 · Sprint S2） |
| `flow-field` | フローフィールド | AI · 経路 | **M** | BFS · steering | ゴールからコスト場を塗り、多数エージェントが勾配に従う | 高 | **実装済**（2026-07-28 · Sprint S2） |
| `jps` | Jump Point Search | 経路探索 | **M〜H** | A* | 一様コスト格子で対称性を刈り込み展開数を減らす | 高 | **実装済**（2026-07-29 · Sprint S3） |
| `spatial-hash` | 空間ハッシュ | 空間 | **E〜M** | uniform-grid · brute-force | ハッシュで近傍候補を絞る | 高 | グリッドと役割が近いが「ハッシュ衝突・セルサイズ」を教えられる。 |
| `utility-ai` | 効用 AI（Utility） | AI | **M** | FSM · BT | 行動ごとにスコア曲線を計算し最大を選ぶ | 高 | **実装済**（2026-07-28 · Sprint S2） |
| `verlet-integration` | Verlet 積分 · 距離拘束 | 物理 | **M** | velocity · momentum | 位置ベース積分と棒・布の簡易拘束 | 高 | **実装済**（2026-07-29 · Sprint S3） |
| `wfc-intro` | Wave Function Collapse 入門 | procgen | **M〜H** | constrained-gen · weighted-random | タイル制約で局所一貫したマップ生成 | 高 | **実装済**（2026-07-29 · Sprint S3） |
| `cellular-automata` | セルオートマトン（洞窟生成） | procgen | **E〜M** | maze-gen · noise | 近傍ルールで壁/床が進化 | 高 | 実装が軽く、迷路・ノイズと並ぶ生成三本目。 |
| `sprite-anim-fsm` | スプライトアニメ × FSM | Graphics · patterns | **E〜M** | gfx-sprite-2d · fsm | 状態ごとにクリップ切替・遷移 | 高 | 既存 2 トピックの接続。実践感が高い。 |
| `snapshot-interp` | スナップショット補間 | networking | **M** | net-prediction · net-p2p | 受信状態をバッファし描画を遅延補間 | 高 | 予測の対になる「リモート表示」側。静的疑似ネットで可。 |
| （参考）`net-anti-cheat` | サーバ権威とチート対策 | networking | — | **実装済** | 速度上限・スコア再計算 | — | 入門として十分。本格 anti-cheat は ROADMAP §4.2 範囲外 |

### 2.2 優先度 B（中期・少し重い or 狭い）

| id 案 | タイトル | カテゴリ | 難度 | 依存 | メモ |
|-------|----------|----------|------|------|------|
| `theta-star` | Theta* / 任意角経路 | 経路 | **M** | A* · raycast | 視線が通れば親を飛ばし滑らかな経路。 |
| `influence-map` | 影響マップ | AI | **M** | flow-field · steering | 脅威・興味のスカラー場。戦術 AI の入口。 |
| `goap-lite` | GOAP 入門（小状態） | AI | **H** | BT · utility | 目標→前提→行動計画。状態数を極小にしないと爆発。 |
| `decision-tree` | 決定木（ルール AI） | AI | **E** | FSM | 条件分岐の木。簡単だが FSM と差別化が必要。 |
| `blackboard` | ブラックボード | patterns · AI | **E〜M** | event-system · BT | 共有キーバリュー。BT と組み合わせデモ。 |
| `distance-joint` | 距離ジョイント | 物理 | **M** | verlet または impulse | 2 点間距離拘束。振り子。 |
| `platformer-slope` | スロープ接地 | 物理 · HCI | **M** | accel-gravity · collision-response | 法線に沿った移動。2D アクション定番の穴。 |
| `character-controller-2d` | キネマティック CC | 物理 | **M** | slope · swept-aabb | 速度入力→安全な移動解決。 |
| `poisson-disk` | Poisson disk サンプリング | procgen | **M** | rng-seed | 点の最小距離配置。木・敵の配置。 |
| `marching-squares` | Marching Squares | procgen · gfx | **M** | noise-terrain | スカラー場→輪郭。地形の次。 |
| `autotile` | オートタイル / bitmask | gfx · procgen | **M** | dungeon-gen · gfx-sprite-2d | 近傍 4/8 でタイル ID。 |
| `parallax-scroll` | 視差スクロール | gfx | **E** | gfx-camera | レイヤ速度差。カメラの応用。 |
| `palette-swap` | パレットスワップ | gfx | **E** | gfx-sprite-2d | 色テーブル差し替え。 |
| `interest-mgmt` | 関心管理（AOI） | networking | **M** | net-p2p · spatial | 視野内エンティティだけ送る。 |
| `delta-compress` | 差分圧縮の概念 | networking | **M** | net-sync-modes | 前回スナップショットとの差分。バイト数比較。 |
| `elo-rating` | レーティング（Elo） | balance · net | **E〜M** | balance-sim | 対戦後のレート更新。統計教材。 |
| `cooldown-resource` | クールダウン・リソース | ゲームロジック | **E** | game-loop · input | GCD・MP 消費。UI ゲージ可視化。 |
| `damage-pipeline` | ダメージ計算パイプライン | ゲームロジック | **E〜M** | event-system | 基礎→補正→防御→乱数。ログが教材。 |
| `dirty-flag` | Dirty Flag パターン | patterns | **E** | coordinates · gfx | 変換キャッシュ無効化。 |
| `double-buffer` | ダブルバッファ | patterns · fundamentals | **E** | game-loop | 更新用と描画用の入れ替え。 |
| `flyweight` | Flyweight | patterns | **E** | object-pool · gfx-sprite | 共有データとインスタンスデータ。 |

### 2.3 優先度 C（重い・方針依存・後回し）

| id 案 | タイトル | 理由 |
|-------|----------|------|
| `d-star-lite` | D* Lite | 動的障害で強いが実装・教材設計が重い |
| `hpa-star` | Hierarchical Pathfinding | 抽象化レベルが多く UI が複雑 |
| `ik-2bone` | 2 ボーン IK | 数学は美しいがカテゴリが狭い |
| `skeletal-2d` | 2D スケルタル | アセットとエディタ相当が必要 |
| `pbr-lite` | PBR 概念 | Web ではシェーダ or 近似。GPU 概念で足りる部分大 |
| `server-authoritative-full` | 本格サーバ権威 | 静的サイトの範囲を超える（疑似は net-* でカバー済み） |
| `ml-agent-lite` | 強化学習エージェント | 学習ループが重く依存が増える |
| `behavior-tree-editor` | BT ビジュアル編集 | エディタ実装が本体になりがち |

---

## 3. カテゴリ別ギャップ要約

| カテゴリ | 実装済みの到達点 | 自然な次の 1〜2 本 |
|----------|------------------|-------------------|
| 経路探索 | 格子 + 双方向 | **navmesh-intro** · **jps** |
| AI | ステアリング + BT + ナビ | **utility-ai** · **flow-field** |
| 物理 | 剛体 2D 基本一通り | **verlet** · **platformer-slope** |
| 空間 | 分割構造一通り | **spatial-hash**（明示トピック） |
| procgen | 迷路〜ノイズ・バランス | **cellular-automata** · **wfc-intro** |
| Graphics | GPU〜UI/Mesh | **sprite-anim-fsm** · **autotile** / **parallax** |
| networking | 遅延〜DB | **snapshot-interp** · **interest-mgmt** |
| patterns | FSM〜ECS | **dirty-flag** · **blackboard** |
| 横断ロジック | — | **damage-pipeline** · **cooldown-resource** |

---

## 4. 推奨スプリント案（実装する場合）

難易度と依存を踏まえた **案**（確定の実装指示ではない）。

### Sprint S1 — 低〜中・接続が強い（4 本）— **実装済 2026-07-28**

1. `cellular-automata` ✅  
2. `spatial-hash` ✅  
3. `sprite-anim-fsm` ✅  
4. `dirty-flag` ✅

### Sprint S2 — 経路・AI の「次の現実」（3 本）— **実装済 2026-07-28**

1. `navmesh-intro`（M） ✅  
2. `flow-field`（M） ✅  
3. `utility-ai`（M） ✅

### Sprint S3 — 生成・物理の深掘り（3 本）— **実装済 2026-07-29**

1. `wfc-intro`（M〜H） ✅  
2. `verlet-integration`（M） ✅  
3. `jps`（M〜H） ✅

### Sprint S4 — ネット表示の完成（2 本）

1. `snapshot-interp`（M）  
2. `interest-mgmt`（M）

---

## 5. 盛り込み判定チェックリスト（候補を落とすとき）

着手前に SPEC で確認する:

- [ ] 1 画面のキャンバス / 表で **内部状態**が見えるか  
- [ ] 既存トピックとの **前段・後段**が言えるか  
- [ ] 静的サイトで **疑似**に落ちるか（サーバ実体が必須なら見送り）  
- [ ] 操作が 3〜6 個に収まるか（多すぎる UI は分割）  
- [ ] C# サンプルが「核」だけ示せるか  

---

## 6. 参考文献・定番トピック源（調査メモ）

教材・産業で繰り返し出る項目（網羅ではない）:

- 経路: A* 発展（JPS, Theta*, NavMesh + funnel）, Flow fields  
- AI: Utility AI, GOAP/HTN, Influence maps, Perception  
- 物理: Verlet / PBD 入門, 関節拘束, キャラクターコントローラ  
- 生成: CA 洞窟, WFC, Poisson disk, Marching squares  
- ネット: Snapshot interpolation, Interest management, Delta compression  
- パターン: Dirty flag, Double buffer, Flyweight（Game Programming Patterns 系）

NavMesh は「グラフ探索 + string pulling + ステアリング」の三段であることが教材ストーリーとして明確（産業記事・講座でも定番）。

---

## 7. 更新ルール

| いつ | 何をする |
|------|----------|
| 候補を採用して着手 | 本表の行を ROADMAP §2.4 に転記し SPEC を切る。本表では「着手中」とメモ |
| 実装完了 | 本表から削除 or 「実装済 → CATALOG」と 1 行残す |
| 調査の再見直し | 年 1 回または Wave 完了時。日付を表紙に更新 |

**次の人間/エージェント向け**: 実装指示が「候補から進めて」のときは、§4 の Sprint S4 から選ぶと安全（S1〜S3 実装済）。  
低優先の `path-compare` / `game-tree-engine` は本表の推奨スプリントに入れない。
