// デモ: algorithms/event-system.html
using System;
using System.Collections.Generic;

public sealed class EventBus
{
    private readonly Dictionary<string, List<Action<object?>>> _map = new();

    public void On(string type, Action<object?> handler)
    {
        if (!_map.TryGetValue(type, out var list))
        {
            list = new List<Action<object?>>();
            _map[type] = list;
        }
        list.Add(handler);
    }

    public void Off(string type, Action<object?> handler)
    {
        if (_map.TryGetValue(type, out var list))
            list.Remove(handler);
    }

    public void Emit(string type, object? payload = null)
    {
        if (!_map.TryGetValue(type, out var list)) return;
        foreach (var h in list.ToArray())
            h(payload);
    }
}
