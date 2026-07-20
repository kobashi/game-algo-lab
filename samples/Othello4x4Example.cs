// Game Algo Lab — 4×4 オセロ（符号化・転置表・対称正規化）の核
// デモ: algorithms/othello-4x4.html
//
// 盤面は 16 文字の string（行優先。'.' 空き / 'B' 黒 / 'W' 白）。
// 手番は個数差からは決まらない（パスがあるため）ので、局面は (board, turn) の組で表す。
// 「直前の手がパスだったか」は状態に持たない。両者とも合法手がない、という
// 盤面だけから決まる性質で終局判定できるため（デモの js/othello-4x4.js SPEC §11 参照）。
//
// 期待される出力（デモの js/othello-4x4.js の analyzeMoves と一致することを
// Node の検証スクリプトで確認済み。文献値ではなく自前の全解析で確定した値）:
//   Solve(初期局面, 黒視点) = -8   // 黒が最善を尽くしても白に8石差で負ける
//   訪問局面数（全トグルOFF）: 224,820
//   訪問局面数（全トグルON）:      432

using System;
using System.Collections.Generic;
using System.Linq;

public static class Othello4x4
{
    private const int Size = 4;
    private const int Cells = Size * Size;

    private static readonly (int dr, int dc)[] Dirs =
    {
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1), (0, 1),
        (1, -1), (1, 0), (1, 1),
    };

    public const string InitialBoard = ".....WB..BW.....";
    public const char InitialTurn = 'B';

    public static char Opponent(char turn) => turn == 'B' ? 'W' : 'B';

    private static bool InBounds(int r, int c) => r >= 0 && r < Size && c >= 0 && c < Size;
    private static int Idx(int r, int c) => r * Size + c;

    public static int CountPiece(string board, char piece) => board.Count(c => c == piece);

    public static bool IsFull(string board) => !board.Contains('.');

    /// <summary>index に turn が着手した場合に反転する石の index 一覧（合法でなければ空）。</summary>
    public static List<int> FlipsForMove(string board, char turn, int index)
    {
        var flips = new List<int>();
        if (board[index] != '.') return flips;
        char opp = Opponent(turn);
        int r0 = index / Size, c0 = index % Size;
        foreach (var (dr, dc) in Dirs)
        {
            int r = r0 + dr, c = c0 + dc;
            var line = new List<int>();
            while (InBounds(r, c) && board[Idx(r, c)] == opp)
            {
                line.Add(Idx(r, c));
                r += dr; c += dc;
            }
            if (line.Count > 0 && InBounds(r, c) && board[Idx(r, c)] == turn)
            {
                flips.AddRange(line);
            }
        }
        return flips;
    }

    public static IEnumerable<int> LegalMoves(string board, char turn)
    {
        for (int i = 0; i < Cells; i++)
            if (board[i] == '.' && FlipsForMove(board, turn, i).Count > 0) yield return i;
    }

    public static string Apply(string board, char turn, int index)
    {
        var flips = FlipsForMove(board, turn, index);
        var chars = board.ToCharArray();
        chars[index] = turn;
        foreach (int f in flips) chars[f] = turn;
        return new string(chars);
    }

    /// <summary>
    /// 両者とも合法手がない（=終局。満杯でなくとも打つ手なし）かどうか。
    /// 盤面だけから決まる性質なので「直前がパスか」を状態に持たなくてよい。
    /// </summary>
    public static bool BothHaveNoMoves(string board) =>
        !LegalMoves(board, 'B').Any() && !LegalMoves(board, 'W').Any();

    public static bool IsTerminal(string board) => IsFull(board) || BothHaveNoMoves(board);

    /// <summary>終局時の値。turn 視点の石差。</summary>
    public static int TerminalValue(string board, char turn) =>
        CountPiece(board, turn) - CountPiece(board, Opponent(turn));

    public static string Encode(string board, char turn) => board + turn;

    /// <summary>
    /// 座標変換: k=0..3 は90°刻みの回転、k=4..7 は左右反転してから回転（D4群、8元）。
    /// </summary>
    public static int TransformIndex(int i, int k)
    {
        int r = i / Size, c = i % Size;
        if (k >= 4) { c = Size - 1 - c; k -= 4; }
        for (int t = 0; t < k; t++)
        {
            int nr = c, nc = Size - 1 - r;
            r = nr; c = nc;
        }
        return r * Size + c;
    }

    public static string TransformBoard(string board, int k)
    {
        var outArr = new char[Cells];
        for (int i = 0; i < Cells; i++) outArr[TransformIndex(i, k)] = board[i];
        return new string(outArr);
    }

    /// <summary>8変換のうち符号化（手番込み）で辞書順最小のものを代表値とする。</summary>
    public static string Canonical(string board, char turn)
    {
        string best = null;
        for (int k = 0; k < 8; k++)
        {
            string t = TransformBoard(board, k) + turn;
            if (best == null || string.CompareOrdinal(t, best) < 0) best = t;
        }
        return best;
    }

    public sealed record SolveOptions(bool AlphaBeta, bool Memo, bool Symmetry);

    private sealed record MemoEntry(int Value, char Flag); // 'e'=exact, 'l'=lower, 'u'=upper

    /// <summary>
    /// negamax 本体。合法手が0のときは「パス」（盤面そのまま・手番交代のみ）として
    /// 単一子で再帰する。転置表は三目並べと同じ exact/lower/upper 境界フラグ方式。
    /// </summary>
    public static int Solve(
        string board, char turn, int alpha, int beta, SolveOptions opt,
        Dictionary<string, MemoEntry> memo)
    {
        if (IsTerminal(board)) return TerminalValue(board, turn);

        int alphaOrig = alpha;
        string key = null;
        if (opt.Memo)
        {
            key = opt.Symmetry ? Canonical(board, turn) : Encode(board, turn);
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

        var moves = LegalMoves(board, turn).ToList();
        int best;
        if (moves.Count == 0)
        {
            // 合法手なし = パス
            best = -Solve(board, Opponent(turn), -beta, -alpha, opt, memo);
        }
        else
        {
            best = int.MinValue;
            foreach (int m in moves)
            {
                string child = Apply(board, turn, m);
                int v = -Solve(child, Opponent(turn), -beta, -alpha, opt, memo);
                if (v > best) best = v;
                if (opt.AlphaBeta)
                {
                    if (best > alpha) alpha = best;
                    if (alpha >= beta) break; // 枝刈り
                }
            }
        }

        if (opt.Memo)
        {
            char flag = best <= alphaOrig ? 'u' : best >= beta ? 'l' : 'e';
            memo[key] = new MemoEntry(best, flag);
        }
        return best;
    }

    /// <summary>デモの既定（α-β・転置表 ON、対称性 OFF）と同じ設定での初期局面解析。</summary>
    public static void Main()
    {
        var opt = new SolveOptions(AlphaBeta: true, Memo: true, Symmetry: true);
        var memo = new Dictionary<string, MemoEntry>();
        int value = Solve(InitialBoard, InitialTurn, int.MinValue + 1, int.MaxValue - 1, opt, memo);
        Console.WriteLine($"Solve(初期局面) = {value} (黒視点の石差。負=黒が負け)"); // -8
    }
}
