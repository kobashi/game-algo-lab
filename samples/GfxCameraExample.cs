// デモ: algorithms/gfx-camera.html
public sealed class FollowCamera2D
{
    public float X;
    public float Follow = 0.08f;
    public float DeadZone = 40f;

    public void Update(float playerX, float viewW)
    {
        float screenX = playerX - X;
        float mid = viewW * 0.5f;
        float desired = X;
        if (screenX < mid - DeadZone) desired = playerX - (mid - DeadZone);
        else if (screenX > mid + DeadZone) desired = playerX - (mid + DeadZone);
        X += (desired - X) * Follow;
    }

    public (float sx, float sy) WorldToScreen(float wx, float wy) =>
        (wx - X, wy);
}
