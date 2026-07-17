/**
 * トピックページ共通シェル（ヘッダー・ナビ）
 * HTML にビルド不要でマウントする。
 *
 * 使い方:
 *   <header class="site-header" id="site-header" data-nav="pathfinding" data-active="bfs"></header>
 *   import { mountSiteHeaderFromDataset } from "./platform/topic-shell.js";
 *   mountSiteHeaderFromDataset();
 */

/**
 * @typedef {{ id: string, label: string, href: string }} NavLink
 */

/** @type {Record<string, NavLink[]>} */
export const NAV_GROUPS = {
  pathfinding: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "bfs", label: "BFS", href: "bfs.html" },
    { id: "dfs", label: "DFS", href: "dfs.html" },
    { id: "dijkstra", label: "ダイクストラ", href: "dijkstra.html" },
    { id: "best-first", label: "最良優先", href: "best-first.html" },
    { id: "astar", label: "A*", href: "astar.html" },
  ],
  "game-tree": [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "and-or", label: "AND-OR", href: "and-or.html" },
    { id: "minimax", label: "Min-Max", href: "minimax.html" },
    { id: "alpha-beta", label: "α-β", href: "alpha-beta.html" },
    { id: "monte-carlo", label: "モンテカルロ", href: "monte-carlo.html" },
    { id: "bandit", label: "バンディット", href: "multi-armed-bandit.html" },
  ],
  explain: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "collision", label: "AABB", href: "collision.html" },
    { id: "fsm", label: "FSM", href: "fsm.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  default: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
};

/**
 * @param {object} opts
 * @param {HTMLElement | null} opts.root
 * @param {string} [opts.nav]  NAV_GROUPS のキー
 * @param {string} [opts.active]  現在ページ id
 * @param {string} [opts.homeHref]
 */
export function mountSiteHeader(opts) {
  const {
    root,
    nav = "default",
    active = "",
    homeHref = "../index.html",
  } = opts;
  if (!root) return;

  const links = NAV_GROUPS[nav] ?? NAV_GROUPS.default;
  const navHtml = links
    .map((link) => {
      const isActive = link.id === active;
      return `<a href="${link.href}" class="nav-link${isActive ? " is-active" : ""}">${link.label}</a>`;
    })
    .join("\n        ");

  root.innerHTML = `
    <div class="container container-wide header-inner">
      <a href="${homeHref}" class="logo">
        <span class="logo-mark">◆</span>
        Game Algo Lab
      </a>
      <nav class="nav" aria-label="メイン">
        ${navHtml}
      </nav>
    </div>
  `;
}

/** `#site-header` の data-nav / data-active からマウント */
export function mountSiteHeaderFromDataset() {
  const root = document.getElementById("site-header");
  if (!root) return;
  mountSiteHeader({
    root,
    nav: root.dataset.nav || "default",
    active: root.dataset.active || "",
  });
}
