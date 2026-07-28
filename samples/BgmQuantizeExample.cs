// デモ: algorithms/bgm-quantize.html
public static class Quantize
{
    public static float NextBeat(float t, float beatSec) =>
        MathF.Ceiling((t + 1e-6f) / beatSec) * beatSec;

    public static float NextBar(float t, float barSec) =>
        MathF.Ceiling((t + 1e-6f) / barSec) * barSec;

    // beatSec = 60f / bpm; barSec = beatSec * 4;
}
