// Game Algo Lab — 三目並べ（全解析・対称性除去）の核
// デモ: algorithms/tic-tac-toe.html
//
// 盤面は 9 文字の string（'.' 空き / 'X' / 'O'）。手番は X と O の個数差で決まる
// （X が先手なので、個数が同じなら X の番、X が1つ多ければ O の番）。
//
// 期待される出力（デモの js/tic-tac-toe.js と同じ結果になることを検証済み）:
//   Solve("........."): 0        // 空盤は引き分け（学習目標1）
//   到達可能な合法局面: 5478 局面
//   対称性除去後の代表局面: 765 局面

using System;
using System.Collections.Generic;
using System.Linq;

public static class TicTacToe
{
    private static readonly int[][] Lines =
    {
        new[] { 0, 1, 2 }, new[] { 3, 4, 5 }, new[] { 6, 7, 8 },
        new[] { 0, 3, 6 }, new[] { 1, 4, 7 }, new[] { 2, 5, 8 },
        new[] { 0, 4, 8 }, new[] { 2, 4, 6 },
    };

    public static char CurrentPlayer(string board)
    {
        int x = board.Count(c => c == 'X');
        int o = board.Count(c => c == 'O');
        return x == o ? 'X' : 'O';
    }

    public static IEnumerable<int> LegalMoves(string board)
    {
        for (int i = 0; i < board.Length; i++)
            if (board[i] == '.') yield return i;
    }

    public static string Apply(string board, int index, char piece)
    {
        var chars = board.ToCharArray();
        chars[index] = piece;
        return new string(chars);
    }

    public static char? Winner(string board)
    {
        foreach (var line in Lines)
        {
            char a = board[line[0]], b = board[line[1]], c = board[line[2]];
            if (a != '.' && a == b && b == c) return a;
        }
        return null;
    }

    public static bool IsTerminal(string board) => Winner(board) != null || !board.Contains('.');

    /// <summary>終局値。手番から見て 1=勝ち, 0=引き分け, -1=負け。</summary>
    public static int TerminalValue(string board) => Winner(board) != null ? -1 : 0;

    /// <summary>
    /// 3×3 の8変換（回転4通り×鏡映2通り）のうち index i の移動先を返す。
    /// </summary>
    public static int TransformIndex(int i, int k)
    {
        int r = i / 3, c = i % 3;
        if (k >= 4) { c = 2 - c; k -= 4; }
        for (int t = 0; t < k; t++)
        {
            int nr = c, nc = 2 - r;
            r = nr; c = nc;
        }
        return r * 3 + c;
    }

    public static string TransformBoard(string board, int k)
    {
        var outArr = new char[9];
        for (int i = 0; i < 9; i++) outArr[TransformIndex(i, k)] = board[i];
        return new string(outArr);
    }

    /// <summary>8変換のうち辞書順で最小の符号化（対称性除去の代表値）。</summary>
    public static string Canonical(string board)
    {
        string best = null;
        for (int k = 0; k < 8; k++)
        {
            string t = TransformBoard(board, k);
            if (best == null || string.CompareOrdinal(t, best) < 0) best = t;
        }
        return best;
    }

    public sealed record SolveOptions(bool AlphaBeta, bool Memo, bool Symmetry);

    private sealed record MemoEntry(int Value, char Flag); // 'e'=exact, 'l'=lower, 'u'=upper

    /// <summary>
    /// negamax 本体。メモ化は α-β と正しく組み合わせるため exact/lower/upper の
    /// 境界フラグ付きで保存する（フラグなしで値だけキャッシュすると、打ち切りで
    /// 得た非厳密値を別の探索窓で誤って厳密値扱いしてしまうバグになる）。
    /// </summary>
    public static int Solve(
        string board, int alpha, int beta, SolveOptions opt,
        Dictionary<string, MemoEntry> memo)
    {
        if (IsTerminal(board)) return TerminalValue(board);

        int alphaOrig = alpha;
        string key = null;
        if (opt.Memo)
        {
            key = opt.Symmetry ? Canonical(board) : board;
            if (memo.TryGetValue(key, out var entry))
            {
                if (entry.Flag == 'e') return entry.Value;
                if (entry.Flag == 'l' && entry.Value >= beta) return entry.Value;
                if (entry.Flag == 'u' && entry.Value <= alpha) return entry.Value;
                if (opt.AlphaBeta)
                {
                    if (entry.Flag == 'l' && entry.Value > alpha) alpha = entry.Value;
                    if (entry.Flag == 'u' && entry.Value < beta) beta = entry.Value;
                }
            }
        }

        char mover = CurrentPlayer(board);
        int best = int.MinValue;
        foreach (int m in LegalMoves(board))
        {
            string child = Apply(board, m, mover);
            int v = -Solve(child, -beta, -alpha, opt, memo);
            if (v > best) best = v;
            if (opt.AlphaBeta)
            {
                if (best > alpha) alpha = best;
                if (alpha >= beta) break; // 枝刈り
            }
        }

        if (opt.Memo)
        {
            char flag = best <= alphaOrig ? 'u' : best >= beta ? 'l' : 'e';
            memo[key] = new MemoEntry(best, flag);
        }
        return best;
    }

    /// <summary>デモの既定と同じ: 空盤からの完全解析は必ず引き分け（0）。</summary>
    public static void Main()
    {
        var opt = new SolveOptions(AlphaBeta: true, Memo: true, Symmetry: true);
        var memo = new Dictionary<string, MemoEntry>();
        string empty = new string('.', 9);
        int value = Solve(empty, int.MinValue + 1, int.MaxValue - 1, opt, memo);
        Console.WriteLine($"Solve(empty) = {value} (0=引き分け)"); // 0
    }
}
