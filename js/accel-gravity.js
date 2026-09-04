/**
 * 加速度と重力: v += a*dt; p += v*dt
 * @see docs/topics/accel-gravity/SPEC.md
 */
import { ACCEL_GRAVITY_CONFIG as C } from "./maps/accel-gravity-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  readSpeedScale,
  drawTrailDots,
  resolveCircleAabbReflect,
  circleAabbTunneled,
  centerObstacleBox,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ag-canvas")
);
const ctx = canvas.getContext("2d");
const gEl = /** @type {HTMLInputElement} */ (document.getElementById("g"));
const vxEl = /** @type {HTMLInputElement} */ (document.getElementById("vx"));
const restEl = /** @type {HTMLInputElement} */ (
  document.getElementById("restitution")
);
const speedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("speed")
);
const loopEl = /** @type {HTMLInputElement} */ (document.getElementById("loop"));
const trailEl = /** @type {HTMLInputElement} */ (
  document.getElementById("trail")
);
const ghostEl = /** @type {HTMLInputElement} */ (
  document.getElementById("ghost")
);
const obsEl = /** @type {HTMLInputElement} */ (document.getElementById("obs"));
const thickEl = /** @type {HTMLInputElement} */ (
  document.getElementById("thick")
);
const gVal = document.getElementById("g-val");
const vxVal = document.getElementById("vx-val");
const restVal = document.getElementById("rest-val");
const speedVal = document.getElementById("speed-val");
const thickVal = document.getElementById("thick-val");
const readoutEl = document.getElementById("ag-readout");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const R = 12;
let x = 60;
let y = 40;
let vx = C.defaultVx;
let vy = 0;
let trail = /** @type {{x:number,y:number}[]} */ ([]);
let ghostTrail = /** @type {{x:number,y:number}[]} */ ([]);
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let bounceCount = 0;
/** @type {number[]} 床からの高さ px */
let peaks = [];
let apexY = 40;
let goingUp = false;
let tunnelFlash = 0;
let stopped = false;

function readG() {
  return Number(gEl?.value) || 0;
}
function readVx() {
  return Number(vxEl?.value) || 0;
}
function readRest() {
  return Number(restEl?.value) || 0;
}
function readThick() {
  const n = Number(thickEl?.value);
  return Number.isFinite(n) ? n : 24;
}
function floorY() {
  return canvas.height - R - 8;
}

function sync() {
  if (gVal) gVal.textContent = String(readG());
  if (vxVal) vxVal.textContent = String(readVx());
  if (restVal) restVal.textContent = readRest().toFixed(2);
  if (speedVal) speedVal.textContent = readSpeedScale(speedEl).toFixed(1);
  if (thickVal) thickVal.textContent = String(Math.round(readThick()));
  const peakStr = peaks.length
    ? peaks.map((h) => h.toFixed(0)).join(" → ")
    : "—";
  if (readoutEl) {
    readoutEl.textContent = `跳ね返り ${bounceCount} 回  /  最高到達点(床からpx) ${peakStr}`;
  }
}

function resetBody(clearGhost) {
  if (ghostEl?.checked && trail.length) ghostTrail = trail.slice();
  else if (clearGhost) ghostTrail = [];
  x = 60;
  y = 40;
  vx = readVx();
  vy = 0;
  trail = [];
  bounceCount = 0;
  peaks = [];
  apexY = 40;
  goingUp = false;
  tunnelFlash = 0;
  stopped = false;
}

function step(dt) {
  const prevX = x;
  const prevY = y;
  const g = readG();
  vx = readVx();
  vy += g * dt;
  x += vx * dt;
  y += vy * dt;

  const floor = floorY();
  if (y > floor) {
    y = floor;
    const e = readRest();
    vy = -vy * e;
    bounceCount += 1;
    if (Math.abs(vy) < 20) {
      vy = 0;
      stopped = true;
    } else {
      goingUp = true;
      apexY = y;
    }
  }
  if (goingUp) {
    if (y < apexY) apexY = y;
    if (vy >= 0) {
      goingUp = false;
      peaks.push(Math.max(0, floor - apexY));
    }
  }

  if (x < R) {
    x = R;
    if (vxEl) vxEl.value = String(Math.abs(readVx()));
  }
  if (x > canvas.width - R) {
    x = canvas.width - R;
    if (vxEl) vxEl.value = String(-Math.abs(readVx()));
  }

  let tunneled = false;
  if (obsEl?.checked) {
    const box = centerObstacleBox(canvas.width, canvas.height, readThick());
    tunneled = circleAabbTunneled(prevX, prevY, x, y, R, box);
    const resolved = resolveCircleAabbReflect(
      x,
      y,
      vx,
      vy,
      R,
      box,
      readRest()
    );
    if (resolved.hit) {
      x = resolved.x;
      y = resolved.y;
      vx = resolved.vx;
      vy = resolved.vy;
      if (vxEl) vxEl.value = String(Math.round(vx));
    }
    if (tunneled) tunnelFlash = 18;
  }

  sync();
  if (trailEl?.checked) {
    trail.push({ x, y });
    if (trail.length > C.trailMax) trail.shift();
  }
  draw();
  if (tunneled) {
    setStatus(`すり抜けた — 1フレームの移動が厚み ${readThick()}px を超えた`);
  } else {
    setStatus(
      `p=(${x.toFixed(0)},${y.toFixed(0)}) v=(${vx.toFixed(0)},${vy.toFixed(0)}) 跳ね=${bounceCount}`
    );
  }
  if (stopped && loopEl?.checked) {
    resetBody(false);
    draw();
    sync();
  }
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, H - 8, W, 8);
  if (obsEl?.checked) {
    const box = centerObstacleBox(W, H, readThick());
    ctx.fillStyle = tunnelFlash > 0 ? "#e07a5f" : "rgba(224,122,95,0.85)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  if (ghostEl?.checked && ghostTrail.length) {
    drawTrailDots(ctx, ghostTrail, { rgb: "167,139,250", radius: 2 });
  }
  if (trailEl?.checked && trail.length) {
    drawTrailDots(ctx, trail, { rgb: "242,204,143", radius: 2.2 });
  }
  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + vx * 0.12, y + vy * 0.12);
  ctx.stroke();
  ctx.strokeStyle = "#e07a5f";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + Math.min(40, readG() * 0.04));
  ctx.stroke();
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("v ← v + g·dt   p ← p + v·dt", 12, 18);
  if (tunnelFlash > 0) tunnelFlash -= 1;
}

function loop(ts) {
  if (!running) return;
  const scale = readSpeedScale(speedEl);
  if (!lastTs) lastTs = ts;
  const elapsed = (ts - lastTs) / 1000;
  const interval = 1 / 60 / scale;
  if (elapsed < interval) {
    rafId = requestAnimationFrame(loop);
    return;
  }
  lastTs = ts;
  let dt = elapsed;
  if (dt > 0.2) dt = 0.2;
  step(dt);
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  resetBody(true);
  sync();
  draw();
  setStatus("リセット — 再生で放物線");
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnStep?.addEventListener("click", () => {
  stop();
  step(C.defaultDtMs / 1000);
});
btnReset?.addEventListener("click", reset);
for (const el of [gEl, vxEl, restEl, speedEl, thickEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}
obsEl?.addEventListener("change", () => {
  draw();
  sync();
});
trailEl?.addEventListener("change", draw);
ghostEl?.addEventListener("change", draw);

loadTextSample(
  "../samples/AccelGravityExample.cs",
  csharpSample,
  "// AccelGravityExample.cs"
);

const urlSpec = {
  g: { el: gEl, kind: "range" },
  vx: { el: vxEl, kind: "range" },
  rest: { el: restEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
  loop: { el: loopEl, kind: "checkbox" },
  trail: { el: trailEl, kind: "checkbox" },
  ghost: { el: ghostEl, kind: "checkbox" },
  obs: { el: obsEl, kind: "checkbox" },
  thick: { el: thickEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
resetBody(true);
sync();
draw();
if (urlResult.warning) setStatus(urlResult.warning);
else setStatus("準備完了 — 再生で放物線");
