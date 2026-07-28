// デモ: algorithms/friction-bounce.html
public sealed class BounceBall
{
    public float X, Y, Vx, Vy;
    public float Restitution = 0.65f;
    public float Friction = 3.5f;
    public float Gravity = 900f;
    public float Radius = 14f;

    public void Integrate(float dt, float floorY)
    {
        Vy += Gravity * dt;
        X += Vx * dt;
        Y += Vy * dt;
        if (Y + Radius >= floorY)
        {
            Y = floorY - Radius;
            Vy = -Vy * Restitution;
            // 接地摩擦（水平）
            Vx *= MathF.Exp(-Friction * dt);
            if (Math.Abs(Vy) < 12f) Vy = 0;
        }
    }
}
