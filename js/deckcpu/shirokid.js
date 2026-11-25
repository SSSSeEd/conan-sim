"use strict";
// デッキ専用CPU: 白黄キッド（環境デッキ「白黄キッド」。パートナー怪盗キッドB02035P、事件B09112、怪盗キッド&安室透B09109）
// 対戦データから学んだ表（スイッチ deckL、js/deckcpu/learned.js、表は table_shirokid.js）を使う。
// SeEdの方針を手で書いた層（スイッチ deck）はまだ無い（SeEd の対戦記録は白単スタンキッドのもので、このデッキの人の記録は無い）
(function(){
const ids=p=>[...p.hand,...p.deck,...p.field,...p.file,...p.rm,...(p.ev||[])].map(x=>x.n);
const isShiroKi=p=>!!p.partner&&p.partner.n.startsWith("B02035")&&ids(p).filter(n=>n==="B09109").length>=2;
const L=deckLearned("shirokid");
DECK_CPU.shirokid={detect:isShiroKi,play:L.play,plan:L.plan};
})();
