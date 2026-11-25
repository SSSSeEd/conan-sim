"use strict";
// デッキ別CPU（段階⑤）の共通部品: 対戦データから学んだ表（DECK_LEARNED）を、手札を使う優先度と探索の案の点数への加点にする。
// 表の作り方: node tools/deck_data.js デッキ名 試合数 > d.jsonl（手番の約3割で出すカードをくじで選ぶ）→ node tools/deck_learn.js d.jsonl
//   表の値は「その局面でそのカードを出すと、別の手を出したときより勝率が何ポイント上がるか」（くじの手番どうしの比較。誤差が大きいものは0に近づけてある）
// 使い方: 各デッキのファイルで deckLearned("名前") を呼び、返った play・plan を DECK_CPU に入れる。スイッチ deckL がオフの席では0
window.DECK_CPU=window.DECK_CPU||{};
window.DECK_LEARNED=window.DECK_LEARNED||{};
// 勝率1ポイント（0.01）あたりの加点。手札の優先度（レベル×10が基本）と、探索の点数（証拠1つ=60）で尺度が違うので別々
const DECK_KP=window.DECK_KP??300,DECK_KS=window.DECK_KS??1500;
function deckLearned(name){
  const eff=(p,card)=>{const T=DECK_LEARNED[name];if(!T||!card)return 0;const t=T[deckPhase(p)]||{};return t[card]||0};
  return {
    play:(p,x)=>ai2(p,"deckL")?DECK_KP*eff(p,x.n):0,
    // 探索の案: 出すカード（指定なしなら今のCPUが出すカード）と、先にアシストするか
    plan:(p,pl)=>{if(!ai2(p,"deckL"))return 0;
      const card=pl.play==="none"?"none":pl.play||((bestHand(p,false)||{}).n)||"none";
      return DECK_KS*(eff(p,card)+(pl.assist?eff(p,"A"):0))}}}
