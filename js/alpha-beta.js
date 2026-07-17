/**
 * α-β 法デモ
 * - Min-Max と同じ値を返す
 * - MAX で v≥β → β カット、MIN で v≤α → α カット
 * - 刈られた節点を可視化
 */
import { INITIAL_TREE, FULL_LEAF_COUNT } from "./maps/alpha-beta-tree.js";
import { setPanel, renderCallStack, renderSet } from "./ds-viz.js";

const svg = document.getElementById("tree-svg");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result-compare");
const dsPanels = document.getElementById("ds-panels");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const csharpSample = document.getElementById("csharp-sample");

/** @typedef {'max'|'min'|'leaf'} Kind */
/** @typedef {{ id: string, label: string, kind: Kind, score?: number, children: string[] }} Node */

/** @type {Record<string, Node>} */
let nodes = {};
let rootId = "root";

/** @type {Record<string, number|null>} */
let value = {};
/** @type {Record<string, string|null>} */
let bestChild = {};
/** @type {Set<string>} */
let active = new Set();
/** @type {Set<string>} 刈られた節点 */
let pruned = new Set();
/** @type {Set<string>} */
let proofEdges = new Set();
/** 評価した葉の数 */
let leavesVisited = 0;
/** カット回数 */
let cutCount = 0;

/**
 * @type {{
 *   id: string,
 *   childIndex: number,
 *   phase: 'enter'|'loop'|'done',
 *   best: number,
 *   bestId: string|null,
 *   alpha: number,
 *   beta: number,
 *   cut?: 'alpha'|'beta'|null
 * }[]}
 */
let callStack = [];

let running = false;
let finished = false;
let timerId = null;
let stepCount = 0;
let layout = {};

const NODE_W = 100;
const NODE_H = 52;
const GAP_X = 14;
const GAP_Y = 78;
const PAD = 28;
const NEG_INF = -1e9;
const POS_INF = 1e9;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function hideResult() {
  if (resultEl) {
    resultEl.hidden = true;
    resultEl.innerHTML = "";
  }
}

function showResult(html) {
  if (!resultEl) return;
  resultEl.hidden = false;
  resultEl.innerHTML = html;
}

function fmtBound(x) {
  if (x <= NEG_INF / 2) return "−∞";
  if (x >= POS_INF / 2) return "+∞";
  return String(x);
}

function cloneTree(src) {
  rootId = src.rootId;
  nodes = {};
  for (const [id, n] of Object.entries(src.nodes)) {
    nodes[id] = {
      id: n.id,
      label: n.label,
      kind: n.kind,
      score: n.score,
      children: n.children ? [...n.children] : [],
    };
  }
}

function kindLabel(kind) {
  if (kind === "max") return "MAX";
  if (kind === "min") return "MIN";
  return "葉";
}

function resetState() {
  stopAuto();
  finished = false;
  stepCount = 0;
  leavesVisited = 0;
  cutCount = 0;
  value = {};
  bestChild = {};
  active = new Set();
  pruned = new Set();
  proofEdges = new Set();
  for (const id of Object.keys(nodes)) {
    value[id] = null;
    bestChild[id] = null;
  }
  callStack = [
    {
      id: rootId,
      childIndex: 0,
      phase: "enter",
      best: NEG_INF,
      bestId: null,
      alpha: NEG_INF,
      beta: POS_INF,
      cut: null,
    },
  ];
  hideResult();
  setStatus("準備完了 — α=−∞, β=+∞ で AlphaBeta(根) を開始");
  layoutTree();
  draw();
  updateDs();
}

function loadInitial() {
  cloneTree(INITIAL_TREE);
  resetState();
}

function subtreeWidth(id) {
  const n = nodes[id];
  if (!n.children.length) return NODE_W;
  let w = 0;
  n.children.forEach((cid, i) => {
    w += subtreeWidth(cid);
    if (i < n.children.length - 1) w += GAP_X;
  });
  return Math.max(NODE_W, w);
}

function place(id, xLeft, depth) {
  const n = nodes[id];
  const w = subtreeWidth(id);
  const cx = xLeft + w / 2;
  const cy = PAD + depth * GAP_Y + NODE_H / 2;
  layout[id] = { x: cx, y: cy };
  if (!n.children.length) return;
  let x = xLeft;
  const childrenSpan = n.children.reduce(
    (s, cid, i) => s + subtreeWidth(cid) + (i ? GAP_X : 0),
    0
  );
  if (childrenSpan < w) x = xLeft + (w - childrenSpan) / 2;
  for (const cid of n.children) {
    const cw = subtreeWidth(cid);
    place(cid, x, depth + 1);
    x += cw + GAP_X;
  }
}

function maxDepth(id) {
  const n = nodes[id];
  if (!n.children.length) return 0;
  return 1 + Math.max(...n.children.map(maxDepth));
}

function layoutTree() {
  layout = {};
  const tw = subtreeWidth(rootId);
  place(rootId, PAD, 0);
  const height = PAD * 2 + maxDepth(rootId) * GAP_Y + NODE_H;
  const width = tw + PAD * 2;
  if (svg) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nodeClass(id) {
  const n = nodes[id];
  const parts = ["andor-node", "mm-node", `kind-${n.kind}`];
  if (active.has(id)) parts.push("is-active");
  if (value[id] !== null) parts.push("is-valued");
  if (pruned.has(id)) parts.push("is-pruned");
  return parts.join(" ");
}

function draw() {
  if (!svg) return;
  const edges = [];
  const nodeEls = [];

  for (const n of Object.values(nodes)) {
    for (const cid of n.children) {
      const a = layout[n.id];
      const b = layout[cid];
      if (!a || !b) continue;
      const edgeKey = `${n.id}->${cid}`;
      const isProof = proofEdges.has(edgeKey);
      const isPrunedEdge = pruned.has(cid);
      edges.push(
        `<line class="andor-edge${isProof ? " is-proof" : ""}${isPrunedEdge ? " is-pruned-edge" : ""}" x1="${a.x}" y1="${a.y + NODE_H / 2 - 4}" x2="${b.x}" y2="${b.y - NODE_H / 2 + 4}" />`
      );
    }
  }

  for (const n of Object.values(nodes)) {
    const p = layout[n.id];
    if (!p) continue;
    const x = p.x - NODE_W / 2;
    const y = p.y - NODE_H / 2;
    const rx = n.kind === "max" ? 16 : n.kind === "min" ? 8 : 6;
    let badge = kindLabel(n.kind);
    if (pruned.has(n.id)) badge = "刈";
    let scoreText = "";
    if (n.kind === "leaf") {
      scoreText = pruned.has(n.id) ? `(${n.score})` : String(n.score);
    } else if (value[n.id] !== null) {
      scoreText = `v=${value[n.id]}`;
    } else {
      scoreText = "v=?";
    }

    nodeEls.push(`
      <g class="${nodeClass(n.id)}" data-id="${n.id}">
        <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${rx}" ry="${rx}" />
        <text class="andor-kind" x="${p.x}" y="${p.y - 12}">${badge}</text>
        <text class="andor-label" x="${p.x}" y="${p.y + 2}">${escapeXml(n.label)}</text>
        <text class="mm-score" x="${p.x}" y="${p.y + 16}">${escapeXml(scoreText)}</text>
      </g>
    `);
  }

  svg.innerHTML = `<g class="andor-edges">${edges.join("")}</g><g class="andor-nodes">${nodeEls.join("")}</g>`;
}

function updateDs() {
  if (!dsPanels) return;
  const frames = callStack.map((f) => {
    const n = nodes[f.id];
    return {
      title: `AB(${n.label})`,
      detail: `${kindLabel(n.kind)} · α=${fmtBound(f.alpha)} β=${fmtBound(f.beta)} · best=${fmtBound(f.best)} · ${f.phase}${
        f.cut ? ` · ${f.cut}カット` : ""
      }${value[f.id] !== null ? ` → v=${value[f.id]}` : ""}`,
    };
  });

  const decided = Object.keys(nodes)
    .filter((id) => value[id] !== null)
    .map((id) => `${nodes[id].label}: ${value[id]}`);

  const prunedList = [...pruned].map((id) => nodes[id].label);

  setPanel(
    dsPanels,
    renderCallStack({
      label: "コールスタック（α-β）",
      frames,
      emptyText: "（探索終了）",
    }) +
      renderSet({
        label: "確定した v",
        typeNote: "節点 → 数",
        items: decided,
      }) +
      renderSet({
        label: "枝刈りされた節点",
        typeNote: "未評価",
        items: prunedList,
        emptyText: "（まだなし）",
      })
  );
}

function markProof(id) {
  if (value[id] === null) return;
  const n = nodes[id];
  if (n.kind === "leaf") return;
  const bc = bestChild[id];
  if (bc) {
    proofEdges.add(`${id}->${bc}`);
    markProof(bc);
  }
}

function markSubtreePruned(id) {
  pruned.add(id);
  for (const cid of nodes[id].children) {
    markSubtreePruned(cid);
  }
}

function finishRoot() {
  finished = true;
  stopAuto();
  markProof(rootId);
  draw();
  const v = value[rootId];
  const move = bestChild[rootId]
    ? nodes[bestChild[rootId]].label
    : "—";
  showResult(`
    <h3>結果（α-β 法）</h3>
    <ul>
      <li><strong>根の評価値 v</strong>: ${v}（素の Min-Max と同じ）</li>
      <li><strong>最善手</strong>: ${move}</li>
      <li><strong>評価した葉</strong>: ${leavesVisited} / 全葉 ${FULL_LEAF_COUNT}</li>
      <li><strong>カット回数</strong>: ${cutCount}</li>
      <li><strong>ステップ数</strong>: ${stepCount}</li>
    </ul>
    <p class="result-verdict">
      手 B で相手δ=2 のあと v≤α となり、葉「相手ε(刈)=99」は<strong>読まずに済む</strong>。
      読まなくても根の答えは変わりません。
    </p>
    <p class="result-note">
      α = MAX が確保した下限、β = MIN が確保した上限。窓 [α,β] の外は相手が選ばない。
      木: <code>js/maps/alpha-beta-tree.js</code>
    </p>
  `);
  setStatus(
    `完了 — v=${v}、葉 ${leavesVisited}/${FULL_LEAF_COUNT}、カット ${cutCount}`
  );
}

function initBest(kind) {
  return kind === "min" ? POS_INF : NEG_INF;
}

/**
 * 直前の子の結果を best / α / β に反映し、カット判定。
 * @returns {boolean} カットして done にしたら true
 */
function absorbChild(frame, n) {
  if (frame.childIndex <= 0) return false;
  const prevId = n.children[frame.childIndex - 1];
  const childV = value[prevId];
  if (childV === null) return false;

  if (n.kind === "max") {
    if (childV > frame.best) {
      frame.best = childV;
      frame.bestId = prevId;
    }
    if (frame.best >= frame.beta) {
      frame.cut = "beta";
      value[frame.id] = frame.best;
      bestChild[frame.id] = frame.bestId;
      frame.phase = "done";
      cutCount += 1;
      // 未評価の兄弟を刈る
      for (let i = frame.childIndex; i < n.children.length; i++) {
        markSubtreePruned(n.children[i]);
      }
      setStatus(
        `β カット @ MAX「${n.label}」: v=${frame.best} ≥ β=${fmtBound(frame.beta)} — 残り子を刈る`
      );
      return true;
    }
    frame.alpha = Math.max(frame.alpha, frame.best);
  } else {
    if (childV < frame.best) {
      frame.best = childV;
      frame.bestId = prevId;
    }
    if (frame.best <= frame.alpha) {
      frame.cut = "alpha";
      value[frame.id] = frame.best;
      bestChild[frame.id] = frame.bestId;
      frame.phase = "done";
      cutCount += 1;
      for (let i = frame.childIndex; i < n.children.length; i++) {
        markSubtreePruned(n.children[i]);
      }
      setStatus(
        `α カット @ MIN「${n.label}」: v=${frame.best} ≤ α=${fmtBound(frame.alpha)} — 残り子を刈る`
      );
      return true;
    }
    frame.beta = Math.min(frame.beta, frame.best);
  }
  return false;
}

function stepOnce() {
  if (finished) return false;
  if (callStack.length === 0) {
    finishRoot();
    return false;
  }

  stepCount += 1;
  const frame = callStack[callStack.length - 1];
  const n = nodes[frame.id];
  active.add(frame.id);

  if (frame.phase === "enter") {
    if (n.kind === "leaf") {
      value[frame.id] = n.score ?? 0;
      frame.best = value[frame.id];
      leavesVisited += 1;
      frame.phase = "done";
      setStatus(
        `葉「${n.label}」→ ${value[frame.id]}  （α=${fmtBound(frame.alpha)} β=${fmtBound(frame.beta)}）`
      );
      draw();
      updateDs();
      return true;
    }
    frame.phase = "loop";
    frame.childIndex = 0;
    frame.best = initBest(n.kind);
    frame.bestId = null;
    frame.cut = null;
    setStatus(
      `${kindLabel(n.kind)}「${n.label}」入場  α=${fmtBound(frame.alpha)} β=${fmtBound(frame.beta)}`
    );
    draw();
    updateDs();
    return true;
  }

  if (frame.phase === "loop") {
    if (absorbChild(frame, n)) {
      draw();
      updateDs();
      return true;
    }

    if (frame.childIndex < n.children.length) {
      const cid = n.children[frame.childIndex];
      frame.childIndex += 1;
      callStack.push({
        id: cid,
        childIndex: 0,
        phase: "enter",
        best: initBest(nodes[cid].kind === "leaf" ? "max" : nodes[cid].kind),
        bestId: null,
        alpha: frame.alpha,
        beta: frame.beta,
        cut: null,
      });
      setStatus(
        `${kindLabel(n.kind)}「${n.label}」→ AB(${nodes[cid].label})  α=${fmtBound(frame.alpha)} β=${fmtBound(frame.beta)}`
      );
      draw();
      updateDs();
      return true;
    }

    value[frame.id] = frame.best;
    bestChild[frame.id] = frame.bestId;
    frame.phase = "done";
    setStatus(
      `${kindLabel(n.kind)}「${n.label}」→ v=${frame.best}` +
        (frame.bestId ? `（${nodes[frame.bestId].label}）` : "")
    );
    draw();
    updateDs();
    return true;
  }

  if (frame.phase === "done") {
    active.delete(frame.id);
    callStack.pop();
    if (callStack.length === 0) {
      finishRoot();
      updateDs();
      return false;
    }
    const parent = callStack[callStack.length - 1];
    setStatus(
      `return → 親 AB(${nodes[parent.id].label}) へ（${n.label}=${value[frame.id]}）`
    );
    draw();
    updateDs();
    return true;
  }

  return false;
}

function stopAuto() {
  running = false;
  if (btnPlay) btnPlay.textContent = "再生";
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function scheduleNext() {
  if (!running) return;
  const delay = Number(speedEl?.value) || 200;
  timerId = setTimeout(() => {
    if (!running) return;
    if (stepOnce()) scheduleNext();
    else stopAuto();
  }, delay);
}

function togglePlay() {
  if (finished) loadInitial();
  if (running) {
    stopAuto();
    return;
  }
  running = true;
  if (btnPlay) btnPlay.textContent = "一時停止";
  if (stepOnce()) scheduleNext();
  else stopAuto();
}

async function loadCsharp() {
  if (!csharpSample) return;
  try {
    const res = await fetch("../samples/AlphaBetaExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    csharpSample.textContent = await res.text();
  } catch {
    csharpSample.textContent =
      "// samples/AlphaBetaExample.cs を読み込めませんでした。";
  }
}

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  if (running) stopAuto();
  if (finished) loadInitial();
  stepOnce();
});
btnReset?.addEventListener("click", () => {
  loadInitial();
  setStatus("木をリセットしました — js/maps/alpha-beta-tree.js");
});

loadInitial();
loadCsharp();
