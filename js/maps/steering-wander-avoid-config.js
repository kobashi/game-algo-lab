/** @see docs/topics/steering-wander-avoid/SPEC.md */
export const STEERING_WANDER_AVOID_CONFIG = {
  maxSpeed: 120,
  maxForce: 200,
  wanderDistance: 50,
  wanderRadius: 28,
  wanderJitter: 40,
  avoidDistance: 70,
  avoidRadius: 36,
  obstacles: [
    { x: 220, y: 120, r: 36 },
    { x: 400, y: 240, r: 42 },
    { x: 320, y: 80, r: 28 },
  ],
};
