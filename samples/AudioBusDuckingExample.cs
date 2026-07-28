// デモ: algorithms/audio-bus-ducking.html
// Master → BGM / SE バス。SE 時に BGM をダック
public sealed class AudioMixer
{
    public float Master = 0.9f, Bgm = 0.55f, Se = 0.8f;
    public float DuckMul = 1f;

    public void OnSe(float duckTo = 0.15f, float attack = 0.05f,
        float hold = 0.25f, float release = 0.4f)
    {
        // schedule envelope: 1 → duckTo → 1 on BGM bus
        // DuckMul = EvalEnvelope(time);
    }

    public float EffectiveBgm() => Master * Bgm * DuckMul;
}
