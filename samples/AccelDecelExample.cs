// デモ: algorithms/accel-decel.html
public sealed class HorizontalMotor
{
    public float Accel = 520f;
    public float MaxSpeed = 220f;
    public float Brake = 4.5f; // 入力なし時の減衰強さ
    public float Vx;

    public void Update(float input, float dt) // input in [-1,1]
    {
        if (Math.Abs(input) > 0.01f)
        {
            Vx += input * Accel * dt;
            if (Vx > MaxSpeed) Vx = MaxSpeed;
            if (Vx < -MaxSpeed) Vx = -MaxSpeed;
        }
        else
        {
            // 指数的に減速
            Vx *= MathF.Exp(-Brake * dt);
            if (Math.Abs(Vx) < 1f) Vx = 0;
        }
    }
}
