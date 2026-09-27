/**
 * platform モジュールの実行スモーク（Node 18+）
 *   node scripts/smoke-platform.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
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
  circleAabbOverlaps,
  circleAabbTunneled,
  resolveCircleAabbReflect,
  readSpeedScale,
  delayFromSpeedScale,
} from "../js/platform/index.js";
import { parseMap } from "../js/map-format.js";
import { TOPICS } from "../js/main.js";
import { STAGES, getCourseOrder } from "../js/courses/intro-stages.js";
import { EXERCISES } from "../js/courses/intro-exercises.js";
import { INTRO_QUIZ } from "../js/courses/intro-quiz.js";
import { GLOSSARY } from "../js/platform/glossary-terms.js";

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
assert.ok(NAV_GROUPS.course?.some((l) => l.id === "intro"));
assert.ok(FOOTER_RELATED.bfs?.length >= 1);
assert.ok(FOOTER_RELATED.intro?.length >= 1);

// --- url-params ---
function mockControl(kind, value, extra = {}) {
  const el = {
    value: String(value ?? ""),
    checked: !!extra.checked,
    min: extra.min ?? "",
    max: extra.max ?? "",
    step: extra.step ?? "",
    options: extra.options ?? null,
    events: [],
    getAttribute(name) {
      if (name === "min") return this.min;
      if (name === "max") return this.max;
      if (name === "step") return extra.step == null ? "" : String(extra.step);
      return null;
    },
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
  const vx = mockControl("range", "120", { min: "-240", max: "240", step: "5" });
  const vy = mockControl("range", "-40", { min: "-240", max: "240", step: "5" });
  const dt = mockControl("range", "16.7", { min: "5", max: "50", step: "0.5" });
  const bounce = mockControl("checkbox", "", { checked: true });
  const spec = {
    vx: { el: vx, kind: "range" },
    vy: { el: vy, kind: "range" },
    dt: { el: dt, kind: "range" },
    bounce: { el: bounce, kind: "checkbox" },
  };
  const r = applyParamsToControls(spec, "?vx=100&vy=-40&dt=10&bounce=1");
  assert.deepEqual(r.applied, ["vx", "vy", "dt", "bounce"]);
  assert.equal(vx.value, "100");
  assert.equal(vy.value, "-40");
  assert.equal(dt.value, "10");
  assert.equal(bounce.checked, true);

  const offStep = applyParamsToControls(
    { vx: { el: vx, kind: "range" } },
    "?vx=3"
  );
  assert.equal(vx.value, "100", "vx=3 must not snap to 5");
  assert.equal(offStep.rejected[0].reason, "step");
  assert.match(offStep.warning, /刻み幅5/);

  const bad = applyParamsToControls(
    { dt: { el: dt, kind: "range" } },
    "?dt=0.1"
  );
  assert.equal(dt.value, "10", "dt=0.1 must not clamp into 5–50ms");
  assert.equal(bad.rejected[0].reason, "range");

  const dtHalf = applyParamsToControls(
    { dt: { el: dt, kind: "range" } },
    "?dt=16.5"
  );
  assert.deepEqual(dtHalf.applied, ["dt"]);
  assert.equal(dt.value, "16.5");
}

{
  const g = mockControl("range", "600", { min: "0", max: "1200" });
  const vx = mockControl("range", "120", { min: "-240", max: "240" });
  const rest = mockControl("range", "0.75", { min: "0", max: "1" });
  const r = applyParamsToControls(
    {
      g: { el: g, kind: "range" },
      vx: { el: vx, kind: "range" },
      rest: { el: rest, kind: "range" },
    },
    "?g=20&vx=5&rest=0.2"
  );
  assert.deepEqual(r.applied, ["g", "vx", "rest"]);
  assert.equal(g.value, "20");
  assert.equal(vx.value, "5");
  assert.equal(rest.value, "0.2");
}

{
  const res = mockControl("select", "640x360", {
    options: ["640x360", "800x450", "480x320", "960x540"],
  });
  const anchor = mockControl("select", "bottom-right", {
    options: ["top-left", "top-right", "center", "bottom-right", "bottom-stretch"],
  });
  const px = mockControl("range", "0.5", { min: "0", max: "1" });
  const py = mockControl("range", "0.5", { min: "0", max: "1" });
  const r = applyParamsToControls(
    {
      res: { el: res, kind: "select" },
      anchor: { el: anchor, kind: "select" },
      px: { el: px, kind: "range" },
      py: { el: py, kind: "range" },
    },
    "?anchor=top-right&px=0.5&py=0.5"
  );
  assert.deepEqual(r.applied, ["anchor", "px", "py"]);
  assert.equal(anchor.value, "top-right");
  const nosuch = applyParamsToControls(
    { anchor: { el: anchor, kind: "select" } },
    "?anchor=nosuch"
  );
  assert.equal(anchor.value, "top-right");
  assert.equal(nosuch.rejected[0].reason, "option");
}

{
  const follow = mockControl("range", "0.08", {
    min: "0.02",
    max: "0.5",
    step: "0.01",
  });
  const dead = mockControl("range", "40", { min: "0", max: "160", step: "5" });
  const r = applyParamsToControls(
    {
      follow: { el: follow, kind: "range" },
      dead: { el: dead, kind: "range" },
    },
    "?follow=0.35&dead=60"
  );
  assert.deepEqual(r.applied, ["follow", "dead"]);
  assert.equal(follow.value, "0.35");
  assert.equal(dead.value, "60");

  const atMin = applyParamsToControls(
    { follow: { el: follow, kind: "range" } },
    "?follow=0.02"
  );
  assert.deepEqual(atMin.applied, ["follow"]);
  const atMax = applyParamsToControls(
    { follow: { el: follow, kind: "range" } },
    "?follow=0.5"
  );
  assert.deepEqual(atMax.applied, ["follow"]);
}

{
  const mode = mockControl("select", "fixed", {
    options: ["variable", "fixed"],
  });
  const dt = mockControl("range", "16.7", { min: "8", max: "33" });
  const lag = mockControl("range", "0", { min: "0", max: "80", step: "5" });
  const maxsteps = mockControl("range", "8", { min: "1", max: "16" });
  const r = applyParamsToControls(
    {
      mode: { el: mode, kind: "select" },
      dt: { el: dt, kind: "range" },
      lag: { el: lag, kind: "range" },
      maxsteps: { el: maxsteps, kind: "range" },
    },
    "?mode=fixed&dt=16.7&lag=10"
  );
  assert.deepEqual(r.applied, ["mode", "dt", "lag"]);
  assert.equal(lag.value, "10");
  const badDt = applyParamsToControls(
    { dt: { el: dt, kind: "range" } },
    "?dt=0.033"
  );
  assert.equal(dt.value, "16.7", "dt=0.033s must not clamp into 8–33ms");
  assert.equal(badDt.rejected[0].reason, "range");

  const badLag = applyParamsToControls(
    { lag: { el: lag, kind: "range" } },
    "?lag=1"
  );
  assert.equal(badLag.rejected[0].reason, "step");
  assert.equal(lag.value, "10", "lag=1 must not snap");
}

{
  const ev = mockControl("select", "Jump", {
    options: ["Jump", "Land", "Hit", "Pickup", "UI"],
  });
  const freq = mockControl("range", "440", { min: "80", max: "1200", step: "10" });
  const r = applyParamsToControls(
    {
      ev: { el: ev, kind: "select" },
      freq: { el: freq, kind: "range" },
    },
    "?ev=Hit&freq=200"
  );
  assert.deepEqual(r.applied, ["ev", "freq"]);
  assert.equal(ev.value, "Hit");
  assert.equal(freq.value, "200");
}

{
  const leaves = mockControl(
    "text",
    "5,3,7,9,4,2,1,3,6,8,7,4"
  );
  const depth = mockControl("select", "3", { options: ["1", "2", "3"] });
  const spec = {
    leaves: { el: leaves, kind: "text" },
    depth: { el: depth, kind: "select" },
  };
  const r = applyParamsToControls(
    spec,
    "?leaves=9,0,7,2,1,3,4,2,1,3,6,8&depth=2"
  );
  assert.deepEqual(r.applied, ["leaves", "depth"]);
  assert.equal(leaves.value, "9,0,7,2,1,3,4,2,1,3,6,8");
  assert.equal(depth.value, "2");
  const url = buildShareUrl(spec, "http://localhost/algorithms/minimax.html", {
    leaves: "5,3,7,9,4,2,1,3,6,8,7,4",
    depth: "3",
  });
  assert.match(url, /leaves=/);
  assert.match(url, /depth=2/);
}

{
  const initial = mockControl("select", "Idle", {
    options: ["Idle", "Walk", "Jump", "Attack", "Hurt", "Dead"],
  });
  const from = mockControl("select", "Idle", {
    options: ["Idle", "Walk", "Jump", "Attack", "Hurt", "Dead"],
  });
  const ev = mockControl("select", "Move", {
    options: ["Move", "Stop", "Jump", "Land", "Attack", "AttackEnd", "Hit", "Recover", "Kill"],
  });
  const to = mockControl("select", "Walk", {
    options: ["Idle", "Walk", "Jump", "Attack", "Hurt", "Dead"],
  });
  const script = mockControl(
    "text",
    "Move,Jump,Land,Attack,AttackEnd,Move,Hit,Recover,Attack,Kill"
  );
  const spec = {
    initial: { el: initial, kind: "select" },
    from: { el: from, kind: "select" },
    ev: { el: ev, kind: "select" },
    to: { el: to, kind: "select" },
    script: { el: script, kind: "text" },
  };
  const r = applyParamsToControls(
    spec,
    "?initial=Walk&from=Idle&ev=Move&to=Dead&script=Move,Hit"
  );
  assert.deepEqual(r.applied, ["initial", "from", "ev", "to", "script"]);
  assert.equal(initial.value, "Walk");
  assert.equal(to.value, "Dead");
  assert.equal(script.value, "Move,Hit");
}

{
  const ar = mockControl("range", "40", { min: "8", max: "160", step: "1" });
  const ax = mockControl("number", "180", { min: "0", max: "640", step: "1" });
  const r = applyParamsToControls(
    {
      ax: { el: ax, kind: "number" },
      ar: { el: ar, kind: "range" },
    },
    "?ax=200&ar=50"
  );
  assert.deepEqual(r.applied, ["ax", "ar"]);
  assert.equal(ax.value, "200");
  assert.equal(ar.value, "50");
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

{
  const box = { x: 100, y: 0, w: 10, h: 100 };
  assert.equal(circleAabbOverlaps(105, 50, 8, box), true);
  assert.equal(circleAabbOverlaps(40, 50, 8, box), false);
  assert.equal(circleAabbTunneled(40, 50, 180, 50, 8, box), true, "jump over thin wall");
  assert.equal(circleAabbTunneled(40, 50, 50, 50, 8, box), false);
  const hit = resolveCircleAabbReflect(105, 50, 80, 0, 8, box, 1);
  assert.equal(hit.hit, true);
  assert.ok(hit.vx < 0, "reflect vx");
  const miss = resolveCircleAabbReflect(40, 50, 80, 0, 8, box, 1);
  assert.equal(miss.hit, false);
  assert.equal(miss.vx, 80);
  assert.equal(readSpeedScale({ value: "0.1" }), 0.1);
  assert.equal(readSpeedScale({ value: "" }, 1), 1);
  const d = delayFromSpeedScale(200);
  assert.equal(d(1), 200);
  assert.equal(d(0.1), 2000);
}

// --- 入門コース: STAGES の全 id が TOPICS に存在し ready (入門コース改善計画 W2+W3) ---
{
  const order = getCourseOrder();
  assert.equal(order.length, 14, "course order has 14 topics");
  const byId = new Map(TOPICS.map((t) => [t.id, t]));
  for (const id of order) {
    const topic = byId.get(id);
    assert.ok(topic, `TOPICS has ${id}`);
    assert.equal(topic.ready, true, `${id} is ready`);
  }
  // alpha-beta は minimax と tic-tac-toe の間（§8 決定3・案1）
  const mi = order.indexOf("minimax");
  const ab = order.indexOf("alpha-beta");
  const ttt = order.indexOf("tic-tac-toe");
  assert.equal(ab, mi + 1, "alpha-beta directly follows minimax");
  assert.equal(ttt, ab + 1, "tic-tac-toe directly follows alpha-beta");
  // 1本目は前なし、14本目は次なし（前後関係）
  assert.equal(order[0], "game-loop");
  assert.equal(order[order.length - 1], "tic-tac-toe");
}

// --- 入門コース: intro-exercises.js が STAGES の全 id を網羅し、各カードに
//     目標・予想・手順・期待される観察がある ---
{
  const order = getCourseOrder();
  for (const id of order) {
    const card = EXERCISES[id];
    assert.ok(card, `EXERCISES has a card for ${id}`);
    assert.ok(card.goal && card.goal.length > 0, `${id}: goal`);
    assert.ok(card.guess && card.guess.length > 0, `${id}: guess`);
    assert.ok(Array.isArray(card.steps) && card.steps.length > 0, `${id}: steps`);
    assert.ok(
      Array.isArray(card.observations) && card.observations.length > 0,
      `${id}: observations`
    );
  }
  // STAGES と EXERCISES で id の重複・欠落が無いこと
  assert.deepEqual(
    [...order].sort(),
    Object.keys(EXERCISES).sort(),
    "EXERCISES has exactly the course's 14 ids (no extra, no missing)"
  );
}

// --- 入門コース: 課題カード内の URL のクエリキーが、そのトピックの
//     URL spec（js/<id>.js の `key: { el: ... }`）に存在する（course を除く） ---
{
  const specKeyCache = new Map();
  function specKeysFor(id) {
    if (specKeyCache.has(id)) return specKeyCache.get(id);
    const path = fileURLToPath(new URL(`../js/${id}.js`, import.meta.url));
    const text = fs.readFileSync(path, "utf8");
    const keys = new Set();
    const re = /(?:^|[\s{,])([A-Za-z][\w-]*)\s*:\s*\{\s*el:/g;
    let m;
    while ((m = re.exec(text))) keys.add(m[1]);
    specKeyCache.set(id, keys);
    return keys;
  }

  function cardText(card) {
    return [
      card.goal,
      card.guess,
      card.stepsIntro,
      ...(card.steps || []),
      ...(card.observations || []),
      card.extension,
      card.scope,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // `` `xxx.html?a=1&b=2` `` の形だけを URL として拾う（他の `` `code` `` は対象外）
  function extractUrls(text) {
    const urls = [];
    const re = /`([^`]*\.html(?:\?[^`]*)?)`/g;
    let m;
    while ((m = re.exec(text))) urls.push(m[1]);
    return urls;
  }

  for (const id of getCourseOrder()) {
    const card = EXERCISES[id];
    const specKeys = specKeysFor(id);
    const urls = extractUrls(cardText(card));
    for (const url of urls) {
      const qIndex = url.indexOf("?");
      if (qIndex === -1) continue; // クエリ無し（例: `alpha-beta.html`）
      const query = url.slice(qIndex + 1);
      const params = new URLSearchParams(query);
      for (const key of params.keys()) {
        if (key === "course") continue; // コースパラメータは spec 対象外
        assert.ok(
          specKeys.has(key),
          `${id}: URL param "${key}" (in \`${url}\`) must exist in js/${id}.js URL spec`
        );
      }
    }
  }
}

// --- コピー URL: course=intro を維持する／コース外では付けない ---
{
  const withCourse = mockControl("range", "50", { min: "0", max: "100" });
  const spec = { x: { el: withCourse, kind: "range" } };
  const inCourse = buildShareUrl(
    spec,
    "https://example.test/algorithms/game-loop.html?course=intro&x=10",
    { x: "10" }
  );
  assert.ok(
    new URL(inCourse).searchParams.get("course") === "intro",
    "buildShareUrl keeps course=intro when opened from the course"
  );
  const outsideCourse = buildShareUrl(
    spec,
    "https://example.test/algorithms/game-loop.html?x=10",
    { x: "10" }
  );
  assert.equal(
    new URL(outsideCourse).searchParams.has("course"),
    false,
    "buildShareUrl does not add course when opened outside the course"
  );
}

// --- 入門コース: 確認問題（計画書 §10・P1-5）。段ごとに 2〜3 問、4択、正解は1つ、解説あり ---
{
  const stageIds = STAGES.map((st) => st.id);
  assert.ok(stageIds.every((id) => typeof id === "string" && id.length > 0), "every STAGE has an id");
  assert.equal(new Set(stageIds).size, stageIds.length, "STAGE ids are unique");
  assert.deepEqual(Object.keys(INTRO_QUIZ).sort(), [...stageIds].sort(), "INTRO_QUIZ covers exactly the course stages");
  for (const id of stageIds) {
    const qs = INTRO_QUIZ[id];
    assert.ok(qs.length >= 2 && qs.length <= 3, `quiz ${id}: 2〜3 問（実際 ${qs.length}）`);
    qs.forEach((q, i) => {
      assert.ok(q.text && q.explain, `quiz ${id}#${i + 1}: 問題文と解説がある`);
      assert.equal(q.choices.length, 4, `quiz ${id}#${i + 1}: 4択`);
      assert.equal(new Set(q.choices).size, 4, `quiz ${id}#${i + 1}: 選択肢が重複しない`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `quiz ${id}#${i + 1}: 正解の添字が 0〜3`);
    });
  }
}

// --- 用語注: HTML と JS で使う data-term / termHtml のキーが辞書にあること。辞書の各項目に語と説明があること ---
{
  const root = fileURLToPath(new URL("..", import.meta.url));
  for (const [key, e] of Object.entries(GLOSSARY)) {
    assert.ok(e.term && e.text && e.text.length >= 20, `glossary ${key}: 語と説明がある`);
  }
  const files = [
    ...fs.readdirSync(`${root}/algorithms`).map((f) => `${root}/algorithms/${f}`),
    ...fs.readdirSync(`${root}/js`).filter((f) => f.endsWith(".js")).map((f) => `${root}/js/${f}`),
  ].filter((f) => /\.(html|js)$/.test(f));
  let used = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    const keys = [
      ...[...text.matchAll(/data-term="([^"$]+)"/g)].map((m) => m[1]),
      ...[...text.matchAll(/termHtml\("([^"]+)"/g)].map((m) => m[1]),
    ];
    for (const k of keys) {
      used += 1;
      assert.ok(GLOSSARY[k], `${f.slice(root.length)}: 用語 "${k}" が辞書にある`);
    }
  }
  assert.ok(used > 0, "用語注が少なくとも1つ使われている");
}

console.log("smoke-platform.mjs: all assertions passed");
