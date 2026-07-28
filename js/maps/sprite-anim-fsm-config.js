/** @see docs/topics/sprite-anim-fsm/SPEC.md */
export const SPRITE_ANIM_FSM_CONFIG = {
  frameSec: 0.12,
  states: {
    idle: { frames: [0, 1], loop: true },
    run: { frames: [2, 3, 4, 5], loop: true },
    jump: { frames: [6, 7], loop: false },
  },
};
