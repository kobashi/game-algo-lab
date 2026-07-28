// デモ: algorithms/velocity-motion.html
using System;
public struct Vec2 { public double X, Y; public Vec2(double x, double y){X=x;Y=y;} }
public static class VelocityMotionExample
{
    /// <summary>p' = p + v * dt（dt は秒）</summary>
    public static Vec2 Integrate(Vec2 p, Vec2 v, double dt)
        => new(p.X + v.X * dt, p.Y + v.Y * dt);
}
