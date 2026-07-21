// Game Algo Lab — モンテカルロ木探索 (MCTS / UCT) の核
// デモ: algorithms/mcts.html（題材は三目並べ）
//
// 1 反復 = Selection → Expansion → Simulation → Backpropagation
// 選択は多腕バンディットと同じ UCB1。

using System;
using System.Collections.Generic;
using System.Linq;

public sealed class MctsNode
{
    public string Board { get; }
    public int? MoveFromParent { get; }
    public MctsNode? Parent { get; }
    public List<MctsNode> Children { get; } = new();
    public List<int> Untried { get; }
    public int Visits { get; set; }
    public int Wins { get; set; } // このノードへ着手した側の勝利数（根は手番側）

    public MctsNode(string board, int? move, MctsNode? parent, IEnumerable<int> legalMoves)
    {
        Board = board;
        MoveFromParent = move;
        Parent = parent;
        Untried = legalMoves.ToList();
    }
}

public static class MctsUct
{
    /// <summary>UCB1。未訪問は double.PositiveInfinity。</summary>
    public static double Ucb1(MctsNode child, int parentVisits, double c)
    {
        if (child.Visits == 0) return double.PositiveInfinity;
        double exploit = (double)child.Wins / child.Visits;
        double explore = c * Math.Sqrt(Math.Log(Math.Max(parentVisits, 1)) / child.Visits);
        return exploit + explore;
    }

    public static MctsNode SelectChild(MctsNode node, double c)
    {
        return node.Children.OrderByDescending(ch => Ucb1(ch, node.Visits, c)).First();
    }

    /// <summary>
    /// N 回反復。game は合法手・着手・終局・乱択プレイアウトを提供する。
    /// 推奨手は根の子のうち Visits 最大。
    /// </summary>
    public static MctsNode Run(
        string rootBoard,
        int n,
        double c,
        Random rng,
        IGame game)
    {
        var root = new MctsNode(rootBoard, null, null, game.LegalMoves(rootBoard));
        char rootPlayer = game.CurrentPlayer(rootBoard);

        for (int i = 0; i < n; i++)
        {
            var node = root;
            // Selection
            while (!game.IsTerminal(node.Board) && node.Untried.Count == 0 && node.Children.Count > 0)
                node = SelectChild(node, c);

            // Expansion（未試行手をリスト先頭から1つ）
            if (!game.IsTerminal(node.Board) && node.Untried.Count > 0)
            {
                int move = node.Untried[0];
                node.Untried.RemoveAt(0);
                char mover = game.CurrentPlayer(node.Board);
                string childBoard = game.Apply(node.Board, move, mover);
                var child = new MctsNode(childBoard, move, node, game.LegalMoves(childBoard));
                node.Children.Add(child);
                node = child;
            }

            // Simulation
            char? outcome = game.IsTerminal(node.Board)
                ? game.Winner(node.Board)
                : game.RandomPlayout(node.Board, rng);

            // Backpropagation
            var cur = node;
            while (cur != null)
            {
                cur.Visits++;
                if (cur.Parent == null)
                {
                    if (outcome == rootPlayer) cur.Wins++;
                }
                else
                {
                    char mover = game.CurrentPlayer(cur.Parent.Board);
                    if (outcome == mover) cur.Wins++;
                }
                cur = cur.Parent;
            }
        }

        return root;
    }

    public static int? BestMoveByVisits(MctsNode root)
    {
        if (root.Children.Count == 0) return null;
        return root.Children.OrderByDescending(ch => ch.Visits)
            .ThenBy(ch => ch.MoveFromParent)
            .First().MoveFromParent;
    }
}

/// <summary>デモでは三目並べ。ここにはインタフェースだけ示す。</summary>
public interface IGame
{
    IEnumerable<int> LegalMoves(string board);
    char CurrentPlayer(string board);
    string Apply(string board, int move, char piece);
    bool IsTerminal(string board);
    char? Winner(string board);
    char? RandomPlayout(string board, Random rng);
}
