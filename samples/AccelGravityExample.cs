// デモ: algorithms/accel-gravity.html
// v += a * dt; p += v * dt;

public struct Body2D
{
    public float X, Y, Vx, Vy;
    public float Gravity; // a.y

    public void Integrate(float dt)
    {
        Vy += Gravity * dt;
        X += Vx * dt;
        Y += Vy * dt;
    }

    public void BounceFloor(float floorY, float restitution)
    {
        if (Y > floorY)
        {
            Y = floorY;
            Vy = -Vy * restitution;
        }
    }
}
