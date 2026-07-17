/**
 * トップページ: 学習トピック一覧をカテゴリ別に描画
 * 新しいアルゴリズムを追加するときは TOPICS に1件足すだけでOK
 * @see docs/PLATFORM.md
 * @see docs/templates/TOPIC_SCAFFOLD.md
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   href: string,
 *   badge: string,
 *   category: string,
 *   ready: boolean,
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
  },
  {
    id: "dfs",
    title: "深さ優先探索 (DFS)",
    description: "再帰で深く潜りバックトラック。コールスタックを可視化。",
    href: "algorithms/dfs.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
  },
  {
    id: "dijkstra",
    title: "ダイクストラ法",
    description: "優先度 = g（経路コスト）。A* のコスト側の前振り。",
    href: "algorithms/dijkstra.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
  },
  {
    id: "best-first",
    title: "最良優先探索",
    description: "優先度 = h（見積り）のみ。A* のヒューリスティック側の前振り。",
    href: "algorithms/best-first.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
  },
  {
    id: "astar",
    title: "A* 探索",
    description: "f = g + h。ダイクストラと最良優先を統合した探索。",
    href: "algorithms/astar.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
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
  },
];

/**
 * @param {Topic} topic
 */
function createCard(topic) {
  const card = document.createElement("article");
  card.className = topic.ready ? "card" : "card is-coming-soon";

  const badge = document.createElement("span");
  badge.className = "card-badge";
  badge.textContent = topic.badge;

  const title = document.createElement("h3");
  title.textContent = topic.title;

  const desc = document.createElement("p");
  desc.textContent = topic.description;

  card.append(badge, title, desc);

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

renderTopics();
