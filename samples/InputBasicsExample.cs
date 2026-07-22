// Game Algo Lab — 入力の基礎（held / down / up / 長押し）
// デモ: algorithms/input-basics.html

using System;
using System.Collections.Generic;

public sealed class ActionState
{
    public bool Held;
    public bool Down;   // このフレームで押された
    public bool Up;     // このフレームで離された
    public double HoldTime; // 秒
    public bool LongPressFired;
}

public static class InputBasicsExample
{
    /// <summary>
    /// 前フレーム held と今フレームの生 isDown からエッジと holdTime を更新する。
    /// </summary>
    public static void Poll(
        ActionState state,
        bool isDownNow,
        double dtSeconds,
        double longPressThresholdSeconds)
    {
        bool prev = state.Held;
        state.Held = isDownNow;
        state.Down = state.Held && !prev;
        state.Up = !state.Held && prev;

        if (state.Held)
            state.HoldTime += dtSeconds;
        else
        {
            state.HoldTime = 0;
            state.LongPressFired = false;
        }

        // 長押し: 閾値をまたいだ最初のフレームだけ「発火」扱いにするなら
        // 呼び出し側で HoldTime を監視してもよい
    }

    public static bool ConsumeLongPress(
        ActionState state,
        double longPressThresholdSeconds)
    {
        if (!state.Held || state.LongPressFired) return false;
        if (state.HoldTime < longPressThresholdSeconds) return false;
        state.LongPressFired = true;
        return true;
    }
}
