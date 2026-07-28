// デモ: algorithms/gfx-sprite-2d.html
// フレーム切替 + Y ソート描画
public sealed class SpriteActor
{
    public string Id;
    public float X, Y;
    public int Frame;
}

public static class Sprite2d
{
    public static void DrawSorted(List<SpriteActor> list, bool sortByY)
    {
        if (sortByY)
            list = list.OrderBy(a => a.Y).ThenBy(a => a.X).ToList();
        foreach (var a in list)
            DrawFrame(a); // back → front
    }

    static void DrawFrame(SpriteActor a) { /* blit sheet cell a.Frame */ }
}
