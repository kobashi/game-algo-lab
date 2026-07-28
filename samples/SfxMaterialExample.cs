// デモ: algorithms/sfx-material.html
public static class MaterialImpact
{
    public static (float freq, float vol) Resolve(string a, string b, float force)
    {
        float fa = BaseFreq(a), fb = BaseFreq(b);
        float freq = MathF.Sqrt(fa * fb) * (0.85f + force * 0.5f);
        float vol = 0.1f * (0.35f + force * 0.9f);
        return (freq, vol);
    }
    static float BaseFreq(string m) => m switch
    {
        "metal" => 720, "wood" => 280, "stone" => 180, _ => 120
    };
}
