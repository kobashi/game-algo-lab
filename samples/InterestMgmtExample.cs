// デモ: algorithms/interest-mgmt.html
// AOI（関心円）内エンティティだけを送信対象にする

public struct Entity
{
    public int Id;
    public float X, Y;
}

public static class InterestMgmt
{
    public static List<Entity> FilterAoi(
        IEnumerable<Entity> all, float vx, float vy, float radius)
    {
        float r2 = radius * radius;
        var list = new List<Entity>();
        foreach (var e in all)
        {
            float dx = e.X - vx, dy = e.Y - vy;
            if (dx * dx + dy * dy <= r2) list.Add(e);
        }
        return list;
    }

    // bytes/tick ≈ FilterAoi(...).Count * bytesPerEntity
}
