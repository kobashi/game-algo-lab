/**
 * platform モジュールの実行スモーク（Node 18+）
 *   node scripts/smoke-platform.mjs
 */
import assert from "node:assert/strict";
import {
  mulberry32,
  randomIndex,
  layoutTree,
  createGridOps,
  PF,
  parsePaintMode,
  FOOTER_RELATED,
  NAV_GROUPS,
  applyParamsToControls,
  buildShareUrl,
  captureParamDefaults,
} from "../js/platform/index.js";
import { parseMap } from "../js/map-format.js";

// --- rng ---
const r1 = mulberry32(42);
const r2 = mulberry32(42);
const a = [r1(), r1(), r1()];
const b = [r2(), r2(), r2()];
assert.deepEqual(a, b, "mulberry32 is deterministic");
assert.ok(a.every((x) => x >= 0 && x < 1));

const idxes = new Set();
const rng = mulberry32(7);
for (let i = 0; i < 50; i++) idxes.add(randomIndex(rng, 5));
assert.ok(idxes.size >= 2, "randomIndex spreads");

// --- grid ops ---
const grid = createGridOps(PF.COLS, PF.ROWS);
assert.equal(grid.key(2, 3), "2,3");
assert.equal(grid.inBounds(0, 0), true);
assert.equal(grid.inBounds(-1, 0), false);
const walls = Array.from({ length: PF.ROWS }, () =>
  Array(PF.COLS).fill(false)
);
walls[0][1] = true;
const ns = grid.neighbors(0, 0, walls);
assert.ok(ns.every((p) => !(p.x === 1 && p.y === 0)), "wall blocks neighbor");

// --- tree layout ---
const tree = {
  r: { children: ["a", "b"] },
  a: { children: [] },
  b: { children: ["c"] },
  c: { children: [] },
};
const laid = layoutTree(tree, "r");
assert.ok(laid.layout.r && laid.layout.c);
assert.ok(laid.width > 0 && laid.height > 0);

// --- paint mode parse ---
assert.equal(parsePaintMode("wall"), "wall");
assert.equal(parsePaintMode("goal"), "goal");
assert.equal(parsePaintMode("2"), 2);

// --- map-format multi goal ---
const map = parseMap(`
S.G
.G.
`);
assert.equal(map.goals.length, 2);
assert.ok(map.start);
assert.equal(map.goal.x, map.goals[0].x);

// --- shell tables ---
assert.ok(NAV_GROUPS.pathfinding.length >= 5);
assert.ok(FOOTER_RELATED.bfs?.length >= 1);

// --- url-params ---
function mockControl(kind, value, extra = {}) {
  const el = {
    value: String(value ?? ""),
    checked: !!extra.checked,
    min: extra.min ?? "",
    max: extra.max ?? "",
    options: extra.options ?? null,
    events: [],
    querySelectorAll(sel) {
      if (sel === "option" && this.options) return this.options;
      return [];
    },
    dispatchEvent(ev) {
      this.events.push(ev.type);
      if (typeof extra.onEvent === "function") extra.onEvent(ev, this);
      return true;
    },
  };
  if (kind === "select") {
    el.options = (extra.options ?? []).map((v) => ({ value: v }));
  }
  return el;
}

{
  const n = mockControl("range", "48", { min: "4", max: "128" });
  const algo = mockControl("select", "mulberry32", {
    options: ["mulberry32", "lcg", "xorshift32"],
  });
  const seed = mockControl("number", "42", { min: "0", max: "4294967295" });
  const spec = {
    algo: { el: algo, kind: "select" },
    seed: { el: seed, kind: "number" },
    n: { el: n, kind: "range" },
  };
  const r = applyParamsToControls(
    spec,
    "?algo=lcg&a=13&c=5&m=24&seed=0&n=64"
  );
  assert.deepEqual(r.applied, ["algo", "seed", "n"]);
  assert.equal(r.rejected.length, 0);
  assert.equal(r.warning, null);
  assert.equal(algo.value, "lcg");
  assert.equal(seed.value, "0");
  assert.equal(n.value, "64");
  assert.deepEqual(n.events, ["input", "change"]);
}

{
  const n = mockControl("range", "48", { min: "4", max: "128" });
  const r = applyParamsToControls(
    { n: { el: n, kind: "range" } },
    "?n=999"
  );
  assert.equal(n.value, "48", "out-of-range must not clamp");
  assert.equal(r.applied.length, 0);
  assert.equal(r.rejected[0].reason, "range");
  assert.match(r.warning, /n=999/);
  assert.match(r.warning, /4〜128/);
}

{
  const algo = mockControl("select", "mulberry32", {
    options: ["mulberry32", "lcg"],
  });
  const r = applyParamsToControls(
    { algo: { el: algo, kind: "select" } },
    "?algo=nosuch"
  );
  assert.equal(algo.value, "mulberry32");
  assert.equal(r.rejected[0].reason, "option");
  assert.match(r.warning, /algo=nosuch/);
}

{
  const aEl = mockControl("number", "5", { min: "0" });
  const preset = mockControl("select", "tiny-bad", {
    options: ["tiny-bad", "m64-ok"],
    onEvent(ev) {
      if (ev.type === "change") aEl.value = "99";
    },
  });
  const spec = {
    preset: { el: preset, kind: "select" },
    a: { el: aEl, kind: "number" },
  };
  const r = applyParamsToControls(spec, "?preset=m64-ok&a=13");
  assert.deepEqual(r.applied, ["preset", "a"]);
  assert.equal(preset.value, "m64-ok");
  assert.equal(aEl.value, "13", "individual a must win over preset");
}

{
  const coyote = mockControl("checkbox", "", { checked: true });
  const ms = mockControl("range", "120", { min: "0", max: "400" });
  const spec = {
    coyote: { el: coyote, kind: "checkbox" },
    ms: { el: ms, kind: "range" },
  };
  const r = applyParamsToControls(spec, "?coyote=1&ms=200");
  assert.equal(coyote.checked, true);
  assert.equal(ms.value, "200");
  assert.equal(r.rejected.length, 0);

  const off = applyParamsToControls(
    { coyote: { el: coyote, kind: "checkbox" } },
    "?coyote=0"
  );
  assert.equal(coyote.checked, false);
  assert.deepEqual(off.applied, ["coyote"]);

  const bad = applyParamsToControls(
    { coyote: { el: coyote, kind: "checkbox" } },
    "?coyote=maybe"
  );
  assert.equal(coyote.checked, false, "invalid checkbox keeps current");
  assert.equal(bad.rejected[0].reason, "checkbox");
}

{
  const ab = mockControl("checkbox", "", { checked: false });
  const memo = mockControl("checkbox", "", { checked: false });
  const sym = mockControl("checkbox", "", { checked: false });
  const r = applyParamsToControls(
    {
      ab: { el: ab, kind: "checkbox" },
      memo: { el: memo, kind: "checkbox" },
      sym: { el: sym, kind: "checkbox" },
    },
    "?ab=1&memo=1&sym=0"
  );
  assert.equal(ab.checked, true);
  assert.equal(memo.checked, true);
  assert.equal(sym.checked, false);
  assert.deepEqual(r.applied, ["ab", "memo", "sym"]);
}

{
  const n = mockControl("range", "48", { min: "4", max: "128" });
  const r = applyParamsToControls({ n: { el: n, kind: "range" } }, "");
  assert.equal(n.value, "48");
  assert.equal(r.applied.length, 0);
  assert.equal(r.rejected.length, 0);
  assert.equal(n.events.length, 0);
}

{
  const coyote = mockControl("checkbox", "", { checked: true });
  const ms = mockControl("range", "120", { min: "0", max: "400" });
  const spec = {
    coyote: { el: coyote, kind: "checkbox" },
    ms: { el: ms, kind: "range" },
  };
  const defaults = captureParamDefaults(spec);
  const urlDefault = buildShareUrl(
    spec,
    "http://localhost:8080/algorithms/coyote-time.html",
    defaults
  );
  assert.equal(
    urlDefault,
    "http://localhost:8080/algorithms/coyote-time.html"
  );

  coyote.checked = false;
  ms.value = "200";
  const urlChanged = buildShareUrl(
    spec,
    "http://localhost:8080/algorithms/coyote-time.html?utm=1",
    defaults
  );
  const parsed = new URL(urlChanged);
  assert.equal(parsed.searchParams.get("coyote"), "0");
  assert.equal(parsed.searchParams.get("ms"), "200");
  assert.equal(parsed.searchParams.has("utm"), false);
}

{
  // 授業課題の例 (a=13,c=5,m=24,seed=0) は Hull–Dobell を満たし周期 24
  function lcgPeriod(seed, a, c, m) {
    let x = ((seed % m) + m) % m;
    const seen = new Map([[x, 0]]);
    for (let i = 1; i <= m + 2; i++) {
      x = (a * x + c) % m;
      if (seen.has(x)) return i - seen.get(x);
      seen.set(x, i);
    }
    return null;
  }
  assert.equal(lcgPeriod(0, 13, 5, 24), 24);
}

console.log("smoke-platform.mjs: all assertions passed");
