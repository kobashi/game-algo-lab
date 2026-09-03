# Game Algo Lab v0.14.0 — 試作版（Preview）

初学者向けに **入門コース入口** を追加したリリースです。  
ready トピック数は **110** のまま（新規デモなし）。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **入門コース**: https://kobashi.github.io/game-algo-lab/courses/intro.html
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.14.0

## 本版の主な内容（v0.13.0 以降）

- `courses/intro.html` — ゲーム制作でまず必要な13トピックを学ぶ順（6段）で並べる
- カードのタイトル・説明・成熟度はトップの `TOPICS` を参照（文言の二重管理なし）
- トップのヒーロー「入門コースを始める」とナビから入れる
- 共通シェルに `NAV_GROUPS.course`（ホーム / 入門コース / 全トピック）
- 既存110デモの中身は変更していない

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 次の候補

- 授業運用後、対象トピックを増やすか判断
- CANDIDATE 優先度 B 続き
- oneshot → revised / stable

---

prerelease / 試作版。前版: [v0.13.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.13.0)。
