// デモ: algorithms/input-abstraction.html
public sealed class ActionMap
{
    readonly Dictionary<string, string[]> _map = new();
    public void Bind(string action, params string[] keys) => _map[action] = keys;
    public bool IsDown(string action, Func<string, bool> keyDown)
        => _map.TryGetValue(action, out var keys) && keys.Any(keyDown);
}
