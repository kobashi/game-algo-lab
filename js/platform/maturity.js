/**
 * トピック成熟度（修正状況）の表示用定義
 * 正本の説明は docs/topics/MATURITY.md / CATALOG.md
 *
 * 各トピックの maturity / revisions / updated はここが Web 表示の正。
 * js/main.js の TOPICS.maturity と揃えること。
 */

/**
 * @typedef {'oneshot' | 'revised' | 'stable'} Maturity
 * @typedef {{
 *   maturity: Maturity,
 *   revisions: number,
 *   updated: string,
 * }} TopicMaturityMeta
 */

/** @type {Maturity[]} */
export const MATURITY_ORDER = ["oneshot", "revised", "stable"];

/** @type {Record<Maturity, string>} */
export const MATURITY_LABEL = {
  oneshot: "一発未調整",
  revised: "改訂・調整",
  stable: "安定版",
};

/** @type {Record<Maturity, string>} */
export const MATURITY_HINT = {
  oneshot: "一通り実装した段階。大きな教材改訂はまだない",
  revised: "学習目標・操作・表示などの意図した改訂が入っている",
  stable: "授業などで据え置き可能。破壊的変更は原則しない",
};

/**
 * トピック id（ナビ用エイリアス含む）→ 成熟度メタ
 * - revisions: 初回実装後の意図した改訂回数（oneshot は通常 0）
 * - updated: 最終更新日 YYYY-MM-DD
 * multi-armed-bandit の data-active は "bandit"
 * @type {Record<string, TopicMaturityMeta>}
 */
export const TOPIC_META = {
  bfs: { maturity: "revised", revisions: 2, updated: "2026-07-17" },
  dfs: { maturity: "revised", revisions: 3, updated: "2026-07-19" },
  dijkstra: { maturity: "revised", revisions: 2, updated: "2026-07-17" },
  "best-first": { maturity: "revised", revisions: 3, updated: "2026-07-19" },
  astar: { maturity: "revised", revisions: 3, updated: "2026-07-17" },
  "bidirectional-search": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-22",
  },
  "game-loop": { maturity: "oneshot", revisions: 0, updated: "2026-07-22" },
  "time-management": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-22",
  },
  "input-basics": { maturity: "oneshot", revisions: 0, updated: "2026-07-22" },
  coordinates: { maturity: "revised", revisions: 1, updated: "2026-07-28" },
  "rng-seed": { maturity: "revised", revisions: 2, updated: "2026-09-03" },
  "maze-gen": { maturity: "oneshot", revisions: 0, updated: "2026-07-23" },
  "weighted-random": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "velocity-motion": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "event-system": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "object-pool": { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "coyote-time": { maturity: "revised", revisions: 1, updated: "2026-09-03" },
  "grid-pseudo-physics": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "constrained-gen": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "accel-gravity": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "input-buffer": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "command-pattern": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "component-vs-inheritance": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "dungeon-gen": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "noise-terrain": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "accel-decel": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "friction-bounce": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "circle-collision": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "momentum-1d": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "raycast-shapes": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "collision-response": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "brute-force-pairs": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "uniform-grid": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "broad-narrow-phase": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "sweep-and-prune": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  quadtree: { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "steering-seek-flee": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "steering-wander-avoid": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  boids: { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "behavior-tree": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "steering-leader": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "bvh-overview": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "ecs-intro": { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "obb-sat": { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "swept-aabb": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "save-load": { maturity: "oneshot", revisions: 0, updated: "2026-07-27" },
  "rotational-motion": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "replay-determinism": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "debug-overlays": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-27",
  },
  "rotating-collision": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "concave-compound": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "input-abstraction": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "command-input": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "profiling-loop": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sfx-events": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "accessibility-basics": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "unit-test-gameplay": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "obstacle-avoidance-nav": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sfx-voice-limit": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sfx-randomize": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "balance-sim": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-gpu-concepts": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-p2p-demo": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sfx-spatial": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "audio-bus-ducking": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "bgm-loop": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-sprite-2d": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sfx-material": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "bgm-quantize": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-camera": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-prediction": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "bgm-transition-compare": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-animation-vfx": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-lighting-alpha": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-client-server": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "bgm-interactive": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-postprocess": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-lod-culling": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-sync-modes": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-ui-canvas": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "gfx-mesh-uv": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-anti-cheat": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "net-db-transaction": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "cellular-automata": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "spatial-hash": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "sprite-anim-fsm": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "dirty-flag": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "navmesh-intro": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "flow-field": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "utility-ai": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-28",
  },
  "wfc-intro": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "verlet-integration": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  jps: {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "snapshot-interp": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "interest-mgmt": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "influence-map": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "poisson-disk": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "decision-tree": {
    maturity: "oneshot",
    revisions: 0,
    updated: "2026-07-29",
  },
  "and-or": { maturity: "revised", revisions: 1, updated: "2026-07-19" },

  minimax: { maturity: "revised", revisions: 1, updated: "2026-07-19" },
  "alpha-beta": { maturity: "revised", revisions: 1, updated: "2026-07-19" },
  "monte-carlo": { maturity: "revised", revisions: 1, updated: "2026-07-19" },
  "multi-armed-bandit": {
    maturity: "revised",
    revisions: 1,
    updated: "2026-07-19",
  },
  bandit: { maturity: "revised", revisions: 1, updated: "2026-07-19" },
  collision: { maturity: "revised", revisions: 2, updated: "2026-07-17" },
  fsm: { maturity: "oneshot", revisions: 0, updated: "2026-07-17" },
  "tic-tac-toe": { maturity: "revised", revisions: 1, updated: "2026-09-03" },
  mcts: { maturity: "oneshot", revisions: 0, updated: "2026-07-21" },
  nim: { maturity: "oneshot", revisions: 0, updated: "2026-07-19" },
  chopsticks: { maturity: "revised", revisions: 1, updated: "2026-07-19" },
  "othello-4x4": { maturity: "oneshot", revisions: 0, updated: "2026-07-19" },
};

/** @deprecated resolveTopicMeta / TOPIC_META を優先。後方互換用 */
export const TOPIC_MATURITY = Object.fromEntries(
  Object.entries(TOPIC_META).map(([id, m]) => [id, m.maturity]),
);

/**
 * @param {string} [topicId]
 * @returns {TopicMaturityMeta | null}
 */
export function resolveTopicMeta(topicId) {
  if (!topicId) return null;
  return TOPIC_META[topicId] ?? null;
}

/**
 * @param {string} [topicId]
 * @returns {Maturity | null}
 */
export function resolveMaturity(topicId) {
  return resolveTopicMeta(topicId)?.maturity ?? null;
}

/**
 * @param {unknown} value
 * @returns {TopicMaturityMeta | null}
 */
export function normalizeMaturityMeta(value) {
  if (!value) return null;
  if (typeof value === "string") {
    if (value !== "oneshot" && value !== "revised" && value !== "stable") {
      return null;
    }
    return { maturity: value, revisions: 0, updated: "" };
  }
  if (typeof value === "object") {
    const o = /** @type {Record<string, unknown>} */ (value);
    const maturity =
      typeof o.maturity === "string"
        ? o.maturity
        : typeof o.code === "string"
          ? o.code
          : null;
    if (
      maturity !== "oneshot" &&
      maturity !== "revised" &&
      maturity !== "stable"
    ) {
      return null;
    }
    const revisions =
      typeof o.revisions === "number" && o.revisions >= 0
        ? Math.floor(o.revisions)
        : 0;
    const updated = typeof o.updated === "string" ? o.updated : "";
    return {
      maturity: /** @type {Maturity} */ (maturity),
      revisions,
      updated,
    };
  }
  return null;
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
 * バッジ用の「修正 N回 · 更新 YYYY-MM-DD」
 * @param {TopicMaturityMeta | null | undefined} meta
 * @returns {string}
 */
export function formatMaturityDetail(meta) {
  if (!meta) return "";
  const parts = [];
  parts.push(`修正 ${meta.revisions}回`);
  if (meta.updated) parts.push(`更新 ${meta.updated}`);
  return parts.join(" · ");
}

/**
 * @param {Iterable<{ maturity?: string } | Maturity | string | TopicMaturityMeta>} items
 * @returns {Record<Maturity, number>}
 */
export function countByMaturity(items) {
  /** @type {Record<Maturity, number>} */
  const counts = { oneshot: 0, revised: 0, stable: 0 };
  for (const item of items) {
    const meta = normalizeMaturityMeta(
      typeof item === "object" && item && "maturity" in item
        ? item
        : item,
    );
    const code =
      meta?.maturity ??
      (typeof item === "string" ? item : null);
    if (code === "oneshot" || code === "revised" || code === "stable") {
      counts[code] += 1;
    }
  }
  return counts;
}

/**
 * バッジ用要素を生成（ラベル + 修正回数 + 更新日）
 * @param {Maturity | string | TopicMaturityMeta | null | undefined} codeOrMeta
 * @param {{ className?: string, compact?: boolean }} [opts]
 * @returns {HTMLSpanElement | null}
 */
export function createMaturityBadge(codeOrMeta, opts = {}) {
  const meta = normalizeMaturityMeta(codeOrMeta);
  if (!meta) return null;

  const span = document.createElement("span");
  const extra = opts.className ? ` ${opts.className}` : "";
  span.className = `card-maturity card-maturity-${meta.maturity}${extra}`;
  span.setAttribute("data-maturity", meta.maturity);
  span.setAttribute("data-revisions", String(meta.revisions));
  if (meta.updated) span.setAttribute("data-updated", meta.updated);

  const name = document.createElement("span");
  name.className = "card-maturity-name";
  name.textContent = maturityLabel(meta.maturity);

  const detailText = formatMaturityDetail(meta);
  const titleParts = [maturityHint(meta.maturity) || maturityLabel(meta.maturity)];
  if (detailText) titleParts.push(detailText);
  span.title = titleParts.join(" — ");
  span.setAttribute(
    "aria-label",
    `成熟度: ${maturityLabel(meta.maturity)}${detailText ? `（${detailText}）` : ""}`,
  );

  if (opts.compact || !detailText) {
    span.append(name);
    if (detailText && opts.compact) {
      // compact: 1 行「改訂・調整 · 修正 2回 · 更新 …」
      name.textContent = `${maturityLabel(meta.maturity)} · ${detailText}`;
    }
    return span;
  }

  const detail = document.createElement("span");
  detail.className = "card-maturity-detail";
  detail.textContent = detailText;

  span.append(name, detail);
  return span;
}

/**
 * デモページの .page-header に成熟度を挿入
 * @param {string} [topicId] data-active など
 */
export function mountPageMaturity(topicId) {
  const meta = resolveTopicMeta(topicId);
  if (!meta) return;

  const pageHeader = document.querySelector(".page-header");
  if (!pageHeader) return;
  if (pageHeader.querySelector("[data-page-maturity]")) return;

  const row = document.createElement("div");
  row.className = "page-maturity-row";
  row.setAttribute("data-page-maturity", meta.maturity);

  const label = document.createElement("span");
  label.className = "page-maturity-label";
  label.textContent = "成熟度";

  const badge = createMaturityBadge(meta, { className: "card-maturity-lg" });
  if (!badge) return;

  const hint = document.createElement("span");
  hint.className = "page-maturity-hint";
  hint.textContent = maturityHint(meta.maturity);

  row.append(label, badge, hint);

  const h1 = pageHeader.querySelector("h1");
  if (h1) {
    h1.insertAdjacentElement("afterend", row);
  } else {
    pageHeader.appendChild(row);
  }
}
