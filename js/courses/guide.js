/**
 * 入門コースの解説ページ（courses/guide-*.html・courses/cs-*.html）共通 — ヘッダー・フッターと用語注。
 * C# 解説の「全体のコード」（<pre data-sample="../samples/…">）はサンプルファイルから読み込む。
 */
import { mountTopicShellFromDataset, mountGlossary, loadTextSample } from "../platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

for (const pre of document.querySelectorAll("pre[data-sample]")) {
  const code = pre.querySelector("code") ?? pre;
  loadTextSample(pre.getAttribute("data-sample"), code);
}
