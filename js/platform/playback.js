/**
 * 再生 / 一時停止 / 速度付きスケジュール
 *
 * 各トピックは step 関数だけ差し替えればよい。
 */

/**
 * @typedef {object} PlaybackOptions
 * @property {HTMLButtonElement | null} [btnPlay]
 * @property {HTMLInputElement | null} [speedEl]
 * @property {() => boolean} onTick  true なら継続、false で停止
 * @property {number} [defaultDelayMs]
 * @property {string} [labelPlay] 停止中のボタン文言
 * @property {string} [labelPause] 再生中のボタン文言
 */

/**
 * @param {PlaybackOptions} opts
 */
export function createPlayback(opts) {
  const {
    btnPlay = null,
    speedEl = null,
    onTick,
    defaultDelayMs = 200,
    labelPlay = "再生",
    labelPause = "一時停止",
  } = opts;

  let running = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerId = null;

  function delayMs() {
    const v = Number(speedEl?.value);
    return Number.isFinite(v) && v > 0 ? v : defaultDelayMs;
  }

  function stop() {
    running = false;
    if (btnPlay) btnPlay.textContent = labelPlay;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function schedule() {
    if (!running) return;
    timerId = setTimeout(() => {
      if (!running) return;
      if (onTick()) schedule();
      else stop();
    }, delayMs());
  }

  /**
   * 再生開始。最初の1手をすぐ実行する。
   * @returns {boolean} 再生中になったか
   */
  function start() {
    if (running) return true;
    running = true;
    if (btnPlay) btnPlay.textContent = labelPause;
    if (onTick()) schedule();
    else stop();
    return running;
  }

  /**
   * トグル。finished 時は onBeforeStart でリセットさせる想定。
   * @param {() => void} [onBeforeStart]
   */
  function toggle(onBeforeStart) {
    if (running) {
      stop();
      return;
    }
    onBeforeStart?.();
    start();
  }

  return {
    get running() {
      return running;
    },
    stop,
    start,
    toggle,
    schedule,
  };
}
