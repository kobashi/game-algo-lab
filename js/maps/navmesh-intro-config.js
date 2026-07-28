/** @see docs/topics/navmesh-intro/SPEC.md */
/** Walkable polygons (CCW), shared edges = portals */
export const NAVMESH_INTRO_CONFIG = {
  polys: [
    {
      id: 0,
      verts: [
        [40, 40],
        [220, 40],
        [220, 160],
        [40, 160],
      ],
    },
    {
      id: 1,
      verts: [
        [220, 40],
        [400, 40],
        [400, 200],
        [280, 200],
        [280, 160],
        [220, 160],
      ],
    },
    {
      id: 2,
      verts: [
        [40, 160],
        [220, 160],
        [220, 280],
        [40, 280],
      ],
    },
    {
      id: 3,
      verts: [
        [220, 160],
        [280, 160],
        [280, 200],
        [400, 200],
        [400, 320],
        [220, 320],
        [220, 280],
      ],
    },
  ],
  /** undirected edges between poly ids if they share a portal */
  adj: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
  ],
  start: [80, 100],
  goal: [360, 280],
};
