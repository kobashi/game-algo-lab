# Game Algo Lab v0.20.0 — 試作版（Preview）

入門コースを、課題を解いて進める 14 本にしました。  
ready トピック数は **110** のまま。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.20.0

## 本版の主な内容（v0.19.0 以降）

- 入門コースを 14 本に（minimax と三目並べの間に α-β 法）
- コースから開くと、各ページの上下に「入門コース n/14 ← 前 / 次 →」
- 各トピックに課題カード。「期待される観察」は閉じておき、開いて答え合わせする
- 各段の終わりに 4 択の確認問題（6 段・15 問）。選ぶとすぐ 1 行の解説が出る
- coyote-time: 床のジャンプは「接地ジャンプ成功」。猶予 0 ms では崖から出た直後だけ失敗する
- minimax: 読み切れない局面を、葉の平均で見積もるか 0 で打ち切るかを選べる
- accel-gravity: 再生も固定刻み。再生速度を変えても最高点の列は変わらない
- Pivot・猶予・デッドゾーンの 0 が、既定値に化けない
- input-basics: 再生速度 0.1× でも、1 秒の長押しが帯グラフ上で約 1 秒になる
- 再生速度スライダーの表記を「再生速度 N.N×」に揃えた

## 検証

```bash
python3 scripts/smoke-platform.py
```

ブラウザで、コース内ナビ、課題カードの開閉、確認問題の正誤、coyote-time の猶予 0 ms、Pivot 0、帯グラフ（0.1× で 1 秒）を確認した。

---

prerelease / 試作版。前版: [v0.19.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.19.0)。
