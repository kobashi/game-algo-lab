/**
 * 応用サウンドコースの段。描画の副作用はない。
 * 入門のイベントと効果音を前提にし、その先を 4 段で並べる。
 * 文言は js/main.js の TOPICS が正。
 */

/**
 * @typedef {{ id: string, title: string, lead: string, ids: string[] }} AudioStage
 */

/** @type {AudioStage[]} */
export const AUDIO_STAGES = [
  {
    id: "start",
    title: "前提",
    lead: "入門で扱った、イベントの発行と OneShot。応用コースでは、この先の専門を分けて学ぶ。",
    ids: ["sfx-events"],
  },
  {
    id: "voices",
    title: "発音を制御する",
    lead: "同時に鳴る数、同じ音の繰り返し、音量の通り道",
    ids: ["sfx-voice-limit", "sfx-randomize", "audio-bus-ducking"],
  },
  {
    id: "world",
    title: "動きと空間",
    lead: "衝突、移動、距離を音にする",
    ids: ["sfx-material", "audio-motion", "sfx-spatial"],
  },
  {
    id: "music",
    title: "音楽の時間",
    lead: "ループ、拍、切替、レイヤー",
    ids: ["bgm-loop", "bgm-quantize", "bgm-transition-compare", "bgm-interactive"],
  },
  {
    id: "adaptive",
    title: "総合演習",
    lead: "小さなゲームの音を、自分で設計して検証する",
    ids: ["audio-adaptive-lab"],
  },
];

/** @returns {string[]} */
export function getAudioOrder() {
  return AUDIO_STAGES.flatMap((stage) => stage.ids);
}

/**
 * @param {string} id
 * @returns {{ stage: AudioStage, ids: string[] } | null}
 */
export function findAudioStage(id) {
  const stage = AUDIO_STAGES.find((item) => item.ids.includes(id));
  if (!stage) return null;
  return { stage, ids: stage.ids.filter((item) => item !== id) };
}
