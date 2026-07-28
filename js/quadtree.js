/**
 * 四分木
 * @see docs/topics/quadtree/SPEC.md
 */
import { QUADTREE_CONFIG as C } from "./maps/quadtree-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("qt-canvas")
);
const ctx = canvas.getContext("2d");
const capEl = /** @type {HTMLInputElement} */ (
  document.getElementById("capacity")
);
const depthEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-depth")
);
const ptsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("point-count")
);
const capVal = document.getElementById("cap-val");
const depthVal = document.getElementById("depth-val");
const ptsVal = document.getElementById("pts-val");
const statsEl = document.getElementById("qt-stats");
const btnRebuild = document.getElementById("btn-rebuild");
const btnClearQ = document.getElementById("btn-clear-q");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, w: number, h: number, points: {x:number,y:number}[], children: QtNode[] | null, depth: number }} QtNode
 */

/** @type {{x:number,y:number}[]} */
let points = [];
/** @type {QtNode | null} */
let root = null;
/** @type {{x:number,y:number,w:number,h:number} | null} */
let query = null;
/** @type {{x:number,y:number}[]} */
let queryHits = [];
let nodeCount = 0;
let leafCount = 0;

/** @type {null | 'query'} */
let drag = null;
let dmx = 0;
let dmy = 0;
let ox = 0;
let oy = 0;
let ow = 0;
let oh = 0;

function readCap() {
  const v = Math.floor(Number(capEl?.value) || C.defaultCapacity);
  if (capVal) capVal.textContent = String(v);
  return Math.max(1, v);
}
function readMaxDepth() {
  const v = Math.floor(Number(depthEl?.value) || C.defaultMaxDepth);
  if (depthVal) depthVal.textContent = String(v);
  return Math.max(1, v);
}
function readPts() {
  const v = Math.floor(Number(ptsEl?.value) || C.defaultPoints);
  if (ptsVal) ptsVal.textContent = String(v);
  return Math.max(4, v);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} depth
 * @returns {QtNode}
 */
function makeNode(x, y, w, h, depth) {
  return { x, y, w, h, points: [], children: null, depth };
}

/**
 * @param {QtNode} node
 * @param {number} capacity
 * @param {number} maxDepth
 */
function subdivide(node, capacity, maxDepth) {
  const hw = node.w / 2;
  const hh = node.h / 2;
  const d = node.depth + 1;
  node.children = [
    makeNode(node.x, node.y, hw, hh, d),
    makeNode(node.x + hw, node.y, hw, hh, d),
    makeNode(node.x, node.y + hh, hw, hh, d),
    makeNode(node.x + hw, node.y + hh, hw, hh, d),
  ];
  const old = node.points;
  node.points = [];
  for (const p of old) insert(node, p, capacity, maxDepth);
}

/**
 * @param {QtNode} node
 * @param {{x:number,y:number}} p
 * @param {number} capacity
 * @param {number} maxDepth
 */
export function insert(node, p, capacity, maxDepth) {
  if (
    p.x < node.x ||
    p.y < node.y ||
    p.x >= node.x + node.w ||
    p.y >= node.y + node.h
  ) {
    return false;
  }
  if (!node.children) {
    if (node.points.length < capacity || node.depth >= maxDepth) {
      node.points.push(p);
      return true;
    }
    subdivide(node, capacity, maxDepth);
  }
  if (node.children) {
    for (const c of node.children) {
      if (insert(c, p, capacity, maxDepth)) return true;
    }
  }
  return false;
}

/**
 * @param {QtNode} node
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {{x:number,y:number}[]} out
 */
export function queryRange(node, rect, out) {
  if (!rectsOverlap(node, rect)) return;
  for (const p of node.points) {
    if (
      p.x >= rect.x &&
      p.y >= rect.y &&
      p.x <= rect.x + rect.w &&
      p.y <= rect.y + rect.h
    ) {
      out.push(p);
    }
  }
  if (node.children) {
    for (const c of node.children) queryRange(c, rect, out);
  }
}

function rectsOverlap(a, b) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

function countNodes(node) {
  nodeCount += 1;
  if (!node.children) leafCount += 1;
  else for (const c of node.children) countNodes(c);
}

function rebuild() {
  const cap = readCap();
  const maxD = readMaxDepth();
  const n = readPts();
  const rng = mulberry32(21 + n * 5 + cap);
  points = [];
  for (let i = 0; i < n; i++) {
    points.push({
      x: 20 + rng() * (C.world.w - 40),
      y: 20 + rng() * (C.world.h - 40),
    });
  }
  root = makeNode(C.world.x, C.world.y, C.world.w, C.world.h, 0);
  for (const p of points) insert(root, p, cap, maxD);
  nodeCount = 0;
  leafCount = 0;
  countNodes(root);
  refreshQuery();
  draw();
  renderStats();
  setStatus(`再構築 · ${n} 点 · 容量 ${cap} · 深さ上限 ${maxD}`);
}

function refreshQuery() {
  queryHits = [];
  if (root && query) queryRange(root, query, queryHits);
}

function drawNode(node) {
  if (!ctx) return;
  ctx.strokeStyle = "rgba(90, 106, 128, 0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(node.x + 0.5, node.y + 0.5, node.w - 1, node.h - 1);
  if (node.children) {
    for (const c of node.children) drawNode(c);
  }
}

function draw() {
  if (!ctx || !root) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  drawNode(root);

  for (const p of points) {
    const hit = queryHits.some((h) => h.x === p.x && h.y === p.y);
    ctx.fillStyle = hit ? "#f2cc8f" : "#5b9fd4";
    ctx.beginPath();
    ctx.arc(p.x, p.y, hit ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.fillText("緑=クエリ矩形 · 黄=ヒット点 · クリック/ドラッグで矩形", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>点数</td><td>${points.length}</td></tr>
        <tr><td>ノード</td><td>${nodeCount}</td></tr>
        <tr><td>葉</td><td>${leafCount}</td></tr>
        <tr><td>容量</td><td>${readCap()}</td></tr>
        <tr><td>クエリヒット</td><td>${queryHits.length}</td></tr>
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
  if (query && p.x >= query.x && p.y >= query.y && p.x <= query.x + query.w && p.y <= query.y + query.h) {
    drag = "query";
    dmx = p.x;
    dmy = p.y;
    ox = query.x;
    oy = query.y;
    ow = query.w;
    oh = query.h;
    canvas.setPointerCapture(e.pointerId);
  } else {
    query = { x: p.x, y: p.y, w: 1, h: 1 };
    drag = "query";
    dmx = p.x;
    dmy = p.y;
    ox = p.x;
    oy = p.y;
    ow = 1;
    oh = 1;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas?.addEventListener("pointermove", (e) => {
  if (drag !== "query" || !query) return;
  const p = pointerPos(e);
  // if started as new rect from click, grow from origin
  if (ow <= 2 && oh <= 2 && Math.hypot(p.x - dmx, p.y - dmy) > 2) {
    const x0 = Math.min(dmx, p.x);
    const y0 = Math.min(dmy, p.y);
    query = {
      x: x0,
      y: y0,
      w: Math.abs(p.x - dmx),
      h: Math.abs(p.y - dmy),
    };
  } else if (ow > 2 || oh > 2) {
    // move existing
    query.x = ox + (p.x - dmx);
    query.y = oy + (p.y - dmy);
  } else {
    const x0 = Math.min(dmx, p.x);
    const y0 = Math.min(dmy, p.y);
    query = {
      x: x0,
      y: y0,
      w: Math.max(1, Math.abs(p.x - dmx)),
      h: Math.max(1, Math.abs(p.y - dmy)),
    };
  }
  refreshQuery();
  draw();
  renderStats();
});

canvas?.addEventListener("pointerup", () => {
  drag = null;
  refreshQuery();
  draw();
  renderStats();
});

btnRebuild?.addEventListener("click", rebuild);
btnClearQ?.addEventListener("click", () => {
  query = null;
  queryHits = [];
  draw();
  renderStats();
  setStatus("クエリ解除");
});
for (const el of [capEl, depthEl, ptsEl]) {
  el?.addEventListener("change", rebuild);
  el?.addEventListener("input", () => {
    readCap();
    readMaxDepth();
    readPts();
  });
}

loadTextSample(
  "../samples/QuadtreeExample.cs",
  csharpSample,
  "// QuadtreeExample.cs"
);
if (capEl) capEl.value = String(C.defaultCapacity);
if (depthEl) depthEl.value = String(C.defaultMaxDepth);
if (ptsEl) ptsEl.value = String(C.defaultPoints);
query = { x: 200, y: 100, w: 160, h: 120 };
rebuild();
