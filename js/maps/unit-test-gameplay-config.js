/** @see docs/topics/unit-test-gameplay/SPEC.md */
export const UNIT_TEST_GAMEPLAY_CONFIG = {
  cases: [
    { id: "aabb-overlap", name: "AABB 重なり" },
    { id: "aabb-separate", name: "AABB 分離" },
    { id: "damage-clamp", name: "HP は 0 未満にしない" },
    { id: "elastic-1d", name: "等質量弾性で速度交換" },
  ],
};
