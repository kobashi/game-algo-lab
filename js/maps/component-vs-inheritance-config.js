/** @see docs/topics/component-vs-inheritance/SPEC.md */
export const COMPONENT_VS_INHERITANCE_CONFIG = {
  inheritanceTree: [
    { id: "Entity", parent: null },
    { id: "Character", parent: "Entity" },
    { id: "Enemy", parent: "Character" },
    { id: "FlyingEnemy", parent: "Enemy" },
    { id: "Player", parent: "Character" },
    { id: "Npc", parent: "Entity" },
  ],
  components: [
    { id: "Health", label: "Health", color: "#e07a5f" },
    { id: "Move", label: "Move", color: "#6bcb8f" },
    { id: "Shoot", label: "Shoot", color: "#f2cc8f" },
    { id: "Fly", label: "Fly", color: "#5b9fd4" },
  ],
};
