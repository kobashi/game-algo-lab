/**
 * ECS 入門
 * @see docs/topics/ecs-intro/SPEC.md
 */
import { ECS_INTRO_CONFIG as C } from "./maps/ecs-intro-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const tableEl = document.getElementById("ecs-table");
const logEl = document.getElementById("ecs-log");
const archEl = document.getElementById("ecs-arch");
const btnSpawn = document.getElementById("btn-spawn");
const btnTick = document.getElementById("btn-tick");
const btnClear = document.getElementById("btn-clear");
const archSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("arch-select")
);
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   Transform?: { x: number, y: number },
 *   Velocity?: { vx: number, vy: number },
 *   Health?: { hp: number },
 *   Input?: boolean,
 *   AI?: boolean,
 * }} Entity
 */

/** @type {Entity[]} */
let entities = [];
let nextId = 1;
/** @type {string[]} */
let logs = [];

const ALL_COMPS = ["Transform", "Velocity", "Health", "Input", "AI"];

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 24) logs.pop();
  renderLog();
}

function spawn(archetypeName) {
  const arch = C.archetypes.find((a) => a.name === archetypeName) || C.archetypes[0];
  /** @type {Entity} */
  const e = { id: nextId++, name: arch.name };
  for (const c of arch.comps) {
    if (c === "Transform") e.Transform = { x: 40 + Math.random() * 200, y: 40 + Math.random() * 100 };
    if (c === "Velocity") e.Velocity = { vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40 };
    if (c === "Health") e.Health = { hp: 100 };
    if (c === "Input") e.Input = true;
    if (c === "AI") e.AI = true;
  }
  entities.push(e);
  pushLog(`Spawn Entity#${e.id} (${e.name}) · [${arch.comps.join(", ")}]`);
  renderTable();
  setStatus(`Entity#${e.id} 生成`);
}

/** MoveSystem: Transform + Velocity */
function runMoveSystem(dt) {
  let n = 0;
  for (const e of entities) {
    if (e.Transform && e.Velocity) {
      e.Transform.x += e.Velocity.vx * dt;
      e.Transform.y += e.Velocity.vy * dt;
      n += 1;
    }
  }
  pushLog(`MoveSystem · 処理 ${n} entities (Transform+Velocity)`);
}

/** DamageSystem demo: Health only */
function runHealthDecay() {
  let n = 0;
  for (const e of entities) {
    if (e.Health && e.AI) {
      e.Health.hp = Math.max(0, e.Health.hp - 1);
      n += 1;
    }
  }
  if (n) pushLog(`AiHealthTick · 処理 ${n} (Health+AI)`);
}

function tick() {
  runMoveSystem(0.5);
  runHealthDecay();
  renderTable();
  setStatus("Systems tick");
}

function renderTable() {
  if (!tableEl) return;
  if (!entities.length) {
    tableEl.innerHTML = '<p class="gl-log-empty">（Entity なし — 生成してください）</p>';
    return;
  }
  const head = `<tr><th>ID</th><th>名前</th>${ALL_COMPS.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const rows = entities
    .map((e) => {
      const cells = ALL_COMPS.map((c) => {
        if (c === "Transform" && e.Transform)
          return `<td class="ecs-yes">(${e.Transform.x.toFixed(0)},${e.Transform.y.toFixed(0)})</td>`;
        if (c === "Velocity" && e.Velocity)
          return `<td class="ecs-yes">(${e.Velocity.vx.toFixed(0)},${e.Velocity.vy.toFixed(0)})</td>`;
        if (c === "Health" && e.Health)
          return `<td class="ecs-yes">${e.Health.hp}</td>`;
        if (c === "Input" && e.Input) return `<td class="ecs-yes">✓</td>`;
        if (c === "AI" && e.AI) return `<td class="ecs-yes">✓</td>`;
        return `<td class="ecs-no">—</td>`;
      }).join("");
      return `<tr><td>${e.id}</td><td>${e.name}</td>${cells}</tr>`;
    })
    .join("");
  tableEl.innerHTML = `<table class="ecs-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function renderLog() {
  if (!logEl) return;
  logEl.innerHTML = logs.map((m) => `<div class="es-log">${m}</div>`).join("");
}

function renderArch() {
  if (!archEl) return;
  archEl.innerHTML = C.archetypes
    .map(
      (a) =>
        `<div class="ecs-arch-card"><strong>${a.name}</strong><br/><code>${a.comps.join(" + ")}</code></div>`
    )
    .join("");
  if (archSelect) {
    archSelect.innerHTML = C.archetypes
      .map((a) => `<option value="${a.name}">${a.name}</option>`)
      .join("");
  }
}

function clearAll() {
  entities = [];
  logs = [];
  nextId = 1;
  renderTable();
  renderLog();
  setStatus("クリア");
}

btnSpawn?.addEventListener("click", () => {
  spawn(archSelect?.value || "Player");
});
btnTick?.addEventListener("click", tick);
btnClear?.addEventListener("click", clearAll);

loadTextSample(
  "../samples/EcsIntroExample.cs",
  csharpSample,
  "// EcsIntroExample.cs"
);
renderArch();
spawn("Player");
spawn("Enemy");
spawn("Bullet");
spawn("Tree");
setStatus("準備完了 — System を Tick して処理対象を観察");
