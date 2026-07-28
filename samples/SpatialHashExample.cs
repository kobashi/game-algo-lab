// デモ: algorithms/spatial-hash.html
public sealed class SpatialHash
{
    public float Cell;
    readonly Dictionary<(int, int), List<int>> _buckets = new();

    public static (int, int) Key(float x, float y, float cell) =>
        ((int)MathF.Floor(x / cell), (int)MathF.Floor(y / cell));

    public void Insert(int id, float x, float y)
    {
        var k = Key(x, y, Cell);
        if (!_buckets.TryGetValue(k, out var list))
            _buckets[k] = list = new List<int>();
        list.Add(id);
    }

    // Query: self cell + 8 neighbors
}
