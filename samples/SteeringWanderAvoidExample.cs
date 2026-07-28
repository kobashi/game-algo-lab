// デモ: algorithms/steering-wander-avoid.html
public static class WanderAvoid
{
    // 前方 circle 上の角度を jitter し、その点へ Seek
    public static void Wander(
        float px, float py, float vx, float vy,
        ref float theta, float jitter, float dist, float radius,
        float maxSpeed, float maxForce, float dt,
        out float fx, out float fy)
    {
        theta += (Random.Shared.NextSingle() * 2 - 1) * jitter * dt;
        float spd = MathF.Sqrt(vx * vx + vy * vy);
        float hx = spd > 1e-3f ? vx / spd : 1, hy = spd > 1e-3f ? vy / spd : 0;
        float cx = px + hx * dist, cy = py + hy * dist;
        float tx = cx + MathF.Cos(theta) * radius;
        float ty = cy + MathF.Sin(theta) * radius;
        // Seek(tx,ty) ...
        fx = fy = 0;
    }
}
