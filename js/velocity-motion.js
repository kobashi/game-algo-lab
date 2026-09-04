/**
 * 速度による移動: p += v * dt
 */
import { VELOCITY_MOTION_CONFIG as C } from "./maps/velocity-motion-config.js";
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
  document.getElementById("vm-canvas")
);
const ctx = canvas.getContext("2d");
const vxEl = /** @type {HTMLInputElement} */ (document.getElementById("vx"));
const vyEl = /** @type {HTMLInputElement} */ (document.getElementById("vy"));
const dtEl = /** @type {HTMLInputElement} */ (document.getElementById("dt"));
const bounceEl = /** @type {HTMLInputElement} */ (
  document.getElementById("bounce")
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
const vxVal = document.getElementById("vx-val");
const vyVal = document.getElementById("vy-val");
const dtVal = document.getElementById("dt-val");
const speedVal = document.getElementById("speed-val");
const thickVal = document.getElementById("thick-val");
const readoutEl = document.getElementById("vm-readout");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const R = 12;
let x = 80;
let y = 140;
let trail = /** @type {{x:number,y:number}[]} */ ([]);
let ghostTrail = /** @type {{x:number,y:number}[]} */ ([]);
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let wallHits = 0;
let tunnelFlash = 0;

function readVx() {
  return Number(vxEl?.value) || 0;
}
function readVy() {
  return Number(vyEl?.value) || 0;
}
function readDtSec() {
  return (Number(dtEl?.value) || C.defaultDtMs) / 1000;
}
function readThick() {
  const n = Number(thickEl?.value);
  return Number.isFinite(n) ? n : 24;
}
function obstacleOn() {
  return !!obsEl?.checked;
}
function trailOn() {
  return trailEl ? !!trailEl.checked : true;
}

function currentBox() {
  return centerObstacleBox(canvas.width, canvas.height, readThick());
}

function sync() {
  if (vxVal) vxVal.textContent = String(readVx());
  if (vyVal) vyVal.textContent = String(readVy());
  if (dtVal) dtVal.textContent = (readDtSec() * 1000).toFixed(1);
  if (speedVal) speedVal.textContent = readSpeedScale(speedEl).toFixed(1);
  if (thickVal) thickVal.textContent = String(Math.round(readThick()));
  const step = Math.hypot(readVx() * readDtSec(), readVy() * readDtSec());
  if (readoutEl) {
    readoutEl.textContent = `1フレームの移動 |v|·dt = ${step.toFixed(1)} px  /  障害物の厚み = ${readThick()} px`;
  }
}

function maybeLoopReset() {
  if (!loopEl?.checked) return false;
  const out =
    x < -R || x > canvas.width + R || y < -R || y > canvas.height + R;
  if (out || wallHits >= 12) {
    resetBody(false);
    return true;
  }
  return false;
}

function resetBody(clearGhost) {
  if (ghostEl?.checked && trail.length) ghostTrail = trail.slice();
  else if (clearGhost) ghostTrail = [];
  x = 80;
  y = 140;
  trail = [];
  wallHits = 0;
  tunnelFlash = 0;
}

function step(dt) {
  const prevX = x;
  const prevY = y;
  x += readVx() * dt;
  y += readVy() * dt;
  const bounce = !!bounceEl?.checked;
  if (bounce) {
    if (x < R) {
      x = R;
      if (vxEl) vxEl.value = String(Math.abs(readVx()));
      wallHits += 1;
    }
    if (x > canvas.width - R) {
      x = canvas.width - R;
      if (vxEl) vxEl.value = String(-Math.abs(readVx()));
      wallHits += 1;
    }
    if (y < R) {
      y = R;
      if (vyEl) vyEl.value = String(Math.abs(readVy()));
      wallHits += 1;
    }
    if (y > canvas.height - R) {
      y = canvas.height - R;
      if (vyEl) vyEl.value = String(-Math.abs(readVy()));
      wallHits += 1;
    }
  }

  let tunneled = false;
  let hitObs = false;
  if (obstacleOn()) {
    const box = currentBox();
    tunneled = circleAabbTunneled(prevX, prevY, x, y, R, box);
    const resolved = resolveCircleAabbReflect(
      x,
      y,
      readVx(),
      readVy(),
      R,
      box,
      1
    );
    if (resolved.hit) {
      hitObs = true;
      x = resolved.x;
      y = resolved.y;
      if (vxEl) vxEl.value = String(Math.round(resolved.vx));
      if (vyEl) vyEl.value = String(Math.round(resolved.vy));
    }
    if (tunneled) tunnelFlash = 18;
  }

  sync();
  if (trailOn()) {
    trail.push({ x, y });
    if (trail.length > C.trailMax) trail.shift();
  }
  draw();

  if (tunneled) {
    setStatus(
      `すり抜けた — |v|·dt=${(Math.hypot(readVx(), readVy()) * dt).toFixed(1)}px が厚み ${readThick()}px を超えた`
    );
  } else if (hitObs) {
    setStatus(`障害物に当たって反射  p=(${x.toFixed(1)}, ${y.toFixed(1)})`);
  } else {
    setStatus(
      `p=(${x.toFixed(1)}, ${y.toFixed(1)})  v=(${readVx()}, ${readVy()})  dt=${(dt * 1000).toFixed(1)}ms`
    );
  }
  maybeLoopReset();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(90,106,128,0.4)";
  for (let g = 40; g < W; g += 40) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, H);
    ctx.stroke();
  }
  for (let g = 40; g < H; g += 40) {
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(W, g);
    ctx.stroke();
  }
  if (obstacleOn()) {
    const box = currentBox();
    ctx.fillStyle = tunnelFlash > 0 ? "#e07a5f" : "rgba(224,122,95,0.85)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = "#f2cc8f";
    ctx.font = "11px sans-serif";
    ctx.fillText("障害物", box.x, Math.max(14, box.y - 6));
  }
  if (ghostEl?.checked && ghostTrail.length) {
    drawTrailDots(ctx, ghostTrail, { rgb: "242,204,143", radius: 2 });
  }
  if (trailOn() && trail.length) {
    drawTrailDots(ctx, trail, { rgb: "91,159,212", radius: 2.2 });
  }
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + readVx() * 0.25, y + readVy() * 0.25);
  ctx.stroke();
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("p ← p + v·dt", 12, 18);
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
  step(readDtSec());
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
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
  step(readDtSec());
});
btnReset?.addEventListener("click", () => {
  stop();
  resetBody(true);
  draw();
  sync();
  setStatus("リセット");
});
for (const el of [vxEl, vyEl, dtEl, speedEl, thickEl]) {
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
  "../samples/VelocityMotionExample.cs",
  csharpSample,
  "// samples/VelocityMotionExample.cs"
);
if (vxEl) vxEl.value = String(C.defaultVx);
if (vyEl) vyEl.value = String(C.defaultVy);
if (dtEl) dtEl.value = String(C.defaultDtMs);
sync();
draw();

const urlSpec = {
  vx: { el: vxEl, kind: "range" },
  vy: { el: vyEl, kind: "range" },
  dt: { el: dtEl, kind: "range" },
  bounce: { el: bounceEl, kind: "checkbox" },
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
sync();
draw();
if (urlResult.warning) {
  setStatus(urlResult.warning);
} else if (!urlResult.applied.length) {
  setStatus("準備完了 — 再生または 1ステップ");
}
