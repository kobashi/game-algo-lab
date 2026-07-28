// デモ: algorithms/command-input.html
// 入力トークン列を窓時間内でコマンド表と照合
public static class CommandMatcher
{
    public static string? Match(IReadOnlyList<string> buffer, string[][] moves)
    {
        foreach (var m in moves)
        {
            if (buffer.Count < m.Length) continue;
            bool ok = true;
            for (int i = 0; i < m.Length; i++)
                if (buffer[buffer.Count - m.Length + i] != m[i]) { ok = false; break; }
            if (ok) return string.Join("+", m);
        }
        return null;
    }
}
