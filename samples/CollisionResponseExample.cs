// デモ: algorithms/collision-response.html
public static class CollisionResponse
{
    public static void ResolveCircles(
        ref float x1, ref float y1, ref float vx1, ref float vy1, float r1, float m1,
        ref float x2, ref float y2, ref float vx2, ref float vy2, float r2, float m2,
        float e)
    {
        float dx = x2 - x1, dy = y2 - y1;
        float dist = MathF.Sqrt(dx * dx + dy * dy);
        if (dist < 1e-6f || dist >= r1 + r2) return;
        float nx = dx / dist, ny = dy / dist;
        // 位置補正（質量逆比）
        float overlap = r1 + r2 - dist;
        float inv1 = 1f / m1, inv2 = 1f / m2;
        float invSum = inv1 + inv2;
        x1 -= nx * overlap * (inv1 / invSum);
        y1 -= ny * overlap * (inv1 / invSum);
        x2 += nx * overlap * (inv2 / invSum);
        y2 += ny * overlap * (inv2 / invSum);
        // 相対速度の法線成分
        float rvx = vx2 - vx1, rvy = vy2 - vy1;
        float velN = rvx * nx + rvy * ny;
        if (velN > 0) return; // 離れていく
        float j = -(1 + e) * velN / invSum;
        vx1 -= j * nx * inv1; vy1 -= j * ny * inv1;
        vx2 += j * nx * inv2; vy2 += j * ny * inv2;
    }
}
