"use strict";
// カード個別効果（主要キャラ）。環境デッキに同名キャラが多く入る江戸川コナン・工藤新一・毛利小五郎などの未自動化カード。
const nonBlue=y=>colorsOf(C(y).c).some(ch=>ch!=="青");
const detective=y=>isChar(y)&&hasTrait(y,"探偵");
const isRan=named("毛利蘭");
const ownFirst=(p)=>cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1);

DEF["0001"]={ // 江戸川コナン B01005
  onHintUse:async(p,self,y)=>{if(!partnerIs(p,"青")||turnCount(self,"ch1"))return;useTurn(self,"ch1");const lv=C(y).lv||0;
    await bottomChar(p,z=>lvOf(z)<=lv,`デッキの下に移すキャラ（レベル${lv}以下）`)}};
DEF["0618"]={ // 江戸川コナン PR117
  enter:async p=>{const xs=[];let hit=null;
    while(p.deck.length){const y=p.deck.shift();xs.push(y);if(detective(y)&&(C(y).lv||0)>=7){hit=y;break}}
    log(`　${p.name} はデッキの上から${xs.length}枚を公開`,"n");
    if(hit){p.hand.push(hit);log(`　${C(hit).nm} を手札に`,"n")}
    for(const y of xs)if(y!==hit)p.deck.push(y);
    shuffle(p.deck)},
  onAllyEnter:async(p,self,x)=>{if(!myTurn(p)||x===self||!detective(x)||turnCount(self,"pr117")||!p.hand.length||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"江戸川コナン","手札を1枚リムーブして、レベル7以下のキャラをリムーブしますか？",true))return;
    useTurn(self,"pr117");await discard(p,1);await rmChar(p,lvLe(7))}};
DEF["0174"]={ // 江戸川コナン B02002
  enter:async(p,x)=>{if(p.field.some(y=>lvOf(y)>=7&&nonBlue(y)))giveKw(x,"突撃")},
  onAction:async(p,self,actor)=>{if(actor!==self||turnCount(self,"b02002"))return;useTurn(self,"b02002");
    const n=p.field.filter(nonBlue).length;if(n){self.apA+=1000*n;log(`　${C(self).nm} をアクション終了時までAP＋${1000*n}`,"n")}}};
DEF["0262"]={ // 江戸川コナン B03004
  enter:async p=>{if(!p.solved||!p.hand.length||!p.field.some(y=>isRan(y)&&lpOf(y)===0))return;
    if(!await yes(p,"江戸川コナン","手札を1枚リムーブして、LP0の［毛利蘭］をアクティブにしますか？",true))return;
    await discard(p,1);const t=await chooseChar(p,"アクティブにする［毛利蘭］",y=>!isOpp(p,y)&&isRan(y)&&lpOf(y)===0,{ai:ownFirst(p)});if(t)activateC(t)}};
DEF["0410"]={ // 江戸川コナン B04005
  enter:async p=>{drawN(p,2);await discard(p,2)},
  abilities:[{label:"他の［毛利探偵事務所］をAP＋1000",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&hasTrait(y,"毛利探偵事務所")),
    aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"毛利探偵事務所")),
    run:async(p,x)=>{const t=await chooseChar(p,"AP＋1000する［毛利探偵事務所］",y=>y!==x&&!isOpp(p,y)&&hasTrait(y,"毛利探偵事務所"),{ai:ownFirst(p)});if(t)apTurn(t,1000);return true}}]};
DEF["0161"]={ // 江戸川コナン PR006
  onContact:async(p,self,ct)=>{if(!myTurn(p)||(ct.a!==self&&ct.d!==self)||!p.hand.length)return;
    if(!await yes(p,"江戸川コナン","手札を1枚リムーブして、このコンタクト中AP＋2000しますか？",true))return;
    await discard(p,1);self.apC+=2000;log(`　${C(self).nm} をコンタクト中AP＋2000`,"n")}};
DEF["0175"]={ // 工藤新一 B02003
  enter:async p=>{if(partnerIs(p,"青"))await bottomChar(p,lvLe(7),"デッキの下に移すキャラ（レベル7以下）")},
  abilities:[{label:"［毛利蘭］をLP＋1",turn1:true,can:()=>allChars().some(isRan),aiCan:p=>p.field.some(isRan),
    run:async p=>{const t=await chooseChar(p,"LP＋1する［毛利蘭］",isRan,{ai:ownFirst(p)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}return true}}]};
DEF["0263"]={ // 工藤新一 B03005
  abilities:[{label:"【スリープ】: レベル6以下の［毛利蘭］に突撃",can:(p,x)=>partnerIs(p,"青")&&x.st==="a"&&p.field.some(y=>isRan(y)&&lvOf(y)<=6),
    aiCan:p=>myTurn(p)&&p.field.some(y=>isRan(y)&&lvOf(y)<=6&&y.fresh&&y.st==="a"),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"突撃を与える［毛利蘭］",y=>!isOpp(p,y)&&isRan(y)&&lvOf(y)<=6,{ai:cs=>cs.filter(y=>y.fresh).concat(cs).slice(0,1)});if(t)giveKw(t,"突撃");return true}}]};
DEF["0520"]={ // 工藤新一 B05014
  kwSelf:()=>["突撃"],
  endTurn:async(p,x)=>{if(x.st!=="s"||!p.field.includes(x))return;toHandFromField(x);
    const y=await pickCards(p,"スリープ状態で登場させる［江戸川コナン］","",p.rm.filter(z=>isChar(z)&&named("江戸川コナン")(z)&&(C(z).lv||0)<=3),{max:1,ai:c=>c.slice(0,1)});
    if(y[0])await enterByEffect(p,y[0],"s")}};
DEF["0184"]={ // 毛利小五郎 B02012
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&hasColor(y,"青")&&lvOf(y)<=5?1000:0,
  onAction:async(p,self,actor)=>{if(turnCount(self,"b02012")||!(named("妃英理")(actor)||hasTrait(actor,"毛利探偵事務所")))return;useTurn(self,"b02012");drawN(p,1)}};
DEF["0416"]={ // 毛利小五郎 B04011
  abilities:[{label:"現場の［江戸川コナン］をデッキの下へ: LP＋2",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&named("江戸川コナン")(y)),aiCan:()=>false,
    run:async(p,x)=>{const t=await chooseChar(p,"デッキの下に移す［江戸川コナン］",y=>!isOpp(p,y)&&y!==x&&named("江戸川コナン")(y),{ai:ownFirst(p),min:1});
      if(!t)return false;toDeckBottom(t);x.lpT+=2;log(`　${C(x).nm} をターン終了時までLP＋2`,"n");return true}}]};
DEF["0403"]={ // 毛利小五郎 SP001
  enter:async p=>{if(!p.solved)return;const t=await chooseChar(p,"スリープさせるキャラ");if(t)sleepC(t)}};
