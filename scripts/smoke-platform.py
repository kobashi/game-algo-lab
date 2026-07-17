#!/usr/bin/env python3
"""
Game Algo Lab — 共通基盤・教材構造のスモークテスト（ビルド不要）

使い方:
  python3 scripts/smoke-platform.py

Node がある場合は続けて scripts/smoke-platform.mjs も実行する。
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def fail(msg: str) -> None:
    errors.append(msg)
    print(f"  ✗ {msg}")


def check_platform_files() -> None:
    print("platform ファイル")
    required = [
        "js/platform/index.js",
        "js/platform/dom.js",
        "js/platform/playback.js",
        "js/platform/rng.js",
        "js/platform/tree-layout.js",
        "js/platform/grid-paint.js",
        "js/platform/pathfinding-grid.js",
        "js/platform/topic-shell.js",
        "js/platform/maturity.js",
        "js/platform/text.js",
        "js/map-format.js",
        "js/ds-viz.js",
        "docs/templates/TOPIC_SCAFFOLD.md",
        "docs/PLATFORM.md",
    ]
    for rel in required:
        if (ROOT / rel).is_file():
            ok(rel)
        else:
            fail(f"missing {rel}")


def check_exports() -> None:
    print("platform/index.js exports")
    text = (ROOT / "js/platform/index.js").read_text(encoding="utf-8")
    needed = [
        "createStatus",
        "createPlayback",
        "mulberry32",
        "layoutTree",
        "bindMapPaint",
        "drawPathfindingGrid",
        "drawScorePair",
        "mountTopicShellFromDataset",
        "mountPageMaturity",
        "TOPIC_MATURITY",
        "parsePaintMode",
    ]
    for name in needed:
        if name in text:
            ok(f"export mentions {name}")
        else:
            fail(f"export missing {name}")


def check_algorithms() -> None:
    print("algorithms HTML シェル")
    algo_dir = ROOT / "algorithms"
    for html in sorted(algo_dir.glob("*.html")):
        t = html.read_text(encoding="utf-8")
        if 'id="site-header"' not in t:
            fail(f"{html.name}: missing #site-header")
        elif 'id="site-footer"' not in t:
            fail(f"{html.name}: missing #site-footer")
        else:
            ok(html.name)

    print("デモ JS の mountTopicShell")
    demos = [
        "bfs",
        "dfs",
        "dijkstra",
        "best-first",
        "astar",
        "and-or",
        "minimax",
        "alpha-beta",
        "monte-carlo",
        "multi-armed-bandit",
        "collision",
        "fsm",
    ]
    for name in demos:
        path = ROOT / "js" / f"{name}.js"
        if not path.is_file():
            fail(f"missing js/{name}.js")
            continue
        t = path.read_text(encoding="utf-8")
        if "mountTopicShellFromDataset" not in t:
            fail(f"{name}.js: no mountTopicShellFromDataset")
        else:
            ok(f"{name}.js shell")


def check_main_topics() -> None:
    print("js/main.js TOPICS")
    t = (ROOT / "js/main.js").read_text(encoding="utf-8")
    ready_blocks = re.findall(
        r'id:\s*"([^"]+)"[\s\S]*?ready:\s*(true|false)', t
    )
    if not ready_blocks:
        fail("could not parse TOPICS")
        return
    for tid, ready in ready_blocks:
        if ready != "true":
            continue
        # algorithm page or href
        href_m = re.search(
            rf'id:\s*"{re.escape(tid)}"[\s\S]*?href:\s*"([^"]+)"', t
        )
        if not href_m:
            fail(f"no href for {tid}")
            continue
        href = href_m.group(1)
        page = ROOT / href
        if page.is_file():
            ok(f"topic {tid} → {href}")
        else:
            fail(f"topic {tid} missing file {href}")


def check_maturity_sync() -> None:
    print("成熟度: main.js ↔ maturity.js")
    main = (ROOT / "js/main.js").read_text(encoding="utf-8")
    mat = (ROOT / "js/platform/maturity.js").read_text(encoding="utf-8")
    if "maturity-legend" not in (ROOT / "index.html").read_text(encoding="utf-8"):
        fail("index.html missing #maturity-legend")
    else:
        ok("index.html #maturity-legend")
    if "mountPageMaturity" not in (ROOT / "js/platform/topic-shell.js").read_text(
        encoding="utf-8"
    ):
        fail("topic-shell missing mountPageMaturity")
    else:
        ok("topic-shell mounts page maturity")

    pairs = re.findall(
        r'id:\s*"([^"]+)"[\s\S]*?maturity:\s*"([^"]+)"', main
    )
    if not pairs:
        fail("could not parse maturity from TOPICS")
        return
    for tid, code in pairs:
        # maturity.js: bfs: "revised" or "best-first": "revised"
        pat = (
            rf'(?:["\']{re.escape(tid)}["\']|{re.escape(tid)})'
            rf'\s*:\s*["\']{re.escape(code)}["\']'
        )
        if re.search(pat, mat):
            ok(f"{tid} = {code}")
        else:
            fail(f"{tid}: main.js maturity={code} not in TOPIC_MATURITY")


def check_draw_score_pair_usage() -> None:
    print("drawScorePair 利用（経路探索）")
    for name in ("bfs", "dfs", "dijkstra", "best-first", "astar"):
        t = (ROOT / "js" / f"{name}.js").read_text(encoding="utf-8")
        if name == "dfs":
            # DFS は深さ表示が別 UI でも可
            ok(f"{name}.js (optional)")
            continue
        if "drawScorePair" in t:
            ok(f"{name}.js uses drawScorePair")
        else:
            fail(f"{name}.js missing drawScorePair")


def check_aabb_dual() -> None:
    print("AABB 二重判定（ロジック同値の静的チェック）")
    t = (ROOT / "js/collision.js").read_text(encoding="utf-8")
    for name in (
        "intersectsPositive",
        "intersectsNegative",
        "intersectsNegativeEarlyOut",
    ):
        if f"function {name}" in t:
            ok(name)
        else:
            fail(f"missing {name}")


def run_node_smoke() -> None:
    print("Node ES module smoke")
    node = shutil.which("node")
    mjs = ROOT / "scripts" / "smoke-platform.mjs"
    if not node:
        print("  · node なし — スキップ")
        return
    if not mjs.is_file():
        fail("missing scripts/smoke-platform.mjs")
        return
    r = subprocess.run(
        [node, str(mjs)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    print(r.stdout, end="")
    if r.returncode != 0:
        print(r.stderr, end="")
        fail(f"smoke-platform.mjs exit {r.returncode}")
    else:
        ok("smoke-platform.mjs")


def main() -> int:
    print(f"ROOT={ROOT}\n")
    check_platform_files()
    print()
    check_exports()
    print()
    check_algorithms()
    print()
    check_main_topics()
    print()
    check_maturity_sync()
    print()
    check_draw_score_pair_usage()
    print()
    check_aabb_dual()
    print()
    run_node_smoke()
    print()
    if errors:
        print(f"FAILED ({len(errors)})")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("ALL PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
