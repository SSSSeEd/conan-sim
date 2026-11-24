# 引き継ぎメモ（2026-11-15 に整理）

古い経過（各弾の自動化の詳細・個別の判断）は SeEd の許可を得てこのファイルから外した。必要なら `git log -p HANDOFF.md`（整理前は 175 行）か、各 js/effects/*.js 先頭のコメント、tests/effects.js のテスト名を見る。

## 現状
- 効果のある全カード1333種が自動化済み（`node tools/coverage.js` の未自動化は0）。環境デッキ45個はすべて100%で、CPUが使える。
- 画面は下部タブ（対戦／デッキ／記録／フィードバック）。「デッキ」タブにマイデッキ登録（名前変更つき）とデッキ補完（事件を選ぶ→主力カードをタップ→40枚に補完。DECKFILL.md）がある。対戦タブのデッキ欄は事件・パートナー・主力カードの表示（コード欄は hidden で残している）。
- 効果の対象選び: `chooseChar`（js/effects/core.js）の題名に「スリープさせる」「スタンさせる」「リムーブする」があると、すでにその状態のキャラや効かない相手を候補から外す。新しく書くときは題名をその形にする。

- 圧縮コピーはCS2（10戦ずつに分割+deflate+base64url）。アプリはチャンクごとのコピーとテキスト保存。分析側の復元は `node tools/feedback.js --unpack 圧縮.txt 出力.json`（js/feedback.js の packChunks / unpackAny）。CS1も読める。

## 次にやること（SeEd の指示待ち）
- デッキ補完の精度の調整（補完したデッキをCPU同士で回して勝率で比べる。DECKFILL.md の「今後」）。
- 対戦記録からのフィードバック（js/feedback.js）の改善、CPUの強化（js/cpu.js。コンボ探索は tools/combo_lab.js・combo_gate.js、採用表は js/combo_table.js）。
- 近似で済ませた効果の見直し（js/effects/ の「近似」「判断した読み」コメント。例: 松田陣平 B01092・フィリップ王子 B07049・和田進一 B03040）。

## 進め方
1. 変更は小さく PR にする。`node tools/test.js` を通す（tests/ にテストを足す）。
2. カード効果は js/effects/ の色・弾ごとのファイルに `DEF["カードID"]={...}` を書く（auto.js の正規表現で自動生成されるものは手書き DEF があるとそちらが優先）。新ファイルは index.html と sw.js の CORE の両方に登録する（テストが確認する）。
3. SeEd は JS 初心者（C系経験あり）。コードの意味は短く説明する。API使用量を抑えるため、SeEd が自分で書く「バイト方式」の穴埋め問題を出すこともある。書いたコードは必ず差分を見る（`x.st` の "a"/"s" の取り違えなど）。
4. 画面の確認は Playwright（390px幅など）で行う。UI 系ファイル（ui.js・dialogs.js・show.js・setup.js）は tools/headless.js では読まれないので、テストしたい処理は非UIファイル（deckfill.js など）に置く。

## 注意（コードの決まりごと）
- セットを足す・外すコードを書くときは `noteSetOn` / `noteSetOff` を呼ぶ（セットのトリガーが動く。重ねる＝`under` は対象外）。
- 「相手の効果で」の判定は `G.fxBy`（hooks.js の `resolving`）。新しいフックを足すときは fxIf か resolving で包む。
- tests の `board()` で作ったカードは `lvT` が undefined。`t.lvT=(t.lvT||0)-1` と書く。
- `condOk` のタグ判定は順序が大事（「事件編」は「事件(.+)」より先）。
- 事件の「解決編になったとき手札をリムーブ」は DEF 側に書く（solvedTrigger）。
- カード名の指定・比較は `namesOf`（複数名カード《A＆B》対応）で見る。
- 新しい localStorage の項目は読み書きとも try/catch で包む（対戦記録・保存・マイデッキなど既存と同じ）。
- Vault の Status/ は書き込み済み（PCに届くときだけ更新）。

## 2026-11-15 追記: CPUの新基準を既定で採用（PR #88・#90）
- 回答フォーム30問の基準を採用。対象選び（tgt2、cpu.js の aiTgtScore）と場面判断（sit2: FILE優先のアシスト、FILE4でヒントしない、ミスリード複数は先にパートナー推理、ガードは強さと手札で判断）。
- 勝率は旧CPUと同じ（各1200戦で47.7〜50.1%、対照約49%）。SeEdの決定: 人間の動きに近づくので勝率が変わらなくても採用。
- 旧の動きに戻すときは AI_OFF に "tgt2" / "sit2" を足す。tools/vs.js は base が旧、名前に tgt / sit を含めると新基準（例: node tools/vs.js 300 11 sit+tgt base）。（2026-11-24 に tgt2/sit2 のスイッチと vs.js は削除。下の追記を参照）
- 記録の圧縮コピー(2026-11-15): js/feedback.js の `pack`/`unpack`（先頭行 `CS1`）。対戦記録を開いて「圧縮コピー」（ログ付き）・「圧縮コピー（ログなし）」、記録タブの「全記録を圧縮コピー（ログなし）」。読み込み画面と tools/feedback.js は貼り付けた圧縮形式もそのまま読める。
- 対戦タブのデッキ選択(2026-11-15): 「勝率上位15デッキだけ」のチェック（既定オン・端末に記憶）。勝率は js/data.js の `DECK_WR`（2026-11-12 の総当たり。作り直しは tools/gen_winrate.js）。環境デッキを増やしたら、総当たりをやり直して DECK_WR に足す（表にないデッキは上位のみでは出ない）。

## 2026-11-20 追記: プリセットと検証の方針
- SeEdの指示: 検証（総当たり・CPU比較）の対象は基本的にプリセットのデッキ。デッキを追加したら、色・カードを見て「スタンキッド11/20」「ジン＆ウォッカ11/20」のように名前＋日付を付けてプリセット（js/data.js の PRESETS）に足す。
- 追加済み: スタンキッド11/20（公式レシピ W8J9PM7QO）、ジン＆ウォッカ11/20（KcXAwJu5O）。DECK_WR は 11/20 の47デッキ総当たりに更新（simulator/matchup-all45-2026-11-20.md）。

## 2026-11-22 追記: 詳しい対戦ログ（js/dlog.js）
- 1戦ごとに、通常ログ＋詳細（手番の始め・終わりの両者の盤面と手札、ドローで引いたカード、マリガン、`pickCards`/`yes` の候補と選んだ札、ガード・カットイン/変装の判断材料、探索の点数）を `G.dlog` に積み、終了時に端末の `conan-sim-dlogs` へ保存。直近3戦（`DLOG_MAX`）を超えたら古い順に消える。圧縮コピー（CS1/CS2）とは別。
- 短縮版（`dlCompact`）: 情報は同じで約3割短い。カード名の辞書(#n)・盤面と手札の差分・同名の枚数まとめ・短いキー。コピーの既定はこの短縮版（分析はClaudeが読む前提）。`tests/dlog.js` が短縮版を読み戻して元のイベントと一致することを確かめる。新しいイベントを足すときは `dlFmt`（通常テキスト）と `dlCompact`、テストの `expand` の3か所に足す。
- 見る/取り出す: 記録タブの下の「詳しい対戦ログ」（コピー・テキスト保存・JSON保存）、対戦終了メニューの「詳しいログをコピー」。ターン番号は通常ログの「— Nターン目 —」と同じ。
- 新しい判断場面を足すときは `dl("種類",{...})` を呼び、`dlFmt`（js/dlog.js）にテキスト化を足す。探索の試しの手番（`G.sim`）と SIM_FAST では記録されない（テストは `SIM_SAVE:1`）。
- CPUは相手の手札を推定していない。ガード/カットイン判断には、CPUが実際に見ている材料（相手の手札枚数・現場・証拠・リムーブエリア枚数）を残している。

## 2026-11-23 追記: 「環境デッキ」分類と青単探偵団
- デッキ一覧に「環境デッキ」分類（js/data.js の deckGroups の "v"）を新設: DECK_WR 上位15（2026-11-20総当たり）＋ `DECK_ENV_EXTRA`（勝率表にまだ無い追加分）。同じデッキはプリセット・noteの欄から外れる（setup.js の deckOptions）。
- プリセットに「青単探偵団」（公式レシピ B2RISJY2P。共有APIでは取れず公式デッキレシピから取得）を追加。次に総当たりをやり直すときに DECK_WR へ足し、DECK_ENV_EXTRA から外す。

## 2026-11-24 追記: CPUの設計の見直し（段階1・2）
- 全体の方針: 共有フォルダ notes/cpu-architecture-plan-2026-11-24.md（SeEd承認済みの順番: 測定ツール → cpuTurn分解とフラグ整理 → 探索の複数回試し → 構えを探索に → デッキ別の載せ替え → 捨て札・変装など）。
- 測定は `node tools/bench.js`（ペア比較・4並列・95%の幅）。vs.js / vs_off.js / vs_ab.js は削除。小さい改良も 2000組（4000戦）以上で判定する。
- 動きを変えない整理は `node tools/golden.js 300 save 前.json` → 変更 → `check 前.json` で全試合一致を確かめる。
- js/cpu.js: cpuTurn を段階の関数（choosePlan / abilityPhase / handPhase / rushPhase / attackPhase / actorPhase / partnerPhase）と判定の関数（finishCheck / defenseCheck / waryNow / caseFirst / bestHand / canAssist / holdForHeavy）に分けた。
- 実験スイッチは AI_SWITCH の5つ（fin2, threat2, resist, wary, combo2。既定オン）だけ。新しい実験は AI_OFF0 に入れて既定オフで足し、bench の +名前 で測る。不採用の14個と定着した13個のスイッチは削除（歴史は notes/cpu-flag-history-2026-11-24.md）。cfg.ai1（旧CPU）も削除。
