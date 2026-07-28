// デモ: algorithms/sfx-spatial.html
// 距離減衰 + パン（簡易）
public static class SpatialSfx
{
    public static float Gain(float dist, float refDist, float maxDist)
    {
        if (dist <= refDist) return 1f;
        return Math.Clamp(1f - (dist - refDist) / (maxDist - refDist), 0f, 1f);
    }

    public static float Pan(float dx, float maxDist) =>
        Math.Clamp(dx / (maxDist * 0.55f), -1f, 1f);
}
