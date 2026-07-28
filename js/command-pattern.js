/**
 * コマンドパターン — Undo 履歴
 * @see docs/topics/command-pattern/SPEC.md
 */
import { COMMAND_PATTERN_CONFIG as C } from "./maps/command-pattern-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cmd-canvas")
);
const ctx = canvas.getContext("2d");
const histEl = document.getElementById("cmd-history");
const btnUndo = document.getElementById("btn-undo");
const btnClear = document.getElementById("btn-clear");
const btnN = document.getElementById("btn-n");
const btnS = document.getElementById("btn-s");
const btnW = document.getElementById("btn-w");
const btnE = document.getElementById("btn-e");
const btnPaint = document.getElementById("btn-paint");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {{x:number,y:number}} */
let actor = { x: 3, y: 3 };
/** @type {Set<string>} */
let painted = new Set();
/**
 * @typedef {{ label: string, execute: () => void, undo: () => void }} Cmd
 * @type {Cmd[]}
 */
let history = [];

function cellKey(x, y) {
  return `${x},${y}`;
}

function clampActor() {
  actor.x = Math.max(0, Math.min(C.grid - 1, actor.x));
  actor.y = Math.max(0, Math.min(C.grid - 1, actor.y));
}

/**
 * @param {number} dx
 * @param {number} dy
 * @returns {Cmd}
 */
function makeMove(dx, dy) {
  const ox = actor.x;
  const oy = actor.y;
  const dir =
    dx === 1 ? "→" : dx === -1 ? "←" : dy === 1 ? "↓" : "↑";
  return {
    label: `Move ${dir}`,
    execute() {
      actor.x = ox + dx;
      actor.y = oy + dy;
      clampActor();
    },
    undo() {
      actor.x = ox;
      actor.y = oy;
    },
  };
}

/** @returns {Cmd} */
function makePaint() {
  const k = cellKey(actor.x, actor.y);
  const had = painted.has(k);
  return {
    label: `Paint (${actor.x},${actor.y})`,
    execute() {
      painted.add(k);
    },
    undo() {
      if (!had) painted.delete(k);
    },
  };
}

/** @param {Cmd} cmd */
function run(cmd) {
  cmd.execute();
  history.push(cmd);
  if (history.length > C.maxHistory) history.shift();
  render();
  setStatus(`Execute: ${cmd.label} · 履歴 ${history.length}`);
}

function undo() {
  const cmd = history.pop();
  if (!cmd) {
    setStatus("Undo するものがありません");
    return;
  }
  cmd.undo();
  render();
  setStatus(`Undo: ${cmd.label} · 履歴 ${history.length}`);
}

function clearAll() {
  history = [];
  actor = { x: 3, y: 3 };
  painted = new Set();
  render();
  setStatus("クリア");
}

function draw() {
  if (!ctx) return;
  const cell = C.cell;
  const W = C.grid * cell;
  const H = C.grid * cell;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < C.grid; y++) {
    for (let x = 0; x < C.grid; x++) {
      const px = x * cell;
      const py = y * cell;
      if (painted.has(cellKey(x, y))) {
        ctx.fillStyle = "rgba(242, 204, 143, 0.45)";
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      }
      ctx.strokeStyle = "rgba(90,106,128,0.35)";
      ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
    }
  }
  ctx.fillStyle = "#6bcb8f";
  ctx.fillRect(
    actor.x * cell + 6,
    actor.y * cell + 6,
    cell - 12,
    cell - 12
  );
}

function renderHistory() {
  if (!histEl) return;
  if (!history.length) {
    histEl.innerHTML = '<p class="gl-log-empty">（履歴なし）</p>';
    return;
  }
  histEl.innerHTML = history
    .map(
      (c, i) =>
        `<div class="es-log${i === history.length - 1 ? " es-log-emit" : ""}">${i + 1}. ${c.label}</div>`
    )
    .join("");
}

function render() {
  draw();
  renderHistory();
}

btnN?.addEventListener("click", () => run(makeMove(0, -1)));
btnS?.addEventListener("click", () => run(makeMove(0, 1)));
btnW?.addEventListener("click", () => run(makeMove(-1, 0)));
btnE?.addEventListener("click", () => run(makeMove(1, 0)));
btnPaint?.addEventListener("click", () => run(makePaint()));
btnUndo?.addEventListener("click", undo);
btnClear?.addEventListener("click", clearAll);

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp") {
    e.preventDefault();
    run(makeMove(0, -1));
  } else if (e.code === "ArrowDown") {
    e.preventDefault();
    run(makeMove(0, 1));
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    run(makeMove(-1, 0));
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    run(makeMove(1, 0));
  } else if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    undo();
  } else if (e.code === "Space") {
    e.preventDefault();
    run(makePaint());
  }
});

loadTextSample(
  "../samples/CommandPatternExample.cs",
  csharpSample,
  "// CommandPatternExample.cs"
);
render();
setStatus("準備完了 — 移動/塗る → Undo");
