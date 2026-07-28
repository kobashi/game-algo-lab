// デモ: algorithms/noise-terrain.html
// Value Noise: 格子乱数 + バイリニア補間。fBm はオクターブ加算。

public static class ValueNoise
{
    // hash(ix,iy,seed) → [0,1)
    public static float Hash(int x, int y, int seed)
    {
        unchecked
        {
            uint h = (uint)(x * 374761393 + y * 668265263 + seed * 362437);
            h = (h ^ (h >> 13)) * 1274126177u;
            return (h & 0xFFFFFF) / 16777216f;
        }
    }

    public static float Smooth(float t) => t * t * (3 - 2 * t);

    public static float Sample(float x, float y, int seed)
    {
        int x0 = (int)Math.Floor(x), y0 = (int)Math.Floor(y);
        float tx = Smooth(x - x0), ty = Smooth(y - y0);
        float v00 = Hash(x0, y0, seed), v10 = Hash(x0 + 1, y0, seed);
        float v01 = Hash(x0, y0 + 1, seed), v11 = Hash(x0 + 1, y0 + 1, seed);
        float a = v00 + (v10 - v00) * tx;
        float b = v01 + (v11 - v01) * tx;
        return a + (b - a) * ty;
    }

    public static float Fbm(float x, float y, int seed, int octaves)
    {
        float sum = 0, amp = 1, freq = 1, norm = 0;
        for (int i = 0; i < octaves; i++)
        {
            sum += Sample(x * freq, y * freq, seed + i * 1013) * amp;
            norm += amp;
            amp *= 0.5f;
            freq *= 2f;
        }
        return sum / norm;
    }
}
