/**
 * 乱数とシード — アルゴリズム切替・LCG プリセット
 * @see docs/topics/rng-seed/SPEC.md
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   quality: 'bad' | 'ok' | 'good',
 *   blurb: string,
 *   a: number,
 *   c: number,
 *   m: number,
 *   defaultSeed?: number,
 * }} LcgPreset
 */

export const RNG_SEED_CONFIG = {
  defaultAlgo: "mulberry32",
  defaultSeed: 42,
  defaultN: 48,
  minN: 4,
  maxN: 128,
  histBins: 10,
  /** LCG 周期計測の上限（状態空間がこれより大きい m はスキップ） */
  periodScanMaxM: 65536,
};

/**
 * 線形合同法 X' = (aX + c) mod m のプリセット。
 * 小さい m は周期を全列挙でき、パラメータと周期の関係を体感しやすい。
 *
 * @type {LcgPreset[]}
 */
export const LCG_PRESETS = [
  {
    id: "tiny-bad",
    label: "【質が悪い】極小周期 m=16",
    quality: "bad",
    blurb:
      "状態が 0..15 しかない。どんな a,c でも周期 ≤16。分布が粗くすぐループする。",
    a: 5,
    c: 1,
    m: 16,
    defaultSeed: 1,
  },
  {
    id: "bad-a",
    label: "【質が悪い】a が悪い (m=256)",
    quality: "bad",
    blurb:
      "m=256 でも a=2,c=0 は偶奇が固定されやすく、周期が極端に短い。",
    a: 2,
    c: 0,
    m: 256,
    defaultSeed: 7,
  },
  {
    id: "short-ok",
    label: "【教材用】小フル周期 m=31 (Hull–Dobell)",
    quality: "ok",
    blurb:
      "m=31 素数、c=0 でない乗算合同。条件を満たすと周期 31（フル）。小さいので周期を数え切れる。",
    a: 3,
    c: 0,
    m: 31,
    defaultSeed: 1,
  },
  {
    // multiplicative LCG full period on prime field needs careful choice
    // For c=0, period divides m-1. a=3, m=31: period of 1 under x->3x mod 31
    // order of 3 mod 31: 3^5=243=26, ... actually 3 is primitive root mod 31? 
    // 3^15 mod 31 = ... Let's use c!=0 for full period m when gcd(c,m)=1, a-1 divisible by all prime factors of m
    id: "m64-ok",
    label: "【許容】m=64 フル周期に近い教材例",
    quality: "ok",
    blurb:
      "m=2^6。Hull–Dobell を意識した a=5,c=1。周期を計測して m と比較できる。",
    a: 5,
    c: 1,
    m: 64,
    defaultSeed: 1,
  },
  {
    id: "glibc-like",
    label: "【実用寄り】glibc 風 (m=2^31)",
    quality: "good",
    blurb:
      "a=1103515245, c=12345, m=2^31。古典的な LCG。周期は理論上大きい（全列挙はしない）。",
    a: 1103515245,
    c: 12345,
    m: 2147483648,
    defaultSeed: 42,
  },
  {
    id: "numrec",
    label: "【実用寄り】Numerical Recipes 風",
    quality: "good",
    blurb:
      "a=1664525, c=1013904223, m=2^32。広く使われたパラメータ例。",
    a: 1664525,
    c: 1013904223,
    m: 4294967296,
    defaultSeed: 42,
  },
];

/**
 * XorShift32: x ^= x<<a; x ^= x>>>b; x ^= x<<c （符号なし 32bit）
 * @typedef {{
 *   id: string,
 *   label: string,
 *   quality: 'bad' | 'ok' | 'good',
 *   blurb: string,
 *   a: number,
 *   b: number,
 *   c: number,
 *   defaultSeed?: number,
 * }} XorShiftPreset
 */

/** @type {XorShiftPreset[]} */
export const XORSHIFT_PRESETS = [
  {
    id: "xs-bad-tiny",
    label: "【質が悪い】シフトが極端 (1,1,1)",
    quality: "bad",
    blurb:
      "シフト量が小さすぎると状態空間をうまく混ぜられず、短いループや偏りが出やすい。",
    a: 1,
    b: 1,
    c: 1,
    defaultSeed: 1,
  },
  {
    id: "xs-bad-same",
    label: "【質が悪い】同じ方向ばかり (5,0,5)",
    quality: "bad",
    blurb:
      "右シフトが 0 だと片側のビットしか混ざらない。ヒストグラムの偏りを観察しやすい。",
    a: 5,
    b: 0,
    c: 5,
    defaultSeed: 1,
  },
  {
    id: "xs-marsaglia",
    label: "【標準】Marsaglia (13,17,5)",
    quality: "good",
    blurb:
      "古典的な XorShift32 三重シフト。シード 0 は全ゼロ固定点なので実装では避ける。",
    a: 13,
    b: 17,
    c: 5,
    defaultSeed: 42,
  },
  {
    id: "xs-alt",
    label: "【許容】別三重 (7,9,13)",
    quality: "ok",
    blurb: "別のシフト組。標準と系列が違うことを比較できる。",
    a: 7,
    b: 9,
    c: 13,
    defaultSeed: 42,
  },
];

export const ALGO_OPTIONS = [
  {
    id: "mulberry32",
    label: "Mulberry32（サイト標準）",
    blurb: "js/platform の既定 PRNG。シードのみ。高品質・高速。",
  },
  {
    id: "xorshift32",
    label: "XorShift32",
    blurb:
      "x ^= x<<a; x ^= x>>>b; x ^= x<<c。シフト (a,b,c) をプリセット／手動で比較。シード 0 は退化。",
  },
  {
    id: "lcg",
    label: "線形合同法 (LCG)",
    blurb: "X'=(aX+c) mod m。a,c,m をプリセットまたは手動で変え、周期を観察。",
  },
];
