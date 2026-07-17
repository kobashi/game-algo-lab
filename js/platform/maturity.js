/**
 * トピック成熟度（修正状況）の表示用定義
 * 正本の説明は docs/topics/MATURITY.md / CATALOG.md
 * コード値は js/main.js の TOPICS.maturity と揃えること
 */

/**
 * @typedef {'oneshot' | 'revised' | 'stable'} Maturity
 */

/** @type {Maturity[]} */
export const MATURITY_ORDER = ["oneshot", "revised", "stable"];

/** @type {Record<Maturity, string>} */
export const MATURITY_LABEL = {
  oneshot: "一発未調整",
  revised: "改訂・調整",
  stable: "安定版",
};

/** 短い説明（ツールチップ・凡例） */
/** @type {Record<Maturity, string>} */
export const MATURITY_HINT = {
  oneshot: "一通り実装した段階。大きな教材改訂はまだない",
  revised: "学習目標・操作・表示などの意図した改訂が入っている",
  stable: "授業などで据え置き可能。破壊的変更は原則しない",
};

/**
 * トピック id（およびナビ用エイリアス）→ 成熟度
 * multi-armed-bandit の data-active は "bandit"
 * @type {Record<string, Maturity>}
 */
export const TOPIC_MATURITY = {
  bfs: "revised",
  dfs: "revised",
  dijkstra: "revised",
  "best-first": "revised",
  astar: "revised",
  "and-or": "oneshot",
  minimax: "oneshot",
  "alpha-beta": "oneshot",
  "monte-carlo": "oneshot",
  "multi-armed-bandit": "oneshot",
  bandit: "oneshot",
  collision: "revised",
  fsm: "oneshot",
};

/**
 * @param {string} [topicId]
 * @returns {Maturity | null}
 */
export function resolveMaturity(topicId) {
  if (!topicId) return null;
  return TOPIC_MATURITY[topicId] ?? null;
}

/**
 * @param {Maturity | string | null | undefined} code
 * @returns {string}
 */
export function maturityLabel(code) {
  if (!code) return "";
  return MATURITY_LABEL[/** @type {Maturity} */ (code)] || String(code);
}

/**
 * @param {Maturity | string | null | undefined} code
 * @returns {string}
 */
export function maturityHint(code) {
  if (!code) return "";
  return MATURITY_HINT[/** @type {Maturity} */ (code)] || "";
}

/**
 * @param {Iterable<{ maturity?: string } | Maturity | string>} items
 * @returns {Record<Maturity, number>}
 */
export function countByMaturity(items) {
  /** @type {Record<Maturity, number>} */
  const counts = { oneshot: 0, revised: 0, stable: 0 };
  for (const item of items) {
    const code =
      typeof item === "string"
        ? item
        : item && typeof item === "object"
          ? item.maturity
          : null;
    if (code === "oneshot" || code === "revised" || code === "stable") {
      counts[code] += 1;
    }
  }
  return counts;
}

/**
 * バッジ用 span を生成
 * @param {Maturity | string | null | undefined} code
 * @param {{ className?: string }} [opts]
 * @returns {HTMLSpanElement | null}
 */
export function createMaturityBadge(code, opts = {}) {
  if (!code) return null;
  const span = document.createElement("span");
  const extra = opts.className ? ` ${opts.className}` : "";
  span.className = `card-maturity card-maturity-${code}${extra}`;
  span.textContent = maturityLabel(code);
  span.title = maturityHint(code) || maturityLabel(code);
  span.setAttribute("data-maturity", String(code));
  span.setAttribute("aria-label", `成熟度: ${maturityLabel(code)}`);
  return span;
}

/**
 * デモページの .page-header に成熟度を挿入
 * @param {string} [topicId] data-active など
 */
export function mountPageMaturity(topicId) {
  const code = resolveMaturity(topicId);
  if (!code) return;

  const pageHeader = document.querySelector(".page-header");
  if (!pageHeader) return;
  if (pageHeader.querySelector("[data-page-maturity]")) return;

  const row = document.createElement("div");
  row.className = "page-maturity-row";
  row.setAttribute("data-page-maturity", code);

  const label = document.createElement("span");
  label.className = "page-maturity-label";
  label.textContent = "成熟度";

  const badge = createMaturityBadge(code, { className: "card-maturity-lg" });
  if (!badge) return;

  const hint = document.createElement("span");
  hint.className = "page-maturity-hint";
  hint.textContent = maturityHint(code);

  row.append(label, badge, hint);

  const h1 = pageHeader.querySelector("h1");
  if (h1) {
    h1.insertAdjacentElement("afterend", row);
  } else {
    pageHeader.appendChild(row);
  }
}
