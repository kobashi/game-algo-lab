/** @see docs/topics/command-input/SPEC.md */
export const COMMAND_INPUT_CONFIG = {
  windowMs: 800,
  // tokens: L R U D A B
  moves: [
    { name: "Hadouken", seq: ["D", "R", "A"] },
    { name: "Shoryuken", seq: ["R", "D", "R", "A"] },
    { name: "Sonic", seq: ["D", "L", "R", "A"] },
  ],
};
