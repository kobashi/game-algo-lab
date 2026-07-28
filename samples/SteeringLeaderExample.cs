// デモ: algorithms/steering-leader.html
// followPoint = leaderPos - leaderForward * distance
// Arrive(followPoint)
public static class LeaderFollowing
{
    public static void FollowPoint(
        float lx, float ly, float lvx, float lvy, float dist,
        out float fx, out float fy)
    {
        float spd = MathF.Sqrt(lvx * lvx + lvy * lvy);
        float hx = spd > 1e-3f ? lvx / spd : 1, hy = spd > 1e-3f ? lvy / spd : 0;
        fx = lx - hx * dist;
        fy = ly - hy * dist;
    }
}
