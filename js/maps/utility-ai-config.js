/** @see docs/topics/utility-ai/SPEC.md */
export const UTILITY_AI_CONFIG = {
  actions: [
    {
      id: "eat",
      label: "食事",
      /** score from hunger 0..1 */
      score: (h, t, e) => h * h * 1.2,
    },
    {
      id: "flee",
      label: "逃走",
      score: (h, t, e) => t * t * 1.4,
    },
    {
      id: "patrol",
      label: "巡回",
      score: (h, t, e) => (1 - t) * 0.35 + e * 0.25,
    },
    {
      id: "rest",
      label: "休息",
      score: (h, t, e) => (1 - e) * (1 - e) * 1.1,
    },
  ],
};
