/**
 * コヨーテタイム — 崖際ジャンプの猶予
 * @see docs/topics/coyote-time/SPEC.md
 */
import { COYOTE_TIME_CONFIG as C } from "./maps/coyote-time-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ct-canvas")
);
const ctx = canvas.getContext("2d");
const coyoteOnEl = /** @type {HTMLInputElement} */ (
  document.getElementById("coyote-on")
);
const coyoteMsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("coyote-ms")
);
const coyoteMsVal = document.getElementById("coyote-ms-val");
const statsEl = document.getElementById("ct-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const keys = new Set();
let px = 80;
let py = C.groundY - C.playerH;
let vx = 0;
let vy = 0;
let grounded = true;
let coyoteLeft = 0;
let jumpOkCount = 0;
let jumpFailCount = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let jumpEdge = false;

function readCoyoteSec() {
  const ms = Math.min(
    C.maxCoyoteMs,
    Math.max(C.minCoyoteMs, Number(coyoteMsEl?.value) || C.defaultCoyoteMs)
  );
  if (coyoteMsVal) coyoteMsVal.textContent = String(ms);
  return ms / 1000;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolvePlatforms() {
  grounded = false;
  for (const p of C.platforms) {
    if (!rectsOverlap(px, py, C.playerW, C.playerH, p.x, p.y, p.w, p.h)) {
      continue;
    }
    // land from above
    if (vy >= 0 && py + C.playerH - vy * 0.02 <= p.y + 4) {
      py = p.y - C.playerH;
      vy = 0;
      grounded = true;
    }
  }
  // floor clamp
  if (py + C.playerH > canvas.height) {
    py = canvas.height - C.playerH;
    vy = 0;
    grounded = true;
  }
  if (px < 0) px = 0;
  if (px + C.playerW > canvas.width) px = canvas.width - C.playerW;
}

function tryJump() {
  const use = !!coyoteOnEl?.checked;
  const ok = grounded || (use && coyoteLeft > 0);
  if (!ok) {
    jumpFailCount += 1;
    setStatus("ジャンプ失敗（接地でもコヨーテでもない）");
    return;
  }
  vy = C.jumpVy;
  grounded = false;
  coyoteLeft = 0;
  jumpOkCount += 1;
  setStatus(use && !grounded ? "コヨーテ猶予でジャンプ成功" : "接地ジャンプ成功");
}

function step(dt) {
  // horizontal
  vx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) vx -= C.moveSpeed;
  if (keys.has("ArrowRight") || keys.has("KeyD")) vx += C.moveSpeed;

  if (jumpEdge) {
    tryJump();
    jumpEdge = false;
  }

  vy += C.gravity * dt;
  px += vx * dt;
  py += vy * dt;
  resolvePlatforms();

  if (grounded) coyoteLeft = readCoyoteSec();
  else coyoteLeft = Math.max(0, coyoteLeft - dt);

  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // coyote aura when active in air
  if (!grounded && coyoteLeft > 0 && coyoteOnEl?.checked) {
    ctx.fillStyle = "rgba(242, 204, 143, 0.15)";
    ctx.fillRect(px - 6, py - 6, C.playerW + 12, C.playerH + 12);
  }

  ctx.fillStyle = "#3d4f66";
  for (const p of C.platforms) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  ctx.fillStyle = grounded ? "#6bcb8f" : "#5b9fd4";
  ctx.fillRect(px, py, C.playerW, C.playerH);

  // coyote bar
  const maxC = readCoyoteSec() || 0.001;
  const ratio = Math.min(1, coyoteLeft / maxC);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(12, 12, 160, 12);
  ctx.fillStyle = ratio > 0 ? "#f2cc8f" : "#5a6a80";
  ctx.fillRect(12, 12, 160 * ratio, 12);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `coyote ${(coyoteLeft * 1000).toFixed(0)} ms ${coyoteOnEl?.checked ? "ON" : "OFF"}`,
    12,
    40
  );
  ctx.fillText("←→ 移動 · Space ジャンプ", 12, H - 12);
}

function renderStats() {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>接地</td><td>${grounded ? "yes" : "no"}</td></tr>
      <tr><td>コヨーテ残</td><td>${(coyoteLeft * 1000).toFixed(0)} ms</td></tr>
      <tr><td>ジャンプ成功</td><td>${jumpOkCount}</td></tr>
      <tr><td>ジャンプ失敗</td><td>${jumpFailCount}</td></tr>
    </table>`;
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
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
  px = 80;
  py = C.groundY - C.playerH;
  vx = 0;
  vy = 0;
  grounded = true;
  coyoteLeft = readCoyoteSec();
  jumpOkCount = 0;
  jumpFailCount = 0;
  jumpEdge = false;
  draw();
  renderStats();
  setStatus("リセット — 崖から落ちながら Space を試す");
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
  }
  if (!keys.has(e.code) && e.code === "Space") jumpEdge = true;
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  canvas?.focus();
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);
coyoteMsEl?.addEventListener("input", () => readCoyoteSec());
coyoteOnEl?.addEventListener("change", () => {
  setStatus(coyoteOnEl.checked ? "コヨーテ ON" : "コヨーテ OFF（接地のみ）");
});

loadTextSample(
  "../samples/CoyoteTimeExample.cs",
  csharpSample,
  "// CoyoteTimeExample.cs"
);

const urlSpec = {
  coyote: { el: coyoteOnEl, kind: "checkbox" },
  ms: { el: coyoteMsEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
reset();
if (urlResult.warning) setStatus(urlResult.warning);
