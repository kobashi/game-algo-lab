/** @see docs/topics/sfx-material/SPEC.md */
export const SFX_MATERIAL_CONFIG = {
  materials: {
    wood: { label: "木", baseFreq: 280, color: "#c4a35a" },
    metal: { label: "金属", baseFreq: 720, color: "#9aabbf" },
    stone: { label: "石", baseFreq: 180, color: "#7a8494" },
    flesh: { label: "肉", baseFreq: 120, color: "#e07a5f" },
  },
  /** pair key "a|b" sorted → mix factor */
  defaultDur: 0.12,
  baseGain: 0.1,
};
