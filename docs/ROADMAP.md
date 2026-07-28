# ロードマップと今後の方針

| 項目 | 内容 |
|------|------|
| **計画の正本** | [interactive_game_programming_material_plan.docx](./interactive_game_programming_material_plan.docx)（構想・設計資料） |
| **策定** | **2026年7月**（資料表題どおり） |
| **正本改訂** | **2026-07-19** — Fable5 レビュー全件承認を反映（§2 実在ルール優先原則、§4 procgen 行、§6.1 三目並べ、§6.4 割り箸 新設、§15 第2期追記）。レビュー記録: [reviews/2026-07-19-docx-minigames-review.md](./reviews/2026-07-19-docx-minigames-review.md)、変更履歴版: [interactive_game_programming_material_plan_fable5_review.docx](./interactive_game_programming_material_plan_fable5_review.docx) |
| **リポジトリ登録** | 2026-07-17（`docs/` に配置し Git 管理開始） |
| **本 Markdown** | 正本の要約・**実装状況の対応表**・Game Algo Lab 運用メモ（エージェント／GitHub 向け） |
| **最終更新（md）** | 2026-07-27（難易度順の実装計画 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) を追加） |

正本の変更や方針の大きな見直しは **Docx を更新したうえで本ファイルを同期**する。  
細部の図表・講義向け長文は正本を開き、日々の実装判断は本ファイルと [topics/CATALOG.md](./topics/CATALOG.md) を優先する。

GitHub 上の正本（`main`）:  
https://github.com/kobashi/game-algo-lab/blob/main/docs/interactive_game_programming_material_plan.docx

---

## 1. 正本の要旨（構想）

タイトル: **インタラクティブ・ゲームプログラミング教材構想・設計資料**  
副題: 古典的アルゴリズム、ゲーム AI、物理、通信、サウンド、CG を体験的に学ぶ大学講義教材の将来計画（検討内容統合版・2026年7月）

### 1.1 目的

大学のゲームプログラミング講義で、アルゴリズムやシステムの内部動作を学生が **操作・観察・比較** できるインタラクティブ教材を段階整備する。完成ゲームの鑑賞ではなく、CS 概念をゲームという具体対象で理解させる。

### 1.2 中心方針

完成ゲームだけを見せるのではなく、Queue、コールスタック、評価値、探索木、速度・加速度、衝突法線、ネットワーク遅延、音楽の拍・小節、描画順など **通常は見えない内部状態を可視化**する。

### 1.3 設計原則（正本 §2）

| 原則 | 内容 |
|------|------|
| 段階性 | 単純モデルから現実的・高速・高度なモデルへ（例: グリッド擬似物理 → 連続座標 → …） |
| 比較可能性 | 同一条件で複数方式を切り替え、結果・計算量・操作感を比較 |
| 内部状態の可視化 | 実行中の DS・変数・候補・評価値・ベクトル・通信・発音などを表示 |
| 1ステップ実行 | 再生に加え、1ステップ／戻る／速度／初期化を共通操作に |
| 共通基盤 | 盤面・探索・物理・イベント・サウンド・UI・計測を共用 |
| 理論と実装の接続 | 全探索→理論解、総当たり→空間分割、素朴→最適化 |
| Unity を主基盤（将来） | 基本は Unity で実装・可視化。GPU 依存の高度領域は概念説明中心 |
| 実在ルール優先（2026-07-19 追加） | ゲーム木の題材は人対人で遊べる実在ルール（ニム、割り箸、三目並べ、オセロ等）を優先。創作パズルは補助 |

> **現行 Game Algo Lab**: GitHub Pages 向けの **静的 HTML/CSS/JS** で経路探索・ゲーム木・AABB・FSM を試作中。Unity 本線は正本の将来像であり、当面の公開デモ基盤は静的サイトを維持する（[PLATFORM.md](./PLATFORM.md)）。

### 1.4 共通 UI・実行基盤（正本 §3）

デモ領域、疑似コード＋現在行、内部データ、1ステップ進む／戻る、再生・一時停止、速度、初期状態・乱数シード、方式比較、計測（回数・節点・時間）、説明パネルと学習課題。

**共通ミニゲーム／実験環境（構想）**: 2D アクションルーム、CG 実験室、大量オブジェクトフィールド、ゲーム木ビューワ、オンライン・コイン争奪、ボス登場デモ（BGM）。

### 1.5 教材体系の領域（正本 §4）

| 領域 | 主なトピック例 |
|------|----------------|
| 基礎実行モデル | ゲームループ、時間、入力、座標、乱数 |
| 経路・グラフ探索 | BFS, DFS, Dijkstra, 最良優先, A*, 双方向 |
| ゲーム木・組合せ | AND-OR, Min-Max, α-β, 三目並べ, ニム, 割り箸, 4×4 オセロ, MC, バンディット, MCTS |
| ゲーム AI・自律移動 | FSM, ステアリング, Boids, 障害物回避, BT |
| 2D 物理・衝突 | 擬似物理〜加速度、AABB/OBB/SAT、連続衝突 |
| 空間探索・最適化 | 総当たり, Broad/Narrow, グリッド, 四分木, SaP |
| 通信・データ | P2P, C/S, 同期, 予測, チート対策, DB |
| サウンド | SE, 発音管理, 距離減衰, BGM ループ, 拍同期 |
| CG | スプライト〜LOD（Unity 実習 + GPU 概念） |
| 設計・品質 | イベント, コンポーネント, プール, セーブ, テスト, プロファイリング |
| HCI・制作評価 | 入力バッファ, コヨーテタイム, UI, アクセシビリティ, バランス |
| プロシージャル・確率・バランス | 迷路生成, ダンジョン生成, 地形, 制約付き生成, 乱数, バランス分析（2026-07-19 の正本改訂で §4 表へ追加） |

教材カードの標準項目（正本 §16）: カテゴリ / 名 / 1–2 文 / 状態 / 学習目標 / 操作 / 計測 / 発展課題。  
講義フロー（正本 §17）: 導入→原理→可視化→実験→比較→課題→振り返り。

---

## 2. 推奨開発ロードマップ（正本 §15）と実装対応

正本の **第1期〜第5期** を、現行リポジトリの進捗に対応づける。

| 期 | 正本のねらい | Game Algo Lab 現状（2026-07-17） | 次の実装候補（例） |
|----|--------------|----------------------------------|-------------------|
| **第1期** | 既存探索教材の完成と共通 UI | 経路探索 6 本 `ready`（双方向含む）。platform・スモーク・Pages 試作 | 疑似コード同期、計測パネル統一、迷路エディタ強化（同時比較は低優先のアイディアメモ） |
| **第2期** | ゲーム木と状態空間 | AND-OR〜バンディット 5 本 `ready`・多く **一発**。AABB・FSM も試作 | **三目並べ**（全解析・対称性除去）、**割り箸**（循環グラフ・後退解析）、**MCTS**、**ニム**（完全解析→剰余/nim-sum）、**4×4 オセロ**（符号化・対称正規化）、ゲーム木の教材改訂 |
| **第3期** | 2D アクション共通基盤 | AABB のみ（説明 UI） | 擬似物理→速度/加速度、OBB/SAT/連続衝突、入力バッファ・コヨーテ、スプライト統合（将来 Unity と接続可） |
| **第4期** | 群集・高速化・CG | 未着手 | ステアリング・Boids、空間分割、大量オブジェクト、CG 実験室 |
| **第5期** | 通信・データ・BGM | 未着手 | コイン争奪の P2P/サーバ比較、遅延・予測、DB、インタラクティブ BGM |

### 2.1 現行サイトの三本柱（運用）

| 柱 | ねらい | 主な成果物 |
|----|--------|------------|
| **1. トピックの拡大とカテゴリ化** | 正本の体系に沿って段階追加 | [topics/CATALOG.md](./topics/CATALOG.md)、`js/main.js` |
| **2. 共通基盤** | 学び方の統一（正本の共通 UI に相当） | [PLATFORM.md](./PLATFORM.md)、`js/platform/*` |
| **3. 分業体制** | SPEC 先行で並行実装 | [WORKFLOW.md](./WORKFLOW.md)、`docs/templates/` |

### 2.2 実装フェーズ（サイト側・詳細）

#### Phase A — 経路探索（第1期の中核）

- **状態**: BFS / DFS / ダイクストラ / 最良優先 / A* / **双方向** が `ready: true`
- 地図ペイント（コスト・壁・複数ゴール G）、DS 可視化、platform 寄せ済み
- **残（優先）**: 疑似コード行同期、計測表示の統一  
- **低優先（アイディアメモ）**: 経路アルゴリズム同時比較（`path-compare`）— 当面着手しない

#### Phase B — 共通基盤 — **概ね完了（試作）**

- [x] PLATFORM / `js/platform/*` / TOPIC_SCAFFOLD / シェル / smoke  
- [x] トップの成熟度可視化（一発 / 調整 / 安定）  
- 残: 正本が求める「戻る」「疑似コード強調」「計測」の共通 API 化

#### Phase C — ゲーム木（第2期の前半）

- [x] AND-OR / Min-Max / α-β / モンテカルロ / 多腕バンディット  
- [x] 三目並べ（全解析・対称性除去・MC 比較。正本 §6.1、2026-07-19 実装）  
- [x] ニム完全解析 → 剰余 / nim-sum（正本 §6.2、2026-07-19 実装）  
- [x] 割り箸（循環ゲームグラフ・後退解析。正本 §6.4、2026-07-19 新設・同日実装）  
- [x] MCTS（正本明記）— **2026-07-21 実装**: 題材=**三目並べ**。4相+UCB1、完全解/素の MC 比較。[SPEC](./topics/mcts/SPEC.md)  
- [x] 4×4 オセロ（転置表・対称正規化・パス処理・3段計測。正本 §6.3、2026-07-19 実装）  
- 既存 5 本の教材改訂（成熟度 oneshot → revised）
- 学習進行の目安（正本 §6）: 三目並べ → **MCTS（同一題材で UCT）** → ニム → 割り箸 → 4×4 オセロ  
- 第2期ゲーム木（アルゴリズム可視化 + 実在ゲーム4本 + MCTS）は **一通り出揃った**

#### Phase D — その他カテゴリ（第2〜3期の入口）

- [x] AABB（説明特化）  
- [x] ステートマシン  
- [ ] 物理段階シリーズ、ステアリング、通信・サウンド・CG（第3期以降）

### 2.3 カテゴリ一覧（実装済み + 企画中）

**状態の意味**

| 状態 | 意味 |
|------|------|
| **実装済** | `ready: true`。メニューからデモを開ける（[CATALOG.md](./topics/CATALOG.md)） |
| **企画中** | 正本に基づき計画のみ。**SPEC 未着手・HTML/JS 未追加・TOPICS 未登録**。着手時は CATALOG → SPEC → 実装の順 |

| カテゴリ ID（案） | 表示名 | 状態 | 期の目安 | 備考 |
|-------------------|--------|------|----------|------|
| `pathfinding` | 経路探索 | **実装済** | 第1期 | 6 本実装済（双方向含む）。同時比較はアイディアメモ（低優先） |
| `game-tree` | ゲーム木 | **実装済** | 第2期 | 10 本実装済（MCTS + 実在ゲーム4本を含む） |
| `physics` | 物理・判定 | **実装済**（一部企画中） | 第3期 | 擬似〜回転・OBB/Swept。回転衝突・複合は企画中 |
| `patterns` | 設計パターン | **実装済**（一部企画中） | 第2〜3期 | FSM〜ECS 実装済 |
| `fundamentals` | 基礎実行モデル | **実装済** | 第1〜3期 | 5 本すべて ready（game-loop〜rng-seed） |
| `ai-steering` | ゲーム AI・自律移動 | **実装済**（一部企画中） | 第4期 | Seek〜Leader・BT ready。ナビ連携は企画中 |
| `spatial` | 空間探索・最適化 | **実装済**（一部企画中） | 第3〜4期 | 総当たり〜BVH ready |
| `hci` | 入力・操作感・HCI | **実装済**（一部企画中） | 第3期 | coyote-time / input-buffer ready |

| `networking` | 通信・データ | **実装済**（一部企画中） | 第5期 | p2p · prediction ready。サーバ権威・DB 等は企画中 |
| `audio` | ゲームサウンド | **実装済**（一部企画中） | 第5期 | SFX〜材質・量子化 ready。クロスフェード等は企画中 |
| `graphics` | ゲーム CG | **実装済**（一部企画中） | 第4期 | GPU · スプライト · カメラ ready。ライティング等は企画中 |
| `quality` | 設計・品質 | **実装済**（一部企画中） | 横断 | save/replay/debug ready。計測・テストは企画中 |
| `procgen` | プロシージャル・確率・バランス | **実装済**（一部企画中） | 第2〜4期 | maze〜noise · balance-sim ready |

実装済みトピックの詳細・成熟度は [topics/CATALOG.md](./topics/CATALOG.md) / [topics/MATURITY.md](./topics/MATURITY.md)。  
**企画中の id は仮**。着手時に衝突を避けて確定する。

> **`patterns` / `quality` 分割について**: 正本 §13 は「ソフトウェア設計・品質」という **単一領域**（イベント〜プロファイリングまで）。本サイトはメニュー UI の都合で `patterns`（設計パターン寄り）と `quality`（品質・計測寄り）の **2 カテゴリに分割**している。上表の「第2〜3期」「横断」という期の目安は **正本 §15 に明記はなく、サイト運用上の便宜的な推定**。正本との対応は 1 領域 → 2 カテゴリの意図的な分割であり、矛盾ではなく **サイト独自の実装分類**として扱う。

---

## 2.4 企画中トピック一覧（実装しない・計画のみ）

> 本節は **カタログ拡張の予約表**。デモ実装・SPEC は着手時まで作らない。  
> **学習項目の見出しだけ** トップページ `#curriculum` に掲載する（`js/curriculum-outline.js`、デモ・リンクなし）。  
> 正本 §5〜§14・§15 を id 候補に落としたもの。優先は上の期表に従う。

### 状態サマリ

| | 件数の目安 |
|--|-----------|
| 実装済（メニュー掲載） | 15（経路 5 + ゲーム木 8 + AABB + FSM） |
| 企画中（本節） | 下記の各表（カテゴリ横断で多数） |

---

### `pathfinding` — 経路探索（追加分は企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `bfs` … `astar` | （既存 5 本） | 実装済 | CATALOG 参照 |
| `bidirectional-search` | 双方向探索 | **実装済** | 双方向 BFS・出会点接合・一方向との展開数比較。[SPEC](./topics/bidirectional-search/SPEC.md) |
| `path-compare` | 経路アルゴリズム同時比較 | **アイディアメモ（低優先）** | 同一地図・複数方式の同時実行 UI の構想のみ。**当面 SPEC・実装しない**。双方向デモ内の「一方向との展開数比較」で比較学習の一部は既にカバー。優先度は E2E/i18n と同様バックログ側（§5 参照） |

---

### `game-tree` — ゲーム木（追加分は企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `and-or` … `multi-armed-bandit` | （既存 5 本） | 実装済 | 多く oneshot。改訂は別作業 |
| `tic-tac-toe` | 三目並べ（全解析・対称性除去） | **実装済** | 正本 §6.1（2026-07-19 追加・実装）。765 局面・α-β/メモ化/8対称 ON/OFF・MC 比較・15ゲーム同型は解説パネルのみ。[SPEC](./topics/tic-tac-toe/SPEC.md)（implemented） |
| `mcts` | モンテカルロ木探索 (MCTS) | **実装済** | 題材=**三目並べ**。4相 + UCB1/UCT。完全解・素の MC 比較。主シナリオ=`double-threat`。[SPEC](./topics/mcts/SPEC.md) |
| `nim` | ニム（完全読み切り→理論解） | **実装済** | 正本 §6.2（2026-07-19 実装）。1山の逆向き着色DP（周期 n mod k+1）と複数山のnim-sum(XOR)判定・全局面一致確認。[SPEC](./topics/nim/SPEC.md)（implemented） |
| `chopsticks` | 割り箸（循環グラフ・後退解析） | **実装済** | 正本 §6.4（2026-07-19 新設・同日実装）。勝ち/負け/引き分け3値・バリアント比較・局面正規化・深さ制限Min-Max対比。[SPEC](./topics/chopsticks/SPEC.md)（implemented） |
| `othello-4x4` | 4×4 オセロ（符号化・転置表・対称正規化） | **実装済** | 正本 §6.3（2026-07-19 実装）。負の全探索224,820局面/約0.4秒（Node実測）→3段計測（生/転置表後/対称除去後）をチャンク実行で可視化。canonical は手番込み8変換最小。初期局面は黒-8石差（自前計算・独立実装一致）。[SPEC](./topics/othello-4x4/SPEC.md)（implemented） |
| `game-tree-engine` | 共通探索エンジン（交換可能） | **アイディアメモ（低優先）** | 合法手・終局・評価の共通インタフェース構想のみ。**当面 SPEC・実装しない**。現状は各トピックが solver を持ち、`js/platform` で UI・再生を共有する形で足りる。優先度は §5 バックログ側 |

---

### `physics` — 物理・判定（追加分は企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `collision` | AABB 衝突判定 | 実装済 | 二重判定・複雑度比較 |
| `grid-pseudo-physics` | グリッド擬似物理 | **実装済** | 1 マス落下・接地。[SPEC](./topics/grid-pseudo-physics/SPEC.md) |
| `velocity-motion` | 速度による移動 | **実装済** | 位置←位置＋速度。[SPEC](./topics/velocity-motion/SPEC.md) |
| `accel-decel` | 加減速 | **実装済** | 最高速度・慣性。[SPEC](./topics/accel-decel/SPEC.md) |
| `accel-gravity` | 加速度と重力 | **実装済** | 放物・ジャンプ。[SPEC](./topics/accel-gravity/SPEC.md) |
| `friction-bounce` | 摩擦・反発 | **実装済** | 減衰・反発係数。[SPEC](./topics/friction-bounce/SPEC.md) |
| `momentum-1d` | 質量と運動量（1 次元） | **実装済** | 弾性/非弾性。[SPEC](./topics/momentum-1d/SPEC.md) |
| `rotational-motion` | 回転運動 | **実装済** | [SPEC](./topics/rotational-motion/SPEC.md) |
| `circle-collision` | 円同士・円と AABB | **実装済** | Clamp・最近点。[SPEC](./topics/circle-collision/SPEC.md) |
| `raycast-shapes` | 線分・レイキャストと図形の交差 | **実装済** | [SPEC](./topics/raycast-shapes/SPEC.md) |
| `obb-sat` | OBB / 分離軸定理 (SAT) | **実装済** | [SPEC](./topics/obb-sat/SPEC.md) |
| `swept-aabb` | 連続衝突 (Swept AABB / TOI) | **実装済** | [SPEC](./topics/swept-aabb/SPEC.md) |
| `rotating-collision` | 回転中の物体との衝突 | **実装済** | [SPEC](./topics/rotating-collision/SPEC.md) |
| `concave-compound` | 凹形状の凸分割・複合コライダー | **実装済** | [SPEC](./topics/concave-compound/SPEC.md) |
| `collision-response` | 衝突応答 | **実装済** | 侵入解消・インパルス。[SPEC](./topics/collision-response/SPEC.md) |

---

### `patterns` — 設計パターン（追加分は企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `fsm` | ステートマシン | 実装済 | |
| `event-system` | イベントシステム | **実装済** | 疎結合通知。[SPEC](./topics/event-system/SPEC.md) |
| `command-pattern` | コマンドパターン | **実装済** | リプレイ・Undo。[SPEC](./topics/command-pattern/SPEC.md) |
| `component-vs-inheritance` | 継承 vs コンポーネント | **実装済** | 構成比較。[SPEC](./topics/component-vs-inheritance/SPEC.md) |
| `object-pool` | オブジェクトプール | **実装済** | 弾丸・エフェクト・GC 比較。[SPEC](./topics/object-pool/SPEC.md) |
| `ecs-intro` | ECS 入門 | **実装済** | [SPEC](./topics/ecs-intro/SPEC.md) |

---

### `fundamentals` — 基礎実行モデル

学習順: **game-loop → time-management → input-basics → coordinates → rng-seed**

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `game-loop` | ゲームループ | **実装済** | 可変/固定 timestep・人工遅延・MAX_STEPS。[SPEC](./topics/game-loop/SPEC.md) |
| `time-management` | 時間管理 | **実装済** | real/game 時間、time scale、ポーズ。[SPEC](./topics/time-management/SPEC.md) |
| `input-basics` | 入力の基礎 | **実装済** | held / down / up / 長押し。[SPEC](./topics/input-basics/SPEC.md) |
| `coordinates` | 座標変換 | **実装済** | ローカル/ワールド/スクリーン。[SPEC](./topics/coordinates/SPEC.md) |
| `rng-seed` | 乱数とシード | **実装済** | Mulberry32・再現性。[SPEC](./topics/rng-seed/SPEC.md) |

---

### `ai-steering` — ゲーム AI・自律移動（カテゴリごと企画中）

> **FSM の分類について**: 正本 §4 の領域表ではステートマシンは本カテゴリ（ゲームAI・自律移動）に属する。しかし本サイトは実装済みの UI 型（説明特化・非マップ）の都合で `patterns`（設計パターン）カテゴリに置いている。これは正本の体系からの **意図的なサイト側分類**であり、今後 FSM を本カテゴリへ移す予定はない（変更する場合は `js/main.js` の `category`/`badge`、CATALOG、本 ROADMAP を同時に更新する）。

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `steering-seek-flee` | Seek / Flee / Arrive | **実装済** | [SPEC](./topics/steering-seek-flee/SPEC.md) |
| `steering-wander-avoid` | Wander / Obstacle Avoidance | **実装済** | [SPEC](./topics/steering-wander-avoid/SPEC.md) |
| `steering-leader` | Leader Following | **実装済** | [SPEC](./topics/steering-leader/SPEC.md) |
| `boids` | Boids / Flocking | **実装済** | [SPEC](./topics/boids/SPEC.md) |
| `behavior-tree` | ビヘイビアツリー | **実装済** | [SPEC](./topics/behavior-tree/SPEC.md) |
| `obstacle-avoidance-nav` | 障害物回避（ナビ連携） | **実装済** | [SPEC](./topics/obstacle-avoidance-nav/SPEC.md) |

---

### `spatial` — 空間探索・最適化

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `brute-force-pairs` | 総当たり O(n²) | **実装済** | [SPEC](./topics/brute-force-pairs/SPEC.md) |
| `broad-narrow-phase` | Broad / Narrow Phase | **実装済** | [SPEC](./topics/broad-narrow-phase/SPEC.md) |
| `uniform-grid` | 一様グリッド | **実装済** | [SPEC](./topics/uniform-grid/SPEC.md) |
| `quadtree` | 四分木 | **実装済** | [SPEC](./topics/quadtree/SPEC.md) |
| `sweep-and-prune` | Sweep and Prune | **実装済** | [SPEC](./topics/sweep-and-prune/SPEC.md) |
| `bvh-overview` | BVH（概説） | **実装済** | [SPEC](./topics/bvh-overview/SPEC.md) |

---

### `hci` — 入力・操作感・HCI（カテゴリごと企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `input-buffer` | 入力バッファ | **実装済** | 着地前入力。[SPEC](./topics/input-buffer/SPEC.md) |
| `coyote-time` | コヨーテタイム | **実装済** | 猶予の有無比較。[SPEC](./topics/coyote-time/SPEC.md) |
| `input-abstraction` | 入力抽象化 | **実装済** | [SPEC](./topics/input-abstraction/SPEC.md) |
| `command-input` | コマンド入力 | **実装済** | [SPEC](./topics/command-input/SPEC.md) |
| `accessibility-basics` | アクセシビリティ基礎 | **実装済** | [SPEC](./topics/accessibility-basics/SPEC.md) |

---

### `networking` — 通信・データ（カテゴリごと企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `net-p2p-demo` | P2P 通信の観察 | **実装済** | [SPEC](./topics/net-p2p-demo/SPEC.md) |
| `net-client-server` | クライアント・サーバ | **企画中** | サーバ権威 |
| `net-sync-modes` | 状態同期 vs 入力同期 | **企画中** | |
| `net-prediction` | 補間・予測・補正 | **実装済** | [SPEC](./topics/net-prediction/SPEC.md) |
| `net-anti-cheat` | サーバ権威とチート対策 | **企画中** | 速度・スコア検証の疑似 |
| `net-db-transaction` | DB とトランザクション | **企画中** | 購入の COMMIT/ROLLBACK 概念 |

---

### `audio` — ゲームサウンド（カテゴリごと企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `sfx-events` | イベントと効果音 | **実装済** | [SPEC](./topics/sfx-events/SPEC.md) |
| `sfx-voice-limit` | 同時発音・重複制御 | **実装済** | [SPEC](./topics/sfx-voice-limit/SPEC.md) |
| `sfx-randomize` | ランダム化 | **実装済** | [SPEC](./topics/sfx-randomize/SPEC.md) |
| `sfx-material` | 材質別・衝突強度と音 | **実装済** | [SPEC](./topics/sfx-material/SPEC.md) |
| `sfx-spatial` | 距離・パン・優先順位 | **実装済** | [SPEC](./topics/sfx-spatial/SPEC.md) |
| `audio-bus-ducking` | サウンドバスとダッキング | **実装済** | [SPEC](./topics/audio-bus-ducking/SPEC.md) |
| `bgm-loop` | BGM ループ / イントロ＋ループ | **実装済** | [SPEC](./topics/bgm-loop/SPEC.md) |
| `bgm-transition-compare` | 切替方式の比較 | **企画中** | 即時切替・クロスフェード・拍同期・専用トランジション（正本 §11.2） |
| `bgm-quantize` | 量子化 | **実装済** | [SPEC](./topics/bgm-quantize/SPEC.md) |
| `bgm-interactive` | 拍同期・レイヤー型 BGM | **企画中** | ボス登場デモ（正本共通環境） |

---

### `graphics` — ゲーム CG（カテゴリごと企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `gfx-coordinates` | 座標系と変換 | **企画中** | Unity / Web のどちらでやるか SPEC で決定 |
| `gfx-camera` | カメラと投影 | **実装済** | [SPEC](./topics/gfx-camera/SPEC.md) |
| `gfx-sprite-2d` | 2D スプライト | **実装済** | [SPEC](./topics/gfx-sprite-2d/SPEC.md) |
| `gfx-mesh-uv` | メッシュ・UV・マテリアル | **企画中** | |
| `gfx-lighting-alpha` | ライティング・透明度 | **企画中** | |
| `gfx-animation-vfx` | アニメーション・パーティクル | **企画中** | |
| `gfx-postprocess` | ポストプロセス | **企画中** | Bloom・色調・Vignette（正本 §12.1） |
| `gfx-lod-culling` | LOD・カリング | **企画中** | 負荷計測とセット |
| `gfx-ui-canvas` | UI 描画 | **企画中** | Canvas・Anchor・Pivot・解像度対応（正本 §12.1） |
| `gfx-gpu-concepts` | GPU パイプライン概説 | **実装済** | [SPEC](./topics/gfx-gpu-concepts/SPEC.md) |

---

### `quality` — 設計・品質（カテゴリごと企画中）

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `save-load` | セーブ・ロード | **実装済** | [SPEC](./topics/save-load/SPEC.md) |
| `replay-determinism` | リプレイと決定性 | **実装済** | [SPEC](./topics/replay-determinism/SPEC.md) |
| `debug-overlays` | デバッグ可視化 | **実装済** | [SPEC](./topics/debug-overlays/SPEC.md) |
| `profiling-loop` | プロファイリング循環 | **実装済** | [SPEC](./topics/profiling-loop/SPEC.md) |
| `unit-test-gameplay` | ゲームロジックのテスト | **実装済** | [SPEC](./topics/unit-test-gameplay/SPEC.md) |

---

### `procgen` — プロシージャル・確率・バランス

学習順（案）: **rng-seed → maze-gen → dungeon-gen → …**

| id（案） | タイトル | 状態 | メモ |
|----------|----------|------|------|
| `maze-gen` | 迷路生成 | **実装済** | Backtracker / Prim 風・シード付き。[SPEC](./topics/maze-gen/SPEC.md) |
| `dungeon-gen` | ダンジョン生成 | **実装済** | 部屋と通路。[SPEC](./topics/dungeon-gen/SPEC.md) |
| `noise-terrain` | ノイズと地形 | **実装済** | Value Noise + fBm。[SPEC](./topics/noise-terrain/SPEC.md) |
| `constrained-gen` | 制約付き生成 | **実装済** | 到達可能性検証。[SPEC](./topics/constrained-gen/SPEC.md) |
| `weighted-random` | 重み付き抽選・分布 | **実装済** | Fisher–Yates 等。[SPEC](./topics/weighted-random/SPEC.md) |
| `balance-sim` | ゲームバランス分析 | **実装済** | [SPEC](./topics/balance-sim/SPEC.md) |

---

### 企画中トピックの着手ルール

1. 本表の id を [topics/CATALOG.md](./topics/CATALOG.md) に **ready ❌ / 状態: 企画中→準備中** で転記  
2. `docs/topics/<id>/SPEC.md` を作成（学習目標・操作・成功条件）  
3. 実装ブランチ → デモ → `ready: true`・成熟度 `oneshot`  
4. **本 ROADMAP の該当行を「実装済」に更新**（CATALOG と揃える）  
5. この更新作業では **コード・HTML・main.js は触らない**

**実装の優先順位（難易度順）**は [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) を正とする。簡単なものから Wave A → B → … と進める。

---

## 3. 成功の定義

### 3.1 正本の到達目標（§18 要約）

- ゲームループ・入力・物理・描画・AI・サウンド・通信の役割を説明できる  
- アルゴリズムの **過程**（内部状態）を観察・説明できる  
- 単純／高度方式の利点・計算量を比較できる  
- ゲーム木（全探索・枝刈り・メモ化・対称・理論解）の違いを理解できる  
- 2D 物理を段階実装できる / サーバ権威とチート対策の要点を説明できる  
- SE・BGM をイベント・拍に結び付けられる / Unity で基本 CG を扱え GPU 概要を説明できる  
- プロファイリングやテストで根拠ある改善ができる  

### 3.2 現行リポジトリの運用目標

1. 受講生が同じ UI 習慣で新トピックに入れる  
2. 実装者が SPEC + テンプレから着手できる  
3. メンテナが platform 規約違反を指摘できる  
4. GitHub Pages で **main = 公開可能な静的サイト** を保てる  

---

## 4. やらないこと（当面・サイト実装）

- ビルドツール必須化（Webpack 等）。静的 HTML/CSS/JS を維持  
- バックエンド・ログイン（通信教材は別途 SPEC。現サイトは静的）  
- 仕様なしの大規模リファクタ  
- **E2E** / **i18n**（下記バックログ）  
- 正本の Unity 全面移行を、現サイトの置き換えとして急がない  

---

## 5. 今後の課題（バックログ・着手保留）

優先度はトピック追加や基盤の小さな改善より**下**。

| 課題 | 意図（やるなら） | いまやらない理由 |
|------|------------------|------------------|
| **E2E**（Playwright 等） | 主要操作の回帰防止 | メンテコスト。`scripts/smoke-platform.py` + 手動で当面足りる |
| **i18n** | 多言語受講・公開 | 日本語教材が主。文言キー化の波及が大きい |
| **`path-compare`（経路アルゴリズム同時比較）** | 同一地図で BFS/Dijkstra/A* 等を並べて再生・計測 | アイディアメモ段階。UI・共通エンジンの工大。双方向デモの比較パネルや個別トピックの切替で当面足りる。**優先度低・着手保留** |
| **`game-tree-engine`（共通探索エンジン）** | 合法手・終局・評価を差し替え可能な横断 solver | アイディアメモ段階。抽象化の設計コストが大きく、教材効果は薄い。各デモの純関数 export + platform 共有で当面足りる。**優先度低・着手保留** |

### E2E 目安

代表 2〜3 本 × 開く / 1ステップ / リセット。ピクセル断言は避ける。

### i18n 目安

`js/platform` とシェルから。地図記号・数式・C# の言語方針を SPEC で先に決める。

---

## 6. 正本との同期ルール

1. **方針・体系・期分けの変更** → 正本 Docx を更新し、**策定/改訂日**を Docx と本表に記録  
2. **実装の進捗** → 本ファイル §2 / §2.4 と CATALOG / HANDOFF を更新（毎回 Docx を書き直す必要はない）  
3. Git に載せる Docx は `docs/*.docx` のみ（ルートの下書きは `.gitignore`）  
4. 新規トピックは **§2.4 企画中表 → CATALOG → SPEC → 実装**。企画中のままコードを増やさない  

---

## 7. 関連ドキュメント

| 文書 | 役割 |
|------|------|
| [interactive_game_programming_material_plan.docx](./interactive_game_programming_material_plan.docx) | **計画の正本**（2026年7月策定） |
| [PLATFORM.md](./PLATFORM.md) | 現行静的サイトの共通仕様 |
| [WORKFLOW.md](./WORKFLOW.md) | Git と分業 |
| [topics/CATALOG.md](./topics/CATALOG.md) | トピック一覧・成熟度 |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 難易度順の実装計画 |
| [topics/MATURITY.md](./topics/MATURITY.md) | 一発 / 調整 / 安定 |
| [templates/SPEC.md](./templates/SPEC.md) | 仕様テンプレ |
| [../README.md](../README.md) / [../HANDOFF.md](../HANDOFF.md) | 入口・引き継ぎ |
