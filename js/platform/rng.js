/**
 * 決定的 PRNG（教材の再現用シード）
 */

/**
 * mulberry32
 * @param {number} seed
 * @returns {() => number}  [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {() => number} rng
 * @param {number} n  長さ（n > 0）
 */
export function randomIndex(rng, n) {
  if (n <= 0) return 0;
  return Math.min(n - 1, Math.floor(rng() * n));
}
