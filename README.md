# コナンTCG 卓上シミュレータ

名探偵コナンTCGの練習用シミュレータ（個人用）。GitHub Pages で公開し、iPhoneのホーム画面に追加してWebアプリとして使う。

- `index.html` 本体（PCとスマホで画面が自動で切り替わる）
- `style.css` 見た目
- `js/` プログラム（index.html が読み込む）
  - ゲーム処理: `state.js`（盤面とルールの判定）/ `engine.js`（進行）/ `cpu.js` `search.js`（CPU）/ `effects.js`（カード効果）。document には触らない
  - 画面: `ui.js`（盤面）/ `dialogs.js`（通知・選択の画面）/ `show.js`（演出）/ `setup.js`（デッキ選択）
  - データ: `cards.js`（カード）/ `decks.js` `data.js`（デッキ）
- `img/*.json` 縮小したカード画像（パック単位）
- `manifest.json` `sw.js` `icons/` Webアプリ・オフライン用（sw.js はアプリ全体を見るため一番上に置く）
- `tools/` `tests/` 開発用（下記）

公開URL: https://sssseed.github.io/conan-sim/

対戦中の盤面はターンのはじめと自分の行動のあとに端末へ保存される（engine.js の saveGame）。接続が切れたりアプリを閉じたりしても、次に開いたときに「続きから」か「ニューゲーム」を選べる。CPUのターン中に切れた場合は、そのターンのはじめからやり直す。

反映は main へのマージだけ（GitHub Pages）。ほかの場所へのコピーや、sw.js の版数を上げる作業は要らない。

## 開発用ツール（Node 22、ブラウザ不要）
- `node tools/test.js [試合数]` 動作確認（デッキの読み込み、CPU同士の対戦がエラーなしで決着するか、`tests/rules.js` のルールの単体テスト）。PRごとに GitHub Actions でも走る
- `node tools/vs.js 試合数 seed A B` CPUの比較実験（base / combo / search）。100戦で1秒前後（探索ありは数秒）
- `node tools/find_combos.js デッキ.txt [試合数]` 新しいデッキのコンボ探し
- `node tools/vs_off.js 試合数 seed 機能名 [search]` CPUの機能1つの対照実験（機能あり vs なし。`none` で同じCPU同士の基準）
- `node tools/probe_assist.js 試合数 seed [search]` 最初の手番に手札を使えたか、FILEで強くなるイベントをアシスト前に使っていないかの集計
- `tools/headless.js` 上の3つの土台。画面の部品をダミーにして、ゲームの処理だけを Node で動かす
