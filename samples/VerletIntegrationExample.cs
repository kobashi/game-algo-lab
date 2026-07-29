// デモ: algorithms/verlet-integration.html

public struct Particle
{
    public float X, Y, Px, Py;
    public bool Pinned;
}

public static class VerletIntegration
{
    public static void Integrate(ref Particle p, float ax, float ay, float dt, float damp)
    {
        if (p.Pinned) { p.Px = p.X; p.Py = p.Y; return; }
        float vx = (p.X - p.Px) * damp;
        float vy = (p.Y - p.Py) * damp;
        float nx = p.X + vx + ax * dt * dt;
        float ny = p.Y + vy + ay * dt * dt;
        p.Px = p.X; p.Py = p.Y;
        p.X = nx; p.Y = ny;
    }

    public static void SolveDistance(ref Particle a, ref Particle b, float rest)
    {
        float dx = b.X - a.X, dy = b.Y - a.Y;
        float dist = MathF.Sqrt(dx * dx + dy * dy);
        if (dist < 1e-6f) return;
        float diff = (dist - rest) / dist;
        float ox = dx * 0.5f * diff, oy = dy * 0.5f * diff;
        if (!a.Pinned) { a.X += ox; a.Y += oy; }
        if (!b.Pinned) { b.X -= ox; b.Y -= oy; }
    }
}
