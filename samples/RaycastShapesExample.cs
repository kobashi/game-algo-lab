// デモ: algorithms/raycast-shapes.html
public static class RaycastShapes
{
    // p(t) = o + d * t, t >= 0
    public static bool RayCircle(float ox, float oy, float dx, float dy,
        float cx, float cy, float r, out float t)
    {
        float fx = ox - cx, fy = oy - cy;
        float a = dx * dx + dy * dy;
        float b = 2 * (fx * dx + fy * dy);
        float c = fx * fx + fy * fy - r * r;
        float disc = b * b - 4 * a * c;
        t = 0;
        if (disc < 0 || a < 1e-12f) return false;
        float s = MathF.Sqrt(disc);
        float t0 = (-b - s) / (2 * a);
        float t1 = (-b + s) / (2 * a);
        t = t0 >= 0 ? t0 : t1;
        return t >= 0;
    }

    public static bool RayAabb(float ox, float oy, float dx, float dy,
        float minX, float minY, float maxX, float maxY, out float t)
    {
        // slab method
        float tmin = 0, tmax = float.PositiveInfinity;
        t = 0;
        if (!Slab(ox, dx, minX, maxX, ref tmin, ref tmax)) return false;
        if (!Slab(oy, dy, minY, maxY, ref tmin, ref tmax)) return false;
        if (tmax < 0 || tmin > tmax) return false;
        t = tmin >= 0 ? tmin : tmax;
        return t >= 0;
    }

    static bool Slab(float o, float d, float min, float max, ref float tmin, ref float tmax)
    {
        if (Math.Abs(d) < 1e-12f) return o >= min && o <= max;
        float inv = 1f / d;
        float t1 = (min - o) * inv, t2 = (max - o) * inv;
        if (t1 > t2) (t1, t2) = (t2, t1);
        tmin = Math.Max(tmin, t1);
        tmax = Math.Min(tmax, t2);
        return true;
    }
}
