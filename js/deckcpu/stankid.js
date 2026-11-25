"use strict";
// デッキ専用CPU: 白単スタンキッド（プリセット「スタンキッド11/20」。パートナー怪盗キッドB01042、スタンの怪盗キッドB03046・キッド＆白馬B06066）
// 2つの層: ①SeEdの動きに寄せる加点（スイッチ deck）②対戦データから学んだ表（スイッチ deckL、js/deckcpu/learned.js）
// ①は SeEd がこのデッキで遊んだ記録（2026-10-27〜11-07、23戦）の「局面ごとに使ったカードの割合」と、既定のCPUの割合の比（対数）。
//   人が既定のCPUより多く使うカードに加点、少なく使うカードに減点する。表は tools/deck_human.js --write stankid で作る（table_human_stankid.js）
(function(){
const ids=p=>[...p.hand,...p.deck,...p.field,...p.file,...p.rm,...(p.ev||[])].map(x=>x.n);
const isStan=p=>p.partner&&p.partner.n.startsWith("B01042")&&ids(p).filter(n=>n==="B03046"||n==="B06066").length>=4;
const KH=window.DECK_KH??25,KHS=window.DECK_KHS??80; // 対数比1あたりの加点（手札の優先度 / 探索の点数）
const hum=(p,nm)=>{if(!ai2(p,"deck"))return 0;const T=(window.DECK_HUMAN||{}).stankid;if(!T)return 0;const t=T[deckPhase(p)]||{};return t[nm]||0};
const nmOf=n=>n==="none"?"（使わない）":(C({n})||{}).nm;
const L=deckLearned("stankid");
DECK_CPU.stankid={detect:isStan,
  play:(p,x)=>KH*hum(p,C(x).nm)+L.play(p,x),
  plan:(p,pl)=>{const card=pl.play==="none"?"none":pl.play||((bestHand(p,false)||{}).n)||"none";return KHS*hum(p,nmOf(card))+L.plan(p,pl)}};
})();
