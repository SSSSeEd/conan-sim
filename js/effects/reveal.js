"use strict";
// 「手札から公開したとき」に発動するカードと、公開をコストにするカード（毛利蘭・工藤新一 系）。
// 公開は revealFromHand（core.js）を通す。発動は onReveal(p,self,公開したカード) で、今の効果を解決し終えてから呼ばれる（hooks.js の resolving）

const shinRan=named("工藤新一","毛利蘭");
DEF["1068"]={ // 毛利蘭 B10006（スリープ状態で登場・オートフェイズにアクティブにならない は本文から自動）
  onReveal:async(p,self,y)=>{if(!condOk("事件青＆黒",p)||!condOk("FILE5",p)||!myTurn(p)||turnCount(self,"ran6")>=2||!shinRan(y))return;
    useTurn(self,"ran6");activateC(self);apTurn(self,1000)}};
DEF["1152"]={ // 毛利蘭＆ベルモット B10097
  abilities:[{label:"［工藤新一］か［毛利蘭］を公開: AP8000以下のキャラをリムーブ",turn1:true,
    can:(p,x)=>p.hand.some(shinRan)&&p.field.some(y=>y!==x&&(hasColor(y,"青")||hasColor(y,"黒"))),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4),
    run:async(p,x)=>{if(!await revealFromHand(p,shinRan,"公開する［工藤新一］か［毛利蘭］",{must:true}))return false;await rmChar(p,apLe(8000));return true}}],
  endTurn:async p=>{const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [y]=await pickCards(p,"公開して手札に加える［工藤新一］か［毛利蘭］","",xs.filter(shinRan),{ai:c=>c.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
    if(y){detach(y);p.hand.push(y);log(`　${p.name} は ${C(y).nm} を公開して手札に加えた`)}
    const rest=xs.filter(z=>z!==y);for(const z of rest){detach(z);p.rm.push(z)}if(rest.length)log(`　残り${rest.length}枚をリムーブ`,"n");
    checkDeck(p);if(y&&(C(y).lv||0)>=5)await discard(p,1)},
  partnerToo:true};
DEF["0629"]={ // 工藤新一 B06004
  apAura:(q,self,y)=>G.turn!==q.idx&&condOk("絆毛利蘭",q)&&q.field.includes(y)&&named("毛利蘭")(y)?1000:0,
  abilities:[{label:"【スリープ】［毛利蘭］を公開: 相手のレベル7以下をデッキの下へ",
    can:(p,x)=>x.st==="a"&&p.hand.some(named("毛利蘭")),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{if(!await revealFromHand(p,named("毛利蘭"),"公開する［毛利蘭］",{must:true}))return false;sleepCost(x);await bottomChar(p,y=>isOpp(p,y)&&lvLe(7)(y));return true}}]};
