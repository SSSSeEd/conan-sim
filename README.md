# コナンTCG 卓上シミュレータ

名探偵コナンTCGの練習用シミュレータ（個人用）。GitHub Pages で公開し、iPhoneのホーム画面に追加してWebアプリとして使う。

- `index.html` 本体（PCとスマホで画面が自動で切り替わる）
- `style.css` 見た目
- `js/` プログラム（index.html が読み込む）
  - ゲーム処理: `state.js`（盤面とルールの判定）/ `engine.js`（進行）/ `cpu.js` `search.js`（CPU）/ `effects/`（カード効果、下記）。document には触らない
  - 画面: `ui.js`（盤面）/ `dialogs.js`（通知・選択の画面）/ `show.js`（演出）/ `setup.js`（デッキ選択）
  - `effects/` カード効果。色ごとのファイル（`white.js` `black.js` `blue.js` `red.js` `yellow.js` `green.js` など）に `DEF["カードID"]={...}` を足す。共通の部品は `core.js`、効果文から自動で組み立てる処理は `auto.js`、本体から呼ばれる入口は `hooks.js`。キャラにセットするイベント（`setEventOn` と DEF の `setAp` `setKw` `setToRm`、セット先の `onSet`）は `set-events.js`、「手札から公開したとき」（`onReveal`。今の効果を解決し終えてから発動）は `reveal.js`。読み込む順は index.html のとおり
  - データ: `cards.js`（カード）/ `decks.js` `data.js`（デッキ）
- `img/*.json` 縮小したカード画像（パック単位）
- `manifest.json` `sw.js` `icons/` Webアプリ・オフライン用（sw.js はアプリ全体を見るため一番上に置く）
- `js/deckfill.js` デッキ補完（設計は DECKFILL.md）
- `tools/` `tests/` 開発用（下記）

公開URL: https://sssseed.github.io/conan-sim/

対戦中の盤面はターンのはじめと自分の行動のあとに端末へ保存される（engine.js の saveGame）。接続が切れたりアプリを閉じたりしても、次に開いたときに「続きから」か「ニューゲーム」を選べる。CPUのターン中に切れた場合は、そのターンのはじめからやり直す。

反映は main へのマージだけ（GitHub Pages）。ほかの場所へのコピーや、sw.js の版数を上げる作業は要らない。

## 開発用ツール（Node 22、ブラウザ不要）
- `node tools/test.js [試合数]` 動作確認（デッキの読み込み、CPU同士の対戦がエラーなしで決着するか、`tests/rules.js` のルールの単体テスト）。PRごとに GitHub Actions でも走る
- `node tools/fill_eval.js [回数]` デッキ補完の答え合わせ（環境デッキから入力だけ残して、元に戻せる割合）
- `node tools/bench.js +機能|-機能|none [組数]` CPUの改良を測る（同じ乱数で席を入れ替えた2戦を1組にして比べる。4並列、勝率と95%の幅と判定を出す。2000組=4000戦で約10分）
- `node tools/golden.js 試合数 save|check 記録.json` 整理・リファクタの前後で、同じ乱数の全試合のログが一致するかを確かめる（`OFF=threat2` で既定オンのスイッチを切った動きも比べられる）
- `node tools/find_combos.js デッキ.txt [試合数]` 新しいデッキのコンボ探し
- `node tools/probe_assist.js 試合数 seed [search]` 最初の手番に手札を使えたか、FILEで強くなるイベントをアシスト前に使っていないかの集計
- `tools/headless.js` 上の3つの土台。画面の部品をダミーにして、ゲームの処理だけを Node で動かす
