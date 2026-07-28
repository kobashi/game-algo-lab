// デモ: algorithms/balance-sim.html
// 2 体の簡易ターン戦闘を N 回シミュレートして勝率
public static class BalanceSim
{
    public static double WinRateA(int trials, int atkA, int atkB, int hp, Random rng)
    {
        int wins = 0;
        for (int i = 0; i < trials; i++)
            if (Fight(atkA, atkB, hp, rng) == 0) wins++;
        return wins / (double)trials;
    }
    static int Fight(int a, int b, int hp, Random rng) { return 0; /* A or B */ }
}
