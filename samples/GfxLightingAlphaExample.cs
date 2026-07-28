// デモ: algorithms/gfx-lighting-alpha.html
public static class LightAlpha
{
    public static float LightFactor(float dist, float radius, float ambient)
    {
        if (dist >= radius) return ambient;
        float t = 1f - dist / radius;
        return ambient + (1f - ambient) * t * t;
    }

    public static float AlphaOver(float src, float dst, float a) =>
        src * a + dst * (1f - a);
}
