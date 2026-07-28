/**
 * ナビメッシュ入門 — ポリゴングラフ + 簡易 string pull
 */
import { NAVMESH_INTRO_CONFIG as C } from "./maps/navmesh-intro-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("nm-canvas")
);
const ctx = canvas.getContext("2d");
const pullEl = /** @type {HTMLInputElement} */ (
  document.getElementById("string-pull")
);
const statsEl = document.getElementById("nm-stats");
const btnPath = document.getElementById("btn-path");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let start = { x: C.start[0], y: C.start[1] };
let goal = { x: C.goal[0], y: C.goal[1] };
/** @type {number[]} poly path ids */
let polyPath = [];
/** @type {{x:number,y:number}[]} */
let corridor = [];
/** @type {{x:number,y:number}[]} */
let smoothed = [];
let drag = /** @type {null | 'start' | 'goal'} */ (null);

/**
 * @param {number[][]} verts
 */
export function centroid(verts) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of verts) {
    sx += x;
    sy += y;
  }
  const n = verts.length;
  return { x: sx / n, y: sy / n };
}

/**
 * Point in polygon (ray cast)
 * @param {number} px
 * @param {number} py
 * @param {number[][]} verts
 */
export function pointInPoly(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i][0];
    const yi = verts[i][1];
    const xj = verts[j][0];
    const yj = verts[j][1];
    const inter =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function findPoly(px, py) {
  for (const p of C.polys) {
    if (pointInPoly(px, py, p.verts)) return p.id;
  }
  return -1;
}

/**
 * A* on poly graph (centers).
 * @returns {number[]}
 */
export function polyAStar(startId, goalId) {
  if (startId < 0 || goalId < 0) return [];
  if (startId === goalId) return [startId];
  /** @type {Map<number, number>} */
  const centers = new Map();
  for (const p of C.polys) {
    const c = centroid(p.verts);
    centers.set(p.id, c);
  }
  /** @type {Map<number, number[]>} */
  const graph = new Map();
  for (const p of C.polys) graph.set(p.id, []);
  for (const [a, b] of C.adj) {
    graph.get(a)?.push(b);
    graph.get(b)?.push(a);
  }
  const gc = (id) => centers.get(id) || { x: 0, y: 0 };
  const h = (id) => {
    const a = gc(id);
    const b = gc(goalId);
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  /** @type {Map<number, number>} */
  const gScore = new Map([[startId, 0]]);
  /** @type {Map<number, number | null>} */
  const came = new Map([[startId, null]]);
  /** @type {{id:number,f:number}[]} */
  const open = [{ id: startId, f: h(startId) }];
  const closed = new Set();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (!cur) break;
    if (cur.id === goalId) {
      const path = [];
      let c = goalId;
      while (c != null) {
        path.push(c);
        c = /** @type {number|null} */ (came.get(c));
      }
      return path.reverse();
    }
    if (closed.has(cur.id)) continue;
    closed.add(cur.id);
    const neigh = graph.get(cur.id) || [];
    for (const nb of neigh) {
      if (closed.has(nb)) continue;
      const ca = gc(cur.id);
      const cb = gc(nb);
      const tent = (gScore.get(cur.id) ?? 0) + Math.hypot(ca.x - cb.x, ca.y - cb.y);
      if (tent < (gScore.get(nb) ?? Infinity)) {
        gScore.set(nb, tent);
        came.set(nb, cur.id);
        open.push({ id: nb, f: tent + h(nb) });
      }
    }
  }
  return [];
}

/**
 * Corridor: start → poly centers → goal
 */
function buildCorridor(pathIds) {
  /** @type {{x:number,y:number}[]} */
  const pts = [{ ...start }];
  for (const id of pathIds) {
    const p = C.polys.find((x) => x.id === id);
    if (p) pts.push(centroid(p.verts));
  }
  pts.push({ ...goal });
  return pts;
}

/**
 * Simple string pull: repeatedly shortcut if segment stays in union of path polys.
 * @param {{x:number,y:number}[]} pts
 * @param {number[]} pathIds
 */
export function stringPull(pts, pathIds) {
  if (pts.length <= 2) return pts.slice();
  const polys = pathIds
    .map((id) => C.polys.find((p) => p.id === id))
    .filter(Boolean);
  const inMesh = (x, y) =>
    polys.some((p) => p && pointInPoly(x, y, p.verts));
  // sample segment inside mesh
  const segOk = (a, b) => {
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (!inMesh(x, y)) return false;
    }
    return true;
  };
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let best = i + 1;
    for (let j = pts.length - 1; j > i + 1; j--) {
      if (segOk(pts[i], pts[j])) {
        best = j;
        break;
      }
    }
    out.push(pts[best]);
    i = best;
  }
  return out;
}

function recompute() {
  const sid = findPoly(start.x, start.y);
  const gid = findPoly(goal.x, goal.y);
  polyPath = polyAStar(sid, gid);
  corridor = buildCorridor(polyPath);
  smoothed = pullEl?.checked ? stringPull(corridor, polyPath) : corridor.slice();
  draw();
  const clen = pathLen(corridor);
  const slen = pathLen(smoothed);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>S ポリゴン</td><td>${sid}</td></tr>
        <tr><td>G ポリゴン</td><td>${gid}</td></tr>
        <tr><td>ポリゴン経路</td><td>${polyPath.join(" → ") || "—"}</td></tr>
        <tr><td>回廊長</td><td>${clen.toFixed(0)}</td></tr>
        <tr><td>ショートカット後</td><td>${slen.toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(
    polyPath.length
      ? `path polys=${polyPath.length} · ${pullEl?.checked ? "pull ON" : "pull OFF"}`
      : "経路なし（S/G をメッシュ内へ）"
  );
}

function pathLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return L;
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  for (const p of C.polys) {
    const onPath = polyPath.includes(p.id);
    ctx.fillStyle = onPath
      ? "rgba(107, 203, 143, 0.25)"
      : "rgba(61, 79, 102, 0.45)";
    ctx.strokeStyle = onPath ? "#6bcb8f" : "#5a6a80";
    ctx.beginPath();
    p.verts.forEach((v, i) => {
      if (i === 0) ctx.moveTo(v[0], v[1]);
      else ctx.lineTo(v[0], v[1]);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const c = centroid(p.verts);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "12px sans-serif";
    ctx.fillText(`P${p.id}`, c.x - 8, c.y + 4);
  }

  // graph edges
  ctx.strokeStyle = "rgba(242,204,143,0.35)";
  for (const [a, b] of C.adj) {
    const pa = C.polys.find((p) => p.id === a);
    const pb = C.polys.find((p) => p.id === b);
    if (!pa || !pb) continue;
    const ca = centroid(pa.verts);
    const cb = centroid(pb.verts);
    ctx.beginPath();
    ctx.moveTo(ca.x, ca.y);
    ctx.lineTo(cb.x, cb.y);
    ctx.stroke();
  }

  const drawPath = (pts, color, width) => {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.lineWidth = 1;
  };
  drawPath(corridor, "rgba(91,159,212,0.7)", 2);
  if (pullEl?.checked) drawPath(smoothed, "#e07a5f", 3);

  // start / goal
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef7";
  ctx.font = "11px sans-serif";
  ctx.fillText("S", start.x - 4, start.y - 12);
  ctx.fillText("G", goal.x - 4, goal.y - 12);
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  if (Math.hypot(p.x - start.x, p.y - start.y) < 16) drag = "start";
  else if (Math.hypot(p.x - goal.x, p.y - goal.y) < 16) drag = "goal";
  else {
    // place start if click in mesh
    if (findPoly(p.x, p.y) >= 0) {
      start = p;
      recompute();
    }
  }
  if (drag) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = pointerPos(e);
  if (findPoly(p.x, p.y) < 0) return;
  if (drag === "start") start = p;
  else goal = p;
  recompute();
});
canvas.addEventListener("pointerup", () => {
  drag = null;
});

btnPath?.addEventListener("click", recompute);
btnReset?.addEventListener("click", () => {
  start = { x: C.start[0], y: C.start[1] };
  goal = { x: C.goal[0], y: C.goal[1] };
  recompute();
});
pullEl?.addEventListener("change", recompute);

loadTextSample(
  "../samples/NavmeshIntroExample.cs",
  csharpSample,
  "// NavmeshIntroExample.cs"
);
recompute();
