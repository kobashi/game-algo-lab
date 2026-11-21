// 総合演習の入口。各関数は、対応する応用トピックと同じ役割を持つ。
class AudioDirector
{
    public float StepInterval(float speed, bool grounded) => 0f;
    public (float freq, float gain) LandImpact(float speed) => (200f, 0f);
    public (float gain, float interval) Warning(float distance) => (0f, 1f);
    public int? PickStop(int[] voiceIds, string policy) => null;
    public (float baseGain, float tension, float battle) LayerGains(string state)
        => (1f, 0f, 0f);
}
