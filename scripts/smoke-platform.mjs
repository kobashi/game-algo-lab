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

console.log("smoke-platform.mjs: all assertions passed");
