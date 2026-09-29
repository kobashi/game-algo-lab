// Game Algo Lab — 入力の基礎（held / down / up / 長押し）
// デモ: algorithms/input-basics.html
// Fire は held のあいだ毎フレーム +1、離したフレーム（Up）で 0 に戻す。
// Charge は長押しが成立したフレームで 1 回だけ消費し、弾を 1 発足す。

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

    /// <summary>
    /// 長押しが成立したフレームだけチャージを消費し、弾を 1 発足す。
    /// 押し続けても 2 発目は出ない。
    /// </summary>
    public static int ConsumeCharge(
        ActionState state,
        double longPressThresholdSeconds,
        int shots)
    {
        if (ConsumeLongPress(state, longPressThresholdSeconds))
            shots += 1;
        return shots;
    }

    /// <summary>
    /// Fire: 押しているあいだは毎フレーム +1。離したフレーム（Up）で 0 に戻す。
    /// </summary>
    public static int ApplyFire(ActionState state, int fireCount)
    {
        if (state.Held)
            fireCount += 1;
        if (state.Up)
            fireCount = 0;
        return fireCount;
    }
}
