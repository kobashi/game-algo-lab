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
  bindSpeedScaleControl,
  delayFromSpeedScale,
  mountGlossary,
} from "./platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

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
const DEFAULT_OVERRIDE = { from: DEFAULT_FROM, ev: DEFAULT_EV, to: DEFAULT_TO };
const DEFAULT_SCRIPT = FSM_CONFIG.demoScript.join(",");
const EVENT_IDS = new Set(FSM_CONFIG.events.map((e) => e.id));

/** @type {Record<string, string>} */
let transitions = { ...FSM_CONFIG.transitions };
let appliedOverride = DEFAULT_OVERRIDE;
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

function readOverrideControls() {
  return {
    from: fromEl?.value || DEFAULT_FROM,
    ev: evEl?.value || DEFAULT_EV,
    to: toEl?.value || DEFAULT_TO,
  };
}

function normalizeOverride(override) {
  return FSM_CONFIG.transitions[transitionKey(override.from, override.ev)] === override.to
    ? DEFAULT_OVERRIDE
    : override;
}

function updateOverridePreview() {
  const draft = readOverrideControls();
  const { from, ev, to } = draft;
  const base = FSM_CONFIG.transitions[transitionKey(from, ev)];
  const preview = document.getElementById("fsm-override-preview");
  if (!preview) return;
  const candidate = normalizeOverride(draft);
  const alreadyApplied =
    candidate.from === appliedOverride.from && candidate.ev === appliedOverride.ev && candidate.to === appliedOverride.to;
  const change = base === to ? "元の表と同じ" : base ? "行き先を上書き" : "新しい遷移を追加";
  const detail = `${from} 行 × ${ev} 列　${base ?? "空欄（—）"} → ${to}（${change}）`;
  const status = alreadyApplied ? (base === to ? "" : "。反映済み") : "。反映待ち";
  const previous = !alreadyApplied && appliedOverride !== DEFAULT_OVERRIDE
    ? `。反映すると、適用中の ${appliedOverride.from} 行 × ${appliedOverride.ev} 列の変更に代わります`
    : "";
  preview.textContent = `${detail}${status}${previous}。`;
}

function applyOverrideAndScript() {
  initial = initialEl?.value || FSM_CONFIG.initial;
  if (!FSM_CONFIG.states[initial]) initial = FSM_CONFIG.initial;
  transitions = { ...FSM_CONFIG.transitions };
  const { from, ev, to } = appliedOverride;
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

/** 他の状態へ進む本数。自分に戻る遷移は出口に数えない。 */
function outgoingCount(id) {
  return FSM_CONFIG.events.filter((e) => {
    const nxt = nextState(id, e.id);
    return nxt !== null && nxt !== id;
  }).length;
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
const VIEW_PAD = 6;
const NODE_GAP = 12;

function fmt(v) {
  return (Math.round(v * 10) / 10).toString();
}

function layoutNodes() {
  return stateIds().map((id) => ({ id, ...FSM_CONFIG.layout[id] }));
}

function sampleQuad(sx, sy, mx, my, ex, ey, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x: u * u * sx + 2 * u * t * mx + t * t * ex,
      y: u * u * sy + 2 * u * t * my + t * t * ey,
    });
  }
  return pts;
}

function sampleCubic(p0, p1, p2, p3, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    pts.push({
      x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
    });
  }
  return pts;
}

function tangentQuad(sx, sy, mx, my, ex, ey, t) {
  const u = 1 - t;
  const dx = 2 * u * (mx - sx) + 2 * t * (ex - mx);
  const dy = 2 * u * (my - sy) + 2 * t * (ey - my);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function inView(pts) {
  return pts.every(
    (p) =>
      p.x >= VIEW_PAD &&
      p.x <= 640 - VIEW_PAD &&
      p.y >= VIEW_PAD &&
      p.y <= 360 - VIEW_PAD
  );
}

function hitsOtherNode(pts, skipIds) {
  for (const p of pts) {
    for (const n of layoutNodes()) {
      if (skipIds.has(n.id)) continue;
      if (Math.hypot(p.x - n.x, p.y - n.y) < R + NODE_GAP) return true;
    }
  }
  return false;
}

function labelBoxClear(x, y, text) {
  const halfW = Math.max(14, text.length * 3.2);
  const halfH = 7;
  if (x - halfW < 2 || x + halfW > 638 || y - halfH < 2 || y + halfH > 358) {
    return false;
  }
  return layoutNodes().every((n) => {
    const cx = Math.max(x - halfW, Math.min(n.x, x + halfW));
    const cy = Math.max(y - halfH, Math.min(n.y, y + halfH));
    return Math.hypot(n.x - cx, n.y - cy) >= R + 6;
  });
}

function makeSelfLoop(x, y, dir, lift) {
  const ox = dir.ox;
  const oy = dir.oy;
  const tx = -oy;
  const ty = ox;
  const a = 0.95;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const start = {
    x: x + R * (ca * ox - sa * tx),
    y: y + R * (ca * oy - sa * ty),
  };
  const end = {
    x: x + (R + 2) * (ca * ox + sa * tx),
    y: y + (R + 2) * (ca * oy + sa * ty),
  };
  const wide = 26;
  const reach = R + lift;
  const c1 = {
    x: x + reach * ox - wide * tx,
    y: y + reach * oy - wide * ty,
  };
  const c2 = {
    x: x + reach * ox + wide * tx,
    y: y + reach * oy + wide * ty,
  };
  return {
    d: `M ${fmt(start.x)} ${fmt(start.y)} C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`,
    samples: sampleCubic(start, c1, c2, end, 28),
    label: {
      x: x + (reach + 12) * ox,
      y: y + (reach + 12) * oy,
    },
  };
}

function selfLoopGeom(x, y, id, text) {
  const dirs = [
    { ox: 0, oy: -1 },
    { ox: 0, oy: 1 },
    { ox: -1, oy: 0 },
    { ox: 1, oy: 0 },
  ];
  let best = null;
  let bestScore = -Infinity;
  for (const dir of dirs) {
    for (const lift of [40, 32, 24]) {
      const geom = makeSelfLoop(x, y, dir, lift);
      const body = geom.samples.filter(
        (p) => Math.hypot(p.x - x, p.y - y) >= R + 8
      );
      if (body.length < geom.samples.length * 0.6) continue;
      if (!inView(geom.samples)) continue;
      if (hitsOtherNode(geom.samples, new Set([id]))) continue;
      if (!labelBoxClear(geom.label.x, geom.label.y, text)) continue;
      let score = Infinity;
      for (const n of layoutNodes()) {
        if (n.id === id) continue;
        for (const p of geom.samples) {
          score = Math.min(score, Math.hypot(p.x - n.x, p.y - n.y) - R);
        }
      }
      score = Math.min(score, geom.label.x, geom.label.y, 640 - geom.label.x, 360 - geom.label.y);
      if (score > bestScore) {
        best = geom;
        bestScore = score;
      }
    }
  }
  return best ?? makeSelfLoop(x, y, { ox: -1, oy: 0 }, 24);
}

function spreadLabels(labels) {
  for (let iter = 0; iter < 14; iter++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const need = a.halfW + b.halfW + 4;
        if (dist >= need) continue;
        const push = Math.min(6, (need - dist) / 2);
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    for (const lb of labels) {
      lb.x += (lb.homeX - lb.x) * 0.08;
      lb.y += (lb.homeY - lb.y) * 0.08;
      for (const n of layoutNodes()) {
        const dx = lb.x - n.x;
        const dy = lb.y - n.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const limit = R + 8;
        if (dist < limit) {
          lb.x = n.x + (dx / dist) * limit;
          lb.y = n.y + (dy / dist) * limit;
        }
      }
      lb.x = Math.min(628, Math.max(12, lb.x));
      lb.y = Math.min(350, Math.max(12, lb.y));
    }
  }
}

function edgeGeom(fromId, toId, ax, ay, bx, by, text) {
  if (fromId === toId) return selfLoopGeom(ax, ay, fromId, text);
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const sx = ax + ux * R;
  const sy = ay + uy * R;
  const ex = bx - ux * (R + 7);
  const ey = by - uy * (R + 7);
  const heights = [];
  for (const sign of [1, -1]) {
    for (let h = 18; h <= 150; h += 6) heights.push(sign * h);
  }
  for (const h of heights) {
    const mx = (sx + ex) / 2 + px * h;
    const my = (sy + ey) / 2 + py * h;
    const samples = sampleQuad(sx, sy, mx, my, ex, ey, 40);
    if (!inView(samples)) continue;
    if (hitsOtherNode(samples, new Set([fromId, toId]))) continue;
    const mid = samples[20];
    const tan = tangentQuad(sx, sy, mx, my, ex, ey, 0.5);
    let nx = -tan.y;
    let ny = tan.x;
    if (nx * (mx - mid.x) + ny * (my - mid.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    let label = null;
    for (let dist = 14; dist <= 42; dist += 4) {
      const lx = mid.x + nx * dist;
      const ly = mid.y + ny * dist;
      if (labelBoxClear(lx, ly, text)) {
        label = { x: lx, y: ly };
        break;
      }
    }
    if (!label) continue;
    return {
      d: `M ${fmt(sx)} ${fmt(sy)} Q ${fmt(mx)} ${fmt(my)} ${fmt(ex)} ${fmt(ey)}`,
      label,
    };
  }
  const mx = (sx + ex) / 2 + px * 18;
  const my = (sy + ey) / 2 + py * 18;
  return {
    d: `M ${fmt(sx)} ${fmt(sy)} Q ${fmt(mx)} ${fmt(my)} ${fmt(ex)} ${fmt(ey)}`,
    label: { x: (ax + bx) / 2, y: (ay + by) / 2 - 16 },
  };
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

  /** @type {{ x: number, y: number, text: string, on: string, halfW: number }[]} */
  const labels = [];
  for (const [bk, evs] of bundled) {
    const [from, to] = bk.split("->");
    const a = layout[from];
    const b = layout[to];
    if (!a || !b) continue;
    const text = evs.join(",");
    const { d, label } = edgeGeom(from, to, a.x, a.y, b.x, b.y, text);
    const active = lastAccepted && lastFrom === from && lastTo === to;
    edges.push(
      `<path class="fsm-edge${active ? " is-active" : ""}" d="${d}" fill="none" marker-end="url(#arrow)" />`
    );
    labels.push({
      x: label.x,
      y: label.y,
      homeX: label.x,
      homeY: label.y,
      text,
      on: active ? " is-active" : "",
      halfW: Math.max(12, text.length * 3.4),
    });
  }
  spreadLabels(labels);

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
    <title id="fsm-svg-title">ステートマシン状態図</title>
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6a7d94" />
      </marker>
    </defs>
    <g class="fsm-edges">${edges.join("")}</g>
    <g class="fsm-nodes">${nodes}</g>
    <g class="fsm-edge-labels">${labels
      .map(
        (lb) =>
          `<text class="fsm-edge-label${lb.on}" x="${fmt(lb.x)}" y="${fmt(lb.y)}" text-anchor="middle">${lb.text}</text>`
      )
      .join("")}</g>
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

/** @type {Map<string, HTMLButtonElement>} */
const eventButtonEls = new Map();

function ensureEventButtons() {
  if (!eventButtons || eventButtonEls.size > 0) return;
  for (const e of FSM_CONFIG.events) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn fsm-event-btn";
    btn.dataset.event = e.id;
    btn.textContent = e.label;
    btn.addEventListener("click", () => {
      stopAuto();
      handleEvent(e.id);
    });
    eventButtons.appendChild(btn);
    eventButtonEls.set(e.id, btn);
  }
}

function renderEventButtons() {
  if (!eventButtons) return;
  ensureEventButtons();
  const valid = new Set(validEvents(current));
  for (const e of FSM_CONFIG.events) {
    const btn = eventButtonEls.get(e.id);
    if (!btn) continue;
    const ok = valid.has(e.id);
    btn.classList.toggle("is-valid", ok);
    btn.classList.toggle("is-invalid", !ok);
    const to = nextState(current, e.id);
    btn.title = ok ? `${current} → ${to}` : "この状態では無効";
  }
}

function renderTable() {
  if (!tableEl) return;
  const events = FSM_CONFIG.events;
  const states = stateIds();
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
      const base = FSM_CONFIG.transitions[transitionKey(st, ev.id)] ?? null;
      const isOv = (to ?? null) !== base;
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
  delayFromSpeed: delayFromSpeedScale(550),
  labelPlay: "自動デモ",
  labelPause: "停止",
});
bindSpeedScaleControl(
  /** @type {HTMLInputElement | null} */ (speedEl),
  document.getElementById("speed-val")
);

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
  from: { el: fromEl, kind: "select", getShareValue: () => appliedOverride.from },
  ev: { el: evEl, kind: "select", getShareValue: () => appliedOverride.ev },
  to: { el: toEl, kind: "select", getShareValue: () => appliedOverride.to },
  script: { el: scriptEl, kind: "text" },
  speed: { el: speedEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
appliedOverride = normalizeOverride(readOverrideControls());
const scriptWarning = applyOverrideAndScript();
reset();
updateOverridePreview();
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
fromEl?.addEventListener("change", updateOverridePreview);
evEl?.addEventListener("change", updateOverridePreview);
toEl?.addEventListener("change", updateOverridePreview);
scriptEl?.addEventListener("change", onParamChange);

document.getElementById("btn-apply-override")?.addEventListener("click", () => {
  appliedOverride = normalizeOverride(readOverrideControls());
  onParamChange();
  updateOverridePreview();
});

document.getElementById("btn-clear-override")?.addEventListener("click", () => {
  appliedOverride = DEFAULT_OVERRIDE;
  if (fromEl) fromEl.value = DEFAULT_FROM;
  if (evEl) evEl.value = DEFAULT_EV;
  if (toEl) toEl.value = DEFAULT_TO;
  onParamChange();
  updateOverridePreview();
});

loadTextSample(
  "../samples/FsmExample.cs",
  csharpSample,
  "// samples/FsmExample.cs を読み込めませんでした。"
);
