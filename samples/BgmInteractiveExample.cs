// デモ: algorithms/bgm-interactive.html
public sealed class LayeredBgm
{
    public float[] Gains = { 0.7f, 0.55f, 0f }; // base, drums, boss
    public float[] Targets = { 0.7f, 0.55f, 0f };

    public void SetCombat(bool on)
    {
        Targets[2] = on ? 0.85f : 0f; // apply at next bar in real code
    }

    public void Tick(float dt, float fadeSec)
    {
        float rate = 1f / fadeSec;
        for (int i = 0; i < Gains.Length; i++)
        {
            float d = Targets[i] - Gains[i];
            Gains[i] += Math.Sign(d) * Math.Min(Math.Abs(d), rate * dt);
        }
    }
}
