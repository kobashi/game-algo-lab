// デモ: algorithms/steering-seek-flee.html
public static class Steering
{
    // desired = normalize(target - pos) * maxSpeed
    // steer = desired - velocity; clamp(steer, maxForce)
    public static void Seek(
        float px, float py, float vx, float vy,
        float tx, float ty, float maxSpeed, float maxForce,
        out float ax, out float ay)
    {
        float dx = tx - px, dy = ty - py;
        float len = MathF.Sqrt(dx * dx + dy * dy);
        if (len < 1e-6f) { ax = ay = 0; return; }
        float dsx = dx / len * maxSpeed, dsy = dy / len * maxSpeed;
        ax = dsx - vx; ay = dsy - vy;
        float fl = MathF.Sqrt(ax * ax + ay * ay);
        if (fl > maxForce) { ax = ax / fl * maxForce; ay = ay / fl * maxForce; }
    }
}
