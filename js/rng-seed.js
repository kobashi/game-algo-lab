/**
 * 乱数とシード — Mulberry32 / XorShift32 / LCG 切替
 * @see docs/topics/rng-seed/SPEC.md
 */

import {
  RNG_SEED_CONFIG as C,
  LCG_PRESETS,
  XORSHIFT_PRESETS,
  ALGO_OPTIONS,
} from "./maps/rng-seed-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rng-canvas")
);
const ctx = canvas.getContext("2d");
const listEl = document.getElementById("rng-list");
const periodPanel = document.getElementById("period-panel");
const algoEl = /** @type {HTMLSelectElement} */ (document.getElementById("algo"));
const algoBlurb = document.getElementById("algo-blurb");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const countEl = /** @type {HTMLInputElement} */ (document.getElementById("count"));
const countVal = document.getElementById("count-val");
const xsPanel = document.getElementById("xs-panel");
const xsPresetEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("xs-preset")
);
const xsPresetBlurb = document.getElementById("xs-preset-blurb");
const xsAEl = /** @type {HTMLInputElement} */ (document.getElementById("xs-a"));
const xsBEl = /** @type {HTMLInputElement} */ (document.getElementById("xs-b"));
const xsCEl = /** @type {HTMLInputElement} */ (document.getElementById("xs-c"));
const lcgPanel = document.getElementById("lcg-panel");
const lcgPresetEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("lcg-preset")
);
const lcgPresetBlurb = document.getElementById("lcg-preset-blurb");
const lcgAEl = /** @type {HTMLInputElement} */ (document.getElementById("lcg-a"));
const lcgCEl = /** @type {HTMLInputElement} */ (document.getElementById("lcg-c"));
const lcgMEl = /** @type {HTMLInputElement} */ (document.getElementById("lcg-m"));
const btnGen = document.getElementById("btn-gen");
const btnRegen = document.getElementById("btn-regen");
const btnSeedPlus = document.getElementById("btn-seed-plus");
const btnSeedRand = document.getElementById("btn-seed-rand");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/** @type {number[]} */
let samples = [];
/** @type {number[] | null} */
let previousSamples = null;
/** @type {string} */
let lastAlgo = C.defaultAlgo;
/** @type {number | null} */
let lastPeriod = null;
/** @type {string} */
let lastPeriodNote = "";

/* ---- PRNG factories: each returns () => number in [0,1) ---- */

/**
 * XorShift32 with triple (sa, sb, sc)
 * @param {number} seed
 * @param {number} sa
 * @param {number} sb
 * @param {number} sc
 * @returns {() => number}
 */
function createXorShift32(seed, sa = 13, sb = 17, sc = 5) {
  let x = seed >>> 0;
  if (x === 0) x = 0x9e3779b9;
  const a = Math.min(31, Math.max(0, sa | 0));
  const b = Math.min(31, Math.max(0, sb | 0));
  const c = Math.min(31, Math.max(0, sc | 0));
  return function next() {
    x ^= (x << a) >>> 0;
    x >>>= 0;
    x ^= x >>> b;
    x >>>= 0;
    x ^= (x << c) >>> 0;
    x >>>= 0;
    return x / 4294967296;
  };
}

/**
 * 短い周期の検出（最大 maxSteps）。見つからなければ null。
 * @param {number} seed
 * @param {number} sa
 * @param {number} sb
 * @param {number} sc
 * @param {number} [maxSteps]
 */
function measureXorShiftPeriod(seed, sa, sb, sc, maxSteps = 1 << 20) {
  let x = seed >>> 0;
  if (x === 0) {
    return {
      period: 1,
      note: "seed=0 は全ゼロ固定点（周期 1）。実装では別値にずらします。",
    };
  }
  const a = Math.min(31, Math.max(0, sa | 0));
  const b = Math.min(31, Math.max(0, sb | 0));
  const c = Math.min(31, Math.max(0, sc | 0));
  const x0 = x;
  const seen = new Map();
  seen.set(x, 0);
  for (let i = 1; i <= maxSteps; i++) {
    x ^= (x << a) >>> 0;
    x >>>= 0;
    x ^= x >>> b;
    x >>>= 0;
    x ^= (x << c) >>> 0;
    x >>>= 0;
    if (seen.has(x)) {
      const first = /** @type {number} */ (seen.get(x));
      const period = i - first;
      return {
        period,
        note:
          period < 1000
            ? `短い周期 ${period} を検出（シフト組が弱い可能性）。`
            : `周期候補 ${period}（先頭 ${maxSteps} ステップ以内でループ検出）。`,
      };
    }
    // メモリ節約: 最初の状態への復帰のみ厳密に見る場合
    if (x === x0) {
      return {
        period: i,
        note: `初期状態に ${i} ステップで復帰（周期 ${i}）。`,
      };
    }
    if (i < 65536) seen.set(x, i);
  }
  return {
    period: null,
    note: `${maxSteps} ステップ以内に短いループは見つかりませんでした（大きな周期の可能性）。`,
  };
}

/**
 * LCG: X' = (a*X + c) mod m
 * 戻り値は u = X/m ∈ [0,1)（m が 2^32 のときは >>>0 で扱う）
 * @param {number} seed
 * @param {number} a
 * @param {number} c
 * @param {number} m
 * @returns {() => number}
 */
function createLcg(seed, a, c, m) {
  const useBig = m > 0x100000000 || m === 0x100000000;
  // JS Number は 2^53 まで整数正確。m=2^32 は OK。それ以上は BigInt 不要（m max 2^32 in presets）
  let x = ((seed % m) + m) % m;
  if (!Number.isFinite(x)) x = 1;
  // 乗算が 2^53 を超えうる: a*x を注意。m=2^32, a~1e9, x~2^32 → 1e9*4e9=4e18 > 2^53
  // 安全のため (a*x + c) mod m を分割
  return function next() {
    if (m <= 0x1000000) {
      // 小さい m: そのまま
      x = (a * x + c) % m;
    } else {
      // 中規模: 乗算を mod 内で
      x = mulMod(a, x, m);
      x = (x + (c % m)) % m;
    }
    if (x < 0) x += m;
    return x / m;
  };
}

/**
 * (a * x) mod m — m が 2^32 以下想定
 * @param {number} a
 * @param {number} x
 * @param {number} m
 */
function mulMod(a, x, m) {
  // 安全な積: BigInt を使って正確に
  const r = (BigInt(a) * BigInt(x) + BigInt(0)) % BigInt(m);
  return Number(r);
}

/**
 * LCG の周期: 初期状態に戻るまでの長さ（m が小さいとき）
 * @param {number} seed
 * @param {number} a
 * @param {number} c
 * @param {number} m
 * @returns {{ period: number | null, note: string }}
 */
function measureLcgPeriod(seed, a, c, m) {
  if (m > C.periodScanMaxM) {
    return {
      period: null,
      note: `m=${m} は大きすぎるため周期を全列挙しません（理論上 ≤ m）。短いサンプルのヒストグラムで様子を見てください。`,
    };
  }
  if (m < 2) {
    return { period: null, note: "m は 2 以上が必要です。" };
  }
  let x0 = ((seed % m) + m) % m;
  // c=0 のとき seed=0 は固定点
  if (c === 0 && x0 === 0) {
    return {
      period: 1,
      note: "c=0 かつ seed=0 は常に 0 に留まる（周期 1・退化）。",
    };
  }
  let x = x0;
  const seen = new Map();
  seen.set(x, 0);
  const maxSteps = m + 2;
  for (let i = 1; i <= maxSteps; i++) {
    if (m <= 0x1000000) x = (a * x + c) % m;
    else {
      x = mulMod(a, x, m);
      x = (x + (c % m)) % m;
    }
    if (x < 0) x += m;
    if (seen.has(x)) {
      const first = /** @type {number} */ (seen.get(x));
      const period = i - first;
      const full = period === m || (c === 0 && period === m - 1);
      return {
        period,
        note: full
          ? `計測周期 = ${period}（状態空間のほぼ最大: m=${m}${c === 0 ? " のとき最大 m-1" : ""}）`
          : `計測周期 = ${period}（m=${m} より短い。パラメータがフル周期条件を満たしていない可能性）`,
      };
    }
    seen.set(x, i);
  }
  return { period: null, note: "周期を検出できませんでした。" };
}

/**
 * Hull–Dobell の簡易チェック（教材用・厳密証明ではない）
 * @param {number} a
 * @param {number} c
 * @param {number} m
 */
function hullDobellHint(a, c, m) {
  if (c === 0) {
    return "c=0（乗算合同）: フル周期は高々 m-1。seed≠0 が必要。";
  }
  // gcd(c,m)==1
  const g = gcd(c, m);
  const tips = [];
  if (g !== 1) tips.push(`gcd(c,m)=${g} ≠ 1 → フル周期 m は期待しにくい`);
  else tips.push("gcd(c,m)=1 ✓");
  if (m % 4 === 0 && (a - 1) % 4 !== 0) {
    tips.push("m が 4 の倍数なのに a-1 が 4 の倍数でない → 条件不足の可能性");
  }
  return tips.join(" · ");
}

function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function readAlgo() {
  return algoEl?.value || C.defaultAlgo;
}

function readSeed() {
  let s = Math.floor(Number(seedEl?.value));
  if (!Number.isFinite(s)) s = C.defaultSeed;
  // LCG は 0 許容。xorshift/mulberry は 0 を内部でずらす
  if (s < 0) s = 0;
  return s >>> 0;
}

function readN() {
  return Math.min(
    C.maxN,
    Math.max(C.minN, Math.floor(Number(countEl?.value) || C.defaultN))
  );
}

function readLcgParams() {
  let a = Math.floor(Number(lcgAEl?.value));
  let c = Math.floor(Number(lcgCEl?.value));
  let m = Math.floor(Number(lcgMEl?.value));
  if (!Number.isFinite(a) || a < 0) a = 5;
  if (!Number.isFinite(c) || c < 0) c = 1;
  if (!Number.isFinite(m) || m < 2) m = 16;
  // JS 安全: m は 2^32 まで
  if (m > 0x100000000) m = 0x100000000;
  return { a, c, m };
}

function readXsParams() {
  let a = Math.floor(Number(xsAEl?.value));
  let b = Math.floor(Number(xsBEl?.value));
  let c = Math.floor(Number(xsCEl?.value));
  if (!Number.isFinite(a)) a = 13;
  if (!Number.isFinite(b)) b = 17;
  if (!Number.isFinite(c)) c = 5;
  a = Math.min(31, Math.max(0, a));
  b = Math.min(31, Math.max(0, b));
  c = Math.min(31, Math.max(0, c));
  return { a, b, c };
}

/**
 * @returns {() => number}
 */
function createRng() {
  const algo = readAlgo();
  const seed = readSeed();
  if (algo === "xorshift32") {
    const { a, b, c } = readXsParams();
    return createXorShift32(seed, a, b, c);
  }
  if (algo === "lcg") {
    const { a, c, m } = readLcgParams();
    return createLcg(seed, a, c, m);
  }
  return mulberry32(seed === 0 ? 1 : seed);
}

/**
 * @param {number} n
 * @returns {number[]}
 */
function generate(n) {
  const rng = createRng();
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(rng());
  return xs;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function syncParamPanels() {
  const algo = readAlgo();
  if (lcgPanel) lcgPanel.hidden = algo !== "lcg";
  if (xsPanel) xsPanel.hidden = algo !== "xorshift32";
  const opt = ALGO_OPTIONS.find((o) => o.id === algo);
  if (algoBlurb) algoBlurb.textContent = opt?.blurb || "";
}

/**
 * @param {string} presetId
 * @param {{ setSeed?: boolean }} [opts]
 */
function applyLcgPreset(presetId, opts = {}) {
  const p = LCG_PRESETS.find((x) => x.id === presetId) || LCG_PRESETS[0];
  if (lcgAEl) lcgAEl.value = String(p.a);
  if (lcgCEl) lcgCEl.value = String(p.c);
  if (lcgMEl) lcgMEl.value = String(p.m);
  if (lcgPresetBlurb) {
    const q =
      p.quality === "bad"
        ? "質が悪い例"
        : p.quality === "ok"
          ? "教材・許容範囲"
          : "実用寄り";
    lcgPresetBlurb.textContent = `【${q}】${p.blurb}`;
  }
  if (opts.setSeed && p.defaultSeed != null && seedEl) {
    seedEl.value = String(p.defaultSeed);
  }
}

/**
 * @param {string} presetId
 * @param {{ setSeed?: boolean }} [opts]
 */
function applyXsPreset(presetId, opts = {}) {
  const p =
    XORSHIFT_PRESETS.find((x) => x.id === presetId) || XORSHIFT_PRESETS[2];
  if (xsAEl) xsAEl.value = String(p.a);
  if (xsBEl) xsBEl.value = String(p.b);
  if (xsCEl) xsCEl.value = String(p.c);
  if (xsPresetBlurb) {
    const q =
      p.quality === "bad"
        ? "質が悪い例"
        : p.quality === "ok"
          ? "教材・許容"
          : "標準・良好";
    xsPresetBlurb.textContent = `【${q}】${p.blurb}`;
  }
  if (opts.setSeed && p.defaultSeed != null && seedEl) {
    seedEl.value = String(p.defaultSeed);
  }
}

function syncLabels() {
  if (countVal) countVal.textContent = String(readN());
}

/**
 * @param {'fresh' | 'regen' | 'newseed' | 'algo'} reason
 */
function runGenerate(reason) {
  const n = readN();
  const algo = readAlgo();
  const seed = readSeed();
  previousSamples = samples.length ? samples.slice() : null;
  samples = generate(n);
  lastAlgo = algo;

  if (algo === "lcg") {
    const { a, c, m } = readLcgParams();
    const measured = measureLcgPeriod(seed, a, c, m);
    lastPeriod = measured.period;
    lastPeriodNote = measured.note;
    const hint = hullDobellHint(a, c, m);
    const qClass =
      lastPeriod != null && lastPeriod < Math.min(m, 32)
        ? "bad"
        : lastPeriod != null && lastPeriod >= m * 0.9
          ? "good"
          : "ok";
    if (periodPanel) {
      periodPanel.hidden = false;
      periodPanel.innerHTML = `
        <div class="rng-period-card quality-${qClass}">
          <strong>LCG 周期</strong>
          <span class="rng-period-num">${
            lastPeriod != null ? lastPeriod : "（未計測）"
          }</span>
          <p>${lastPeriodNote}</p>
          <p class="rng-period-hint">Hull–Dobell 目安: ${hint}</p>
          <p class="rng-period-eq"><code>X' = (${a}·X + ${c}) mod ${m}</code></p>
        </div>`;
    }
  } else if (algo === "xorshift32") {
    const { a, b, c } = readXsParams();
    const measured = measureXorShiftPeriod(seed === 0 ? 0 : seed, a, b, c);
    lastPeriod = measured.period;
    lastPeriodNote = measured.note;
    const qClass =
      lastPeriod != null && lastPeriod < 256
        ? "bad"
        : lastPeriod == null
          ? "good"
          : "ok";
    if (periodPanel) {
      periodPanel.hidden = false;
      periodPanel.innerHTML = `
        <div class="rng-period-card quality-${qClass}">
          <strong>XorShift32</strong>
          <span class="rng-period-num">${
            lastPeriod != null ? `周期≈${lastPeriod}` : "長い周期"
          }</span>
          <p>${lastPeriodNote}</p>
          <p class="rng-period-eq"><code>x ^= x&lt;&lt;${a}; x ^= x&gt;&gt;&gt;${b}; x ^= x&lt;&lt;${c}</code></p>
        </div>`;
    }
  } else if (periodPanel) {
    periodPanel.hidden = true;
    lastPeriod = null;
    lastPeriodNote = "";
  }

  if (reason === "regen" && previousSamples) {
    const ok = arraysEqual(samples, previousSamples);
    resultPanel.show(`
      <p class="result-verdict">${ok ? "再現成功" : "再現失敗"}</p>
      <p class="result-note">
        アルゴリズム=${algo} シード=${seed} で再生成。
        ${ok ? "前回と完全に同じ系列です。" : "設定が変わっていないか確認してください。"}
      </p>
    `);
  } else if (reason === "newseed" && previousSamples) {
    const same = arraysEqual(samples, previousSamples);
    resultPanel.show(`
      <p class="result-verdict">${same ? "系列が同じ（稀）" : "別系列"}</p>
      <p class="result-note">シードを変えると通常は別の列になります。</p>
    `);
  } else if (reason === "algo") {
    resultPanel.show(`
      <p class="result-verdict">アルゴリズム: ${algo}</p>
      <p class="result-note">${
        ALGO_OPTIONS.find((o) => o.id === algo)?.blurb || ""
      }</p>
    `);
  } else {
    resultPanel.hide();
  }

  draw();
  renderList();
  const periodTxt =
    algo === "lcg" && lastPeriod != null ? ` · 周期=${lastPeriod}` : "";
  setStatus(
    `${algo} seed=${seed} N=${n}${periodTxt}` +
      (reason === "regen" ? " — 再生成" : " — 生成完了")
  );
}

function draw() {
  if (!ctx || !canvas || !samples.length) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const bins = C.histBins;
  const counts = Array(bins).fill(0);
  for (const x of samples) {
    let u = x;
    if (u < 0) u = 0;
    if (u >= 1) u = 0.999999;
    let b = Math.floor(u * bins);
    if (b >= bins) b = bins - 1;
    counts[b] += 1;
  }
  const maxC = Math.max(1, ...counts);
  const padL = 36;
  const padB = 28;
  const padT = 20;
  const padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const barW = plotW / bins;

  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `ヒストグラム N=${samples.length} · ${readAlgo()} · seed=${readSeed()}`,
    8,
    14
  );

  for (let i = 0; i < bins; i++) {
    const h = (counts[i] / maxC) * plotH;
    const x = padL + i * barW;
    const y = padT + plotH - h;
    // 偏りが大きい bin を強調
    const expected = samples.length / bins;
    const skewed = counts[i] > expected * 2 || counts[i] === 0;
    ctx.fillStyle = skewed ? "#e07a5f" : "#5b9fd4";
    ctx.fillRect(x + 2, y, barW - 4, h);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(counts[i]), x + barW / 2, y - 3);
    ctx.fillText((i / bins).toFixed(1), x + barW / 2, H - 8);
  }
}

function renderList() {
  if (!listEl || !samples.length) return;
  const dice = samples.map((x) => {
    const u = Math.min(0.999999, Math.max(0, x));
    return 1 + Math.floor(u * 6);
  });
  const show = samples.slice(0, 48);
  const nums = show
    .map(
      (x) =>
        `<span class="rng-chip" title="u=${x}">${Number(x).toFixed(4)}</span>`
    )
    .join("");
  const diceHtml = dice
    .slice(0, 48)
    .map((d) => `<span class="rng-die">${d}</span>`)
    .join("");
  const more =
    samples.length > 48
      ? `<p class="coord-side-note">先頭 48 / ${samples.length} 件を表示</p>`
      : "";
  listEl.innerHTML = `
    <div class="rng-block">
      <div class="rng-block-title">[0,1) 一様乱数</div>
      <div class="rng-chips">${nums}</div>
      ${more}
    </div>
    <div class="rng-block">
      <div class="rng-block-title">1〜6 ダイス</div>
      <div class="rng-dice">${diceHtml}</div>
    </div>`;
}

// ---- init UI ----
for (const o of ALGO_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = o.id;
  opt.textContent = o.label;
  if (o.id === C.defaultAlgo) opt.selected = true;
  algoEl?.appendChild(opt);
}

for (const p of LCG_PRESETS) {
  const opt = document.createElement("option");
  opt.value = p.id;
  const mark =
    p.quality === "bad" ? "⚠ " : p.quality === "good" ? "★ " : "· ";
  opt.textContent = mark + p.label;
  lcgPresetEl?.appendChild(opt);
}
for (const p of XORSHIFT_PRESETS) {
  const opt = document.createElement("option");
  opt.value = p.id;
  const mark =
    p.quality === "bad" ? "⚠ " : p.quality === "good" ? "★ " : "· ";
  opt.textContent = mark + p.label;
  if (p.id === "xs-marsaglia") opt.selected = true;
  xsPresetEl?.appendChild(opt);
}

function onAlgoChange() {
  syncParamPanels();
  if (readAlgo() === "lcg") {
    applyLcgPreset(lcgPresetEl?.value || LCG_PRESETS[0].id, {
      setSeed: true,
    });
  } else if (readAlgo() === "xorshift32") {
    applyXsPreset(xsPresetEl?.value || "xs-marsaglia", { setSeed: true });
  }
  runGenerate("algo");
}

algoEl?.addEventListener("change", onAlgoChange);
lcgPresetEl?.addEventListener("change", () => {
  applyLcgPreset(lcgPresetEl.value, { setSeed: true });
  runGenerate("fresh");
});
xsPresetEl?.addEventListener("change", () => {
  applyXsPreset(xsPresetEl.value, { setSeed: true });
  runGenerate("fresh");
});

for (const el of [lcgAEl, lcgCEl, lcgMEl]) {
  el?.addEventListener("change", () => {
    if (lcgPresetBlurb) {
      lcgPresetBlurb.textContent =
        "手動パラメータ。生成して周期・ヒストグラムを確認してください。";
    }
    runGenerate("fresh");
  });
}
for (const el of [xsAEl, xsBEl, xsCEl]) {
  el?.addEventListener("change", () => {
    if (xsPresetBlurb) {
      xsPresetBlurb.textContent =
        "手動シフト。生成して偏り・短い周期の有無を確認してください。";
    }
    runGenerate("fresh");
  });
}

btnGen?.addEventListener("click", () => runGenerate("fresh"));
btnRegen?.addEventListener("click", () => runGenerate("regen"));
btnSeedPlus?.addEventListener("click", () => {
  seedEl.value = String((readSeed() + 1) >>> 0);
  runGenerate("newseed");
});
btnSeedRand?.addEventListener("click", () => {
  seedEl.value = String(
    (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0
  );
  runGenerate("newseed");
});
countEl?.addEventListener("input", () => {
  syncLabels();
});

loadTextSample(
  "../samples/RngSeedExample.cs",
  csharpSample,
  "// samples/RngSeedExample.cs を読み込めませんでした。"
);

if (seedEl) seedEl.value = String(C.defaultSeed);
if (countEl) countEl.value = String(C.defaultN);
syncLabels();
applyLcgPreset(LCG_PRESETS[0].id, { setSeed: false });
applyXsPreset("xs-marsaglia", { setSeed: false });
syncParamPanels();
runGenerate("fresh");
setStatus(
  "Mulberry32 既定 — XorShift / LCG に切替えてプリセット比較ができます"
);
