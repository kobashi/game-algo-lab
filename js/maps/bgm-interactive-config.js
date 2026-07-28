/** @see docs/topics/bgm-interactive/SPEC.md */
export const BGM_INTERACTIVE_CONFIG = {
  defaultBpm: 120,
  beatsPerBar: 4,
  layers: [
    { id: "base", label: "ベース", freq: 110, gain: 0.7 },
    { id: "drums", label: "ドラム", freq: 180, gain: 0.55 },
    { id: "boss", label: "ボス層", freq: 330, gain: 0.0 },
  ],
  fadeSec: 0.8,
};
