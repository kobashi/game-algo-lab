/**
 * コマンド入力 — 技コマンド照合
 */
import { COMMAND_INPUT_CONFIG as C } from "./maps/command-input-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const bufEl = document.getElementById("cmd-buf");
const logEl = document.getElementById("cmd-log");
const listEl = document.getElementById("cmd-list");
const winEl = /** @type {HTMLInputElement} */ (
  document.getElementById("window-ms")
);
const winVal = document.getElementById("window-val");
const btnClear = document.getElementById("btn-clear");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ t: number, tok: string }} Tok
 * @type {Tok[]}
 */
let buffer = [];
/** @type {string[]} */
let logs = [];

function readWindow() {
  const ms = Number(winEl?.value) || C.windowMs;
  if (winVal) winVal.textContent = String(ms);
  return ms;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 12) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs.map((m) => `<div class="es-log es-log-emit">${m}</div>`).join("");
  }
}

/**
 * @param {string[]} toks
 * @param {{ name: string, seq: string[] }[]} moves
 */
export function matchCommand(toks, moves) {
  let best = null;
  for (const m of moves) {
    if (toks.length < m.seq.length) continue;
    let ok = true;
    for (let i = 0; i < m.seq.length; i++) {
      if (toks[toks.length - m.seq.length + i] !== m.seq[i]) {
        ok = false;
        break;
      }
    }
    if (ok && (!best || m.seq.length > best.seq.length)) best = m;
  }
  return best;
}

function prune() {
  const now = performance.now();
  const win = readWindow();
  buffer = buffer.filter((b) => now - b.t <= win);
}

function renderBuf() {
  prune();
  if (bufEl) {
    bufEl.textContent = buffer.map((b) => b.tok).join(" ") || "（空）";
  }
}

function onToken(tok) {
  buffer.push({ t: performance.now(), tok });
  prune();
  const toks = buffer.map((b) => b.tok);
  const hit = matchCommand(toks, C.moves);
  renderBuf();
  if (hit) {
    pushLog(`発動: ${hit.name} [${hit.seq.join("→")}]`);
    setStatus(`コマンド成功: ${hit.name}`);
    buffer = [];
    renderBuf();
  } else {
    setStatus(`入力 ${tok}`);
  }
}

const keyMap = {
  ArrowLeft: "L",
  ArrowRight: "R",
  ArrowUp: "U",
  ArrowDown: "D",
  KeyA: "A",
  KeyZ: "A",
  KeyS: "B",
  KeyX: "B",
};

window.addEventListener("keydown", (e) => {
  const tok = keyMap[e.code];
  if (!tok) return;
  e.preventDefault();
  if (e.repeat) return;
  onToken(tok);
});

btnClear?.addEventListener("click", () => {
  buffer = [];
  renderBuf();
  setStatus("バッファクリア");
});
winEl?.addEventListener("input", () => {
  readWindow();
  prune();
  renderBuf();
});

if (listEl) {
  listEl.innerHTML = C.moves
    .map((m) => `<li><strong>${m.name}</strong>: ${m.seq.join(" → ")}</li>`)
    .join("");
}
if (winEl) winEl.value = String(C.windowMs);
readWindow();
renderBuf();

loadTextSample(
  "../samples/CommandInputExample.cs",
  csharpSample,
  "// CommandInputExample.cs"
);
setStatus("↓→A などで Hadouken — 窓時間内に入力");
