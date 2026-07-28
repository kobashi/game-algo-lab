/**
 * DB トランザクション — 購入 COMMIT / ROLLBACK
 */
import { NET_DB_TRANSACTION_CONFIG as C } from "./maps/net-db-transaction-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const stateEl = document.getElementById("db-state");
const logEl = document.getElementById("db-log");
const scenarioEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("scenario")
);
const btnBuy = document.getElementById("btn-buy");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ gold: number, stock: number, inventory: number }} DbState */

/** @type {DbState} */
let committed = {
  gold: C.startGold,
  stock: C.startStock,
  inventory: 0,
};
/** @type {string[]} */
let logs = [];

/**
 * Run purchase in a transaction snapshot.
 * @param {DbState} base
 * @param {'ok'|'nostock'|'fail'} scenario
 * @param {number} price
 * @returns {{ ok: boolean, final: DbState, steps: string[] }}
 */
export function purchaseTx(base, scenario, price) {
  const steps = [];
  /** working copy */
  const w = { ...base };
  steps.push("BEGIN");
  steps.push(`SELECT gold=${w.gold}, stock=${w.stock}`);

  if (scenario === "nostock" || w.stock <= 0) {
    steps.push("CHECK stock → FAIL (在庫なし)");
    steps.push("ROLLBACK");
    return { ok: false, final: { ...base }, steps };
  }
  if (w.gold < price) {
    steps.push("CHECK gold → FAIL (残高不足)");
    steps.push("ROLLBACK");
    return { ok: false, final: { ...base }, steps };
  }

  w.gold -= price;
  steps.push(`UPDATE gold → ${w.gold}`);
  w.stock -= 1;
  steps.push(`UPDATE stock → ${w.stock}`);
  w.inventory += 1;
  steps.push(`UPDATE inventory → ${w.inventory}`);

  if (scenario === "fail") {
    steps.push("模擬エラー（通信/制約違反）");
    steps.push("ROLLBACK");
    return { ok: false, final: { ...base }, steps };
  }

  steps.push("COMMIT");
  return { ok: true, final: w, steps };
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 40) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => {
        const cls =
          m.includes("COMMIT")
            ? "es-log"
            : m.includes("ROLLBACK") || m.includes("FAIL")
              ? "es-log es-log-sub"
              : "es-log es-log-sub";
        return `<div class="${cls}">${m}</div>`;
      })
      .join("");
  }
}

function renderState() {
  if (!stateEl) return;
  stateEl.innerHTML = `
    <table class="coord-table">
      <tr><td>ゴールド</td><td>${committed.gold}</td></tr>
      <tr><td>${C.itemName} 在庫</td><td>${committed.stock}</td></tr>
      <tr><td>所持 ${C.itemName}</td><td>${committed.inventory}</td></tr>
      <tr><td>価格</td><td>${C.price}</td></tr>
    </table>`;
}

function buy() {
  const scenario = /** @type {'ok'|'nostock'|'fail'} */ (
    scenarioEl?.value || "ok"
  );
  const r = purchaseTx(committed, scenario, C.price);
  for (const s of r.steps) pushLog(s);
  if (r.ok) {
    committed = r.final;
    setStatus("COMMIT 成功");
  } else {
    setStatus("ROLLBACK — 状態は変更なし");
  }
  renderState();
}

function reset() {
  committed = {
    gold: C.startGold,
    stock: C.startStock,
    inventory: 0,
  };
  logs = [];
  if (logEl) logEl.innerHTML = "";
  renderState();
  setStatus("リセット");
}

btnBuy?.addEventListener("click", buy);
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/NetDbTransactionExample.cs",
  csharpSample,
  "// NetDbTransactionExample.cs"
);
renderState();
setStatus("シナリオを選んで購入");
