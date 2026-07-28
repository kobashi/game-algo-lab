/** @see docs/topics/gfx-mesh-uv/SPEC.md */
export const GFX_MESH_UV_CONFIG = {
  /** unit quad as two triangles */
  positions: [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ],
  uvs: [
    [0, 1],
    [1, 1],
    [1, 0],
    [0, 0],
  ],
  indices: [0, 1, 2, 0, 2, 3],
  texSize: 64,
};
