// デモ: algorithms/gfx-mesh-uv.html
// Quad = 2 tris; UV in 0..1
public static class MeshUv
{
    public static readonly float[,] Pos = { { -1, -1 }, { 1, -1 }, { 1, 1 }, { -1, 1 } };
    public static readonly float[,] Uv = { { 0, 1 }, { 1, 1 }, { 1, 0 }, { 0, 0 } };
    public static readonly int[] Idx = { 0, 1, 2, 0, 2, 3 };

    public static (float u, float v) Transform(float u, float v, float uOff, float vOff, float scale) =>
        ((u + uOff) * scale, (v + vOff) * scale);
}
