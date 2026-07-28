/** @see docs/topics/ecs-intro/SPEC.md */
export const ECS_INTRO_CONFIG = {
  archetypes: [
    { name: "Player", comps: ["Transform", "Velocity", "Health", "Input"] },
    { name: "Enemy", comps: ["Transform", "Velocity", "Health", "AI"] },
    { name: "Bullet", comps: ["Transform", "Velocity"] },
    { name: "Tree", comps: ["Transform"] },
  ],
};
