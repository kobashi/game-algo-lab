/**
 * トピックページ共通シェル（ヘッダー・ナビ・フッター）
 * ビルド不要。HTML の data 属性からマウントする。
 *
 * @example
 * <header class="site-header" id="site-header" data-nav="pathfinding" data-active="bfs"></header>
 * <footer class="site-footer" id="site-footer"></footer>
 * import { mountTopicShellFromDataset } from "./platform/index.js";
 * mountTopicShellFromDataset();
 */

import { mountPageMaturity } from "./maturity.js";

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
    { id: "tic-tac-toe", label: "三目並べ", href: "tic-tac-toe.html" },
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
 * フッターの「関連リンク」（active id ごと）
 * @type {Record<string, { href: string, label: string }[]>}
 */
export const FOOTER_RELATED = {
  bfs: [{ href: "dfs.html", label: "DFS と比較" }],
  dfs: [
    { href: "bfs.html", label: "BFS と比較" },
    { href: "dijkstra.html", label: "ダイクストラへ" },
  ],
  dijkstra: [
    { href: "best-first.html", label: "最良優先へ" },
    { href: "astar.html", label: "A* へ" },
  ],
  "best-first": [
    { href: "dijkstra.html", label: "ダイクストラへ" },
    { href: "astar.html", label: "A* へ" },
  ],
  astar: [
    { href: "dijkstra.html", label: "ダイクストラ" },
    { href: "best-first.html", label: "最良優先" },
  ],
  "and-or": [{ href: "minimax.html", label: "次: Min-Max" }],
  minimax: [
    { href: "and-or.html", label: "AND-OR（前段）" },
    { href: "alpha-beta.html", label: "次: α-β" },
  ],
  "alpha-beta": [
    { href: "minimax.html", label: "Min-Max（前段）" },
    { href: "monte-carlo.html", label: "次: モンテカルロ" },
  ],
  "monte-carlo": [
    { href: "minimax.html", label: "Min-Max" },
    { href: "alpha-beta.html", label: "α-β" },
    { href: "multi-armed-bandit.html", label: "次: バンディット" },
  ],
  bandit: [
    { href: "monte-carlo.html", label: "モンテカルロ（前段）" },
    { href: "tic-tac-toe.html", label: "次: 三目並べ" },
  ],
  "tic-tac-toe": [
    { href: "multi-armed-bandit.html", label: "バンディット（前段）" },
    { href: "alpha-beta.html", label: "α-β 法" },
  ],
  collision: [{ href: "fsm.html", label: "FSM" }],
  fsm: [{ href: "collision.html", label: "AABB" }],
};

/** ナビ group ごとのフッター注記（data-note 未指定時） */
export const FOOTER_NOTES = {
  pathfinding: "経路探索シリーズ",
  "game-tree": "ゲーム木シリーズ",
  explain: "説明特化 UI · 経路探索マップは使いません",
  default: "",
};

/**
 * @param {object} opts
 * @param {HTMLElement | null} opts.root
 * @param {string} [opts.nav]
 * @param {string} [opts.active]
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

/**
 * @param {object} opts
 * @param {HTMLElement | null} opts.root
 * @param {string} [opts.active]
 * @param {string} [opts.nav]
 * @param {string} [opts.note]  明示注記（優先）
 * @param {string} [opts.topicsHref]
 */
export function mountSiteFooter(opts) {
  const {
    root,
    active = "",
    nav = "default",
    note = "",
    topicsHref = "../index.html",
  } = opts;
  if (!root) return;

  const related = FOOTER_RELATED[active] ?? [];
  const parts = [
    `<a href="${topicsHref}">← トピック一覧</a>`,
    ...related.map((r) => `<a href="${r.href}">${r.label}</a>`),
  ];

  const noteText =
    note ||
    root.dataset.note ||
    FOOTER_NOTES[nav] ||
    "";

  root.innerHTML = `
    <div class="container container-wide">
      <p class="site-footer-links">
        ${parts.join("\n        ·\n        ")}
      </p>
      ${
        noteText
          ? `<p class="footer-muted">${noteText}</p>`
          : ""
      }
    </div>
  `;
}

/** `#site-header` の data-nav / data-active からヘッダーのみ */
export function mountSiteHeaderFromDataset() {
  const root = document.getElementById("site-header");
  if (!root) return;
  mountSiteHeader({
    root,
    nav: root.dataset.nav || "default",
    active: root.dataset.active || "",
  });
}

/** ヘッダー + フッターをまとめてマウント（推奨） */
export function mountTopicShellFromDataset() {
  const header = document.getElementById("site-header");
  const nav = header?.dataset.nav || "default";
  const active = header?.dataset.active || "";

  mountSiteHeaderFromDataset();

  const footer = document.getElementById("site-footer");
  if (footer) {
    mountSiteFooter({
      root: footer,
      active,
      nav,
      note: footer.dataset.note || "",
    });
  }

  // デモ本文の .page-header に成熟度バッジを表示
  mountPageMaturity(active);
}
