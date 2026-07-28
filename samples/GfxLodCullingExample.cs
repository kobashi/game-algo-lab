// デモ: algorithms/gfx-lod-culling.html
public static class LodCull
{
    public static int PickLod(float dist, float near, float far) =>
        dist < near ? 0 : dist < far ? 1 : 2;

    public static bool InFrustum(float ox, float oy, float half,
        float vx, float vy, float vw, float vh) =>
        !(ox + half < vx || ox - half > vx + vw ||
          oy + half < vy || oy - half > vy + vh);
}
