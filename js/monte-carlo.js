/**
 * モンテカルロ評価デモ
 * 共通基盤: js/platform/*
 */

import {
  INITIAL_TREE,
  MINIMAX_ROOT,
  TRUE_RANDOM_EV,
} from "./maps/monte-carlo-tree.js";
import { setPanel, renderCallStack, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  randomIndex,
  layoutTree as layoutTreeShared,
  applySvgSize,
  escapeXml,
  mountSiteHeaderFromDataset,
} from "./platform/index.js";

mountSiteHeaderFromDataset();

const svg = document.getElementById("tree-svg");
const dsPanels = document.getElementById("ds-panels");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const seedEl = document.getElementById("seed");
const targetEl = document.getElementById("target-n");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(document.getElementById("result-compare"));

/** @typedef {'max'|'min'|'leaf'} Kind */
/** @typedef {{ id: string, label: string, kind: Kind, score?: number, children: string[] }} Node */

/** @type {Record<string, Node>} */
let nodes = {};
let rootId = "root";

/** @type {Record<string, number>} 通過回数 */
let visitCount = {};
/** @type {string[]} 現在のプレイアウト経路 */
let path = [];
/** プレイアウト途中か */
let walking = false;
let trials = 0;
let sumScores = 0;
/** @type {number[]} 直近の葉スコア */
let recentScores = [];
/** @type {Record<string, number>} 根の直後の子の選択回数 */
let firstMoveCount = {};

let running = false;
let finished = false;
let timerId = null;
let layout = {};
/** @type {() => number} */
let rng = Math.random;

const NODE_W = 100;
const NODE_H = 48;
const GAP_X = 16;
const GAP_Y = 76;
const PAD = 28;
const RECENT_MAX = 12;

function pickChild(id) {
  const ch = nodes[id].children;
  return ch[randomIndex(rng, ch.length)];
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

function estimate() {
  return trials === 0 ? null : sumScores / trials;
}

function targetN() {
  return Math.max(1, Number(targetEl?.value) || 50);
}

function resetState() {
  stopAuto();
  finished = false;
  walking = false;
  path = [];
  trials = 0;
  sumScores = 0;
  recentScores = [];
  visitCount = {};
  firstMoveCount = {};
  for (const id of Object.keys(nodes)) visitCount[id] = 0;
  for (const cid of nodes[rootId]?.children ?? []) firstMoveCount[cid] = 0;

  const seed = Number(seedEl?.value) || 42;
  rng = mulberry32(seed);

  resultPanel.hide();
  setStatus(
    `準備完了 — シード ${seed}。1ステップでプレイアウトを進め、目標 ${targetN()} 回`
  );
  relayout();
  draw();
  updateDs();
}

function loadInitial() {
  cloneTree(INITIAL_TREE);
  resetState();
}

function relayout() {
  const packed = layoutTreeShared(nodes, rootId, {
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
    gapX: GAP_X,
    gapY: GAP_Y,
    pad: PAD,
  });
  layout = packed.layout;
  applySvgSize(svg, packed.width, packed.height);
}

function pathEdgeSet() {
  const s = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    s.add(`${path[i]}->${path[i + 1]}`);
  }
  return s;
}

function nodeClass(id) {
  const n = nodes[id];
  const parts = ["andor-node", "mm-node", `kind-${n.kind}`];
  if (path.includes(id)) parts.push("is-on-path");
  if (path.length && path[path.length - 1] === id) parts.push("is-active");
  if (visitCount[id] > 0) parts.push("is-visited-mc");
  return parts.join(" ");
}

function draw() {
  if (!svg) return;
  const edges = [];
  const nodeEls = [];
  const pe = pathEdgeSet();
  const maxV = Math.max(1, ...Object.values(visitCount));

  for (const n of Object.values(nodes)) {
    for (const cid of n.children) {
      const a = layout[n.id];
      const b = layout[cid];
      if (!a || !b) continue;
      const key = `${n.id}->${cid}`;
      edges.push(
        `<line class="andor-edge${pe.has(key) ? " is-proof" : ""}" x1="${a.x}" y1="${a.y + NODE_H / 2 - 4}" x2="${b.x}" y2="${b.y - NODE_H / 2 + 4}" />`
      );
    }
  }

  for (const n of Object.values(nodes)) {
    const p = layout[n.id];
    if (!p) continue;
    const x = p.x - NODE_W / 2;
    const y = p.y - NODE_H / 2;
    const rx = n.kind === "max" ? 16 : n.kind === "min" ? 8 : 6;
    const badge = kindLabel(n.kind);
    const vc = visitCount[n.id] || 0;
    let scoreText =
      n.kind === "leaf" ? String(n.score) : vc ? `通${vc}` : "—";
    const heat = vc / maxV;
    const heatAttr =
      vc > 0
        ? ` style="opacity:${0.55 + 0.45 * heat}"`
        : "";

    nodeEls.push(`
      <g class="${nodeClass(n.id)}" data-id="${n.id}"${heatAttr}>
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
  const est = estimate();
  const pathFrames = path.map((id, i) => ({
    title: nodes[id].label,
    detail:
      nodes[id].kind === "leaf"
        ? `score=${nodes[id].score}`
        : kindLabel(nodes[id].kind) + (i === path.length - 1 ? " ← 現在" : ""),
  }));

  const recent = recentScores.map((s, i) => `#${trials - recentScores.length + i + 1}: ${s}`);
  const moves = Object.keys(firstMoveCount).map(
    (id) =>
      `${nodes[id].label}: ${firstMoveCount[id]}` +
      (trials ? ` (${((100 * firstMoveCount[id]) / trials).toFixed(0)}%)` : "")
  );

  const stats = [
    `試行: ${trials} / 目標 ${targetN()}`,
    `推定値: ${est === null ? "—" : est.toFixed(3)}`,
    `真の乱択EV: ${TRUE_RANDOM_EV.toFixed(3)}`,
    `Min-Max: ${MINIMAX_ROOT}`,
  ];

  setPanel(
    dsPanels,
    renderCallStack({
      label: "今回のプレイアウト経路",
      frames: pathFrames,
      emptyText: "（次のステップで開始）",
    }) +
      renderSet({
        label: "統計",
        typeNote: "推定 vs 理論",
        items: stats,
      }) +
      renderSet({
        label: "根の最初の一手の回数",
        typeNote: "乱択分布",
        items: moves,
      }) +
      renderSet({
        label: "直近の葉スコア",
        typeNote: "履歴",
        items: recent.length ? recent : [],
        emptyText: "（まだなし）",
      })
  );
}

function finishBatch() {
  finished = true;
  stopAuto();
  const est = estimate();
  const errEv =
    est === null ? "—" : Math.abs(est - TRUE_RANDOM_EV).toFixed(3);
  const errMm =
    est === null ? "—" : Math.abs(est - MINIMAX_ROOT).toFixed(3);
  resultPanel.show(`
    <h3>結果（モンテカルロ評価）</h3>
    <ul>
      <li><strong>試行回数 N</strong>: ${trials}</li>
      <li><strong>推定値（平均）</strong>: ${est?.toFixed(4)}</li>
      <li><strong>真の乱択 EV</strong>: ${TRUE_RANDOM_EV.toFixed(4)}（差 ${errEv}）</li>
      <li><strong>Min-Max 値</strong>: ${MINIMAX_ROOT}（差 ${errMm}）— 最善前提なので別物</li>
    </ul>
    <p class="result-verdict">
      乱択プレイアウトの平均は「みんながランダムに指したときの期待スコア」に近づきます。
      相手も自分も最善を取る Min-Max（この木では 4）とは一致しません。
    </p>
    <p class="result-note">
      より賢い「どの枝を多くサンプルするか」は次の<strong>多腕バンディット</strong>や MCTS の話です。
      木: <code>js/maps/monte-carlo-tree.js</code>
    </p>
  `);
  setStatus(
    `目標到達 — 推定 ${est?.toFixed(3)}（乱択EV ${TRUE_RANDOM_EV.toFixed(2)} / Min-Max ${MINIMAX_ROOT}）`
  );
}

function completePlayoutAtLeaf() {
  const leafId = path[path.length - 1];
  const score = nodes[leafId].score ?? 0;
  trials += 1;
  sumScores += score;
  recentScores.push(score);
  if (recentScores.length > RECENT_MAX) recentScores.shift();

  if (path.length >= 2) {
    const first = path[1];
    if (firstMoveCount[first] !== undefined) firstMoveCount[first] += 1;
  }

  const est = estimate();
  setStatus(
    `プレイアウト #${trials} 完了: 経路末尾「${nodes[leafId].label}」= ${score} → 推定 ${est.toFixed(3)}`
  );
  walking = false;
  // path は次開始まで残してハイライト維持
  if (trials >= targetN()) {
    finishBatch();
  }
}

/**
 * 1 ステップ: プレイアウトを1マス進める（葉なら集計）
 * @returns {boolean} まだ目標に達していなければ true
 */
function stepOnce() {
  if (finished) return false;

  if (!walking) {
    // 新規プレイアウト開始
    path = [rootId];
    visitCount[rootId] = (visitCount[rootId] || 0) + 1;
    walking = true;
    if (nodes[rootId].kind === "leaf") {
      completePlayoutAtLeaf();
      draw();
      updateDs();
      return !finished;
    }
    setStatus(`プレイアウト #${trials + 1} 開始 — 根「${nodes[rootId].label}」`);
    draw();
    updateDs();
    return true;
  }

  const cur = path[path.length - 1];
  if (nodes[cur].kind === "leaf") {
    // すでに葉で止まっている場合（再ステップ）
    completePlayoutAtLeaf();
    draw();
    updateDs();
    return !finished;
  }

  const next = pickChild(cur);
  path.push(next);
  visitCount[next] = (visitCount[next] || 0) + 1;

  if (nodes[next].kind === "leaf") {
    completePlayoutAtLeaf();
  } else {
    setStatus(
      `プレイアウト #${trials + 1}: 「${nodes[cur].label}」→「${nodes[next].label}」（乱択）`
    );
  }
  draw();
  updateDs();
  return !finished;
}

/** 再生用: 1プレイアウトを最後まで（複数 micro-step 相当を1ティックで） */
function runFullPlayoutTick() {
  if (finished) return false;
  // 歩き途中なら葉まで、でなければ1本まるごと
  if (!walking) {
    path = [rootId];
    visitCount[rootId] = (visitCount[rootId] || 0) + 1;
    walking = true;
  }
  while (walking && nodes[path[path.length - 1]].kind !== "leaf") {
    const cur = path[path.length - 1];
    const next = pickChild(cur);
    path.push(next);
    visitCount[next] = (visitCount[next] || 0) + 1;
  }
  if (nodes[path[path.length - 1]].kind === "leaf") {
    completePlayoutAtLeaf();
  }
  draw();
  updateDs();
  return !finished;
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
  const delay = Number(speedEl?.value) || 120;
  timerId = setTimeout(() => {
    if (!running) return;
    // 再生中は1ティック = 1プレイアウト完走（速くサンプルが溜まる）
    if (runFullPlayoutTick()) scheduleNext();
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
  if (runFullPlayoutTick()) scheduleNext();
  else stopAuto();
}



btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  if (running) stopAuto();
  if (finished) loadInitial();
  stepOnce();
});
btnReset?.addEventListener("click", () => {
  loadInitial();
});
seedEl?.addEventListener("change", () => loadInitial());
targetEl?.addEventListener("change", () => {
  if (!finished && trials >= targetN()) finishBatch();
  else updateDs();
});

loadInitial();
loadTextSample(
  "../samples/MonteCarloExample.cs",
  csharpSample,
  "// samples/MonteCarloExample.cs を読み込めませんでした。"
);
