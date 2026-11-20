/**
 * 比較実験用。HTML の初期値とは別で、ボタンを押したときだけ適用する。
 * @see docs/topics/sfx-events/SPEC.md
 */

/** @type {Record<string, Record<string, string | boolean>>} */
export const AUDIO_PRESETS = {
  "oneshot-16": {
    tab: "oneshot",
    steal: "unlimited",
    vmax: "16",
    comp: false,
    wave: "square",
  },
  "voice-cap": {
    tab: "oneshot",
    steal: "oldest",
    vmax: "4",
    comp: false,
  },
  "voice-quiet": {
    tab: "oneshot",
    steal: "quietest",
    vmax: "4",
    comp: false,
  },
  "comp-on": {
    tab: "mixer",
    comp: true,
    mcomp: false,
    thr: "-24",
    ratio: "8",
    knee: "12",
    steal: "unlimited",
    vmax: "16",
  },
  "comp-off": {
    tab: "mixer",
    comp: false,
    mcomp: false,
    steal: "unlimited",
    vmax: "16",
  },
  "xf-slow": {
    tab: "bgm",
    xf: "2",
    song: "a",
  },
  "xf-fast": {
    tab: "bgm",
    xf: "0",
    song: "a",
  },
  duck: {
    tab: "dynamic",
    duck: "18",
    ducka: "30",
    duckh: "180",
    duckr: "700",
    gstate: "normal",
  },
  tension: {
    tab: "dynamic",
    tension: "100",
    gstate: "normal",
    layers: false,
  },
  "low-health": {
    tab: "dynamic",
    health: "12",
    gstate: "normal",
  },
};

export const PRESET_LABELS = [
  ["oneshot-16", "16音・上限なし"],
  ["voice-cap", "上限4・古い音を止める"],
  ["voice-quiet", "上限4・小さい音を止める"],
  ["comp-off", "コンプレッサーオフ"],
  ["comp-on", "コンプレッサーオン"],
  ["xf-fast", "BGMをすぐ切り替え"],
  ["xf-slow", "BGMを2秒でクロスフェード"],
  ["duck", "HitでBGMを下げる"],
  ["tension", "緊張100・通常の曲"],
  ["low-health", "体力12・通常の曲"],
];
