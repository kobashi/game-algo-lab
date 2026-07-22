// Game Algo Lab — ゲームループ（可変 / 固定 timestep）の核
// デモ: algorithms/game-loop.html

using System;

public sealed class BallWorld
{
    public double Y;      // 上=0、下へ正
    public double V;
    public double Gravity = 900;
    public double Floor = 1.0;
    public double Restitution = 0.72;
    public double Radius = 0.045;

    public void Update(double dtSeconds)
    {
        V += Gravity * dtSeconds;
        Y += V * dtSeconds;
        if (Y + Radius > Floor)
        {
            Y = Floor - Radius;
            V = -Math.Abs(V) * Restitution;
        }
    }
}

public static class GameLoopExample
{
    /// <summary>可変 timestep: そのフレームの実経過で 1 回だけ更新。</summary>
    public static void VariableStep(BallWorld world, double realDtSeconds)
    {
        // 巨大 dt は任意でクランプ（タブ復帰対策）
        double dt = Math.Min(realDtSeconds, 0.1);
        world.Update(dt);
    }

    /// <summary>
    /// 固定 timestep: アキュムレータに realDt を溜め、FIXED ずつ Update。
    /// 戻り値は残りの accumulator と実行したステップ数。
    /// </summary>
    public static (double accumulator, int steps) FixedStep(
        BallWorld world,
        double realDtSeconds,
        double fixedDtSeconds,
        ref double accumulator,
        int maxSteps)
    {
        accumulator += Math.Min(realDtSeconds, 0.25);
        int steps = 0;
        while (accumulator >= fixedDtSeconds && steps < maxSteps)
        {
            world.Update(fixedDtSeconds);
            accumulator -= fixedDtSeconds;
            steps++;
        }
        // steps == maxSteps かつまだ余りがある → スパイラル防止で追いつき切れず
        return (accumulator, steps);
    }
}
