// デモ: algorithms/gfx-animation-vfx.html
public struct Particle
{
    public float X, Y, Vx, Vy, Life, MaxLife;
}

public static class ParticleSystem
{
    public static void Step(List<Particle> list, float dt, float gravity)
    {
        for (int i = list.Count - 1; i >= 0; i--)
        {
            var p = list[i];
            p.Vy += gravity * dt;
            p.X += p.Vx * dt;
            p.Y += p.Vy * dt;
            p.Life -= dt;
            if (p.Life <= 0) list.RemoveAt(i);
            else list[i] = p;
        }
    }
}
