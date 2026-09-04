/**
 * ステートマシンデモ（説明特化 UI）
 * 共通基盤: js/platform
 */

import { FSM_CONFIG, transitionKey } from "./maps/fsm-config.js";
import {
  createStatus,
  createPlayback,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
} from "./platform/index.js";

mountTopicShellFromDataset();

const svg = document.getElementById("fsm-svg");
const eventButtons = document.getElementById("event-buttons");
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
const initialEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("fsm-initial")
);
const fromEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("fsm-from")
);
const evEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("fsm-ev")
);
const toEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("fsm-to")
);
const scriptEl = /** @type {HTMLInputElement | null} */ (
  document.getElementById("fsm-script")
);
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));

const R = 36;

const firstTransKey = Object.keys(FSM_CONFIG.transitions)[0];
const [DEFAULT_FROM, DEFAULT_EV] = firstTransKey.split("|");
const DEFAULT_TO = FSM_CONFIG.transitions[firstTransKey];
const DEFAULT_SCRIPT = FSM_CONFIG.demoScript.join(",");
const EVENT_IDS = new Set(FSM_CONFIG.events.map((e) => e.id));

/** @type {Record<string, string>} */
let transitions = { ...FSM_CONFIG.transitions };
let initial = FSM_CONFIG.initial;
/** @type {string[]} */
let demoScript = [...FSM_CONFIG.demoScript];

let current = initial;
/** @type {string[]} */
let history = [current];
/** 最後に発火したイベント / 遷移結果 */
let lastEvent = null;
let lastFrom = null;
let lastTo = null;
let lastAccepted = false;

let demoIndex = 0;

function stateIds() {
  return Object.keys(FSM_CONFIG.states);
}

function fillSelect(el, ids, selected) {
  if (!el) return;
  el.innerHTML = ids
    .map((id) => `<option value="${id}">${id}</option>`)
    .join("");
  el.value = selected;
}

/**
 * @param {string} raw
 * @returns {{ ok: true, events: string[] } | { ok: false, reason: "empty"|"parse" }}
 */
function parseScript(raw) {
  const tokens = String(raw).split(",");
  /** @type {string[]} */
  const events = [];
  if (tokens.length === 0) return { ok: false, reason: "empty" };
  for (const t of tokens) {
    const id = t.trim();
    if (id === "") return { ok: false, reason: "empty" };
    if (!EVENT_IDS.has(id)) return { ok: false, reason: "parse" };
    events.push(id);
  }
  return { ok: true, events };
}

function overrideKey() {
  return transitionKey(fromEl?.value ?? "", evEl?.value ?? "");
}

function applyOverrideAndScript() {
  initial = initialEl?.value || FSM_CONFIG.initial;
  if (!FSM_CONFIG.states[initial]) initial = FSM_CONFIG.initial;
  transitions = { ...FSM_CONFIG.transitions };
  const from = fromEl?.value ?? "";
  const ev = evEl?.value ?? "";
  const to = toEl?.value ?? "";
  if (from && ev && to && FSM_CONFIG.states[from] && EVENT_IDS.has(ev) && FSM_CONFIG.states[to]) {
    transitions[transitionKey(from, ev)] = to;
  }
  const parsed = parseScript(scriptEl?.value ?? "");
  if (!parsed.ok) {
    if (scriptEl) scriptEl.value = DEFAULT_SCRIPT;
    demoScript = [...FSM_CONFIG.demoScript];
    if (parsed.reason === "empty") {
      return "⚠ デモのイベント列が空です。既定の脚本に戻しました。";
    }
    return "⚠ デモのイベント列に未知のイベントがあります。既定の脚本に戻しました。";
  }
  demoScript = parsed.events;
  return null;
}

function reachableFrom(start) {
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const s = q.shift();
    for (const ev of FSM_CONFIG.events) {
      const nxt = transitions[transitionKey(s, ev.id)];
      if (nxt && FSM_CONFIG.states[nxt] && !seen.has(nxt)) {
        seen.add(nxt);
        q.push(nxt);
      }
    }
  }
  return seen;
}

function unreachableIds() {
  const reach = reachableFrom(initial);
  return stateIds().filter((id) => !reach.has(id));
}

function outgoingCount(id) {
  return FSM_CONFIG.events.filter((e) => nextState(id, e.id) !== null).length;
}

function deadlockIds() {
  const reach = reachableFrom(initial);
  return stateIds().filter((id) => reach.has(id) && outgoingCount(id) === 0);
}

function nextState(from, event) {
  return transitions[transitionKey(from, event)] ?? null;
}

function validEvents(from) {
  return FSM_CONFIG.events
    .map((e) => e.id)
    .filter((id) => nextState(from, id) !== null);
}

function reset() {
  stopAuto();
  current = initial;
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
  const dead = unreachableIds();
  const locks = deadlockIds();
  const bits = [];
  if (dead.length) bits.push(`到達不能: ${dead.join(", ")}`);
  if (locks.length) bits.push(`出口なし: ${locks.join(", ")}`);
  const extra = bits.length ? `。${bits.join(" / ")}` : "";
  setStatus(`準備完了 — 初期状態 ${current}${extra}`);
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
  const edgeKeys = Object.entries(transitions);
  const reach = reachableFrom(initial);

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
      const unreachable = !reach.has(id);
      const deadlock = !unreachable && outgoingCount(id) === 0;
      return `
        <g class="fsm-node${isCur ? " is-current" : ""}${isLast ? " is-flash" : ""}${unreachable ? " is-unreachable" : ""}${deadlock ? " is-deadlock" : ""}" data-state="${id}">
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
  const ovKey = overrideKey();
  const reach = reachableFrom(initial);
  let head =
    "<thead><tr><th>状態 \\ イベント</th>" +
    events.map((e) => `<th>${e.label}</th>`).join("") +
    "</tr></thead>";
  let body = "<tbody>";
  for (const st of states) {
    const isRow = st === current;
    const unreach = !reach.has(st);
    body += `<tr class="${isRow ? "is-current-row" : ""}${unreach ? " is-unreachable-row" : ""}"><th scope="row">${st}</th>`;
    for (const ev of events) {
      const to = nextState(st, ev.id);
      const active =
        lastAccepted && lastFrom === st && lastEvent === ev.id;
      const isOv = transitionKey(st, ev.id) === ovKey;
      body += `<td class="${to ? "has-trans" : "no-trans"}${active ? " is-active-cell" : ""}${isOv ? " is-override-cell" : ""}">${
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
function stepDemo() {
  const script = demoScript;
  if (demoIndex >= script.length) {
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

const playback = createPlayback({
  btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
  speedEl: /** @type {HTMLInputElement | null} */ (speedEl),
  onTick: () => stepDemo(),
  defaultDelayMs: 550,
  labelPlay: "自動デモ",
  labelPause: "停止",
});

function stopAuto() {
  playback.stop();
}

btnPlay?.addEventListener("click", () => {
  if (playback.running) {
    stopAuto();
    setStatus("自動デモを停止");
    return;
  }
  if (demoIndex >= demoScript.length) {
    reset();
  }
  playback.start();
});
btnStep?.addEventListener("click", () => {
  stopAuto();
  if (demoIndex >= demoScript.length) {
    setStatus("デモ脚本は終了済み。下のイベントボタンで手動入力してください");
    return;
  }
  stepDemo();
});
btnReset?.addEventListener("click", () => {
  reset();
  setStatus(`実行をリセットしました（初期状態 ${initial}、上書きと脚本は維持）`);
});

fillSelect(initialEl, stateIds(), FSM_CONFIG.initial);
fillSelect(fromEl, stateIds(), DEFAULT_FROM);
fillSelect(evEl, FSM_CONFIG.events.map((e) => e.id), DEFAULT_EV);
fillSelect(toEl, stateIds(), DEFAULT_TO);
if (scriptEl) scriptEl.value = DEFAULT_SCRIPT;

const urlSpec = {
  initial: { el: initialEl, kind: "select" },
  from: { el: fromEl, kind: "select" },
  ev: { el: evEl, kind: "select" },
  to: { el: toEl, kind: "select" },
  script: { el: scriptEl, kind: "text" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
const scriptWarning = applyOverrideAndScript();
reset();
if (urlResult.warning && scriptWarning) {
  setStatus(`${urlResult.warning} ${scriptWarning}`);
} else if (urlResult.warning) {
  setStatus(urlResult.warning);
} else if (scriptWarning) {
  setStatus(scriptWarning);
}

function onParamChange() {
  const warning = applyOverrideAndScript();
  reset();
  if (warning) setStatus(warning);
}

initialEl?.addEventListener("change", onParamChange);
fromEl?.addEventListener("change", onParamChange);
evEl?.addEventListener("change", onParamChange);
toEl?.addEventListener("change", onParamChange);
scriptEl?.addEventListener("change", onParamChange);

loadTextSample(
  "../samples/FsmExample.cs",
  csharpSample,
  "// samples/FsmExample.cs を読み込めませんでした。"
);
