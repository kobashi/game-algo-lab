/**
 * Leader Following
 * @see docs/topics/steering-leader/SPEC.md
 */
import { STEERING_LEADER_CONFIG as C } from "./maps/steering-leader-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("lf-canvas")
);
const ctx = canvas.getContext("2d");
const distEl = /** @type {HTMLInputElement} */ (
  document.getElementById("follow-dist")
);
const distVal = document.getElementById("dist-val");
const autoEl = /** @type {HTMLInputElement} */ (
  document.getElementById("auto-leader")
);
const statsEl = document.getElementById("lf-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const keys = new Set();
let leader = { x: 200, y: 180, vx: 60, vy: 0 };
/** @type {{ x: number, y: number, vx: number, vy: number }[]} */
let followers = [];
/** @type {{ x: number, y: number }[]} */
let followPts = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let wanderT = 0;

function readDist() {
  const d = Number(distEl?.value) || C.followDistance;
  if (distVal) distVal.textContent = String(d);
  return d;
}

function clampMag(x, y, max) {
  const m = Math.hypot(x, y);
  if (m > max && m > 1e-9) return { x: (x / m) * max, y: (y / m) * max };
  return { x, y };
}

function arrive(px, py, vx, vy, tx, ty) {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.hypot(dx, dy) || 1;
  let speed = C.maxSpeed;
  if (dist < C.arriveRadius) speed = C.maxSpeed * (dist / C.arriveRadius);
  const dsx = (dx / dist) * speed;
  const dsy = (dy / dist) * speed;
  return clampMag(dsx - vx, dsy - vy, C.maxForce);
}

function spawnFollowers() {
  followers = [];
  for (let i = 0; i < C.followerCount; i++) {
    followers.push({
      x: leader.x - 40 - i * 30,
      y: leader.y + (i % 2 === 0 ? -10 : 10),
      vx: 0,
      vy: 0,
    });
  }
}

function step(dt) {
  // leader control
  if (autoEl?.checked) {
    wanderT += dt;
    const ang = Math.sin(wanderT * 0.7) * 0.9;
    leader.vx = Math.cos(ang) * C.leaderSpeed;
    leader.vy = Math.sin(ang) * C.leaderSpeed * 0.6;
  } else {
    let ix = 0;
    let iy = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) ix -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) ix += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) iy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) iy += 1;
    if (ix || iy) {
      const len = Math.hypot(ix, iy) || 1;
      leader.vx = (ix / len) * C.leaderSpeed;
      leader.vy = (iy / len) * C.leaderSpeed;
    } else {
      leader.vx *= Math.exp(-3 * dt);
      leader.vy *= Math.exp(-3 * dt);
    }
  }
  leader.x += leader.vx * dt;
  leader.y += leader.vy * dt;
  if (leader.x < 20) leader.x = 20;
  if (leader.x > canvas.width - 20) leader.x = canvas.width - 20;
  if (leader.y < 20) leader.y = 20;
  if (leader.y > canvas.height - 20) leader.y = canvas.height - 20;

  const spd = Math.hypot(leader.vx, leader.vy) || 1;
  const hx = leader.vx / spd;
  const hy = leader.vy / spd;
  const baseDist = readDist();
  followPts = [];
  for (let i = 0; i < followers.length; i++) {
    const f = followers[i];
    const slot = baseDist * (i + 1);
    const tx = leader.x - hx * slot;
    const ty = leader.y - hy * slot;
    followPts.push({ x: tx, y: ty });
    const force = arrive(f.x, f.y, f.vx, f.vy, tx, ty);
    f.vx += force.x * dt;
    f.vy += force.y * dt;
    const cl = clampMag(f.vx, f.vy, C.maxSpeed);
    f.vx = cl.x;
    f.vy = cl.y;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
  }
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // follow points
  ctx.fillStyle = "rgba(242, 204, 143, 0.7)";
  for (const p of followPts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // links
  ctx.strokeStyle = "rgba(154, 171, 191, 0.35)";
  ctx.beginPath();
  ctx.moveTo(leader.x, leader.y);
  for (const f of followers) ctx.lineTo(f.x, f.y);
  ctx.stroke();

  for (const f of followers) {
    ctx.fillStyle = "#5b9fd4";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(leader.x, leader.y, 12, 0, Math.PI * 2);
  ctx.fill();
  // leader velocity
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leader.x, leader.y);
  ctx.lineTo(leader.x + leader.vx * 0.25, leader.y + leader.vy * 0.25);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("赤=Leader · 青=Follower · 黄点=追従スロット", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>フォロワー</td><td>${followers.length}</td></tr>
        <tr><td>間隔</td><td>${readDist()}</td></tr>
        <tr><td>Leader |v|</td><td>${Math.hypot(leader.vx, leader.vy).toFixed(0)}</td></tr>
        <tr><td>操作</td><td>${autoEl?.checked ? "自動" : "WASD"}</td></tr>
      </table>`;
  }
  setStatus(autoEl?.checked ? "自動リーダー" : "手動リーダー");
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
  leader = { x: 200, y: 180, vx: 60, vy: 0 };
  wanderT = 0;
  if (distEl) distEl.value = String(C.followDistance);
  readDist();
  spawnFollowers();
  draw();
  renderStats();
  setStatus("リセット");
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

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
distEl?.addEventListener("input", () => readDist());

loadTextSample(
  "../samples/SteeringLeaderExample.cs",
  csharpSample,
  "// SteeringLeaderExample.cs"
);
reset();
