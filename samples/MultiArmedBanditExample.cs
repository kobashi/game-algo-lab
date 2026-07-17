// Game Algo Lab — 多腕バンディット（ε-greedy / UCB1）の核
// デモ: algorithms/multi-armed-bandit.html

using System;

public static class MultiArmedBandit
{
    /// <summary>ε-greedy: 確率 epsilon で一様探索、否则 経験平均最大を活用。</summary>
    public static int SelectEpsilonGreedy(
        double[] meanEst,
        int[] pulls,
        double epsilon,
        Random rng)
    {
        if (rng.NextDouble() < epsilon)
            return rng.Next(meanEst.Length);

        int best = 0;
        for (int i = 1; i < meanEst.Length; i++)
        {
            if (pulls[i] == 0) return i; // 未引きは優先して試す
            if (meanEst[i] > meanEst[best]) best = i;
        }
        if (pulls[best] == 0)
        {
            for (int i = 0; i < pulls.Length; i++)
                if (pulls[i] == 0) return i;
        }
        return best;
    }

    /// <summary>
    /// UCB1: argmax (μ̂_i + sqrt(2 ln t / n_i))。未引きは優先。
    /// t は 1 以上の総試行回数（これから引く直前の t+1 を渡してもよい）。
    /// </summary>
    public static int SelectUcb1(double[] meanEst, int[] pulls, int totalPulls)
    {
        int k = meanEst.Length;
        for (int i = 0; i < k; i++)
            if (pulls[i] == 0) return i;

        double t = Math.Max(1, totalPulls);
        int best = 0;
        double bestScore = double.NegativeInfinity;
        for (int i = 0; i < k; i++)
        {
            double bonus = Math.Sqrt(2.0 * Math.Log(t) / pulls[i]);
            double score = meanEst[i] + bonus;
            if (score > bestScore)
            {
                bestScore = score;
                best = i;
            }
        }
        return best;
    }

    /// <summary>ベルヌーイ報酬。trueMean の確率で 1。</summary>
    public static int SampleBernoulli(double trueMean, Random rng)
    {
        return rng.NextDouble() < trueMean ? 1 : 0;
    }
}
