/**
 * データ構造の可視化ヘルパー（C# の Queue / List / HashSet 等のイメージ用）
 * デモ実装との 1:1 対応は不要。教材として「今何が入っているか」を見せる。
 */

/** 親ポインタパネルのタブ状態（再描画後も維持） */
let parentMapTab = "list"; // "list" | "tree"
/**
 * ツリー表示スケール段階（押すたびに進む）
 * 100% → 70% → 50% → 100% …
 */
const TREE_SCALE_STEPS = [1, 0.7, 0.5];
let treeScaleIndex = 0;
let parentTabsBound = false;

function currentTreeScale() {
  return TREE_SCALE_STEPS[treeScaleIndex] ?? 1;
}

/**
 * @param {HTMLElement|null} el
 * @param {string} html
 */
export function setPanel(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

/**
 * コールスタック（再帰呼び出しのイメージ）
 * 配列の末尾 = スタックトップ（現在の呼び出し）
 * @param {{label?: string, frames: {title: string, detail?: string}[], emptyText?: string}} opts
 */
export function renderCallStack({
  label = "コールスタック",
  frames,
  emptyText = "（空）",
}) {
  if (!frames.length) {
    return `
      <div class="ds-block">
        <div class="ds-title">${escapeHtml(label)} <span class="ds-type">Call Stack / 再帰</span></div>
        <p class="ds-empty">${escapeHtml(emptyText)}</p>
        <p class="ds-caption">C# イメージ: 再帰呼び出しのたびにフレームが積まれ、return で外れる</p>
      </div>
    `;
  }

  // 表示は底→頂（上が古い、下が現在）
  const rows = frames
    .map((f, i) => {
      const isTop = i === frames.length - 1;
      return `
      <div class="call-frame${isTop ? " is-top" : ""}">
        <span class="call-depth">#${i}</span>
        <span class="call-title">${escapeHtml(f.title)}</span>
        ${f.detail ? `<span class="call-detail">${escapeHtml(f.detail)}</span>` : ""}
        ${isTop ? `<span class="call-badge">TOP</span>` : ""}
      </div>`;
    })
    .join("");

  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)} <span class="ds-type">Call Stack / 再帰</span></div>
      <div class="call-stack" aria-label="コールスタック（下が現在の呼び出し）">
        <div class="call-stack-end">底（最初の呼び出し）</div>
        ${rows}
        <div class="call-stack-end">頂（現在）</div>
      </div>
      <p class="ds-caption">深さ = 再帰のネスト。行き止まりで return → バックトラック</p>
    </div>
  `;
}

/**
 * キュー（先頭が Dequeue 側）
 * @param {{label: string, items: string[], emptyText?: string}} opts
 */
export function renderQueue({ label, items, emptyText = "（空）" }) {
  const cells =
    items.length === 0
      ? `<span class="ds-empty">${escapeHtml(emptyText)}</span>`
      : items
          .map(
            (v, i) =>
              `<span class="ds-cell${i === 0 ? " is-front" : ""}" title="${i === 0 ? "先頭 (Dequeue)" : ""}">${escapeHtml(v)}</span>`
          )
          .join("");

  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)} <span class="ds-type">Queue / リスト先頭から取り出し</span></div>
      <div class="ds-row ds-queue">
        <span class="ds-end-label">前</span>
        <div class="ds-cells">${cells}</div>
        <span class="ds-end-label">後</span>
      </div>
      <p class="ds-caption">C# イメージ: <code>Queue&lt;T&gt;</code> や <code>List&lt;T&gt;</code> の先頭削除</p>
    </div>
  `;
}

/**
 * リスト（順序付きの値の並び）
 * @param {{label: string, typeNote?: string, items: string[], emptyText?: string}} opts
 */
export function renderList({
  label,
  typeNote = "List",
  items,
  emptyText = "（空）",
}) {
  const cells =
    items.length === 0
      ? `<span class="ds-empty">${escapeHtml(emptyText)}</span>`
      : items
          .map(
            (v, i) =>
              `<span class="ds-cell"><span class="ds-idx">${i}</span>${escapeHtml(v)}</span>`
          )
          .join("");

  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)} <span class="ds-type">${escapeHtml(typeNote)}</span></div>
      <div class="ds-row">
        <div class="ds-cells">${cells}</div>
      </div>
    </div>
  `;
}

/**
 * 集合（順序は教材上の表示順）
 * @param {{label: string, typeNote?: string, items: string[], emptyText?: string}} opts
 */
export function renderSet({
  label,
  typeNote = "HashSet",
  items,
  emptyText = "（空）",
}) {
  const cells =
    items.length === 0
      ? `<span class="ds-empty">${escapeHtml(emptyText)}</span>`
      : items
          .map((v) => `<span class="ds-cell ds-set-cell">${escapeHtml(v)}</span>`)
          .join("");

  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)} <span class="ds-type">${escapeHtml(typeNote)}</span></div>
      <div class="ds-row">
        <div class="ds-cells ds-set">${cells}</div>
      </div>
    </div>
  `;
}

/**
 * 親ポインタ（固定タブ UI の中身だけ更新）
 * HTML に #ds-parent-list / #ds-parent-tree / #ds-parent-root がある前提
 * @param {{edges: {from: string, to: string}[], root?: string}} opts
 */
export function updateParentMapPanels({ edges, root }) {
  bindParentMapTabsOnce();

  const rootEl = document.getElementById("ds-parent-root");
  const listEl = document.getElementById("ds-parent-list");
  const treeEl = document.getElementById("ds-parent-tree");

  if (rootEl) {
    rootEl.innerHTML = root
      ? `根（スタート）: <strong>${escapeHtml(root)}</strong>`
      : "";
  }

  if (listEl) {
    if (!edges.length) {
      listEl.innerHTML = `<p class="ds-empty">（まだ辺なし）</p>
        <p class="ds-caption">子 ← 親 の対応表。経路復元はゴールから親をたどる。</p>`;
    } else {
      const rows = edges
        .slice(-32)
        .map(
          (e) =>
            `<div class="ds-edge"><span class="ds-node">${escapeHtml(e.to)}</span>
             <span class="ds-arrow">← 親</span>
             <span class="ds-node is-parent">${escapeHtml(e.from ?? "null")}</span></div>`
        )
        .join("");
      const more =
        edges.length > 32
          ? `<p class="ds-caption">直近 32 件のみ（全 ${edges.length} 件）</p>`
          : "";
      listEl.innerHTML = `
        <div class="ds-tree ds-tree-list">${rows}</div>
        ${more}
        <p class="ds-caption">子 ← 親 の対応表。経路復元はゴールから親をたどる。</p>`;
    }
  }

  if (treeEl) {
    if (!edges.length) {
      treeEl.innerHTML = `<p class="ds-empty">（まだ辺なし）</p>
        <p class="ds-caption">探索が進むとスタートを根とした木が伸びます。</p>`;
    } else {
      const scale = currentTreeScale();
      treeEl.innerHTML = `
        <div class="ds-node-tree${scale < 1 ? " is-compact" : ""}" id="ds-node-tree-scroll" data-tree-scale="${scale}">
          <div class="tree-scale-inner" id="tree-scale-inner" style="--tree-zoom:${scale}">${renderParentTree(edges, root)}</div>
        </div>
        <p class="ds-caption">同じ深さは同じ高さ。枝で接続。縮小／拡大ボタンでサイズ変更（${Math.round(scale * 100)}%）。</p>`;
    }
  }

  applyParentMapTabs(document);
  applyTreeZoomUi();
}

/**
 * @deprecated 互換用。タブ付き親ポインタは updateParentMapPanels を使う
 */
export function renderParentMap({ label, edges, root }) {
  // 旧呼び出し向け: 中身だけ返す（タブなし）。基本は使わない
  if (!edges.length) {
    return `
      <div class="ds-block">
        <div class="ds-title">${escapeHtml(label)}</div>
        <p class="ds-empty">（まだ辺なし）</p>
      </div>`;
  }
  const rows = edges
    .slice(-24)
    .map(
      (e) =>
        `<div class="ds-edge"><span class="ds-node">${escapeHtml(e.to)}</span>
         <span class="ds-arrow">← 親</span>
         <span class="ds-node is-parent">${escapeHtml(e.from)}</span></div>`
    )
    .join("");
  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)}</div>
      <div class="ds-tree">${rows}</div>
    </div>`;
}

/**
 * edges: { from: parent, to: child }[]
 * @param {{from: string, to: string}[]} edges
 * @param {string|undefined} root
 */
function renderParentTree(edges, root) {
  /** @type {Map<string, string[]>} */
  const children = new Map();
  /** @type {Set<string>} */
  const all = new Set();

  for (const e of edges) {
    const p = e.from;
    const c = e.to;
    if (!p || !c) continue;
    all.add(p);
    all.add(c);
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
  }

  for (const [, list] of children) {
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  let start = root;
  if (!start || !all.has(start)) {
    const childSet = new Set(edges.map((e) => e.to));
    const roots = [...all].filter((n) => !childSet.has(n));
    start = roots[0] ?? [...all][0];
  }

  if (!start) {
    return `<p class="ds-empty">（表示できるノードがありません）</p>`;
  }

  const MAX_NODES = 60;
  let count = 0;

  /**
   * トップダウンの枝付きツリー（同深度は横一列・同じ高さ）
   * @param {string} id
   * @param {number} depth
   * @param {Set<string>} path
   * @param {boolean} isRoot
   */
  function walk(id, depth, path, isRoot) {
    if (count >= MAX_NODES) {
      return `<li class="tree-li tree-li-omit"><span class="tree-node-chip is-cycle">…</span></li>`;
    }
    if (path.has(id)) {
      return `<li class="tree-li">
        <div class="tree-node-box">
          <span class="tree-node-chip is-cycle">${escapeHtml(id)}…</span>
        </div>
      </li>`;
    }
    count += 1;
    const kids = children.get(id) || [];
    const pathNext = new Set(path);
    pathNext.add(id);

    const kidsHtml =
      kids.length === 0
        ? ""
        : `<ul class="tree-branch" role="group">
            ${kids.map((k) => walk(k, depth + 1, pathNext, false)).join("")}
          </ul>`;

    return `
      <li class="tree-li${kids.length ? " has-kids" : " is-leaf"}" role="treeitem" aria-expanded="${kids.length > 0}">
        <div class="tree-node-box">
          <span class="tree-node-chip${isRoot ? " is-root" : ""}${kids.length === 0 ? " is-leaf" : ""}">${escapeHtml(id)}</span>
        </div>
        ${kidsHtml}
      </li>
    `;
  }

  let html = `<ul class="tree-root" role="tree">${walk(start, 0, new Set(), true)}</ul>`;
  if (count >= MAX_NODES) {
    html += `<p class="ds-caption">表示上限 ${MAX_NODES} ノード（以降は省略）</p>`;
  }
  return html;
}

function applyParentMapTabs(scope) {
  const root = scope || document;
  for (const block of root.querySelectorAll("[data-parent-map]")) {
    for (const tab of block.querySelectorAll("[data-parent-tab]")) {
      const id = tab.getAttribute("data-parent-tab");
      const on = id === parentMapTab;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    }
    for (const panel of block.querySelectorAll("[data-parent-panel]")) {
      const id = panel.getAttribute("data-parent-panel");
      if (id === parentMapTab) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    }
  }
}

function applyTreeZoomUi() {
  const scale = currentTreeScale();
  const scroll = document.getElementById("ds-node-tree-scroll");
  const inner = document.getElementById("tree-scale-inner");
  if (scroll) {
    scroll.dataset.treeScale = String(scale);
    scroll.classList.toggle("is-compact", scale < 1);
  }
  if (inner) {
    inner.style.setProperty("--tree-zoom", String(scale));
  }

  // 常に両方のボタンを表示（押すたびに段階が変わる）
  const zoomOut = document.getElementById("btn-tree-zoom-out");
  const zoomIn = document.getElementById("btn-tree-zoom-in");
  const zoomToggle = document.getElementById("btn-tree-zoom");

  const atMin = treeScaleIndex >= TREE_SCALE_STEPS.length - 1;
  const atMax = treeScaleIndex <= 0;

  if (zoomOut) {
    zoomOut.disabled = atMin;
    zoomOut.setAttribute("aria-disabled", atMin ? "true" : "false");
  }
  if (zoomIn) {
    zoomIn.disabled = atMax;
    zoomIn.setAttribute("aria-disabled", atMax ? "true" : "false");
  }
  // 旧単一ボタン互換: 縮小↔拡大トグル表示
  if (zoomToggle) {
    zoomToggle.hidden = false;
    zoomToggle.textContent = atMin ? "拡大" : "縮小";
    zoomToggle.setAttribute("aria-pressed", scale < 1 ? "true" : "false");
    zoomToggle.title = `現在 ${Math.round(scale * 100)}% — 押すと${atMin ? "拡大" : "縮小"}`;
  }

  const label = document.getElementById("tree-zoom-label");
  if (label) {
    label.textContent = `${Math.round(scale * 100)}%`;
  }
}

function stepTreeZoom(direction) {
  // direction: -1 縮小, +1 拡大
  const next = treeScaleIndex + (direction < 0 ? 1 : -1);
  treeScaleIndex = Math.max(0, Math.min(TREE_SCALE_STEPS.length - 1, next));
  applyTreeZoomUi();
}

function bindParentMapTabsOnce() {
  if (parentTabsBound) return;
  parentTabsBound = true;
  document.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);

    if (t.closest?.("#btn-tree-zoom-out")) {
      e.preventDefault();
      stepTreeZoom(-1);
      return;
    }
    if (t.closest?.("#btn-tree-zoom-in")) {
      e.preventDefault();
      stepTreeZoom(1);
      return;
    }
    // 単一トグル: 最小なら拡大、それ以外は縮小
    if (t.closest?.("#btn-tree-zoom")) {
      e.preventDefault();
      if (treeScaleIndex >= TREE_SCALE_STEPS.length - 1) {
        treeScaleIndex = 0; // 拡大（100%へ）
      } else {
        treeScaleIndex += 1; // 一段縮小
      }
      applyTreeZoomUi();
      return;
    }

    const tab = t.closest?.("[data-parent-tab]");
    if (!tab) return;
    e.preventDefault();
    const id = tab.getAttribute("data-parent-tab");
    if (id !== "list" && id !== "tree") return;
    parentMapTab = id;
    applyParentMapTabs(document);
    applyTreeZoomUi();
  });
  // 初回反映
  applyParentMapTabs(document);
  applyTreeZoomUi();
}

/**
 * 優先度付きオープン集合（A*）
 * @param {{label: string, items: {key: string, f: number, g: number, h: number}[]}} opts
 */
export function renderPriorityOpen({ label, items }) {
  if (items.length === 0) {
    return `
      <div class="ds-block">
        <div class="ds-title">${escapeHtml(label)} <span class="ds-type">優先度付きキュー / ソート List</span></div>
        <p class="ds-empty">（空）</p>
      </div>
    `;
  }

  const sorted = [...items].sort((a, b) => a.f - b.f || b.g - a.g);
  const rows = sorted
    .slice(0, 20)
    .map(
      (it, i) => `
      <div class="ds-pri-row${i === 0 ? " is-best" : ""}">
        <span class="ds-pri-rank">${i === 0 ? "次" : i + 1}</span>
        <span class="ds-node">${escapeHtml(it.key)}</span>
        <span class="ds-pri-f">f=${it.f}</span>
        <span class="ds-pri-gh">g=${it.g} h=${it.h}</span>
      </div>`
    )
    .join("");

  const more =
    sorted.length > 20
      ? `<p class="ds-caption">f 昇順の上位 20 件（全 ${sorted.length} 件）</p>`
      : `<p class="ds-caption">f が小さいほど先に展開（教材上のイメージ）</p>`;

  return `
    <div class="ds-block">
      <div class="ds-title">${escapeHtml(label)} <span class="ds-type">優先度付きキュー / SortedList 風</span></div>
      <div class="ds-priority">${rows}</div>
      ${more}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 座標表示 (x,y) */
export function cellLabel(x, y) {
  return `(${x},${y})`;
}

// ページ読込時にタブを有効化
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindParentMapTabsOnce());
  } else {
    bindParentMapTabsOnce();
  }
}
