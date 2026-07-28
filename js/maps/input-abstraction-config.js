/** @see docs/topics/input-abstraction/SPEC.md */
export const INPUT_ABSTRACTION_CONFIG = {
  actions: ["MoveLeft", "MoveRight", "Jump", "Fire"],
  presets: {
    default: {
      MoveLeft: ["ArrowLeft", "KeyA"],
      MoveRight: ["ArrowRight", "KeyD"],
      Jump: ["Space", "KeyW"],
      Fire: ["KeyZ", "KeyJ"],
    },
    wasd: {
      MoveLeft: ["KeyA"],
      MoveRight: ["KeyD"],
      Jump: ["KeyW", "Space"],
      Fire: ["KeyF"],
    },
    arrows: {
      MoveLeft: ["ArrowLeft"],
      MoveRight: ["ArrowRight"],
      Jump: ["ArrowUp", "Space"],
      Fire: ["ShiftRight", "Enter"],
    },
  },
};
