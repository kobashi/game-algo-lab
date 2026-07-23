/**
 * 座標変換デモ — ローカル / ワールド / スクリーン
 * @see docs/topics/coordinates/SPEC.md
 */

import { COORD_CONFIG as C } from "./maps/coordinates-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("coord-canvas")
);
const ctx = canvas.getContext("2d");
const readoutEl = document.getElementById("coord-readout");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const els = {
  px: /** @type {HTMLInputElement} */ (document.getElementById("px")),
  py: /** @type {HTMLInputElement} */ (document.getElementById("py")),
  pang: /** @type {HTMLInputElement} */ (document.getElementById("pang")),
  lx: /** @type {HTMLInputElement} */ (document.getElementById("lx")),
  ly: /** @type {HTMLInputElement} */ (document.getElementById("ly")),
  camx: /** @type {HTMLInputElement} */ (document.getElementById("camx")),
  camy: /** @type {HTMLInputElement} */ (document.getElementById("camy")),
  zoom: /** @type {HTMLInputElement} */ (document.getElementById("zoom")),
};

const vals = {
  px: document.getElementById("px-val"),
  py: document.getElementById("py-val"),
  pang: document.getElementById("pang-val"),
  lx: document.getElementById("lx-val"),
  ly: document.getElementById("ly-val"),
  camx: document.getElementById("camx-val"),
  camy: document.getElementById("camy-val"),
  zoom: document.getElementById("zoom-val"),
};

/** @type {{ x: number, y: number } | null} */
let pickWorld = null;

function num(el, fallback = 0) {
  const v = Number(el?.value);
  return Number.isFinite(v) ? v : fallback;
}

function readState() {
  return {
    parent: {
      x: num(els.px, C.defaultParent.x),
      y: num(els.py, C.defaultParent.y),
      angleDeg: num(els.pang, C.defaultParent.angleDeg),
    },
    local: {
      x: num(els.lx, C.defaultLocal.x),
      y: num(els.ly, C.defaultLocal.y),
    },
    camera: {
      x: num(els.camx, C.defaultCamera.x),
      y: num(els.camy, C.defaultCamera.y),
      zoom: num(els.zoom, C.defaultCamera.zoom),
    },
  };
}

function syncLabels() {
  const s = readState();
  if (vals.px) vals.px.textContent = s.parent.x.toFixed(2);
  if (vals.py) vals.py.textContent = s.parent.y.toFixed(2);
  if (vals.pang) vals.pang.textContent = String(Math.round(s.parent.angleDeg));
  if (vals.lx) vals.lx.textContent = s.local.x.toFixed(2);
  if (vals.ly) vals.ly.textContent = s.local.y.toFixed(2);
  if (vals.camx) vals.camx.textContent = s.camera.x.toFixed(2);
  if (vals.camy) vals.camy.textContent = s.camera.y.toFixed(2);
  if (vals.zoom) vals.zoom.textContent = String(Math.round(s.camera.zoom));
}

function deg2rad(d) {
  return (d * Math.PI) / 180;
}

function rotate(x, y, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: x * c - y * s, y: x * s + y * c };
}

function localToWorld(local, parent) {
  const r = rotate(local.x, local.y, deg2rad(parent.angleDeg));
  return { x: r.x + parent.x, y: r.y + parent.y };
}

function worldToLocal(world, parent) {
  const dx = world.x - parent.x;
  const dy = world.y - parent.y;
  return rotate(dx, dy, -deg2rad(parent.angleDeg));
}

function worldToScreen(world, camera, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  // スクリーン Y は下向き → ワールド Y 上向きを反転
  return {
    x: (world.x - camera.x) * camera.zoom + cx,
    y: -(world.y - camera.y) * camera.zoom + cy,
  };
}

function screenToWorld(sx, sy, camera, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  return {
    x: (sx - cx) / camera.zoom + camera.x,
    y: -((sy - cy) / camera.zoom) + camera.y,
  };
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const s = readState();
  const childW = localToWorld(s.local, s.parent);

  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // グリッド（ワールド単位）
  const half = C.worldHalf;
  ctx.strokeStyle = "rgba(90,106,128,0.35)";
  ctx.lineWidth = 1;
  for (let g = -half; g <= half; g++) {
    const a = worldToScreen({ x: g, y: -half }, s.camera, W, H);
    const b = worldToScreen({ x: g, y: half }, s.camera, W, H);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const c = worldToScreen({ x: -half, y: g }, s.camera, W, H);
    const d = worldToScreen({ x: half, y: g }, s.camera, W, H);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }

  // ワールド軸
  const o = worldToScreen({ x: 0, y: 0 }, s.camera, W, H);
  const ox = worldToScreen({ x: 1.5, y: 0 }, s.camera, W, H);
  const oy = worldToScreen({ x: 0, y: 1.5 }, s.camera, W, H);
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(ox.x, ox.y);
  ctx.stroke();
  ctx.strokeStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(oy.x, oy.y);
  ctx.stroke();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.fillText("Wx", ox.x + 4, ox.y);
  ctx.fillText("Wy", oy.x + 4, oy.y);

  // 親
  const pp = worldToScreen(s.parent, s.camera, W, H);
  const axisLen = 1.0;
  const fwd = localToWorld({ x: axisLen, y: 0 }, s.parent);
  const left = localToWorld({ x: 0, y: axisLen }, s.parent);
  const pf = worldToScreen(fwd, s.camera, W, H);
  const pl = worldToScreen(left, s.camera, W, H);

  ctx.strokeStyle = "#6bcb8f";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pp.x, pp.y);
  ctx.lineTo(pf.x, pf.y);
  ctx.stroke();
  ctx.strokeStyle = "#8fd4a8";
  ctx.beginPath();
  ctx.moveTo(pp.x, pp.y);
  ctx.lineTo(pl.x, pl.y);
  ctx.stroke();

  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef6";
  ctx.font = "11px sans-serif";
  ctx.fillText("親", pp.x + 12, pp.y - 8);

  // 親子線
  const cp = worldToScreen(childW, s.camera, W, H);
  ctx.strokeStyle = "rgba(91,159,212,0.7)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pp.x, pp.y);
  ctx.lineTo(cp.x, cp.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 子
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef6";
  ctx.fillText("子", cp.x + 10, cp.y + 4);

  // ピック点
  if (pickWorld) {
    const pk = worldToScreen(pickWorld, s.camera, W, H);
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef6";
    ctx.fillText("pick", pk.x + 10, pk.y - 6);
  }

  // 読み取り
  const pickLocal = pickWorld
    ? worldToLocal(pickWorld, s.parent)
    : null;
  if (readoutEl) {
    readoutEl.innerHTML = `
      <table class="coord-table">
        <thead><tr><th>空間</th><th>点</th><th>X</th><th>Y</th></tr></thead>
        <tbody>
          <tr><td>ローカル</td><td>子</td><td>${s.local.x.toFixed(3)}</td><td>${s.local.y.toFixed(3)}</td></tr>
          <tr><td>ワールド</td><td>親</td><td>${s.parent.x.toFixed(3)}</td><td>${s.parent.y.toFixed(3)}</td></tr>
          <tr><td>ワールド</td><td>子 = R·local + parent</td><td>${childW.x.toFixed(3)}</td><td>${childW.y.toFixed(3)}</td></tr>
          <tr><td>スクリーン</td><td>子</td><td>${cp.x.toFixed(1)} px</td><td>${cp.y.toFixed(1)} px</td></tr>
          ${
            pickWorld
              ? `<tr><td>ワールド</td><td>クリック</td><td>${pickWorld.x.toFixed(3)}</td><td>${pickWorld.y.toFixed(3)}</td></tr>
                 <tr><td>ローカル</td><td>クリック→親基準</td><td>${pickLocal.x.toFixed(3)}</td><td>${pickLocal.y.toFixed(3)}</td></tr>`
              : `<tr><td colspan="4">キャンバスをクリックして screen→world→local</td></tr>`
          }
        </tbody>
      </table>`;
  }

  setStatus(
    `親 θ=${s.parent.angleDeg.toFixed(0)}° · 子 world=(${childW.x.toFixed(2)}, ${childW.y.toFixed(2)}) · zoom=${s.camera.zoom}`
  );
}

function resetDefaults() {
  els.px.value = String(C.defaultParent.x);
  els.py.value = String(C.defaultParent.y);
  els.pang.value = String(C.defaultParent.angleDeg);
  els.lx.value = String(C.defaultLocal.x);
  els.ly.value = String(C.defaultLocal.y);
  els.camx.value = String(C.defaultCamera.x);
  els.camy.value = String(C.defaultCamera.y);
  els.zoom.value = String(C.defaultCamera.zoom);
  pickWorld = null;
  syncLabels();
  draw();
  setStatus("既定値にリセット");
}

for (const el of Object.values(els)) {
  el?.addEventListener("input", () => {
    syncLabels();
    draw();
  });
}

btnReset?.addEventListener("click", resetDefaults);

canvas?.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const sx = (e.clientX - rect.left) * scaleX;
  const sy = (e.clientY - rect.top) * scaleY;
  const s = readState();
  pickWorld = screenToWorld(sx, sy, s.camera, canvas.width, canvas.height);
  const loc = worldToLocal(pickWorld, s.parent);
  setStatus(
    `click screen=(${sx.toFixed(0)},${sy.toFixed(0)}) → world=(${pickWorld.x.toFixed(2)},${pickWorld.y.toFixed(2)}) → local=(${loc.x.toFixed(2)},${loc.y.toFixed(2)})`
  );
  draw();
});

loadTextSample(
  "../samples/CoordinatesExample.cs",
  csharpSample,
  "// samples/CoordinatesExample.cs を読み込めませんでした。"
);

syncLabels();
draw();
