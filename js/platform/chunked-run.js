/**
 * ジェネレータを時間分割で駆動する汎用ランナー（UI を固めない解析）。
 *
 * 対象ジェネレータは、内部で `yield`（値なしでよい）を定期的に呼ぶことで
 * 「ここまでで一旦制御を返してよい」という区切りを示す。`runChunked` は
 * 1チャンクぶんの持ち時間（既定 16ms）だけ `next()` を回し続け、
 * 時間内に終わらなければ `setTimeout(…, 0)` で次のチャンクを予約する。
 *
 * トピック固有のロジックを一切含まないため `js/platform` に置く
 * （4×4オセロ実装時に新設。他トピックの重い解析にも流用できる）。
 *
 * @example
 * function* work() {
 *   for (let i = 0; i < 1e7; i++) {
 *     if (i % 1000 === 0) yield;
 *   }
 *   return 42;
 * }
 * runChunked(work(), {
 *   onProgress: () => console.log("進捗…"),
 *   onDone: (result) => console.log("完了", result),
 * });
 */

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/**
 * @template T
 * @param {Generator<any, T, void>} gen
 * @param {object} [opts]
 * @param {number} [opts.chunkMs] 1チャンクあたりの持ち時間（既定16ms）
 * @param {(yielded: any) => void} [opts.onProgress] チャンクの区切りごとに呼ばれる
 * @param {(result: T) => void} [opts.onDone] 完了時に一度だけ呼ばれる
 * @param {(err: unknown) => void} [opts.onError] ジェネレータが例外を投げた場合
 * @param {(fn: () => void) => void} [opts.scheduler] 既定は `setTimeout(fn, 0)`
 * @returns {{ cancel: () => void, cancelled: () => boolean }}
 */
export function runChunked(gen, opts = {}) {
  const {
    chunkMs = 16,
    onProgress,
    onDone,
    onError,
    scheduler = (fn) => setTimeout(fn, 0),
  } = opts;

  let cancelled = false;

  function tick() {
    if (cancelled) return;
    const start = nowMs();
    let result;
    try {
      do {
        result = gen.next();
      } while (!result.done && nowMs() - start < chunkMs);
    } catch (err) {
      if (onError) onError(err);
      else throw err;
      return;
    }
    if (cancelled) return;
    if (result.done) {
      if (onDone) onDone(result.value);
      return;
    }
    if (onProgress) onProgress(result.value);
    scheduler(tick);
  }

  scheduler(tick);

  return {
    cancel() {
      cancelled = true;
    },
    cancelled() {
      return cancelled;
    },
  };
}
