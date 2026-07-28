// デモ: algorithms/bgm-transition-compare.html
public static class BgmTransition
{
    public static (float a, float b) Crossfade(float u, bool fromA)
    {
        u = Math.Clamp(u, 0f, 1f);
        return fromA ? (1 - u, u) : (u, 1 - u);
    }

    public static float NextBar(float t, float bpm, int beats = 4)
    {
        float bar = 60f / bpm * beats;
        return MathF.Ceiling((t + 1e-6f) / bar) * bar;
    }
}
