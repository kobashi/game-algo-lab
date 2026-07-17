// Game Algo Lab — 有限ステートマシン（キャラ行動）の核
// デモ: algorithms/fsm.html

using System;
using System.Collections.Generic;

public sealed class StateMachine
{
    private readonly Dictionary<string, string> _transitions;
    public string Current { get; private set; }
    public IReadOnlyList<string> History => _history;
    private readonly List<string> _history = new();

    /// <summary>
    /// transitions のキーは "From|Event"、値は次状態。
    /// </summary>
    public StateMachine(string initial, Dictionary<string, string> transitions)
    {
        Current = initial;
        _transitions = transitions;
        _history.Add(initial);
    }

    /// <summary>
    /// イベントを処理。定義された遷移があれば状態を更新して true。
    /// 未定義なら無視して false（状態は変わらない）。
    /// </summary>
    public bool TryHandle(string eventId)
    {
        var key = Current + "|" + eventId;
        if (!_transitions.TryGetValue(key, out var next))
            return false;

        Current = next;
        _history.Add(next);
        return true;
    }
}

// 利用イメージ:
// var fsm = new StateMachine("Idle", transitions);
// fsm.TryHandle("Move");   // Idle → Walk
// fsm.TryHandle("Attack"); // Walk → Attack
