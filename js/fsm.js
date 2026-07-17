/**
 * ステートマシンデモ（説明特化 UI）
 * - SVG 状態図、イベントボタン、遷移表、履歴
 * - 経路探索マップは使わない
 */
import { FSM_CONFIG, transitionKey } from "./maps/fsm-config.js";

const svg = document.getElementById("fsm-svg");
const eventButtons = document.getElementById("event-buttons");
const statusEl = document.getElementById("status");
const storyEl = document.getElementById("fsm-story");
const actorState = document.getElementById("actor-state");
const actorBlurb = document.getElementById("actor-blurb");
const actorFigure = document.getElementById("actor-figure");
const historyEl = document.getElementById("history");
const tableEl = document.getElementById("trans-table");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const csharpSample = document.getElementById("csharp-sample");

const R = 36;

let current = FSM_CONFIG.initial;
/** @type {string[]} */
let history = [current];
/** 最後に発火したイベント / 遷移結果 */
let lastEvent = null;
let lastFrom = null;
let lastTo = null;
let lastAccepted = false;

let running = false;
let timerId = null;
let demoIndex = 0;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function stateIds() {
  return Object.keys(FSM_CONFIG.states);
}

function nextState(from, event) {
  return FSM_CONFIG.transitions[transitionKey(from, event)] ?? null;
}

function validEvents(from) {
  return FSM_CONFIG.events
    .map((e) => e.id)
    .filter((id) => nextState(from, id) !== null);
}

function reset() {
  stopAuto();
  current = FSM_CONFIG.initial;
  history = [current];
  lastEvent = null;
  lastFrom = null;
  lastTo = null;
  lastAccepted = false;
  demoIndex = 0;
  if (storyEl) {
    storyEl.textContent =
      "現在状態に応じて有効なイベントだけが遷移します。無効な入力は無視されます。";
  }
  setStatus(`準備完了 — 初期状態 ${current}`);
  renderAll();
}

/**
 * @param {string} eventId
 * @param {{ silent?: boolean }} [opts]
 * @returns {boolean} 遷移したか
 */
function handleEvent(eventId, opts = {}) {
  const from = current;
  const to = nextState(from, eventId);
  lastEvent = eventId;
  lastFrom = from;
  if (to === null) {
    lastTo = from;
    lastAccepted = false;
    if (!opts.silent) {
      setStatus(
        `イベント ${eventId}: ${from} からは無効 → 無視（状態維持）`
      );
      if (storyEl) {
        storyEl.textContent = `「${eventId}」は ${from} では定義されていません。遷移表の空欄です。`;
      }
    }
    renderAll();
    return false;
  }
  current = to;
  history.push(to);
  lastTo = to;
  lastAccepted = true;
  if (!opts.silent) {
    setStatus(`イベント ${eventId}: ${from} → ${to}`);
    if (storyEl) {
      storyEl.textContent = `${from} で ${eventId} → ${to}。${FSM_CONFIG.states[to].blurb}`;
    }
  }
  renderAll();
  return true;
}

// ----- 描画: 状態図 -----
function edgePath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // 円周上から円周上へ
  const sx = x1 + ux * R;
  const sy = y1 + uy * R;
  const ex = x2 - ux * (R + 6);
  const ey = y2 - uy * (R + 6);
  // 軽い弧
  const mx = (sx + ex) / 2 - uy * 18;
  const my = (sy + ey) / 2 + ux * 18;
  return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, ex, ey, ux, uy };
}

function drawDiagram() {
  if (!svg) return;
  const layout = FSM_CONFIG.layout;
  const edges = [];
  const edgeKeys = Object.entries(FSM_CONFIG.transitions);

  // 同一 from-to のイベントを束ねる
  /** @type {Map<string, string[]>} */
  const bundled = new Map();
  for (const [key, to] of edgeKeys) {
    const [from, ev] = key.split("|");
    const bk = `${from}->${to}`;
    if (!bundled.has(bk)) bundled.set(bk, []);
    bundled.get(bk).push(ev);
  }

  for (const [bk, evs] of bundled) {
    const [from, to] = bk.split("->");
    const a = layout[from];
    const b = layout[to];
    if (!a || !b) continue;
    const { d, ex, ey, ux, uy } = edgePath(a.x, a.y, b.x, b.y);
    const active =
      lastAccepted && lastFrom === from && lastTo === to;
    const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
    edges.push(`
      <path class="fsm-edge${active ? " is-active" : ""}" d="${d}" fill="none" marker-end="url(#arrow)" />
      <text class="fsm-edge-label${active ? " is-active" : ""}" x="${(a.x + b.x) / 2 - uy * 12}" y="${(a.y + b.y) / 2 + ux * 12}" text-anchor="middle">${evs.join(",")}</text>
    `);
    void angle;
    void ex;
    void ey;
  }

  const nodes = stateIds()
    .map((id) => {
      const s = FSM_CONFIG.states[id];
      const p = layout[id];
      const isCur = id === current;
      const isLast = lastAccepted && id === lastTo;
      return `
        <g class="fsm-node${isCur ? " is-current" : ""}${isLast ? " is-flash" : ""}" data-state="${id}">
          <circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${s.color}33" stroke="${s.color}" />
          <text class="fsm-node-label" x="${p.x}" y="${p.y + 4}" text-anchor="middle">${s.label}</text>
        </g>`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6a7d94" />
      </marker>
    </defs>
    <g class="fsm-edges">${edges.join("")}</g>
    <g class="fsm-nodes">${nodes}</g>
  `;
}

function renderActor() {
  const s = FSM_CONFIG.states[current];
  if (actorState) actorState.textContent = s.label;
  if (actorBlurb) actorBlurb.textContent = s.blurb;
  if (actorFigure) {
    actorFigure.dataset.state = current;
    actorFigure.style.setProperty("--actor-color", s.color);
  }
}

function renderHistory() {
  if (!historyEl) return;
  historyEl.innerHTML = history
    .map((id, i) => {
      const s = FSM_CONFIG.states[id];
      const cur = i === history.length - 1;
      return `<span class="fsm-hist-chip${cur ? " is-current" : ""}" style="--c:${s.color}">${s.label}</span>${
        i < history.length - 1 ? `<span class="fsm-hist-arrow">→</span>` : ""
      }`;
    })
    .join("");
}

function renderEventButtons() {
  if (!eventButtons) return;
  const valid = new Set(validEvents(current));
  eventButtons.innerHTML = FSM_CONFIG.events
    .map((e) => {
      const ok = valid.has(e.id);
      return `<button type="button" class="btn fsm-event-btn${ok ? " is-valid" : " is-invalid"}" data-event="${e.id}" title="${
        ok ? `${current} → ${nextState(current, e.id)}` : "この状態では無効"
      }">${e.label}</button>`;
    })
    .join("");

  eventButtons.querySelectorAll("[data-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      stopAuto();
      const id = btn.getAttribute("data-event");
      if (id) handleEvent(id);
    });
  });
}

function renderTable() {
  if (!tableEl) return;
  const events = FSM_CONFIG.events;
  const states = stateIds();
  let head =
    "<thead><tr><th>状態 \\ イベント</th>" +
    events.map((e) => `<th>${e.label}</th>`).join("") +
    "</tr></thead>";
  let body = "<tbody>";
  for (const st of states) {
    const isRow = st === current;
    body += `<tr class="${isRow ? "is-current-row" : ""}"><th scope="row">${st}</th>`;
    for (const ev of events) {
      const to = nextState(st, ev.id);
      const active =
        lastAccepted && lastFrom === st && lastEvent === ev.id;
      body += `<td class="${to ? "has-trans" : "no-trans"}${active ? " is-active-cell" : ""}">${
        to ?? "—"
      }</td>`;
    }
    body += "</tr>";
  }
  body += "</tbody>";
  tableEl.innerHTML = head + body;
}

function renderAll() {
  drawDiagram();
  renderActor();
  renderHistory();
  renderEventButtons();
  renderTable();
}

// ----- 自動デモ -----
function stopAuto() {
  running = false;
  if (btnPlay) btnPlay.textContent = "自動デモ";
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function stepDemo() {
  const script = FSM_CONFIG.demoScript;
  if (demoIndex >= script.length) {
    stopAuto();
    setStatus("自動デモ終了 — リセットで最初から");
    if (storyEl) {
      storyEl.textContent =
        "デモスクリプトが終わりました。イベントを手動で送って遷移を試せます。";
    }
    return false;
  }
  const ev = script[demoIndex];
  demoIndex += 1;
  handleEvent(ev, { silent: true });
  setStatus(`デモ ${demoIndex}/${script.length}: イベント ${ev} → ${current}`);
  if (storyEl) {
    storyEl.textContent = `自動デモ: ${lastFrom} + ${ev} → ${
      lastAccepted ? lastTo : lastFrom + "（無視）"
    }`;
  }
  return demoIndex < script.length;
}

function scheduleDemo() {
  if (!running) return;
  const delay = Number(speedEl?.value) || 550;
  timerId = setTimeout(() => {
    if (!running) return;
    if (stepDemo()) scheduleDemo();
    else stopAuto();
  }, delay);
}

function togglePlay() {
  if (running) {
    stopAuto();
    setStatus("自動デモを停止");
    return;
  }
  // 続きから / 終わっていれば最初から
  if (demoIndex >= FSM_CONFIG.demoScript.length) {
    reset();
  }
  running = true;
  if (btnPlay) btnPlay.textContent = "停止";
  // すぐ1手
  if (stepDemo()) scheduleDemo();
  else stopAuto();
}

async function loadCsharp() {
  if (!csharpSample) return;
  try {
    const res = await fetch("../samples/FsmExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    csharpSample.textContent = await res.text();
  } catch {
    csharpSample.textContent =
      "// samples/FsmExample.cs を読み込めませんでした。";
  }
}

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  stopAuto();
  if (demoIndex >= FSM_CONFIG.demoScript.length) {
    // 手動ステップ: 何もしないので案内
    setStatus("デモ脚本は終了済み。下のイベントボタンで手動入力してください");
    return;
  }
  stepDemo();
});
btnReset?.addEventListener("click", reset);

reset();
loadCsharp();
