/**
 * 2D フォローカメラ
 * 場面は計測（平面）・アクション・探索。追従の計算は共通。
 * ギミックは当たりの表示だけで、歩く速さは変えない。
 */
import { GFX_CAMERA_CONFIG as C } from "./maps/gfx-camera-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  readSpeedScale,
  bindSpeedScaleControl,
  drawTrailDots,
  mountGlossary,
  formatTenths,
  isFieldKeyTarget,
} from "./platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cam-canvas")
);
const ctx = canvas.getContext("2d");
const followEl = /** @type {HTMLInputElement} */ (
  document.getElementById("follow")
);
const deadEl = /** @type {HTMLInputElement} */ (
  document.getElementById("dead")
);
const followVal = document.getElementById("follow-val");
const deadVal = document.getElementById("dead-val");
const speedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("speed")
);
const speedVal = document.getElementById("speed-val");
const loopEl = /** @type {HTMLInputElement} */ (document.getElementById("loop"));
const trailEl = /** @type {HTMLInputElement} */ (
  document.getElementById("trail")
);
const sceneEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("scene")
);
const sceneNote = document.getElementById("scene-note");
const statsEl = document.getElementById("cam-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** 計測モードと同じ立ち位置。矩形の足はここから 8px 下 */
const GROUND_Y = C.worldH * 0.55;
const GRAVITY = 1400;
const JUMP_VY = -420;
const MEASURE_START = 200;
const ACTION_START = 96;
const EXPLORE_START = 360;

const SCENE_NOTE = {
  measure: "平面です。演習カードの遅れの数値は、この場面で歩いたときの値です。",
  action:
    "横に長いコースです。トゲとノコが先にあります。スペースでジャンプできます。触れても歩く速さは変わりません。",
  explore:
    "横に長い美術館です。絵の前でカメラが動くと「揺れ」、止まっていると「静止」と出ます。",
};

/** @type {{x:number,w:number}[]} */
const SPIKES = [
  { x: 640, w: 56 },
  { x: 1280, w: 70 },
  { x: 1960, w: 56 },
  { x: 2600, w: 84 },
  { x: 3180, w: 56 },
];
/** @type {{x:number,y:number}[]} */
const COINS = [
  { x: 560, y: 162 },
  { x: 980, y: 148 },
  { x: 1560, y: 158 },
  { x: 2140, y: 142 },
  { x: 2720, y: 160 },
  { x: 3240, y: 150 },
];
/** @type {{x:number,base:number,amp:number,speed:number}[]} */
const SAWS = [
  { x: 1040, base: 196, amp: 30, speed: 2.4 },
  { x: 2280, base: 184, amp: 36, speed: 1.8 },
];
/** @type {{x:number,title:string,sky:string,ground:string,mark:string}[]} */
const PAINTINGS = [
  { x: 480, title: "朝の道", sky: "#7ea0c4", ground: "#6b8f71", mark: "#f2cc8f" },
  { x: 980, title: "港", sky: "#5b7fa6", ground: "#3d4f66", mark: "#e8eef7" },
  { x: 1480, title: "森", sky: "#8faf72", ground: "#3e5a40", mark: "#f2cc8f" },
  { x: 1980, title: "塔", sky: "#c47a4a", ground: "#5a4638", mark: "#e8eef7" },
  { x: 2480, title: "静物", sky: "#6a4a5a", ground: "#3a3038", mark: "#e07a5f" },
  { x: 2980, title: "月", sky: "#2a3350", ground: "#1c2438", mark: "#e8eef7" },
  { x: 3480, title: "窓", sky: "#d8c4a4", ground: "#6b5a48", mark: "#5b9fd4" },
];

let playerX = MEASURE_START;
let playerY = GROUND_Y;
let vy = 0;
let camX = 0;
let camDelta = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();
/** @type {{x:number,y:number}[]} */
let trail = [];
let simT = 0;
let hits = 0;
let hitCool = 0;
let flash = 0;
let jumpLatch = false;
/** @type {Set<number>} */
const coins = new Set();

/**
 * World → screen: screen = world - cam
 * @returns {{ sx: number, sy: number }}
 */
export function worldToScreen(wx, wy, cam) {
  return { sx: wx - cam, sy: wy };
}

/**
 * Soft follow with dead zone on X.
 * @param {number} cam
 * @param {number} targetX player world x
 * @param {number} viewW
 * @param {number} dead
 * @param {number} follow 0..1 lerp factor
 * @param {number} [worldW]
 */
export function updateCamera(cam, targetX, viewW, dead, follow, worldW = C.worldW) {
  const screenX = targetX - cam;
  const mid = viewW / 2;
  let desired = cam;
  if (screenX < mid - dead) {
    desired = targetX - (mid - dead);
  } else if (screenX > mid + dead) {
    desired = targetX - (mid + dead);
  }
  const next = cam + (desired - cam) * follow;
  const maxCam = Math.max(0, worldW - viewW);
  return Math.max(0, Math.min(maxCam, next));
}

/**
 * 追従係数の読み取り。0 は 0 のまま扱う（`Number(v) || 既定` だと
 * 0 が既定値に化けてしまうため、数値かどうかで判定する）。
 */
function readFollow() {
  const n = Number(followEl?.value);
  return Number.isFinite(n) ? n : C.defaultFollow;
}

/**
 * デッドゾーンの読み取り。0 は 0 のまま扱う（同上）。
 * デッドゾーン 0 は updateCamera の除算に関わらないため、0 でも破綻しない。
 */
function readDead() {
  const n = Number(deadEl?.value);
  return Number.isFinite(n) ? n : C.defaultDead;
}

/** @returns {"measure" | "action" | "explore"} */
function sceneId() {
  const v = sceneEl?.value;
  if (v === "action" || v === "explore") return v;
  return "measure";
}

function worldWidth(id = sceneId()) {
  return id === "measure" ? C.worldW : C.stageWorldW;
}

function startX(id = sceneId()) {
  if (id === "action") return ACTION_START;
  if (id === "explore") return EXPLORE_START;
  return MEASURE_START;
}

function sceneLabel(id = sceneId()) {
  if (id === "action") return "アクション";
  if (id === "explore") return "探索";
  return "計測";
}

function lookaheadPx() {
  return Math.max(0, Math.round(canvas.width - (playerX - camX)));
}

function sync() {
  if (followVal) followVal.textContent = readFollow().toFixed(2);
  if (deadVal) deadVal.textContent = formatTenths(readDead());
  if (speedVal) speedVal.textContent = readSpeedScale(speedEl).toFixed(1);
  if (sceneNote) sceneNote.textContent = SCENE_NOTE[sceneId()];
}

function nearestPainting() {
  let best = null;
  let bestD = Infinity;
  for (const p of PAINTINGS) {
    const d = Math.abs(playerX - p.x);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best && bestD < 150 ? best : null;
}

function hurt() {
  if (hitCool > 0) return;
  hits += 1;
  hitCool = 40;
  flash = 10;
}

/** アクションのジャンプとギミック。X の速さには触らない。 */
function moveAction(dt) {
  simT += dt;
  if (hitCool > 0) hitCool -= 1;
  if (flash > 0) flash -= 1;
  const space = keys.has("Space");
  const onGround = playerY >= GROUND_Y - 0.5 && vy >= 0;
  if (space && !jumpLatch && onGround) vy = JUMP_VY;
  jumpLatch = space;
  vy += GRAVITY * dt;
  playerY += vy * dt;
  if (playerY >= GROUND_Y) {
    playerY = GROUND_Y;
    vy = 0;
  }
  const feet = playerY + 8;
  for (const sp of SPIKES) {
    if (playerX + 14 > sp.x && playerX - 14 < sp.x + sp.w && feet > 206) hurt();
  }
  for (const saw of SAWS) {
    const y = saw.base + Math.sin(simT * saw.speed) * saw.amp;
    const dx = playerX - saw.x;
    const dy = playerY - 10 - y;
    if (dx * dx + dy * dy < 30 * 30) hurt();
  }
  COINS.forEach((c, i) => {
    if (coins.has(i)) return;
    const bob = Math.sin(simT * 3 + i) * 3;
    const dx = playerX - c.x;
    const dy = playerY - 10 - (c.y + bob);
    if (dx * dx + dy * dy < 22 * 22) coins.add(i);
  });
}

function drawMeasure() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) {
    const wx = i * 100;
    const { sx } = worldToScreen(wx, 0, camX);
    ctx.fillStyle = i % 2 === 0 ? "rgba(61,79,102,0.5)" : "rgba(42,55,72,0.5)";
    ctx.fillRect(sx, H * 0.65, 90, H * 0.35);
    ctx.fillStyle = "#5a6a80";
    ctx.font = "11px sans-serif";
    ctx.fillText(`B${i}`, sx + 8, H * 0.72);
  }
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.7);
  ctx.lineTo(W, H * 0.7);
  ctx.stroke();
}

function drawAction() {
  const W = canvas.width;
  const H = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#142033");
  sky.addColorStop(0.45, "#3a4e68");
  sky.addColorStop(0.7, "#c47a4a");
  sky.addColorStop(1, "#1a120e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const hillShift = -((camX * 0.28) % 220);
  ctx.fillStyle = "#24384c";
  ctx.beginPath();
  ctx.moveTo(-40, 176);
  for (let x = hillShift - 440; x < W + 440; x += 220) {
    ctx.lineTo(x + 110, 100);
    ctx.lineTo(x + 220, 176);
  }
  ctx.lineTo(W + 40, 176);
  ctx.lineTo(W + 40, H);
  ctx.lineTo(-40, H);
  ctx.closePath();
  ctx.fill();

  const midShift = -((camX * 0.55) % 160);
  for (let i = -1; i < 8; i++) {
    const x = midShift + i * 160;
    ctx.fillStyle = i % 2 === 0 ? "#2c3e50" : "#33485c";
    ctx.fillRect(x, 128, 46, 100);
    ctx.fillStyle = "rgba(242,204,143,0.35)";
    ctx.fillRect(x + 10, 146, 10, 14);
    ctx.fillRect(x + 26, 146, 10, 14);
  }

  const ground = worldToScreen(0, 0, camX);
  ctx.fillStyle = "#2a211c";
  ctx.fillRect(ground.sx, 228, worldWidth("action"), H - 228);
  ctx.fillStyle = "#6b4a32";
  ctx.fillRect(ground.sx, 228, worldWidth("action"), 4);

  for (const sp of SPIKES) {
    const s = worldToScreen(sp.x, 0, camX);
    ctx.fillStyle = "#e07a5f";
    ctx.beginPath();
    const n = Math.max(1, Math.floor(sp.w / 14));
    for (let i = 0; i < n; i++) {
      const a = s.sx + i * 14;
      ctx.moveTo(a, 228);
      ctx.lineTo(a + 7, 206);
      ctx.lineTo(a + 14, 228);
    }
    ctx.fill();
  }

  for (const saw of SAWS) {
    const y = saw.base + Math.sin(simT * saw.speed) * saw.amp;
    const p = worldToScreen(saw.x, y, camX);
    const angle = simT * saw.speed * 3;
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.rotate(angle);
    ctx.fillStyle = "#c5ced8";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e8eef7";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  COINS.forEach((c, i) => {
    if (coins.has(i)) return;
    const bob = Math.sin(simT * 3 + i) * 3;
    const p = worldToScreen(c.x, c.y + bob, camX);
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a8843f";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  const flag = worldToScreen(worldWidth("action") - 80, 0, camX);
  ctx.fillStyle = "#e8eef7";
  ctx.fillRect(flag.sx, 160, 3, 68);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(flag.sx + 3, 160, 22, 14);
}

function drawPainting(p, ghostDx) {
  const s = worldToScreen(p.x, 0, camX);
  const x = s.sx - 70 + ghostDx;
  const y = 72;
  if (ghostDx) {
    ctx.strokeStyle = "rgba(242,204,143,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 140, 100);
    return;
  }
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x - 6, y - 6, 152, 112);
  ctx.fillStyle = p.sky;
  ctx.fillRect(x, y, 140, 62);
  ctx.fillStyle = p.ground;
  ctx.fillRect(x, y + 62, 140, 38);
  ctx.fillStyle = p.mark;
  ctx.beginPath();
  ctx.arc(x + 102, y + 26, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef7";
  ctx.font = "12px sans-serif";
  ctx.fillText(p.title, x, y + 124);
}

function drawExplore() {
  const W = canvas.width;
  const H = canvas.height;
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, "#2a241e");
  wall.addColorStop(0.62, "#3c342c");
  wall.addColorStop(1, "#1c1814");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  const floor = worldToScreen(0, 0, camX);
  ctx.fillStyle = "#3a3128";
  ctx.fillRect(floor.sx, 228, worldWidth("explore"), H - 228);
  ctx.fillStyle = "#6b5a48";
  ctx.fillRect(floor.sx, 228, worldWidth("explore"), 5);

  for (let x = 180; x < worldWidth("explore"); x += 520) {
    const s = worldToScreen(x, 0, camX);
    ctx.fillStyle = "#5a4a38";
    ctx.fillRect(s.sx - 2, 28, 4, 36);
    ctx.fillStyle = "rgba(242,204,143,0.16)";
    ctx.beginPath();
    ctx.arc(s.sx, 68, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(s.sx, 68, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < PAINTINGS.length - 1; i++) {
    const wx = (PAINTINGS[i].x + PAINTINGS[i + 1].x) / 2;
    const s = worldToScreen(wx, 0, camX);
    ctx.fillStyle = "#8a7b6a";
    ctx.beginPath();
    ctx.arc(s.sx, 150, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(s.sx - 8, 162, 16, 40);
    ctx.fillRect(s.sx - 16, 202, 32, 10);
  }

  const near = nearestPainting();
  const shaking = Math.abs(camDelta) > 0.35;
  for (const p of PAINTINGS) {
    if (shaking && near && near.x === p.x) drawPainting(p, camDelta);
    drawPainting(p, 0);
  }

  const door = worldToScreen(worldWidth("explore") - 70, 0, camX);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(door.sx, 140, 36, 88);
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.strokeRect(door.sx, 140, 36, 88);
  ctx.fillStyle = "#f2cc8f";
  ctx.font = "12px sans-serif";
  ctx.fillText("出口", door.sx + 4, 132);
}

function drawHud(line1, line2) {
  const H = canvas.height;
  ctx.fillStyle = "rgba(10,14,20,0.78)";
  ctx.fillRect(12, H - 58, 248, 46);
  ctx.fillStyle = "#e8eef7";
  ctx.font = "12px sans-serif";
  ctx.fillText(line1, 20, H - 38);
  ctx.fillText(line2, 20, H - 20);
}

function draw() {
  if (!ctx) return;
  const id = sceneId();
  const W = canvas.width;
  const H = canvas.height;
  if (id === "action") drawAction();
  else if (id === "explore") drawExplore();
  else drawMeasure();

  const dead = readDead();
  const mid = W / 2;
  ctx.fillStyle = "rgba(242,204,143,0.08)";
  ctx.fillRect(mid - dead, 0, dead * 2, H);
  ctx.strokeStyle = "rgba(242,204,143,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mid - dead, 0, dead * 2, H);

  const p = worldToScreen(playerX, playerY, camX);
  if (trailEl?.checked && trail.length) {
    drawTrailDots(ctx, trail, { rgb: "91,159,212", radius: 2 });
  }
  ctx.fillStyle = flash > 0 && id === "action" ? "#e07a5f" : "#5b9fd4";
  ctx.fillRect(p.sx - 14, p.sy - 28, 28, 36);
  ctx.fillStyle = "#e8eef7";
  ctx.font = "12px sans-serif";
  ctx.fillText("P", p.sx - 4, p.sy - 34);
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 8, H * 0.2);
  ctx.lineTo(W / 2 + 8, H * 0.2);
  ctx.moveTo(W / 2, H * 0.2 - 8);
  ctx.lineTo(W / 2, H * 0.2 + 8);
  ctx.stroke();
  ctx.fillStyle = "#f2cc8f";
  ctx.fillText("cam", W / 2 + 10, H * 0.2 + 4);
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(p.sx, 28, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText("target", p.sx + 8, 32);

  const worldW = worldWidth(id);
  const mmW = 160;
  const mmH = 36;
  const mmX = W - mmW - 12;
  const mmY = 12;
  ctx.fillStyle = "rgba(26,35,50,0.9)";
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = "#5a6a80";
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);
  const scale = mmW / worldW;
  ctx.fillStyle = "rgba(91,159,212,0.35)";
  ctx.fillRect(mmX + camX * scale, mmY + 4, W * scale, mmH - 8);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(mmX + playerX * scale - 2, mmY + mmH / 2 - 4, 4, 8);

  if (id === "action") {
    drawHud(`被弾 ${hits}    コイン ${coins.size}/${COINS.length}`, `先に見えている幅 ${lookaheadPx()} px`);
  } else if (id === "explore") {
    const near = nearestPainting();
    const state = Math.abs(camDelta) > 0.35 ? "揺れ" : "静止";
    drawHud(
      near ? `絵「${near.title}」 ${state}` : "絵に近づくと反応します",
      `先に見えている幅 ${lookaheadPx()} px`
    );
  }

  if (statsEl) {
    const ahead =
      id === "measure"
        ? ""
        : `<tr><td>先に見えている幅</td><td>${lookaheadPx()} px</td></tr>`;
    const extra =
      id === "action"
        ? `<tr><td>被弾</td><td>${hits}</td></tr><tr><td>コイン</td><td>${coins.size} / ${COINS.length}</td></tr>`
        : id === "explore"
          ? `<tr><td>近い絵</td><td>${(() => {
              const near = nearestPainting();
              if (!near) return "—";
              return `${near.title} · ${Math.abs(camDelta) > 0.35 ? "揺れ" : "静止"}`;
            })()}</td></tr>`
          : "";
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>Player world</td><td>${playerX.toFixed(0)}, ${playerY.toFixed(0)}</td></tr>
        <tr><td>Player screen</td><td>${p.sx.toFixed(0)}, ${p.sy.toFixed(0)}</td></tr>
        <tr><td>Camera X</td><td>${camX.toFixed(0)}</td></tr>
        <tr><td>Dead zone</td><td>±${formatTenths(dead)} px</td></tr>
        <tr><td>遅れ (P−cam中心)</td><td>${(p.sx - W / 2).toFixed(0)} px</td></tr>
        ${extra}
        ${ahead}
      </table>`;
  }
}

function step(dt) {
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  const id = sceneId();
  const worldW = worldWidth(id);
  playerX += dx * C.playerSpeed * dt;
  playerX = Math.max(20, Math.min(worldW - 20, playerX));
  if (id === "action") moveAction(dt);
  else jumpLatch = keys.has("Space");
  const follow = readFollow();
  const dead = readDead();
  const prevCam = camX;
  camX = updateCamera(camX, playerX, canvas.width, dead, follow, worldW);
  camDelta = camX - prevCam;
  const p = worldToScreen(playerX, playerY, camX);
  if (trailEl?.checked) {
    trail.push({ x: p.sx, y: p.sy });
    if (trail.length > 80) trail.shift();
  }
  if (loopEl?.checked && playerX >= worldW - 24) {
    playerX = startX(id);
    playerY = GROUND_Y;
    vy = 0;
    camX = 0;
    camDelta = 0;
    trail = [];
  }
  draw();
  setStatus(
    `${sceneLabel(id)} cam=${camX.toFixed(0)} p.screen=${(playerX - camX).toFixed(0)} 遅れ=${(p.sx - canvas.width / 2).toFixed(0)}px`
  );
}

/**
 * 追従係数は「1 歩で差の何割を詰めるか」なので、1 歩の長さが変わると結果も変わる。
 * そこで 1 歩を 1/60 秒に固定し、実時間 × 再生速度が 1/60 秒たまるごとに 1 歩進める。
 * （以前は実経過 × 再生速度を 1 歩にしていたので、スロー再生や 120 Hz の画面では遅れが小さく出ていた）
 */
const STEP_SEC = 1 / 60;
let stepAcc = 0;
function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  const wall = Math.min(0.1, (ts - lastTs) / 1000);
  lastTs = ts;
  stepAcc += wall * readSpeedScale(speedEl);
  let n = 0;
  while (stepAcc >= STEP_SEC && n < 4) {
    step(STEP_SEC);
    stepAcc -= STEP_SEC;
    n += 1;
  }
  if (n >= 4) stepAcc = 0;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function resetPose() {
  playerX = startX();
  playerY = GROUND_Y;
  vy = 0;
  camX = 0;
  camDelta = 0;
  trail = [];
  simT = 0;
  hits = 0;
  hitCool = 0;
  flash = 0;
  coins.clear();
}

function reset() {
  stop();
  resetPose();
  sync();
  draw();
  setStatus(`リセット — ${sceneLabel()}。← → で移動`);
}

window.addEventListener("keydown", (e) => {
  if (isFieldKeyTarget(e)) return;
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  } else if (e.code === "Space" && sceneId() === "action") {
    e.preventDefault();
    keys.add("Space");
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
sceneEl?.addEventListener("change", reset);
bindSpeedScaleControl(speedEl, speedVal);
for (const el of [followEl, deadEl, speedEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}

loadTextSample(
  "../samples/GfxCameraExample.cs",
  csharpSample,
  "// GfxCameraExample.cs"
);
if (followEl) followEl.value = String(C.defaultFollow);
if (deadEl) deadEl.value = String(C.defaultDead);
reset();

const urlSpec = {
  follow: { el: followEl, kind: "range" },
  dead: { el: deadEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
  loop: { el: loopEl, kind: "checkbox" },
  trail: { el: trailEl, kind: "checkbox" },
  scene: { el: sceneEl, kind: "select" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
sync();
draw();
if (urlResult.warning) setStatus(urlResult.warning);
