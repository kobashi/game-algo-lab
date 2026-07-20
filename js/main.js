/**
 * トップページ: 学習トピック一覧をカテゴリ別に描画
 * 新しいアルゴリズムを追加するときは TOPICS に1件足すだけでOK
 * @see docs/PLATFORM.md
 * @see docs/topics/CATALOG.md
 * @see docs/topics/MATURITY.md
 */

import {
  MATURITY_ORDER,
  MATURITY_HINT,
  TOPIC_META,
  resolveTopicMeta,
  countByMaturity,
  createMaturityBadge,
} from "./platform/maturity.js";
import { CURRICULUM_OUTLINE } from "./curriculum-outline.js";

/**
 * @typedef {'oneshot' | 'revised' | 'stable'} Maturity
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   href: string,
 *   badge: string,
 *   category: string,
 *   ready: boolean,
 *   maturity: Maturity,
 * }} Topic
 */

/** 表示順（未掲載カテゴリは末尾） */
const CATEGORY_ORDER = [
  "経路探索",
  "ゲーム木",
  "物理・判定",
  "設計パターン",
];

/** @type {Topic[]} */
const TOPICS = [
  {
    id: "bfs",
    title: "幅優先探索 (BFS)",
    description: "最短歩数探索を可視化。Queue で広げる。",
    href: "algorithms/bfs.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "dfs",
    title: "深さ優先探索 (DFS)",
    description: "再帰で深く潜りバックトラック。コールスタックを可視化。",
    href: "algorithms/dfs.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "dijkstra",
    title: "ダイクストラ法",
    description: "優先度 = g（経路コスト）。A* のコスト側の前振り。",
    href: "algorithms/dijkstra.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "best-first",
    title: "最良優先探索",
    description: "優先度 = h（見積り）のみ。A* のヒューリスティック側の前振り。",
    href: "algorithms/best-first.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "astar",
    title: "A* 探索",
    description: "f = g + h。ダイクストラと最良優先を統合した探索。",
    href: "algorithms/astar.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "and-or",
    title: "AND-OR 探索",
    description:
      "ゲーム木の入口。OR（どれか1つ）と AND（すべて）で終局まで読み切る。",
    href: "algorithms/and-or.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "minimax",
    title: "Min-Max 探索",
    description:
      "MAX/MIN と局面評価値。相手も最善を取る前提で木を読む。",
    href: "algorithms/minimax.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "alpha-beta",
    title: "α-β 法",
    description:
      "Min-Max に α・β 窓を付け、答えに効かない枝を刈る。",
    href: "algorithms/alpha-beta.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "monte-carlo",
    title: "モンテカルロ法",
    description:
      "ランダムプレイアウトの平均で評価。全部読む Min-Max との違いを学ぶ。",
    href: "algorithms/monte-carlo.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "multi-armed-bandit",
    title: "多腕バンディット",
    description:
      "探索と活用。ε-greedy / UCB1。MCTS の腕選択の基礎。",
    href: "algorithms/multi-armed-bandit.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "tic-tac-toe",
    title: "三目並べ（全解析・対称性除去）",
    description:
      "全探索で引き分けを証明。α-β・メモ化・対称性除去(765局面)をON/OFF比較し、MCの誤判定も見る。",
    href: "algorithms/tic-tac-toe.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "nim",
    title: "ニム（完全読み切り→理論解）",
    description:
      "1山の逆向き着色で周期性(n mod k+1)を発見、複数山の全局面探索でnim-sum(XOR)判定と一致確認。",
    href: "algorithms/nim.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "chopsticks",
    title: "割り箸（循環グラフ・後退解析）",
    description:
      "同一局面に戻る循環グラフを後退解析で3値（勝ち/負け/引き分け）に確定。バリアント・深さ制限Min-Maxと比較。",
    href: "algorithms/chopsticks.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "othello-4x4",
    title: "4×4 オセロ（符号化・転置表・対称正規化）",
    description:
      "実在ルール＋パス・終局を持つゲーム木最終段。生の生成局面数/転置表後/対称除去後の3段比較をチャンク実行で可視化。",
    href: "algorithms/othello-4x4.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "collision",
    title: "AABB 衝突判定",
    description:
      "重なり判定と分離判定の2通りを実装比較。軸投影と複雑度表付き。",
    href: "algorithms/collision.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "revised",
  },
  {
    id: "fsm",
    title: "ステートマシン",
    description:
      "状態・イベント・遷移表。キャラ行動を FSM でモデル化（非マップ UI）。",
    href: "algorithms/fsm.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
];

/**
 * @param {Topic} topic
 */
function createCard(topic) {
  const meta =
    resolveTopicMeta(topic.id) ||
    TOPIC_META[topic.id] || {
      maturity: topic.maturity || "oneshot",
      revisions: 0,
      updated: "",
    };
  const maturityCode = meta.maturity;
  const card = document.createElement("article");
  card.className = topic.ready ? "card" : "card is-coming-soon";
  card.dataset.maturity = maturityCode;
  card.dataset.revisions = String(meta.revisions);
  if (meta.updated) card.dataset.updated = meta.updated;

  const badgeRow = document.createElement("div");
  badgeRow.className = "card-badge-row";

  const badge = document.createElement("span");
  badge.className = "card-badge";
  badge.textContent = topic.badge;

  const maturity = createMaturityBadge(meta);
  if (maturity) badgeRow.append(badge, maturity);
  else badgeRow.append(badge);

  const title = document.createElement("h3");
  title.textContent = topic.title;

  const desc = document.createElement("p");
  desc.textContent = topic.description;

  card.append(badgeRow, title, desc);

  if (topic.ready) {
    const link = document.createElement("a");
    link.className = "btn btn-ghost";
    link.href = topic.href;
    link.textContent = "デモを開く";
    card.append(link);
  } else {
    const soon = document.createElement("span");
    soon.className = "btn btn-ghost";
    soon.textContent = "準備中";
    soon.setAttribute("aria-disabled", "true");
    card.append(soon);
  }

  return card;
}

/**
 * @param {Topic[]} topics
 * @returns {Map<string, Topic[]>}
 */
function groupByCategory(topics) {
  /** @type {Map<string, Topic[]>} */
  const map = new Map();
  for (const t of topics) {
    const cat = t.category || t.badge || "その他";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(t);
  }
  return map;
}

function orderedCategories(map) {
  const keys = [...map.keys()];
  const ordered = [];
  for (const c of CATEGORY_ORDER) {
    if (map.has(c)) ordered.push(c);
  }
  for (const c of keys) {
    if (!ordered.includes(c)) ordered.push(c);
  }
  return ordered;
}

/** 成熟度の色付き凡例 + 件数 */
function renderMaturityLegend() {
  const root = document.getElementById("maturity-legend");
  if (!root) return;

  const counts = countByMaturity(TOPICS);

  const title = document.createElement("p");
  title.className = "maturity-legend-title";
  title.textContent = "修正状況（成熟度）";

  const list = document.createElement("ul");
  list.className = "maturity-legend-list";
  list.setAttribute("aria-label", "成熟度の凡例");

  for (const code of MATURITY_ORDER) {
    const li = document.createElement("li");
    li.className = "maturity-legend-item";

    const badge = createMaturityBadge(code, { className: "card-maturity-lg" });
    const meta = document.createElement("div");
    meta.className = "maturity-legend-meta";

    const count = document.createElement("span");
    count.className = "maturity-legend-count";
    count.textContent = `${counts[code]} 件`;

    const hint = document.createElement("span");
    hint.className = "maturity-legend-hint";
    hint.textContent = MATURITY_HINT[code];

    meta.append(count, hint);
    if (badge) li.append(badge, meta);
    list.appendChild(li);
  }

  const note = document.createElement("p");
  note.className = "maturity-legend-note";
  note.innerHTML =
    "各カードには成熟度に加え <strong>修正回数</strong> と <strong>更新日</strong> を表示します（定義: <code>docs/topics/MATURITY.md</code>）。";

  root.replaceChildren(title, list, note);
}

function renderTopics() {
  const root = document.getElementById("topic-list");
  if (!root) return;

  const byCat = groupByCategory(TOPICS);
  const cats = orderedCategories(byCat);
  const fragment = document.createDocumentFragment();

  for (const cat of cats) {
    const section = document.createElement("section");
    section.className = "topic-category";
    section.setAttribute("aria-label", cat);

    const heading = document.createElement("h3");
    heading.className = "topic-category-title";
    heading.textContent = cat;

    const grid = document.createElement("div");
    grid.className = "card-grid topic-category-grid";

    for (const topic of byCat.get(cat) ?? []) {
      grid.appendChild(createCard(topic));
    }

    section.append(heading, grid);
    fragment.appendChild(section);
  }

  root.replaceChildren(fragment);
}

/**
 * ROADMAP の企画中トピックを「見出しのみ」掲載（デモ・リンクなし）
 */
function renderCurriculumOutline() {
  const root = document.getElementById("curriculum-outline");
  if (!root) return;

  const fragment = document.createDocumentFragment();
  let itemCount = 0;

  for (const cat of CURRICULUM_OUTLINE) {
    itemCount += cat.items.length;

    const section = document.createElement("section");
    section.className = "curriculum-category";
    section.setAttribute("aria-labelledby", `curriculum-${cat.id}`);

    const head = document.createElement("div");
    head.className = "curriculum-category-head";

    const h3 = document.createElement("h3");
    h3.className = "curriculum-category-title";
    h3.id = `curriculum-${cat.id}`;
    h3.textContent = cat.title;

    const badges = document.createElement("div");
    badges.className = "curriculum-category-badges";

    const planned = document.createElement("span");
    planned.className = "curriculum-badge curriculum-badge-planned";
    planned.textContent = "企画中";

    badges.append(planned);
    if (cat.phase) {
      const phase = document.createElement("span");
      phase.className = "curriculum-badge curriculum-badge-phase";
      phase.textContent = cat.phase;
      badges.append(phase);
    }

    head.append(h3, badges);

    if (cat.blurb) {
      const blurb = document.createElement("p");
      blurb.className = "curriculum-category-blurb";
      blurb.textContent = cat.blurb;
      section.append(head, blurb);
    } else {
      section.append(head);
    }

    const list = document.createElement("ul");
    list.className = "curriculum-item-list";
    list.setAttribute("aria-label", `${cat.title}の学習項目`);

    for (const item of cat.items) {
      const li = document.createElement("li");
      li.className = "curriculum-item";
      li.dataset.id = item.id;

      const title = document.createElement("span");
      title.className = "curriculum-item-title";
      title.textContent = item.title;

      // デモなし: リンク・ボタンは付けない（見出しのみ）
      const mark = document.createElement("span");
      mark.className = "curriculum-item-mark";
      mark.textContent = "見出しのみ";
      mark.title = "デモ未実装。学習項目として掲載";

      li.append(title, mark);
      list.appendChild(li);
    }

    section.append(list);
    fragment.appendChild(section);
  }

  const summary = document.createElement("p");
  summary.className = "curriculum-summary";
  summary.textContent = `カテゴリ ${CURRICULUM_OUTLINE.length} · 学習項目（企画中） ${itemCount} — デモは上の「学習トピック」を参照`;

  root.replaceChildren(summary, fragment);
}

renderMaturityLegend();
renderTopics();
renderCurriculumOutline();
