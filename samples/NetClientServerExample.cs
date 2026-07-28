// デモ: algorithms/net-client-server.html
// サーバは変位を maxSpeed*dt でキャップ
public static class ServerAuthority
{
    public static float Apply(float serverX, float claimX, float maxSpeed, float dt)
    {
        float maxDx = maxSpeed * dt;
        float want = claimX - serverX;
        if (MathF.Abs(want) <= maxDx) return claimX;
        return serverX + MathF.Sign(want) * maxDx;
    }
}
