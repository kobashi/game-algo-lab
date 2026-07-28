// デモ: algorithms/gfx-postprocess.html
public static class PostFx
{
    public static (float r, float g, float b) Saturation(float r, float g, float b, float sat)
    {
        float gray = 0.299f * r + 0.587f * g + 0.114f * b;
        return (gray + (r - gray) * sat, gray + (g - gray) * sat, gray + (b - gray) * sat);
    }

    public static float Vignette(float nx, float ny, float amount)
    {
        float d2 = nx * nx + ny * ny;
        return 1f - amount * Math.Min(1f, d2);
    }
}
