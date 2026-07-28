/** @see docs/topics/weighted-random/SPEC.md */
export const WEIGHTED_RANDOM_CONFIG = {
  defaultSeed: 42,
  defaultDraws: 200,
  minDraws: 20,
  maxDraws: 2000,
  defaultItems: [
    { id: "common", label: "Common", weight: 60, color: "#5b9fd4" },
    { id: "uncommon", label: "Uncommon", weight: 25, color: "#6bcb8f" },
    { id: "rare", label: "Rare", weight: 12, color: "#f2cc8f" },
    { id: "epic", label: "Epic", weight: 3, color: "#e07a5f" },
  ],
};
