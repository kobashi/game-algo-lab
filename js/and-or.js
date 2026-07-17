/**
 * AND-OR 探索デモ
 * - OR: 子のいずれかが真 → 真（早期打ち切り）
 * - AND: すべての子が真 → 真（1つ偽で早期打ち切り）
 * - 深さ優先・左から右、コールスタックでステップ実行
 * 共通基盤: js/platform/*
 */
import { INITIAL_TREE } from "./maps/and-or-tree.js";
import { setPanel, renderCallStack, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  layoutTree as layoutTreeShared,
  applySvgSize,
  escapeXml,
} from "./platform/index.js";

const svg = document.getElementById("tree-svg");
const dsPanels = document.getElementById("ds-panels");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(document.getElementById("result-compare"));

/** @typedef {'or'|'and'|'leaf'} Kind */
/** @typedef {{ id: string, label: string, kind: Kind, value?: boolean, children: string[] }} Node */

/** @type {Record<string, Node>} */
let nodes = {};
let rootId = "root";

/** @type {Record<string, boolean|null>} null=未評価 */
let result = {};
/** @type {Set<string>} 評価中（スタック上） */
let active = new Set();
/** 証明に使われた枝 parentId -> childId */
let proofEdges = new Set();

/**
 * コールスタックフレーム
 * phase:
 *  - enter: 入場、終端なら即確定
 *  - loop: 次の子を試す / 結果を集約
 *  - done: 結果を親へ返す直前（pop される）
 * @type {{ id: string, childIndex: number, phase: 'enter'|'loop'|'done', partial?: boolean }[]}
 */
let callStack = [];

let finished = false;
let stepCount = 0;

/** レイアウト座標 @type {Record<string, {x:number,y:number}>} */
let layout = {};
let NODE_W = 108;
let NODE_H = 44;

function cloneTree(src) {
  rootId = src.rootId;
  nodes = {};
  for (const [id, n] of Object.entries(src.nodes)) {
    nodes[id] = {
      id: n.id,
      label: n.label,
      kind: n.kind,
      value: n.value,
      children: n.children ? [...n.children] : [],
    };
  }
}

function resetState() {
  stopAuto();
  finished = false;
  stepCount = 0;
  result = {};
  active = new Set();
  proofEdges = new Set();
  for (const id of Object.keys(nodes)) {
    result[id] = null;
  }
  callStack = [{ id: rootId, childIndex: 0, phase: "enter" }];
  resultPanel.hide();
  setStatus("準備完了 — 再生または 1ステップで Solve(根) を開始");
  relayout();
  draw();
  updateDs();
}

function loadInitial() {
  cloneTree(INITIAL_TREE);
  resetState();
}

function kindLabel(kind) {
  if (kind === "or") return "OR";
  if (kind === "and") return "AND";
  return "葉";
}

// ----- レイアウト（platform/tree-layout） -----
function relayout() {
  const packed = layoutTreeShared(nodes, rootId, {
    nodeWidth: 108,
    nodeHeight: 44,
    gapX: 18,
    gapY: 72,
    pad: 28,
  });
  layout = packed.layout;
  NODE_W = packed.nodeWidth;
  NODE_H = packed.nodeHeight;
  applySvgSize(svg, packed.width, packed.height);
}

// ----- 描画 -----
function nodeClass(id) {
  const n = nodes[id];
  const parts = ["andor-node", `kind-${n.kind}`];
  if (active.has(id)) parts.push("is-active");
  if (result[id] === true) parts.push("is-true");
  if (result[id] === false) parts.push("is-false");
  if (n.kind === "leaf" && n.value === true) parts.push("leaf-true");
  if (n.kind === "leaf" && n.value === false) parts.push("leaf-false");
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
    const rx = n.kind === "and" ? 8 : n.kind === "or" ? 16 : 6;
    let badge = kindLabel(n.kind);
    if (n.kind === "leaf") badge = n.value ? "真" : "偽";
    let resMark = "";
    if (result[n.id] === true) resMark = " ✓";
    if (result[n.id] === false) resMark = " ✗";

    nodeEls.push(`
      <g class="${nodeClass(n.id)}" data-id="${n.id}">
        <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${rx}" ry="${rx}" />
        <text class="andor-kind" x="${p.x}" y="${p.y - 8}">${badge}</text>
        <text class="andor-label" x="${p.x}" y="${p.y + 10}">${escapeXml(n.label)}${resMark}</text>
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
      title: `Solve(${n.label})`,
      detail: `${kindLabel(n.kind)} · ${f.phase} · 子#${f.childIndex}${
        result[f.id] !== null ? ` → ${result[f.id]}` : ""
      }`,
    };
  });

  const decided = Object.keys(nodes)
    .filter((id) => result[id] !== null)
    .map((id) => {
      const n = nodes[id];
      return `${n.label}: ${result[id] ? "真" : "偽"}`;
    });

  setPanel(
    dsPanels,
    renderCallStack({
      label: "コールスタック（Solve）",
      frames,
      emptyText: "（探索終了）",
    }) +
      renderSet({
        label: "確定した真偽",
        typeNote: "評価済み節点",
        items: decided,
      })
  );
}

// ----- ステップエンジン -----
function finishRoot() {
  finished = true;
  stopAuto();
  const ok = result[rootId] === true;
  // 証明経路: 根から真の子を辿る（簡易ハイライト）
  markProof(rootId);
  draw();
  resultPanel.show(`
    <h3>結果（AND-OR）</h3>
    <ul>
      <li><strong>根の判定</strong>: ${ok ? "真 — 解あり（クリア戦略が存在する）" : "偽 — 解なし"}</li>
      <li><strong>ステップ数</strong>: ${stepCount}</li>
    </ul>
    <p class="result-verdict">
      ${
        ok
          ? "OR は「どれか1つ」でよいので、最初に成功した枝で打ち切られます。AND は1つでも失敗すると全体が偽になります。"
          : "すべての OR 候補が失敗し、根まで偽が伝播しました。"
      }
    </p>
    <p class="result-note">木の定義は <code>js/maps/and-or-tree.js</code> を編集して再読み込みしてください。</p>
  `);
  setStatus(
    ok
      ? `完了 — 根は真（解あり）/ ステップ ${stepCount}`
      : `完了 — 根は偽（解なし）/ ステップ ${stepCount}`
  );
}

function markProof(id) {
  if (result[id] !== true) return;
  const n = nodes[id];
  if (n.kind === "leaf") return;
  if (n.kind === "or") {
    for (const cid of n.children) {
      if (result[cid] === true) {
        proofEdges.add(`${id}->${cid}`);
        markProof(cid);
        break;
      }
    }
  } else if (n.kind === "and") {
    for (const cid of n.children) {
      if (result[cid] === true) {
        proofEdges.add(`${id}->${cid}`);
        markProof(cid);
      }
    }
  }
}

/**
 * 1 ステップ進める。
 * @returns {boolean} 続けられるなら true
 */
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

  // --- 入場 ---
  if (frame.phase === "enter") {
    if (n.kind === "leaf") {
      result[frame.id] = !!n.value;
      frame.phase = "done";
      setStatus(
        `葉「${n.label}」→ ${result[frame.id] ? "真" : "偽"}（終端）`
      );
      draw();
      updateDs();
      return true;
    }
    frame.phase = "loop";
    frame.childIndex = 0;
    setStatus(
      `${kindLabel(n.kind)}「${n.label}」に入場 — 子を左から評価`
    );
    draw();
    updateDs();
    return true;
  }

  // --- 子をループ ---
  if (frame.phase === "loop") {
    // 直前の子の結果を見て打ち切り
    if (frame.childIndex > 0) {
      const prevId = n.children[frame.childIndex - 1];
      const prevRes = result[prevId];
      if (n.kind === "or" && prevRes === true) {
        result[frame.id] = true;
        frame.phase = "done";
        setStatus(
          `OR「${n.label}」: 子「${nodes[prevId].label}」が真 → 全体も真（打ち切り）`
        );
        draw();
        updateDs();
        return true;
      }
      if (n.kind === "and" && prevRes === false) {
        result[frame.id] = false;
        frame.phase = "done";
        setStatus(
          `AND「${n.label}」: 子「${nodes[prevId].label}」が偽 → 全体も偽（打ち切り）`
        );
        draw();
        updateDs();
        return true;
      }
    }

    if (frame.childIndex < n.children.length) {
      const cid = n.children[frame.childIndex];
      frame.childIndex += 1;
      callStack.push({ id: cid, childIndex: 0, phase: "enter" });
      setStatus(
        `${kindLabel(n.kind)}「${n.label}」→ 子 Solve(${nodes[cid].label}) を呼び出し`
      );
      draw();
      updateDs();
      return true;
    }

    // 子を使い切った
    if (n.kind === "or") {
      result[frame.id] = false;
      setStatus(`OR「${n.label}」: すべての子が偽 → 偽`);
    } else {
      result[frame.id] = true;
      setStatus(`AND「${n.label}」: すべての子が真 → 真`);
    }
    frame.phase = "done";
    draw();
    updateDs();
    return true;
  }

  // --- return（pop） ---
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
      `return → 親 Solve(${nodes[parent.id].label}) へ（${nodes[frame.id].label}=${result[frame.id] ? "真" : "偽"}）`
    );
    draw();
    updateDs();
    return true;
  }

  return false;
}

const playback = createPlayback({
  btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
  speedEl: /** @type {HTMLInputElement | null} */ (speedEl),
  onTick: () => stepOnce(),
  defaultDelayMs: 200,
});

function stopAuto() {
  playback.stop();
}

btnPlay?.addEventListener("click", () => {
  playback.toggle(() => {
    if (finished) loadInitial();
  });
});
btnStep?.addEventListener("click", () => {
  playback.stop();
  if (finished) loadInitial();
  stepOnce();
});
btnReset?.addEventListener("click", () => {
  loadInitial();
  setStatus("木をリセットしました — js/maps/and-or-tree.js の定義");
});

loadInitial();
loadTextSample(
  "../samples/AndOrExample.cs",
  csharpSample,
  "// samples/AndOrExample.cs を読み込めませんでした。"
);
