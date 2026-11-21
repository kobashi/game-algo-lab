// 速度と接地はゲームが持つ。音はそれを読んで決める。
class MotionAudio
{
    public float StepInterval(float speed, bool grounded)
    {
        if (!grounded || speed < 20f) return 0f;
        return MathF.Max(0.12f, 0.5f - speed / 400f);
    }

    public float SustainGain(float speed)
    {
        float t = Math.Clamp(speed / 200f, 0f, 1f);
        return t * 0.2f;
    }
}
