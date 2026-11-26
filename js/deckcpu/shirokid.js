"use strict";
// デッキ専用CPU: 白黄キッド（環境デッキ「白黄キッド」。パートナー怪盗キッドB02035P、事件B09112、怪盗キッド&安室透B09109）
// 対戦データから学んだ表（スイッチ deckL、js/deckcpu/learned.js、表は table_shirokid.js）を使う。
// SeEdの方針を手で書いた層（スイッチ deck）はまだ無い（SeEd の対戦記録は白単スタンキッドのもので、このデッキの人の記録は無い）
(function(){
const ids=p=>[...p.hand,...p.deck,...p.field,...p.file,...p.rm,...(p.ev||[])].map(x=>x.n);
const isShiroKi=p=>!!p.partner&&p.partner.n.startsWith("B02035")&&ids(p).filter(n=>n==="B09109").length>=2;
const L=deckLearned("shirokid");
// kaAmuro（手で書いた規則、既定オフ。deck は既定オンなので別スイッチ）: 怪盗キッド&安室透 B09109 の「同じレベル・同じカード名のキャラをデッキから登場」を、手札を使ったあと・ネクストヒントで現場を埋める前に使う
//   （既定CPUは宣言能力を手札とヒントのあとに使うので、ヒントで現場が5枚になり、この能力を使わずに終わっていた。登場したキャラの登場時効果もヒントの前に得られる）
async function afterPlay(p,t){if(!ai2(p,"kaAmuro")||t.plan.ab==="none")return;
  for(const x of p.field.filter(y=>y.n==="B09109")){const ab=FX.abilities(p,x).find(a=>a.ok&&a.key==="ab0");
    if(ab&&ab.aiCan(p,x)){G.ui.act={a:x,t:null};await FX.useAbility(p,x,ab);await t.step();if(G.over)return}}}
DECK_CPU.shirokid={detect:isShiroKi,play:L.play,plan:L.plan,afterPlay};
})();
