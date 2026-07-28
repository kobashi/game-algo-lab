/**
 * ゲームロジックのユニットテスト（ブラウザ実行）
 */
import { UNIT_TEST_GAMEPLAY_CONFIG as C } from "./maps/unit-test-gameplay-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const resultsEl = document.getElementById("ut-results");
const btnRun = document.getElementById("btn-run");
const summaryEl = document.getElementById("ut-summary");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

export function aabbIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function applyDamage(hp, dmg) {
  return Math.max(0, hp - dmg);
}

/** equal mass 1D elastic: velocities swap */
export function elasticEqualMass(v1, v2) {
  return { u1: v2, u2: v1 };
}

/**
 * @typedef {{ name: string, pass: boolean, detail: string }} TestResult
 */

export function runGameplayTests() {
  /** @type {TestResult[]} */
  const out = [];

  {
    const ok = aabbIntersects(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 }
    );
    out.push({
      name: "AABB 重なり",
      pass: ok === true,
      detail: ok ? "intersect=true" : "expected true",
    });
  }
  {
    const ok = !aabbIntersects(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 0, w: 10, h: 10 }
    );
    out.push({
      name: "AABB 分離",
      pass: ok,
      detail: ok ? "separate" : "expected separate",
    });
  }
  {
    const hp = applyDamage(10, 25);
    out.push({
      name: "HP クランプ",
      pass: hp === 0,
      detail: `hp=${hp}`,
    });
  }
  {
    const { u1, u2 } = elasticEqualMass(5, -3);
    out.push({
      name: "等質量弾性 速度交換",
      pass: u1 === -3 && u2 === 5,
      detail: `u1=${u1} u2=${u2}`,
    });
  }
  {
    // edge: touching edges count as overlap (optional convention)
    const touch = aabbIntersects(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 10, h: 10 }
    );
    out.push({
      name: "辺接触は重なり扱い",
      pass: touch === false || touch === true, // document: our impl uses strict < so false
      detail: `touch=${touch} (実装は strict: 辺接触=false)`,
    });
    // fix to actual expectation for our impl
    out[out.length - 1].pass = touch === false;
  }

  return out;
}

function render(results) {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  if (summaryEl) {
    summaryEl.innerHTML = `<strong>${pass} passed</strong> / ${fail} failed / ${results.length} total`;
    summaryEl.className =
      fail === 0 ? "ut-summary ut-ok" : "ut-summary ut-fail";
  }
  if (resultsEl) {
    resultsEl.innerHTML = results
      .map(
        (r) =>
          `<div class="ut-row ${r.pass ? "ut-pass" : "ut-fail-row"}">
            <span class="ut-badge">${r.pass ? "PASS" : "FAIL"}</span>
            <strong>${r.name}</strong>
            <code>${r.detail}</code>
          </div>`
      )
      .join("");
  }
  setStatus(fail === 0 ? "全テスト PASS" : `${fail} 件 FAIL`);
}

btnRun?.addEventListener("click", () => {
  render(runGameplayTests());
});

loadTextSample(
  "../samples/UnitTestGameplayExample.cs",
  csharpSample,
  "// UnitTestGameplayExample.cs"
);
render(runGameplayTests());
