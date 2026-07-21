/**
 * モンテカルロ木探索 (MCTS) — 題材: 三目並べ
 * 共通基盤: js/platform/*
 * ルール・プレイアウト・完全解: js/tic-tac-toe.js を再利用（複製しない）
 *
 * 前半 CORE は DOM 非依存。検証スクリプトから import 可能。
 * @see docs/topics/mcts/SPEC.md
 */

import {
  DEFAULT_PRESET_ID,
  MCTS_CONFIG,
  getPreset,
  presetList,
} from "./maps/mcts-config.js";
import {
  EMPTY_BOARD,
  legalMoves,
  applyMove,
  isTerminal,
  currentPlayer,
  winner,
  validateBoard,
  randomPlayoutOutcome,
  mcEstimateMoves,
  analyzeMoves,
  miniBoardText,
} from "./tic-tac-toe.js";
import { setPanel, renderCallStack, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  mulberry32,
  layoutTree,
  applySvgSize,
  escapeXml,
  mountTopicShellFromDataset,
} from "./platform/index.js";

const IS_BROWSER = typeof document !== "undefined";

/* ============================================================
 * MCTS CORE（DOM 非依存）
 * ============================================================ */

/**
 * @typedef {{
 *   board: string,
 *   move: number | null,
 *   parent: MctsNode | null,
 *   children: MctsNode[],
 *   untried: number[],
 *   visits: number,
 *   wins: number,
 *   id: string,
 * }} MctsNode
 */

/**
 * @typedef {{
 *   path: MctsNode[],
 *   expanded: MctsNode | null,
 *   winner: 'X'|'O'|null,
 *   selectedMove: number | null,
 * }} IterationResult
 */

let _nodeSeq = 0;

/**
 * @param {string} board
 * @param {number | null} move
 * @param {MctsNode | null} parent
 * @returns {MctsNode}
 */
export function createNode(board, move = null, parent = null) {
  _nodeSeq += 1;
  return {
    board,
    move,
    parent,
    children: [],
    untried: isTerminal(board) ? [] : legalMoves(board).slice(),
    visits: 0,
    wins: 0,
    id: `n${_nodeSeq}`,
  };
}

/** @param {MctsNode} root */
export function resetNodeIds(root) {
  _nodeSeq = 0;
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    _nodeSeq += 1;
    n.id = `n${_nodeSeq}`;
    for (const c of n.children) stack.push(c);
  }
}

/**
 * 子の UCB1。未訪問は +∞
 * @param {MctsNode} child
 * @param {number} parentVisits
 * @param {number} C
 */
export function ucb1(child, parentVisits, C) {
  if (child.visits === 0) return Infinity;
  const exploit = child.wins / child.visits;
  const explore = C * Math.sqrt(Math.log(Math.max(parentVisits, 1)) / child.visits);
  return exploit + explore;
}

/**
 * @param {MctsNode} node
 * @param {number} C
 * @returns {MctsNode}
 */
export function selectChild(node, C) {
  let best = node.children[0];
  let bestU = -Infinity;
  for (const ch of node.children) {
    const u = ucb1(ch, node.visits, C);
    if (u > bestU) {
      bestU = u;
      best = ch;
    }
  }
  return best;
}

/**
 * 未展開手を1つ子として追加（合法手リスト順）
 * @param {MctsNode} node
 * @returns {MctsNode}
 */
export function expand(node) {
  if (node.untried.length === 0 || isTerminal(node.board)) return node;
  const move = node.untried.shift();
  const mover = currentPlayer(node.board);
  const childBoard = applyMove(node.board, /** @type {number} */ (move), mover);
  const child = createNode(childBoard, move, node);
  node.children.push(child);
  return child;
}

/**
 * 逆伝播。各ノードの wins は「そのノードへ着手した側」の勝利数。
 * 根は「根で手番の側」の勝利数（推奨手は子の visits で決める）。
 * @param {MctsNode} leaf
 * @param {'X'|'O'|null} outcome
 * @param {'X'|'O'} rootPlayer
 */
export function backup(leaf, outcome, rootPlayer) {
  let n = /** @type {MctsNode | null} */ (leaf);
  while (n) {
    n.visits += 1;
    if (n.parent === null) {
      if (outcome === rootPlayer) n.wins += 1;
    } else {
      const mover = currentPlayer(n.parent.board);
      if (outcome === mover) n.wins += 1;
    }
    n = n.parent;
  }
}

/**
 * 1 反復（選択→展開→シミュレーション→逆伝播）
 * @param {MctsNode} root
 * @param {number} C
 * @param {() => number} rng
 * @returns {IterationResult}
 */
export function mctsIterate(root, C, rng) {
  const rootPlayer = currentPlayer(root.board);
  /** @type {MctsNode[]} */
  const path = [root];
  let node = root;

  // 1. Selection
  while (
    !isTerminal(node.board) &&
    node.untried.length === 0 &&
    node.children.length > 0
  ) {
    node = selectChild(node, C);
    path.push(node);
  }

  // 2. Expansion
  /** @type {MctsNode | null} */
  let expanded = null;
  if (!isTerminal(node.board) && node.untried.length > 0) {
    node = expand(node);
    path.push(node);
    expanded = node;
  }

  // 3. Simulation
  const outcome = isTerminal(node.board)
    ? winner(node.board)
    : randomPlayoutOutcome(node.board, rng);

  // 4. Backpropagation
  backup(node, outcome, rootPlayer);

  return {
    path,
    expanded,
    winner: outcome,
    selectedMove: path.length > 1 ? path[1].move : null,
  };
}

/**
 * N 回反復
 * @param {string} board
 * @param {number} N
 * @param {number} C
 * @param {() => number} rng
 * @returns {{ root: MctsNode, iterations: number }}
 */
export function runMcts(board, N, C, rng) {
  _nodeSeq = 0;
  const root = createNode(board, null, null);
  const n = Math.max(0, Math.floor(N));
  for (let i = 0; i < n; i++) {
    mctsIterate(root, C, rng);
  }
  return { root, iterations: n };
}

/**
 * 推奨手（訪問最多。同点は合法手順で先）
 * @param {MctsNode} root
 * @returns {{ move: number | null, visits: number, winRate: number } | null}
 */
export function bestMoveByVisits(root) {
  if (!root.children.length) return null;
  let best = root.children[0];
  for (const ch of root.children) {
    if (ch.visits > best.visits) best = ch;
    else if (ch.visits === best.visits && (ch.move ?? 99) < (best.move ?? 99)) {
      best = ch;
    }
  }
  return {
    move: best.move,
    visits: best.visits,
    winRate: best.visits ? best.wins / best.visits : 0,
  };
}

/**
 * 根の子の統計（合法手順）
 * @param {MctsNode} root
 */
export function rootChildStats(root) {
  const byMove = new Map(root.children.map((c) => [c.move, c]));
  return legalMoves(root.board).map((m) => {
    const ch = byMove.get(m);
    const visits = ch?.visits ?? 0;
    const wins = ch?.wins ?? 0;
    const winRate = visits ? wins / visits : 0;
    const ucb = ch ? ucb1(ch, root.visits, MCTS_CONFIG.defaultC) : Infinity;
    return {
      move: m,
      visits,
      wins,
      winRate,
      ucb: ch && ch.visits > 0 ? ucb : null,
      child: ch ?? null,
    };
  });
}

/**
 * 木のノード数
 * @param {MctsNode} root
 */
export function countNodes(root) {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    n += 1;
    for (const c of cur.children) stack.push(c);
  }
  return n;
}

/**
 * 木の最大深さ（根=0）
 * @param {MctsNode} root
 */
export function maxDepth(root) {
  let max = 0;
  /** @type {{ node: MctsNode, d: number }[]} */
  const stack = [{ node: root, d: 0 }];
  while (stack.length) {
    const { node, d } = stack.pop();
    if (d > max) max = d;
    for (const c of node.children) stack.push({ node: c, d: d + 1 });
  }
  return max;
}

/**
 * layoutTree 用に部分木を抽出（経路優先 + 訪問上位）
 * @param {MctsNode} root
 * @param {MctsNode[]} [highlightPath]
 * @param {number} [limit]
 */
export function buildTreeViewModel(root, highlightPath = [], limit = 48) {
  const pathSet = new Set(highlightPath.map((n) => n.id));
  /** @type {MctsNode[]} */
  const all = [];
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    all.push(n);
    for (const c of n.children) stack.push(c);
  }

  // 優先度: 経路 > visits
  all.sort((a, b) => {
    const pa = pathSet.has(a.id) ? 1 : 0;
    const pb = pathSet.has(b.id) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.visits - a.visits;
  });

  const keep = new Set(all.slice(0, limit).map((n) => n.id));
  // 経路は必ず含める
  for (const n of highlightPath) keep.add(n.id);
  keep.add(root.id);

  // 親が落ちないよう祖先を追加
  for (const n of all) {
    if (!keep.has(n.id)) continue;
    let p = n.parent;
    while (p) {
      keep.add(p.id);
      p = p.parent;
    }
  }

  /** @type {Record<string, { children: string[], label: string, visits: number, winRate: number, onPath: boolean, move: number|null }>} */
  const nodes = {};
  for (const n of all) {
    if (!keep.has(n.id)) continue;
    nodes[n.id] = {
      children: n.children.filter((c) => keep.has(c.id)).map((c) => c.id),
      label:
        n.parent === null
          ? "根"
          : `手${n.move}${n.visits ? ` n=${n.visits}` : ""}`,
      visits: n.visits,
      winRate: n.visits ? n.wins / n.visits : 0,
      onPath: pathSet.has(n.id),
      move: n.move,
    };
  }
  return { nodes, rootId: root.id, totalNodes: all.length, shown: keep.size };
}

/* ============================================================
 * ブラウザ UI
 * ============================================================ */

if (IS_BROWSER) {
  const active = document
    .querySelector("#site-header")
    ?.getAttribute("data-active");
  if (active === "mcts") {
    runBrowserUi();
  }
}

function runBrowserUi() {
  mountTopicShellFromDataset();

  const boardEl = document.getElementById("ttt-board");
  const treeSvg = document.getElementById("tree-svg");
  const dsPanels = document.getElementById("ds-panels");
  const phaseEl = document.getElementById("phase-badge");
  const presetEl = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("preset")
  );
  const nEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mcts-n")
  );
  const cEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mcts-c")
  );
  const seedEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mcts-seed")
  );
  const nValEl = document.getElementById("mcts-n-val");
  const cValEl = document.getElementById("mcts-c-val");
  const btnReset = document.getElementById("btn-reset");
  const btnStep = document.getElementById("btn-step");
  const btnPlay = document.getElementById("btn-play");
  const btnRunAll = document.getElementById("btn-run-all");
  const btnCompare = document.getElementById("btn-compare");
  const speedEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("speed")
  );
  const modeEditEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("edit-mode")
  );
  const csharpSample = document.getElementById("csharp-sample");

  const setStatus = createStatus(document.getElementById("status"));
  const resultPanel = createResultPanel(
    document.getElementById("result-compare")
  );

  let board = getPreset(DEFAULT_PRESET_ID).board;
  /** @type {MctsNode | null} */
  let root = null;
  let iterationsDone = 0;
  /** @type {() => number} */
  let rng = mulberry32(MCTS_CONFIG.defaultSeed);
  /** @type {MctsNode[]} */
  let lastPath = [];
  /** @type {IterationResult | null} */
  let lastIter = null;
  /** @type {ReturnType<typeof analyzeMoves> | null} */
  let lastExact = null;
  /** @type {ReturnType<typeof mcEstimateMoves> | null} */
  let lastMc = null;
  let editMode = false;
  let editPiece = "X";

  const playback = createPlayback({
    btnPlay,
    speedEl,
    delayFromSpeed: (v) => 450 - v,
    onTick: () => {
      const target = readN();
      if (iterationsDone >= target) {
        setStatus(
          `再生完了 — ${iterationsDone} 反復 / 推奨手 ${formatBest()}`
        );
        return false;
      }
      stepOnce();
      return iterationsDone < target;
    },
  });

  function readN() {
    return Math.min(
      MCTS_CONFIG.maxN,
      Math.max(MCTS_CONFIG.minN, Number(nEl?.value) || MCTS_CONFIG.defaultN)
    );
  }

  function readC() {
    return Math.min(
      MCTS_CONFIG.maxC,
      Math.max(MCTS_CONFIG.minC, Number(cEl?.value) || MCTS_CONFIG.defaultC)
    );
  }

  function readSeed() {
    return Math.floor(Number(seedEl?.value) || MCTS_CONFIG.defaultSeed);
  }

  function syncLabels() {
    if (nValEl) nValEl.textContent = String(readN());
    if (cValEl) cValEl.textContent = readC().toFixed(3);
  }

  function ensureRoot() {
    if (!root || root.board !== board) {
      _nodeSeq = 0;
      root = createNode(board, null, null);
      iterationsDone = 0;
      lastPath = [];
      lastIter = null;
      rng = mulberry32(readSeed());
    }
  }

  function hardResetTree() {
    playback.stop();
    _nodeSeq = 0;
    root = createNode(board, null, null);
    iterationsDone = 0;
    lastPath = [];
    lastIter = null;
    lastExact = null;
    lastMc = null;
    rng = mulberry32(readSeed());
    resultPanel.hide();
    setPhase("idle");
  }

  function setPhase(phase) {
    if (!phaseEl) return;
    const labels = {
      idle: "待機",
      select: "① 選択",
      expand: "② 展開",
      simulate: "③ シミュレーション",
      backup: "④ 逆伝播",
      done: "完了",
    };
    phaseEl.textContent = labels[phase] || phase;
    phaseEl.dataset.phase = phase;
  }

  function formatBest() {
    if (!root) return "—";
    const b = bestMoveByVisits(root);
    if (!b || b.move == null) return "—";
    return `マス${b.move}（n=${b.visits}, μ=${(b.winRate * 100).toFixed(0)}%）`;
  }

  function stepOnce() {
    const v = validateBoard(board);
    if (!v.legal) {
      setStatus(`⚠ 非法局面: ${v.reason}`);
      return false;
    }
    if (isTerminal(board)) {
      setStatus("終局局面です。MCTS の探索対象ではありません。");
      return false;
    }
    ensureRoot();
    const C = readC();
    setPhase("select");
    lastIter = mctsIterate(/** @type {MctsNode} */ (root), C, rng);
    lastPath = lastIter.path;
    iterationsDone += 1;
    setPhase("done");
    const pathMoves = lastPath
      .slice(1)
      .map((n) => n.move)
      .filter((m) => m != null)
      .join("→");
    const w =
      lastIter.winner === null ? "分" : `${lastIter.winner}勝`;
    setStatus(
      `反復 ${iterationsDone}/${readN()} — 経路[${pathMoves || "（根のみ）"}] 結果=${w} / 木=${countNodes(root)}節点 / 推奨 ${formatBest()}`
    );
    renderAll();
    return iterationsDone < readN();
  }

  function runAll() {
    hardResetTree();
    const v = validateBoard(board);
    if (!v.legal) {
      setStatus(`⚠ 非法局面: ${v.reason}`);
      renderAll();
      return;
    }
    if (isTerminal(board)) {
      setStatus("終局局面です。");
      renderAll();
      return;
    }
    ensureRoot();
    const N = readN();
    const C = readC();
    rng = mulberry32(readSeed());
    for (let i = 0; i < N; i++) {
      lastIter = mctsIterate(/** @type {MctsNode} */ (root), C, rng);
      lastPath = lastIter.path;
    }
    iterationsDone = N;
    setPhase("done");
    setStatus(
      `一括 ${N} 反復完了 — 木=${countNodes(root)} / 深さmax=${maxDepth(root)} / 推奨 ${formatBest()}`
    );
    renderAll();
  }

  function runCompare() {
    const v = validateBoard(board);
    if (!v.legal) {
      setStatus(`⚠ 非法局面: ${v.reason}`);
      return;
    }
    if (isTerminal(board)) {
      setStatus("終局局面では比較できません。");
      return;
    }
    ensureRoot();
    // 比較用に同じシードで素の MC（各手 N 回）
    const nPlayouts = Math.max(iterationsDone, 1);
    const mcRng = mulberry32(readSeed() + 1);
    lastMc = mcEstimateMoves(board, nPlayouts, mcRng);
    lastExact = analyzeMoves(board, {
      alphaBeta: true,
      memo: true,
      symmetry: false,
    });

    const mctsStats = rootChildStats(/** @type {MctsNode} */ (root));
    const bestMcts = bestMoveByVisits(/** @type {MctsNode} */ (root));
    const exactBest = lastExact.moves.reduce((a, b) =>
      b.value > a.value ? b : a
    );
    const match =
      bestMcts &&
      bestMcts.move != null &&
      exactBest.index === bestMcts.move;

    const mcMap = new Map(lastMc.map((r) => [r.index, r]));
    const exactMap = new Map(lastExact.moves.map((r) => [r.index, r]));

    let html = `<p class="mcts-compare-lead">比較（MCTS 累計プレイアウト相当 ≈ 根 visits=${root.visits}、素の MC は各手 ${nPlayouts} 回・別シード派生）</p>`;
    html += `<table class="ttt-compare-table mcts-compare-table"><thead><tr>
      <th>手</th><th>MCTS n</th><th>MCTS μ</th><th>素MC 勝率</th><th>完全解</th>
    </tr></thead><tbody>`;
    for (const st of mctsStats) {
      const mc = mcMap.get(st.move);
      const ex = exactMap.get(st.move);
      const exLab =
        ex == null
          ? "—"
          : ex.value > 0
            ? "勝ち"
            : ex.value < 0
              ? "負け"
              : "分";
      const mark =
        bestMcts?.move === st.move
          ? " ★MCTS"
          : exactBest.index === st.move
            ? " ★解"
            : "";
      html += `<tr>
        <td>マス${st.move}${mark}</td>
        <td>${st.visits}</td>
        <td>${st.visits ? (st.winRate * 100).toFixed(1) + "%" : "—"}</td>
        <td>${mc ? (mc.winRate * 100).toFixed(1) + "%" : "—"}</td>
        <td>${exLab}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    html += `<p>推奨一致（MCTS 訪問最多 vs 完全解最善）: <strong>${match ? "一致" : "不一致"}</strong>
      — MCTS=${bestMcts?.move ?? "—"} / 完全解=${exactBest.index}（${exactBest.value > 0 ? "勝ち" : exactBest.value < 0 ? "負け" : "分"}）</p>`;

    resultPanel.show(html);
    setStatus(
      `比較更新 — MCTS推奨=${bestMcts?.move ?? "—"} 完全解=${exactBest.index} → ${match ? "一致" : "不一致"}`
    );
    renderAll();
  }

  function loadPreset(id) {
    playback.stop();
    const preset = getPreset(id);
    board = preset.board;
    if (seedEl && preset.demoSeed != null) {
      seedEl.value = String(preset.demoSeed);
    } else if (seedEl && id === "double-threat") {
      seedEl.value = String(MCTS_CONFIG.defaultSeed);
    }
    hardResetTree();
    setStatus(`プリセット「${preset.label}」— ${preset.blurb}`);
    renderAll();
  }

  function valueClassFromRate(rate, visits) {
    if (!visits) return "";
    if (rate >= 0.55) return "is-win";
    if (rate <= 0.35) return "is-loss";
    return "is-draw";
  }

  function renderBoard() {
    if (!boardEl) return;
    const moves = isTerminal(board) ? [] : legalMoves(board);
    const stats = root ? rootChildStats(root) : [];
    const byMove = new Map(stats.map((s) => [s.move, s]));
    const best = root ? bestMoveByVisits(root) : null;
    const exactMap = new Map(
      (lastExact?.moves ?? []).map((m) => [m.index, m.value])
    );

    let html = `<div class="ttt-grid" role="grid">`;
    for (let i = 0; i < 9; i++) {
      const ch = board[i];
      const st = byMove.get(i);
      const isMove = moves.includes(i);
      let extra = "";
      if (best?.move === i) extra += " is-best";
      if (st && st.visits) {
        extra += " " + valueClassFromRate(st.winRate, st.visits);
      }
      const exact = exactMap.get(i);
      if (exact != null) {
        if (exact > 0) extra += " is-win";
        else if (exact < 0) extra += " is-loss";
        else extra += " is-draw";
      }
      html += `<button type="button" class="ttt-cell${extra}" data-idx="${i}" role="gridcell">`;
      if (ch === "X" || ch === "O") {
        html += `<span class="ttt-piece ttt-piece-${ch}">${ch}</span>`;
      } else if (isMove && st && st.visits > 0) {
        html += `<span class="ttt-piece ttt-piece-empty">·</span>`;
        html += `<span class="ttt-eval">${(st.winRate * 100).toFixed(0)}%</span>`;
        html += `<span class="ttt-mc">n=${st.visits}</span>`;
      } else {
        html += `<span class="ttt-piece ttt-piece-empty">${isMove ? "·" : ""}</span>`;
      }
      html += `</button>`;
    }
    html += `</div>`;
    boardEl.innerHTML = html;
    boardEl.querySelectorAll(".ttt-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(/** @type {HTMLElement} */ (btn).dataset.idx);
        cellClick(idx);
      });
    });
  }

  function cellClick(idx) {
    if (editMode) {
      const arr = board.split("");
      if (editPiece === "X" || editPiece === "O") {
        arr[idx] = arr[idx] === editPiece ? "." : editPiece;
      }
      board = arr.join("");
      hardResetTree();
      setStatus(`編集: マス${idx} → 局面 ${board}`);
      renderAll();
      return;
    }
    if (isTerminal(board)) return;
    const moves = legalMoves(board);
    if (!moves.includes(idx)) return;
    const mover = currentPlayer(board);
    board = applyMove(board, idx, mover);
    hardResetTree();
    setStatus(`${mover} がマス${idx} に着手`);
    renderAll();
  }

  function renderTree() {
    if (!treeSvg || !root) {
      if (treeSvg) treeSvg.innerHTML = "";
      return;
    }
    const vm = buildTreeViewModel(
      root,
      lastPath,
      MCTS_CONFIG.treeNodeLimit
    );
    if (Object.keys(vm.nodes).length === 0) {
      treeSvg.innerHTML = "";
      return;
    }
    const { layout, width, height, nodeWidth, nodeHeight } = layoutTree(
      vm.nodes,
      vm.rootId,
      { nodeWidth: 80, nodeHeight: 36, gapX: 10, gapY: 56, pad: 16 }
    );
    applySvgSize(treeSvg, width, height); // 親幅フィット（横スクロール抑制）

    let edges = "";
    let bodies = "";
    for (const [id, n] of Object.entries(vm.nodes)) {
      const p = layout[id];
      if (!p) continue;
      for (const cid of n.children) {
        const cp = layout[cid];
        if (!cp) continue;
        const onPath =
          n.onPath && vm.nodes[cid]?.onPath ? " mcts-edge-path" : "";
        edges += `<line class="mcts-edge${onPath}" x1="${p.x}" y1="${p.y}" x2="${cp.x}" y2="${cp.y}" />`;
      }
    }
    for (const [id, n] of Object.entries(vm.nodes)) {
      const p = layout[id];
      if (!p) continue;
      const x = p.x - nodeWidth / 2;
      const y = p.y - nodeHeight / 2;
      const pathCls = n.onPath ? " is-path" : "";
      const rate =
        n.visits > 0 ? `${(n.winRate * 100).toFixed(0)}%` : "—";
      bodies += `<g class="mcts-node${pathCls}" data-id="${escapeXml(id)}">
        <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="6" />
        <text x="${p.x}" y="${p.y - 4}" text-anchor="middle" class="mcts-node-label">${escapeXml(n.label)}</text>
        <text x="${p.x}" y="${p.y + 12}" text-anchor="middle" class="mcts-node-meta">μ ${rate}</text>
      </g>`;
    }
    treeSvg.innerHTML = `<g class="mcts-edges">${edges}</g><g class="mcts-nodes">${bodies}</g>
      <text x="8" y="14" class="mcts-tree-caption">表示 ${vm.shown}/${vm.totalNodes} 節点（経路+訪問上位）</text>`;
  }

  function renderDs() {
    if (!dsPanels || !root) return;
    const stats = rootChildStats(root);
    const C = readC();
    const childItems = stats.map((s) => {
      const u =
        s.child && s.visits > 0
          ? ucb1(s.child, root.visits, C).toFixed(3)
          : s.child
            ? "∞"
            : "—";
      return `手${s.move}: n=${s.visits} wins=${s.wins} μ=${
        s.visits ? (s.winRate * 100).toFixed(1) + "%" : "—"
      } UCB=${u}`;
    });
    if (!childItems.length) {
      childItems.push("（合法手なし・終局）");
    } else if (iterationsDone === 0) {
      childItems.unshift("（まだ反復なし — 1ステップ or N 回一括）");
    }

    const pathFrames = lastPath.map((n, i) => ({
      title: i === 0 ? "根" : `手 ${n.move}`,
      detail: miniBoardText(n.board) + (n.visits ? ` · n=${n.visits}` : ""),
    }));

    const measureItems = [
      `反復: ${iterationsDone} / 目標 ${readN()}`,
      `根 visits: ${root.visits}`,
      `木の節点数: ${countNodes(root)}`,
      `最大深さ: ${maxDepth(root)}`,
      `C: ${readC().toFixed(3)} · seed: ${readSeed()}`,
      `推奨: ${formatBest()}`,
    ];

    setPanel(
      dsPanels,
      renderSet({
        label: "根の子（腕 = 合法手 / UCB1）",
        typeNote: "バンディットと同じ選択",
        items: childItems,
      }) +
        renderCallStack({
          label: "直近 Selection 経路",
          frames: pathFrames,
          emptyText: "（1ステップで経路が表示されます）",
        }) +
        renderSet({
          label: "計測",
          typeNote: "MCTS",
          items: measureItems,
        })
    );
  }

  function renderAll() {
    syncLabels();
    renderBoard();
    renderTree();
    renderDs();
  }

  // ---- 初期化 ----
  if (presetEl) {
    for (const p of presetList()) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label;
      if (p.id === DEFAULT_PRESET_ID) opt.selected = true;
      presetEl.appendChild(opt);
    }
    presetEl.addEventListener("change", () => loadPreset(presetEl.value));
  }
  if (nEl) {
    nEl.min = String(MCTS_CONFIG.minN);
    nEl.max = String(MCTS_CONFIG.maxN);
    nEl.step = String(MCTS_CONFIG.stepN);
    nEl.value = String(MCTS_CONFIG.defaultN);
    nEl.addEventListener("input", () => {
      syncLabels();
    });
  }
  if (cEl) {
    cEl.min = String(MCTS_CONFIG.minC);
    cEl.max = String(MCTS_CONFIG.maxC);
    cEl.step = String(MCTS_CONFIG.stepC);
    cEl.value = String(MCTS_CONFIG.defaultC);
    cEl.addEventListener("input", () => {
      syncLabels();
      renderDs();
    });
  }
  if (seedEl) {
    seedEl.value = String(MCTS_CONFIG.defaultSeed);
    seedEl.addEventListener("change", () => {
      hardResetTree();
      setStatus(`シードを ${readSeed()} に変更 — 木をリセット`);
      renderAll();
    });
  }

  btnReset?.addEventListener("click", () => {
    loadPreset(presetEl?.value || DEFAULT_PRESET_ID);
  });
  btnStep?.addEventListener("click", () => {
    playback.stop();
    stepOnce();
  });
  btnPlay?.addEventListener("click", () => {
    playback.toggle();
  });
  btnRunAll?.addEventListener("click", () => {
    playback.stop();
    runAll();
  });
  btnCompare?.addEventListener("click", () => {
    if (iterationsDone === 0) runAll();
    runCompare();
  });
  modeEditEl?.addEventListener("change", () => {
    editMode = !!modeEditEl.checked;
    setStatus(editMode ? "編集モード ON（マスをクリックで X/O）" : "編集モード OFF");
  });
  document.querySelectorAll('input[name="edit-piece"]').forEach((el) => {
    el.addEventListener("change", () => {
      const checked = document.querySelector(
        'input[name="edit-piece"]:checked'
      );
      editPiece = /** @type {HTMLInputElement} */ (checked)?.value || "X";
    });
  });

  loadTextSample("../samples/MctsExample.cs", csharpSample);
  hardResetTree();
  loadPreset(DEFAULT_PRESET_ID);
}
