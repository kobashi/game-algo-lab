// Game Algo Lab — 時間管理（time scale / ポーズ）の核
// デモ: algorithms/time-management.html

using System;

public sealed class TimeClock
{
    /// <summary>壁時計からの累積（ポーズや scale の影響を受けない）</summary>
    public double RealTime;

    /// <summary>ゲーム内時間（scale・ポーズの影響を受ける）</summary>
    public double GameTime;

    public double TimeScale = 1.0;
    public bool Paused;

    /// <summary>
    /// 1 フレーム分。realDt は秒。
    /// scaledDt = Paused ? 0 : realDt * TimeScale
    /// </summary>
    public double Tick(double realDtSeconds)
    {
        RealTime += realDtSeconds;
        double scaled = Paused ? 0.0 : realDtSeconds * TimeScale;
        GameTime += scaled;
        return scaled;
    }
}

public static class TimeManagementExample
{
    /// <summary>往復位置 0..1（三角波）。gameTime と halfPeriod で駆動。</summary>
    public static double Patrol01(double gameTime, double halfPeriod)
    {
        if (halfPeriod <= 0) return 0;
        double cycle = gameTime / halfPeriod;
        double t = cycle - Math.Floor(cycle); // 0..1
        // 0→1→0
        return t < 0.5 ? t * 2.0 : 2.0 - t * 2.0;
    }
}
