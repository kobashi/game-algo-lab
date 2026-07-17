/**
 * 地図文字列のパーサ
 *
 * 1マス = 1文字。行数・列数は同じ（正方形/矩形可。現状デモは 14x14 想定）
 *
 * 記号:
 *   S … スタート（通行可・コストは 0）※1つだけ
 *   G … ゴール（通行可・コストは 0）※複数可。いずれかに到達すれば成功
 *   # … 壁
 *   . … 通行コスト 1（デフォルト）
 *   0 1 2 … 通行コスト
 *   n … 通行コスト -1（報酬など）
 *
 * 例は js/maps/bfs-map.js / astar-map.js をエディタで編集してください。
 */

/**
 * @param {string} text
 * @returns {{
 *   cols: number,
 *   rows: number,
 *   costs: number[][],
 *   walls: boolean[][],
 *   start: {x: number, y: number},
 *   goals: {x: number, y: number}[],
 *   goal: {x: number, y: number},
 * }}
 */
export function parseMap(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.trimStart().startsWith("//"));

  if (lines.length === 0) {
    throw new Error("地図が空です");
  }

  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));

  for (let y = 0; y < rows; y++) {
    if (lines[y].length !== cols) {
      throw new Error(
        `地図の列数が揃っていません（${y + 1} 行目: ${lines[y].length} 文字、期待 ${cols}）`
      );
    }
  }

  /** @type {number[][]} */
  const costs = Array.from({ length: rows }, () => Array(cols).fill(1));
  /** @type {boolean[][]} */
  const walls = Array.from({ length: rows }, () => Array(cols).fill(false));
  let start = null;
  /** @type {{x: number, y: number}[]} */
  const goals = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = lines[y][x];
      switch (ch) {
        case "#":
          walls[y][x] = true;
          costs[y][x] = 1;
          break;
        case "S":
        case "s":
          walls[y][x] = false;
          costs[y][x] = 0;
          if (start) throw new Error("スタート S が複数あります");
          start = { x, y };
          break;
        case "G":
        case "g":
          walls[y][x] = false;
          costs[y][x] = 0;
          goals.push({ x, y });
          break;
        case ".":
        case "1":
          walls[y][x] = false;
          costs[y][x] = 1;
          break;
        case "0":
          walls[y][x] = false;
          costs[y][x] = 0;
          break;
        case "2":
          walls[y][x] = false;
          costs[y][x] = 2;
          break;
        case "n":
        case "N":
        case "-":
          walls[y][x] = false;
          costs[y][x] = -1;
          break;
        case " ":
          // スペースは壁扱い（整形用に使わない想定）
          walls[y][x] = true;
          costs[y][x] = 1;
          break;
        default:
          throw new Error(
            `不明な記号 "${ch}"（${y + 1} 行目, ${x + 1} 列目）。使える記号: S G # . 0 1 2 n -`
          );
      }
    }
  }

  if (!start) throw new Error("スタート S がありません");
  if (goals.length === 0) throw new Error("ゴール G がありません（1つ以上）");

  // goal は先頭（後方互換）。探索は goals 全体を対象にする
  return { cols, rows, costs, walls, start, goals, goal: goals[0] };
}
