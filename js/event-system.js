/**
 * イベントシステム（pub/sub）
 */
import { EVENT_SYSTEM_CONFIG as C } from "./maps/event-system-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

/** @type {Map<string, Set<string>>} event -> listener ids */
const bus = new Map();
/** @type {{ t: number, type: string, msg: string }[]} */
let log = [];
let listenerSeq = 0;
/** @type {Map<string, { id: string, event: string, label: string }>} */
const listeners = new Map();

const listEl = document.getElementById("listener-list");
const logEl = document.getElementById("event-log");
const eventSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("event-type")
);
const btnSub = document.getElementById("btn-sub");
const btnUnsub = document.getElementById("btn-unsub");
const btnEmit = document.getElementById("btn-emit");
const btnClear = document.getElementById("btn-clear");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

function ensure(type) {
  if (!bus.has(type)) bus.set(type, new Set());
  return bus.get(type);
}

function subscribe(event, label) {
  const id = `L${++listenerSeq}`;
  ensure(event).add(id);
  listeners.set(id, { id, event, label });
  pushLog("sub", `${label} が ${event} を購読 (${id})`);
  render();
  return id;
}

function unsubscribe(id) {
  const L = listeners.get(id);
  if (!L) return;
  bus.get(L.event)?.delete(id);
  listeners.delete(id);
  pushLog("off", `${L.label} の購読解除 (${id})`);
  render();
}

function emit(event) {
  const set = bus.get(event);
  const n = set ? set.size : 0;
  pushLog("emit", `Emit ${event} → リスナ ${n} 件`);
  if (set) {
    for (const id of set) {
      const L = listeners.get(id);
      pushLog("call", `  → ${L?.label} (${id}) が処理`);
    }
  }
  render();
  setStatus(`Emit ${event} · 呼び出し ${n}`);
}

function pushLog(kind, msg) {
  log.unshift({ t: Date.now(), type: kind, msg });
  if (log.length > 40) log.pop();
}

function render() {
  if (listEl) {
    if (!listeners.size) {
      listEl.innerHTML = '<p class="gl-log-empty">（購読者なし）</p>';
    } else {
      listEl.innerHTML = [...listeners.values()]
        .map(
          (L) =>
            `<div class="es-listener" data-id="${L.id}">
              <strong>${L.label}</strong> · <code>${L.event}</code>
              <button type="button" class="btn btn-ghost btn-sm es-off" data-id="${L.id}">off</button>
            </div>`
        )
        .join("");
      listEl.querySelectorAll(".es-off").forEach((b) => {
        b.addEventListener("click", () => {
          unsubscribe(/** @type {HTMLElement} */ (b).dataset.id || "");
        });
      });
    }
  }
  if (logEl) {
    logEl.innerHTML = log
      .map(
        (e) =>
          `<div class="es-log es-log-${e.type}">${e.msg}</div>`
      )
      .join("");
  }
}

// seed UI events
for (const ev of C.sampleEvents) {
  const o = document.createElement("option");
  o.value = ev;
  o.textContent = ev;
  eventSelect?.appendChild(o);
}

btnSub?.addEventListener("click", () => {
  const ev = eventSelect?.value || "PlayerHit";
  const labels = ["UI", "Sound", "Achievement", "Analytics", "VFX"];
  const label = labels[listenerSeq % labels.length];
  subscribe(ev, label);
  setStatus(`${label} が ${ev} を購読`);
});
btnEmit?.addEventListener("click", () => {
  emit(eventSelect?.value || "PlayerHit");
});
btnUnsub?.addEventListener("click", () => {
  // remove last for selected event
  const ev = eventSelect?.value;
  const list = [...listeners.values()].filter((L) => L.event === ev);
  if (list.length) unsubscribe(list[list.length - 1].id);
  else setStatus("解除する購読がありません");
});
btnClear?.addEventListener("click", () => {
  bus.clear();
  listeners.clear();
  log = [];
  render();
  setStatus("クリア");
});

loadTextSample(
  "../samples/EventSystemExample.cs",
  csharpSample,
  "// EventSystemExample.cs"
);

// demo seed
subscribe("PlayerHit", "UI");
subscribe("PlayerHit", "Sound");
subscribe("ItemPickup", "Inventory");
render();
setStatus("準備完了 — Emit で購読者へ配信");
