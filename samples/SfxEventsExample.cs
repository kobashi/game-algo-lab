// Game Algo Lab — イベントと効果音（EventBus で「起きたこと」と「鳴らす音」を分ける）
// デモ: algorithms/sfx-events.html

using System;
using System.Collections.Generic;

/// <summary>イベント名ごとに、呼び出す処理（Action）の一覧を持つ。</summary>
public sealed class EventBus
{
    private readonly Dictionary<string, List<Action>> _handlers = new();

    /// <summary>イベント名 ev が起きたときに呼ぶ処理 fn を登録する。</summary>
    public void On(string ev, Action fn)
    {
        if (!_handlers.ContainsKey(ev))
            _handlers[ev] = new List<Action>();
        _handlers[ev].Add(fn);
    }

    /// <summary>イベント名 ev を発行する。登録された処理を順に呼ぶ。</summary>
    public void Emit(string ev)
    {
        Console.WriteLine("Emit " + ev);
        if (!_handlers.ContainsKey(ev)) return;   // 誰も聞いていないイベントは何もしない
        foreach (Action fn in _handlers[ev])
            fn();
    }
}

public sealed class SfxService
{
    public bool Muted;

    public void PlayTone(float freq, float seconds)
    {
        if (Muted) return;
        // 実際の再生は Web Audio / AudioClip など。ここでは内容を表示するだけ
        Console.WriteLine("  play " + freq + " Hz, " + seconds + " s");
    }
}

public static class SfxEventsExample
{
    public static void Main()
    {
        var bus = new EventBus();
        var sfx = new SfxService();

        // イベントと音の対応（デモの既定値）。ゲーム側は音を知らなくてよい
        bus.On("Jump", () => sfx.PlayTone(440f, 0.08f));
        bus.On("Land", () => sfx.PlayTone(180f, 0.1f));
        bus.On("Hit", () => sfx.PlayTone(120f, 0.12f));

        bus.Emit("Jump");   // ゲーム側は「ジャンプした」と知らせるだけ
        bus.Emit("Land");
        sfx.Muted = true;
        bus.Emit("Hit");    // イベントは起きるが、音は鳴らない
    }
}
