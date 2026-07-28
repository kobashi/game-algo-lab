/**
 * BVH 概説
 * @see docs/topics/bvh-overview/SPEC.md
 */
import { BVH_OVERVIEW_CONFIG as C } from "./maps/bvh-overview-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bvh-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const nVal = document.getElementById("n-val");
const statsEl = document.getElementById("bvh-stats");
const btnRebuild = document.getElementById("btn-rebuild");
const btnClearQ = document.getElementById("btn-clear-q");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ minX: number, minY: number, maxX: number, maxY: number, leafId: number, L: BvhNode | null, R: BvhNode | null, depth: number }} BvhNode
 * @typedef {{ x: number, y: number, hw: number, hh: number, color: string }} Obj
 */

/** @type {Obj[]} */
let objects = [];
/** @type {BvhNode | null} */
let root = null;
/** @type {{ x: number, y: number, w: number, h: number } | null} */
let query = { x: 180, y: 100, w: 200, h: 140 };
/** @type {Set<number>} */
let hitLeaves = new Set();
let visited = 0;
let nodeCount = 0;

/** @type {null | 'query'} */
let drag = null;
let dmx = 0;
let dmy = 0;
let ox = 0;
let oy = 0;

function readN() {
  const n = Math.min(
    C.maxN,
    Math.max(C.minN, Math.floor(Number(nEl?.value) || C.defaultN))
  );
  if (nVal) nVal.textContent = String(n);
  return n;
}

/**
 * @param {Obj[]} objs
 * @param {number[]} indices
 * @param {number} depth
 * @returns {BvhNode}
 */
export function buildBvh(objs, indices, depth = 0) {
  /** @type {BvhNode} */
  let node = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    leafId: -1,
    L: null,
    R: null,
    depth,
  };
  for (const i of indices) {
    const o = objs[i];
    node.minX = Math.min(node.minX, o.x - o.hw);
    node.minY = Math.min(node.minY, o.y - o.hh);
    node.maxX = Math.max(node.maxX, o.x + o.hw);
    node.maxY = Math.max(node.maxY, o.y + o.hh);
  }
  if (indices.length === 1) {
    node.leafId = indices[0];
    return node;
  }
  // split by longest axis median
  const extX = node.maxX - node.minX;
  const extY = node.maxY - node.minY;
  const axis = extX >= extY ? "x" : "y";
  const sorted = [...indices].sort((a, b) =>
    axis === "x" ? objs[a].x - objs[b].x : objs[a].y - objs[b].y
  );
  const mid = Math.floor(sorted.length / 2);
  const left = sorted.slice(0, mid);
  const right = sorted.slice(mid);
  if (!left.length || !right.length) {
    node.leafId = sorted[0];
    return node;
  }
  node.L = buildBvh(objs, left, depth + 1);
  node.R = buildBvh(objs, right, depth + 1);
  return node;
}

/**
 * @param {BvhNode} node
 * @param {{x:number,y:number,w:number,h:number}} q
 * @param {Set<number>} out
 */
export function queryBvh(node, q, out) {
  visited += 1;
  const qmaxX = q.x + q.w;
  const qmaxY = q.y + q.h;
  if (
    node.maxX < q.x ||
    node.minX > qmaxX ||
    node.maxY < q.y ||
    node.minY > qmaxY
  ) {
    return;
  }
  if (node.leafId >= 0) {
    out.add(node.leafId);
    return;
  }
  if (node.L) queryBvh(node.L, q, out);
  if (node.R) queryBvh(node.R, q, out);
}

function countNodes(n) {
  nodeCount += 1;
  if (n.L) countNodes(n.L);
  if (n.R) countNodes(n.R);
}

function rebuild() {
  const n = readN();
  const rng = mulberry32(11 + n * 3);
  objects = [];
  const colors = ["#5b9fd4", "#6bcb8f", "#f2cc8f", "#e07a5f", "#b08fd4"];
  for (let i = 0; i < n; i++) {
    objects.push({
      x: 40 + rng() * (canvas.width - 80),
      y: 40 + rng() * (canvas.height - 80),
      hw: C.half * (0.6 + rng() * 0.8),
      hh: C.half * (0.6 + rng() * 0.8),
      color: colors[i % colors.length],
    });
  }
  root = buildBvh(
    objects,
    objects.map((_, i) => i),
    0
  );
  nodeCount = 0;
  if (root) countNodes(root);
  runQuery();
  draw();
  renderStats();
  setStatus(`BVH 再構築 · ${n} 葉`);
}

function runQuery() {
  hitLeaves = new Set();
  visited = 0;
  if (root && query) queryBvh(root, query, hitLeaves);
}

function drawNode(node) {
  if (!ctx) return;
  const alpha = Math.max(0.15, 0.55 - node.depth * 0.08);
  ctx.strokeStyle = `rgba(154, 171, 191, ${alpha})`;
  ctx.lineWidth = node.leafId >= 0 ? 1 : 1.5;
  ctx.strokeRect(
    node.minX,
    node.minY,
    node.maxX - node.minX,
    node.maxY - node.minY
  );
  if (node.L) drawNode(node.L);
  if (node.R) drawNode(node.R);
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (root) drawNode(root);

  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    const hit = hitLeaves.has(i);
    ctx.fillStyle = hit ? "rgba(242, 204, 143, 0.55)" : o.color + "99";
    ctx.strokeStyle = hit ? "#f2cc8f" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = hit ? 2 : 1;
    ctx.fillRect(o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2);
    ctx.strokeRect(o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2);
  }

  if (query) {
    ctx.strokeStyle = "#6bcb8f";
    ctx.lineWidth = 2;
    ctx.strokeRect(query.x, query.y, query.w, query.h);
    ctx.fillStyle = "rgba(107, 203, 143, 0.08)";
    ctx.fillRect(query.x, query.y, query.w, query.h);
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("枠=BVH ノード AABB · 黄=クエリヒット葉 · 緑=クエリ", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>葉（物体）</td><td>${objects.length}</td></tr>
        <tr><td>BVH ノード</td><td>${nodeCount}</td></tr>
        <tr><td>訪問ノード</td><td>${visited}</td></tr>
        <tr><td>ヒット葉</td><td>${hitLeaves.size}</td></tr>
        <tr><td>総当なら</td><td>${objects.length}</td></tr>
      </table>`;
  }
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

canvas?.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  if (
    query &&
    p.x >= query.x &&
    p.y >= query.y &&
    p.x <= query.x + query.w &&
    p.y <= query.y + query.h
  ) {
    drag = "query";
    dmx = p.x;
    dmy = p.y;
    ox = query.x;
    oy = query.y;
  } else {
    query = { x: p.x, y: p.y, w: 1, h: 1 };
    drag = "query";
    dmx = p.x;
    dmy = p.y;
    ox = p.x;
    oy = p.y;
  }
  canvas.setPointerCapture(e.pointerId);
});

canvas?.addEventListener("pointermove", (e) => {
  if (drag !== "query" || !query) return;
  const p = pointerPos(e);
  if (query.w <= 2 && query.h <= 2) {
    query = {
      x: Math.min(dmx, p.x),
      y: Math.min(dmy, p.y),
      w: Math.max(1, Math.abs(p.x - dmx)),
      h: Math.max(1, Math.abs(p.y - dmy)),
    };
  } else if (Math.hypot(p.x - dmx, p.y - dmy) > 3 && query.w > 10) {
    query.x = ox + (p.x - dmx);
    query.y = oy + (p.y - dmy);
  } else {
    query = {
      x: Math.min(dmx, p.x),
      y: Math.min(dmy, p.y),
      w: Math.max(1, Math.abs(p.x - dmx)),
      h: Math.max(1, Math.abs(p.y - dmy)),
    };
  }
  runQuery();
  draw();
  renderStats();
});

canvas?.addEventListener("pointerup", () => {
  drag = null;
  runQuery();
  draw();
  renderStats();
});

btnRebuild?.addEventListener("click", rebuild);
btnClearQ?.addEventListener("click", () => {
  query = null;
  hitLeaves = new Set();
  visited = 0;
  draw();
  renderStats();
  setStatus("クエリ解除");
});
nEl?.addEventListener("change", rebuild);
nEl?.addEventListener("input", () => readN());

loadTextSample(
  "../samples/BvhOverviewExample.cs",
  csharpSample,
  "// BvhOverviewExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
rebuild();
