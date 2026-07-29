// デモ: algorithms/snapshot-interp.html
// 受信スナップショットをバッファし、描画時刻で線形補間

public struct Snap
{
    public float T, X, Y;
}

public static class SnapshotInterp
{
    // renderTime = now - interpDelay
    public static (float x, float y) Sample(IReadOnlyList<Snap> buf, float renderTime)
    {
        if (buf.Count == 0) return (0, 0);
        if (buf.Count == 1 || renderTime <= buf[0].T)
            return (buf[0].X, buf[0].Y);
        var last = buf[buf.Count - 1];
        if (renderTime >= last.T) return (last.X, last.Y);
        int i = 0;
        while (i < buf.Count - 1 && buf[i + 1].T < renderTime) i++;
        var a = buf[i];
        var b = buf[i + 1];
        float u = (renderTime - a.T) / (b.T - a.T);
        return (a.X + (b.X - a.X) * u, a.Y + (b.Y - a.Y) * u);
    }
}
