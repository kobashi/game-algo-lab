/**
 * Min-Max 探索デモ
 * - MAX: 子の最大値
 * - MIN: 子の最小値
 * - 葉: 固定スコア
 * - 枝刈りなし（全子を評価）。深さ優先・左から右
 */
import { INITIAL_TREE } from "./maps/minimax-tree.js";
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
/** @type {Record<string, string|null>} 最善の子 id */
let bestChild = {};
/** @type {Set<string>} */
let active = new Set();
/** @type {Set<string>} */
let proofEdges = new Set();

/**
 * @type {{
 *   id: string,
 *   childIndex: number,
 *   phase: 'enter'|'loop'|'done',
 *   best: number,
 *   bestId: string|null
 * }[]}
 */
let callStack = [];

let running = false;
let finished = false;
let timerId = null;
let stepCount = 0;
let layout = {};

const NODE_W = 100;
const NODE_H = 48;
const GAP_X = 16;
const GAP_Y = 76;
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
  value = {};
  bestChild = {};
  active = new Set();
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
      best: nodes[rootId].kind === "min" ? POS_INF : NEG_INF,
      bestId: null,
    },
  ];
  hideResult();
  setStatus("準備完了 — 再生または 1ステップで Minimax(根) を開始");
  layoutTree();
  draw();
  updateDs();
}

function loadInitial() {
  cloneTree(INITIAL_TREE);
  resetState();
}

// ----- レイアウト -----
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
      edges.push(
        `<line class="andor-edge${isProof ? " is-proof" : ""}" x1="${a.x}" y1="${a.y + NODE_H / 2 - 4}" x2="${b.x}" y2="${b.y - NODE_H / 2 + 4}" />`
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
    let scoreText = "";
    if (n.kind === "leaf") {
      scoreText = String(n.score);
    } else if (value[n.id] !== null) {
      scoreText = `v=${value[n.id]}`;
    } else {
      scoreText = "v=?";
    }

    nodeEls.push(`
      <g class="${nodeClass(n.id)}" data-id="${n.id}">
        <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${rx}" ry="${rx}" />
        <text class="andor-kind" x="${p.x}" y="${p.y - 10}">${badge}</text>
        <text class="andor-label" x="${p.x}" y="${p.y + 4}">${escapeXml(n.label)}</text>
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
    const bestStr =
      f.best <= NEG_INF / 2
        ? "−∞"
        : f.best >= POS_INF / 2
          ? "+∞"
          : String(f.best);
    return {
      title: `Minimax(${n.label})`,
      detail: `${kindLabel(n.kind)} · ${f.phase} · best=${bestStr} · 子#${f.childIndex}${
        value[f.id] !== null ? ` → v=${value[f.id]}` : ""
      }`,
    };
  });

  const decided = Object.keys(nodes)
    .filter((id) => value[id] !== null)
    .map((id) => `${nodes[id].label}: ${value[id]}`);

  setPanel(
    dsPanels,
    renderCallStack({
      label: "コールスタック（Minimax）",
      frames,
      emptyText: "（探索終了）",
    }) +
      renderSet({
        label: "確定した評価値 v",
        typeNote: "節点 → 数",
        items: decided,
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
    <h3>結果（Min-Max）</h3>
    <ul>
      <li><strong>根の評価値 v</strong>: ${v}</li>
      <li><strong>最善手</strong>: ${move}</li>
      <li><strong>ステップ数</strong>: ${stepCount}</li>
    </ul>
    <p class="result-verdict">
      手計算: A=min(3,12)=3、B=min(8,2)=2、C=min(4,6)=4 → 根 max=4（手 C）。
      相手は自分に不利な手を選ぶ前提です。
    </p>
    <p class="result-note">
      素の Min-Max は全子を読みます。次の α-β 法では不要な枝を切れます。
      木は <code>js/maps/minimax-tree.js</code>。
    </p>
  `);
  setStatus(`完了 — v=${v}、最善=${move} / ステップ ${stepCount}`);
}

function initBest(kind) {
  return kind === "min" ? POS_INF : NEG_INF;
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
      frame.phase = "done";
      setStatus(`葉「${n.label}」→ 評価 ${value[frame.id]}`);
      draw();
      updateDs();
      return true;
    }
    frame.phase = "loop";
    frame.childIndex = 0;
    frame.best = initBest(n.kind);
    frame.bestId = null;
    setStatus(
      `${kindLabel(n.kind)}「${n.label}」に入場 — 子を左から評価（枝刈りなし）`
    );
    draw();
    updateDs();
    return true;
  }

  if (frame.phase === "loop") {
    // 直前の子の結果を取り込み
    if (frame.childIndex > 0) {
      const prevId = n.children[frame.childIndex - 1];
      const childV = value[prevId];
      if (childV !== null) {
        if (n.kind === "max") {
          if (childV > frame.best) {
            frame.best = childV;
            frame.bestId = prevId;
          }
        } else {
          if (childV < frame.best) {
            frame.best = childV;
            frame.bestId = prevId;
          }
        }
      }
    }

    if (frame.childIndex < n.children.length) {
      const cid = n.children[frame.childIndex];
      frame.childIndex += 1;
      const ck = nodes[cid].kind;
      callStack.push({
        id: cid,
        childIndex: 0,
        phase: "enter",
        best: initBest(ck === "leaf" ? "max" : ck),
        bestId: null,
      });
      setStatus(
        `${kindLabel(n.kind)}「${n.label}」→ Minimax(${nodes[cid].label}) を呼び出し`
      );
      draw();
      updateDs();
      return true;
    }

    // 全子評価済み
    value[frame.id] = frame.best;
    bestChild[frame.id] = frame.bestId;
    frame.phase = "done";
    setStatus(
      `${kindLabel(n.kind)}「${n.label}」→ v=${frame.best}` +
        (frame.bestId ? `（最善子: ${nodes[frame.bestId].label}）` : "")
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
      `return → 親 Minimax(${nodes[parent.id].label}) へ（${n.label}=${value[frame.id]}）`
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
    const res = await fetch("../samples/MinimaxExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    csharpSample.textContent = await res.text();
  } catch {
    csharpSample.textContent =
      "// samples/MinimaxExample.cs を読み込めませんでした。";
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
  setStatus("木をリセットしました — js/maps/minimax-tree.js");
});

loadInitial();
loadCsharp();
