/**
 * セーブ・ロード
 * @see docs/topics/save-load/SPEC.md
 */
import { SAVE_LOAD_CONFIG as C } from "./maps/save-load-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sl-canvas")
);
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score-val");
const keyEl = /** @type {HTMLInputElement} */ (document.getElementById("has-key"));
const jsonEl = document.getElementById("json-view");
const logEl = document.getElementById("sl-log");
const btnSave = document.getElementById("btn-save");
const btnLoad = document.getElementById("btn-load");
const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const btnV1 = document.getElementById("btn-fake-v1");
const btnReset = document.getElementById("btn-reset");
const btnScore = document.getElementById("btn-score");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {{ version: number, x: number, y: number, score: number, hasKey: boolean }} */
let state = {
  version: C.currentVersion,
  x: 80,
  y: 160,
  score: 0,
  hasKey: false,
};

/** @type {string[]} */
let logs = [];

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 20) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs.map((m) => `<div class="es-log">${m}</div>`).join("");
  }
}

/**
 * v1 JSON → v2 state
 * @param {unknown} raw
 */
export function migrateSave(raw) {
  if (!raw || typeof raw !== "object") throw new Error("invalid save");
  const o = /** @type {Record<string, unknown>} */ (raw);
  let ver = typeof o.version === "number" ? o.version : 1;
  if (ver === 1 || o.Version === 1) {
    // accept Version capital from C# style
    const x = Number(o.x ?? o.X ?? 0);
    const y = Number(o.y ?? o.Y ?? 0);
    const score = Number(o.score ?? o.Score ?? 0);
    pushLog("migrate v1 → v2: hasKey を false で補完");
    return {
      version: 2,
      x,
      y,
      score,
      hasKey: false,
    };
  }
  return {
    version: 2,
    x: Number(o.x ?? 0),
    y: Number(o.y ?? 0),
    score: Number(o.score ?? 0),
    hasKey: Boolean(o.hasKey),
  };
}

function toJson() {
  return JSON.stringify(
    {
      version: state.version,
      x: Math.round(state.x * 10) / 10,
      y: Math.round(state.y * 10) / 10,
      score: state.score,
      hasKey: state.hasKey,
    },
    null,
    2
  );
}

function applyUi() {
  if (scoreEl) scoreEl.textContent = String(state.score);
  if (keyEl) keyEl.checked = state.hasKey;
  if (jsonEl) jsonEl.textContent = toJson();
  draw();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // floor
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
  // key marker
  if (state.hasKey) {
    ctx.fillStyle = "#f2cc8f";
    ctx.fillRect(state.x + 18, state.y - 8, 10, 6);
  }
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(state.x, state.y, 28, 28);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(`score=${state.score}  key=${state.hasKey}  v${state.version}`, 12, 18);
  ctx.fillText("クリックで移動", 12, canvas.height - 8);
}

function save() {
  state.hasKey = !!keyEl?.checked;
  state.version = C.currentVersion;
  const json = toJson();
  try {
    localStorage.setItem(C.storageKey, json);
    pushLog("Save → localStorage OK");
    setStatus("セーブしました");
  } catch (e) {
    pushLog("Save 失敗: " + String(e));
    setStatus("セーブ失敗");
  }
  applyUi();
}

function load() {
  try {
    const raw = localStorage.getItem(C.storageKey);
    if (!raw) {
      pushLog("ロード対象なし");
      setStatus("セーブデータがありません");
      return;
    }
    const parsed = JSON.parse(raw);
    state = migrateSave(parsed);
    pushLog(`Load OK · version→${state.version}`);
    setStatus("ロードしました");
    applyUi();
  } catch (e) {
    pushLog("Load 失敗: " + String(e));
    setStatus("ロード失敗");
  }
}

function exportJson() {
  state.hasKey = !!keyEl?.checked;
  if (jsonEl) jsonEl.textContent = toJson();
  pushLog("JSON を表示に反映");
  setStatus("エクスポート（表示）");
}

function importJson() {
  try {
    const text = jsonEl?.textContent || "{}";
    const parsed = JSON.parse(text);
    state = migrateSave(parsed);
    pushLog("Import + migrate OK");
    setStatus("インポートしました");
    applyUi();
  } catch (e) {
    pushLog("Import 失敗: " + String(e));
    setStatus("JSON が不正です");
  }
}

function fakeV1() {
  const v1 = {
    version: 1,
    x: state.x,
    y: state.y,
    score: state.score,
    // no hasKey
  };
  if (jsonEl) jsonEl.textContent = JSON.stringify(v1, null, 2);
  pushLog("表示を v1 形式に差し替え（hasKey なし）");
  setStatus("v1 JSON を生成 — Import でマイグレーション");
}

function reset() {
  state = {
    version: C.currentVersion,
    x: 80,
    y: 160,
    score: 0,
    hasKey: false,
  };
  applyUi();
  pushLog("リセット（メモリ上）");
  setStatus("リセット");
}

canvas?.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  state.x = ((e.clientX - rect.left) * canvas.width) / rect.width - 14;
  state.y = ((e.clientY - rect.top) * canvas.height) / rect.height - 14;
  state.x = Math.max(0, Math.min(canvas.width - 28, state.x));
  state.y = Math.max(0, Math.min(canvas.height - 52, state.y));
  applyUi();
});

btnSave?.addEventListener("click", save);
btnLoad?.addEventListener("click", load);
btnExport?.addEventListener("click", exportJson);
btnImport?.addEventListener("click", importJson);
btnV1?.addEventListener("click", fakeV1);
btnReset?.addEventListener("click", reset);
btnScore?.addEventListener("click", () => {
  state.score += 10;
  applyUi();
  pushLog("score +10");
});
keyEl?.addEventListener("change", () => {
  state.hasKey = !!keyEl.checked;
  applyUi();
});

// editable JSON
if (jsonEl) {
  jsonEl.setAttribute("contenteditable", "true");
  jsonEl.addEventListener("blur", () => {
    /* user edits then Import */
  });
}

loadTextSample(
  "../samples/SaveLoadExample.cs",
  csharpSample,
  "// SaveLoadExample.cs"
);
reset();
pushLog("準備完了 — Save 後にリロードしても Load で復元（同一オリジン）");
