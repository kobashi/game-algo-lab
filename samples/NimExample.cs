// Game Algo Lab — ニム（完全読み切り→理論解）の核
// デモ: algorithms/nim.html
//
// モード1（1山）: 逆向き着色DP（value[0]=LOSE、以降 相手をLOSEへ送れる手があればWIN）
// モード2（複数山）: メモ化探索（DAGなので必ず停止）＋ nim-sum（XOR）による理論判定
//
// 期待される出力（デモの js/nim.js と同じロジックを実装し、実際に計算して確認済み。
// 文献値ではなく本リポジトリの自前計算値。検証手順は docs/topics/nim/SPEC.md §11 と
// HANDOFF.md を参照）:
//   モード1 (N=21, k=3): 縞の間隔 = k+1 = 4。負け(LOSE)位置 = {0,4,8,12,16,20}
//     n=21 の理論評価: 21 mod 4 = 1 → WIN（手番側=先手 勝ち）
//   モード2 (3,5,7):  nim-sum = 3^5^7 = 1（非0） → 先手 勝ち。全局面 192（=4*6*8）で探索とXOR判定が一致
//   モード2 (1,2,3):  nim-sum = 1^2^3 = 0        → 先手 負け。全局面 24（=2*3*4）で一致
//   モード2 (2,4,6):  nim-sum = 2^4^6 = 0        → 先手 負け（(1,2,3)の2倍でも結論は不変）。全局面 105（=3*5*7）で一致

using System;
using System.Collections.Generic;
using System.Linq;

public static class Nim
{
    // ---- モード1: 1山（サブトラクションゲーム） ----

    /// <summary>理論判定: n mod (k+1) == 0 なら手番側の負け。</summary>
    public static bool SingleTheoryIsLose(int n, int k) => n % (k + 1) == 0;

    /// <summary>
    /// 逆向き着色DP。value[0]=LOSE（取る石がない=直前の相手が最後を取った）。
    /// n=1..N: 相手をLOSE局面(n-t)へ送れる手 t(1..k) が1つでもあればWIN、なければLOSE。
    /// </summary>
    public static bool[] SolveSingle(int N, int k)
    {
        // true = WIN, false = LOSE
        var win = new bool[N + 1];
        win[0] = false;
        for (int n = 1; n <= N; n++)
        {
            bool w = false;
            for (int t = 1; t <= Math.Min(k, n); t++)
            {
                if (!win[n - t]) { w = true; break; }
            }
            win[n] = w;
        }
        return win;
    }

    /// <summary>CPUの着手: n%(k+1)が非0ならその個数を取る。0（負け局面）なら任意（min(k,n)）。</summary>
    public static int CpuMoveSingle(int n, int k)
    {
        int r = n % (k + 1);
        return r != 0 ? r : Math.Min(k, n);
    }

    // ---- モード2: 複数山ニム ----

    /// <summary>nim-sum（全山のXOR）。</summary>
    public static int NimSum(IEnumerable<int> piles) => piles.Aggregate(0, (acc, p) => acc ^ p);

    public static string PilesKey(int[] piles) => string.Join(",", piles);

    /// <summary>
    /// メモ化探索。全山0（合法手0件）=手番側の負け。
    /// 山の合計は手ごとに厳密に減るため必ず停止する（循環なし）。
    /// </summary>
    public static bool SolveMulti(int[] piles, Dictionary<string, bool> memo)
    {
        string key = PilesKey(piles);
        if (memo.TryGetValue(key, out bool cached)) return cached;

        bool win = false;
        for (int i = 0; i < piles.Length && !win; i++)
        {
            for (int to = piles[i] - 1; to >= 0; to--)
            {
                var child = (int[])piles.Clone();
                child[i] = to;
                if (!SolveMulti(child, memo)) { win = true; break; }
            }
        }
        memo[key] = win;
        return win;
    }

    /// <summary>
    /// CPUの着手: nim-sumが非0なら、ある山を (山の値 XOR nim-sum) まで減らせば
    /// 着手後のnim-sumが0になる（XORの構成的性質）。0（負け局面）なら先頭の合法手。
    /// 戻り値: (山番号, 着手後の値) または null（合法手なし）。
    /// </summary>
    public static (int pileIndex, int to)? CpuMoveMulti(int[] piles)
    {
        int sum = NimSum(piles);
        if (sum != 0)
        {
            for (int i = 0; i < piles.Length; i++)
            {
                int target = piles[i] ^ sum;
                if (target < piles[i]) return (i, target);
            }
            return null; // sum!=0 なら理論上ここには到達しない
        }
        for (int i = 0; i < piles.Length; i++)
        {
            if (piles[i] > 0) return (i, piles[i] - 1);
        }
        return null;
    }

    /// <summary>各山 0..初期値 の直積（全局面）を列挙する。</summary>
    public static IEnumerable<int[]> AllStatesProduct(int[] piles)
    {
        int n = piles.Length;
        var cur = new int[n];
        IEnumerable<int[]> Rec(int idx)
        {
            if (idx == n) { yield return (int[])cur.Clone(); yield break; }
            for (int v = 0; v <= piles[idx]; v++)
            {
                cur[idx] = v;
                foreach (var s in Rec(idx + 1)) yield return s;
            }
        }
        return Rec(0);
    }

    /// <summary>
    /// 全局面（直積）で メモ化探索のW/Lと(nim-sum!=0)を照合する。
    /// 戻り値: (全局面数, 探索が触った局面数, 不一致数)。
    /// </summary>
    public static (int total, int statesVisited, int mismatches) VerifyAll(int[] piles)
    {
        var states = AllStatesProduct(piles).ToList();
        var memo = new Dictionary<string, bool>();
        int mismatches = 0;
        foreach (var s in states)
        {
            bool searchWin = SolveMulti(s, memo);
            bool theoryWin = NimSum(s) != 0;
            if (searchWin != theoryWin) mismatches++;
        }
        return (states.Count, memo.Count, mismatches);
    }

    public static void Main()
    {
        // モード1: N=21, k=3
        int N = 21, k = 3;
        var win = SolveSingle(N, k);
        var losePositions = Enumerable.Range(0, N + 1).Where(n => !win[n]).ToList();
        Console.WriteLine($"モード1 N={N} k={k}: 負け位置 = [{string.Join(",", losePositions)}]"); // 0,4,8,12,16,20
        Console.WriteLine($"n={N} の評価: {(win[N] ? "WIN" : "LOSE")}"); // WIN（21 mod 4 = 1）

        // モード2: 3プリセット
        foreach (var piles in new[] { new[] { 3, 5, 7 }, new[] { 1, 2, 3 }, new[] { 2, 4, 6 } })
        {
            int sum = NimSum(piles);
            var (total, visited, mismatches) = VerifyAll(piles);
            Console.WriteLine(
                $"モード2 ({string.Join(",", piles)}): nim-sum={sum} " +
                $"({(sum != 0 ? "先手勝ち" : "先手負け")}) 全{total}局面, 探索が触った局面数={visited}, 不一致={mismatches}");
        }
    }
}
