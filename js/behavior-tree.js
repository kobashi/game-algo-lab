/**
 * ビヘイビアツリー
 * @see docs/topics/behavior-tree/SPEC.md
 */
import { BEHAVIOR_TREE_CONFIG as C } from "./maps/behavior-tree-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bt-canvas")
);
const ctx = canvas.getContext("2d");
const treeEl = document.getElementById("bt-tree");
const statsEl = document.getElementById("bt-stats");
const btnPlay = document.getElementById("btn-play");
const btnTick = document.getElementById("btn-tick");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {'Success'|'Failure'|'Running'} Status */

let agent = { x: 100, y: 100 };
let player = { x: 320, y: 180 };
let patrolIndex = 0;
/** @type {Record<string, Status>} */
let lastStatus = {};
let lastAction = "—";
let canSee = false;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();

/**
 * @param {string} id
 * @param {Status} st
 */
function setSt(id, st) {
  lastStatus[id] = st;
  return st;
}

function dist() {
  return Math.hypot(player.x - agent.x, player.y - agent.y);
}

function tickTree() {
  canSee = dist() <= C.seeRange;
  // Root Selector: [Sequence(CanSee, Chase), Patrol]
  // Sequence CanSee+Chase
  const see = setSt("cond-see", canSee ? "Success" : "Failure");
  let chase = /** @type {Status} */ ("Failure");
  if (see === "Success") {
    // move toward player
    const d = dist() || 1;
    const step = C.agentSpeed / 60;
    agent.x += ((player.x - agent.x) / d) * step * 3;
    agent.y += ((player.y - agent.y) / d) * step * 3;
    lastAction = "Chase";
    chase = setSt("act-chase", d < 18 ? "Success" : "Running");
  } else {
    setSt("act-chase", "Failure");
  }
  const seq = setSt(
    "seq-chase",
    see === "Failure" ? "Failure" : chase === "Failure" ? "Failure" : chase
  );

  let patrol = /** @type {Status} */ ("Failure");
  if (seq === "Failure") {
    const goal = C.patrolPoints[patrolIndex];
    const dx = goal.x - agent.x;
    const dy = goal.y - agent.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = C.agentSpeed / 60 * 3;
    if (d < 12) {
      patrolIndex = (patrolIndex + 1) % C.patrolPoints.length;
      lastAction = "Patrol(到達)";
      patrol = setSt("act-patrol", "Success");
    } else {
      agent.x += (dx / d) * step;
      agent.y += (dy / d) * step;
      lastAction = "Patrol";
      patrol = setSt("act-patrol", "Running");
    }
  } else {
    setSt("act-patrol", "Failure");
  }
  const root = setSt(
    "root",
    seq === "Failure" ? patrol : seq
  );
  renderTree();
  draw();
  renderStats();
  setStatus(`Tick · ${lastAction} · root=${root}`);
  return root;
}

function renderTree() {
  if (!treeEl) return;
  const color = (id) => {
    const s = lastStatus[id];
    if (s === "Success") return "bt-ok";
    if (s === "Failure") return "bt-fail";
    if (s === "Running") return "bt-run";
    return "";
  };
  const badge = (id) => lastStatus[id] || "—";
  treeEl.innerHTML = `
    <ul class="bt-ul">
      <li class="bt-node ${color("root")}"><strong>Selector</strong> <span class="bt-st">${badge("root")}</span>
        <ul class="bt-ul">
          <li class="bt-node ${color("seq-chase")}"><strong>Sequence</strong> <span class="bt-st">${badge("seq-chase")}</span>
            <ul class="bt-ul">
              <li class="bt-node ${color("cond-see")}">Condition: CanSeePlayer <span class="bt-st">${badge("cond-see")}</span></li>
              <li class="bt-node ${color("act-chase")}">Action: Chase <span class="bt-st">${badge("act-chase")}</span></li>
            </ul>
          </li>
          <li class="bt-node ${color("act-patrol")}">Action: Patrol <span class="bt-st">${badge("act-patrol")}</span></li>
        </ul>
      </li>
    </ul>`;
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // see range
  ctx.strokeStyle = canSee
    ? "rgba(224, 122, 95, 0.5)"
    : "rgba(90, 106, 128, 0.45)";
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, C.seeRange, 0, Math.PI * 2);
  ctx.stroke();

  // patrol path
  ctx.strokeStyle = "rgba(107, 203, 143, 0.35)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const pts = C.patrolPoints;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(pts[0].x, pts[0].y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < pts.length; i++) {
    ctx.fillStyle = i === patrolIndex ? "#6bcb8f" : "#3d4f66";
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // player
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
  ctx.fill();
  // agent
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("青=NPC · 赤=プレイヤー（WASD）· 円=視界", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>CanSee</td><td>${canSee ? "yes" : "no"}</td></tr>
        <tr><td>距離</td><td>${dist().toFixed(0)}</td></tr>
        <tr><td>行動</td><td>${lastAction}</td></tr>
        <tr><td>巡回点</td><td>${patrolIndex}</td></tr>
      </table>`;
  }
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    player.x += (dx / len) * C.playerSpeed * dt;
    player.y += (dy / len) * C.playerSpeed * dt;
    player.x = Math.max(10, Math.min(canvas.width - 10, player.x));
    player.y = Math.max(10, Math.min(canvas.height - 10, player.y));
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  movePlayer(dt);
  tickTree();
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "連続 Tick";
}

function reset() {
  stop();
  agent = { x: 100, y: 100 };
  player = { x: 320, y: 180 };
  patrolIndex = 0;
  lastStatus = {};
  lastAction = "—";
  canSee = false;
  renderTree();
  draw();
  renderStats();
  setStatus("リセット — 1 Tick または連続 · WASD でプレイヤー");
}

window.addEventListener("keydown", (e) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
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
  if (btnPlay) btnPlay.textContent = "停止";
  rafId = requestAnimationFrame(loop);
});
btnTick?.addEventListener("click", () => {
  stop();
  tickTree();
});
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/BehaviorTreeExample.cs",
  csharpSample,
  "// BehaviorTreeExample.cs"
);
reset();
