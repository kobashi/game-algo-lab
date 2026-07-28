// デモ: algorithms/net-anti-cheat.html
public static class AntiCheat
{
    public static bool ValidateMove(float serverX, float claimX, float maxSpeed, float dt)
    {
        return MathF.Abs(claimX - serverX) <= maxSpeed * dt + 0.5f;
    }

    public static bool ValidateScore(int reported, int serverHits, int pointsPerHit) =>
        reported <= serverHits * pointsPerHit;
}
