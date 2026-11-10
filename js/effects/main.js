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

// ---- 第2弾(2026-11-10): 毛利蘭・怪盗キッド・服部平次・ジン・赤井秀一 ----
const sleepOne=async(p,title="スリープさせるキャラ")=>{const t=await chooseChar(p,title,y=>y.st==="a");if(t)sleepC(t);return t};
const allSleep=()=>{for(const y of allChars())if(y.st==="a")y.st="s";log("　すべてのキャラをスリープ","n")};
const ranRelated=y=>isChar(y)&&(exactName("妃英理")(y)||exactName("工藤新一")(y)||hasTrait(y,"毛利探偵事務所"));
DEF["0003"]={ // 毛利蘭 B01007
  contactWin:async p=>{drawN(p,1)},
  abilities:[{label:"手札を1枚リムーブ: AP＋1000と突撃",turn1:true,can:p=>partnerIs(p,"青")&&p.hand.length>0,aiCan:(p,x)=>myTurn(p)&&x.fresh&&x.st==="a"&&p.hand.length>=3,
    run:async(p,x)=>{await discard(p,1);apTurn(x,1000);giveKw(x,"突撃");return true}}]};
DEF["0041"]={ // 怪盗キッド B01049
  apSelf:p=>myTurn(p)&&opp(p).field.length>=3?2000:0};
DEF["0058"]={ // 赤井秀一 B01068
  onAction:async(p,self,actor,target)=>{if(actor===self&&!target)giveKw(self,"ブレット")}};
DEF["0086"]={ // ジン B01098（【カットイン】【自分ターン中】コンタクト中のすべてのキャラをリムーブ）
  cutin:async p=>{const ct=G.contact;if(!ct)return;log("　コンタクト中のすべてのキャラをリムーブ","n");
    for(const y of [ct.a,ct.d])if(allChars().includes(y))removeCard(y,"効果",{by:p,effect:true});await runQueue()}};
DEF["0208"]={ // 怪盗キッド B02041
  enter:async p=>{if(partnerIs(p,"白"))await sleepOne(p)},disguise:async p=>{if(partnerIs(p,"白"))await sleepOne(p)}};
DEF["0211"]={ // 怪盗キッド B02045
  disguise:async p=>{const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000)},
  hirameki:async o=>{await sleepOne(o,"ヒラメキ: スリープさせるキャラ")}};
DEF["0221"]={ // 赤井秀一 B02058
  enter:async p=>{const o=opp(p);if(o.hand.length&&o.hand.length>=p.hand.length)await discard(o,1)},
  leaveOppTurn:async p=>{digToHand(p,exactName("沖矢昴"))}};
DEF["0278"]={ // 毛利蘭 B03020
  onAction:async(p,self,actor)=>{if(actor!==self||p.deck.length<3)return;
    if(!await yes(p,"毛利蘭","デッキの上から3枚をリムーブしますか？（［妃英理］［工藤新一］［毛利探偵事務所］のキャラがあればAP＋1000）",()=>p.deck.length>15))return;
    if(millSelf(p,3).some(ranRelated)){self.apA+=1000;log(`　${C(self).nm} をアクション終了時までAP＋1000`,"n")}}};
DEF["0289"]={ // 服部平次 B03032
  kwSelf:()=>["アクティブ指定セット"],
  enter:async p=>{const o=opp(p);if(!o.deck.length)return;const t=await chooseChar(p,"相手のデッキの上から1枚をセットするキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(a)-apOf(b)).slice(0,1)});
    if(t)setTop(o,t)}};
DEF["0305"]={ // 怪盗キッド B03050
  disguise:async(p,x,mine)=>{if(myTurn(p)||!mine||!exactName("世良真純")(mine)||!p.field.includes(x))return;
    if(!await yes(p,"怪盗キッド","このキャラをリムーブして、証拠を1つ得ますか？",true))return;removeCard(x,"効果",{by:p,effect:true});gainEv(p,1);await runQueue()}};
DEF["0306"]={ // 怪盗キッド B03051
  enter:async p=>{if(!partnerIs(p,"白")||!p.deck.length)return;const y=p.deck.pop();p.hand.push(y);log(`　${p.name} はデッキの下から1枚を手札に加えた`,"n")}};
DEF["0322"]={ // 赤井秀一 B03068
  enter:async p=>{const y=await playFromHandSt(p,z=>hasColor(z,"赤")&&lvOf(z)<=4,"スリープ状態で登場させる【赤】のキャラ（レベル4以下）");
    if(y)return;gainEv(opp(p),1);drawN(p,1)}};
DEF["0253"]={ // 毛利蘭 B04012
  enter:async p=>{await lookTop(p,1,ranRelated,{max:1,title:"手札に加える［妃英理］［工藤新一］［毛利探偵事務所］"})}};
DEF["0476"]={ // ジン B04094
  onOppRemoved:async(q,self,info)=>{if(info.by!==q||!info.effect||!partnerIs(q,"黒")||turnCount(self,"gin4"))return;useTurn(self,"gin4");giveKw(self,"突撃")}};
const kidLook2=async p=>{const xs=p.deck.splice(0,2);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const down=await pickCards(p,"デッキの下に移すカード（残りはデッキの上）","",xs,{max:2,ai:c=>c.filter(y=>aiCardValue(p,y)<3)});
  let up=xs.filter(y=>!down.includes(y));if(!p.cpu&&up.length>1&&typeof orderCards==="function")up=await orderCards(`${p.name}: デッキの上に戻す順番（①が一番上）`,up);
  p.deck.unshift(...up);p.deck.push(...down);log(`　上に${up.length}枚、下に${down.length}枚移した`,"n")};
DEF["0549"]={ // 怪盗キッド B05047
  enter:kidLook2,disguise:kidLook2};
DEF["0636"]={ // 毛利蘭 B06011
  enter:async p=>{if(partnerIs(p,"青"))digToHand(p,y=>isChar(y)&&exactName("工藤新一")(y)&&(C(y).lv||0)>=7)}};
DEF["0855"]={ // 毛利蘭 B08014（「自分のMRの能力によって選ばれた」は core.js chooseChar の x.mrPick）
  onAction:async(p,self,actor)=>{if(actor===self)self.ranRet=G.turnNo},
  endTurn:async(p,self)=>{if(self.ranRet===G.turnNo&&self.mrPick!==G.turnNo&&p.field.includes(self))toHandFromField(self)}};
DEF["0874"]={ // 怪盗キッド B08035
  enter:async p=>{if(!p.solved)return;const t=await chooseChar(p,"スタン／スリープさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(!t)return;if(t.st==="s")stunC(t);else if(t.st==="a")sleepC(t)},
  abilities:[{label:"スリープ: 裏向きのセットを1枚リムーブしてもよい。そうしたらキャラをAP＋2000",can:(p,x)=>x.st==="a",
    aiCan:(p,x)=>myTurn(p)&&setCardsAll().some(y=>isOpp(p,y))&&p.field.some(y=>y!==x&&y.st==="a"),
    run:async(p,x)=>{sleepCost(x);if(!setCardsAll().length)return true;
      if(!await yes(p,"怪盗キッド","裏向きでセットされているカードを1枚リムーブしますか？",()=>setCardsAll().some(y=>isOpp(p,y))))return true;
      if(!await removeAnySet(p,"リムーブする裏向きのカード"))return true;const t=await chooseChar(p,"AP＋2000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t)apTurn(t,2000);return true}}]};
DEF["0889"]={ // 赤井秀一 B08051
  enter:async(p,x)=>{if(p.rm.some(exactName("宮野明美")))giveKw(x,"突撃")},
  abilities:[{label:"リムーブエリアの［諸星大］か［ライ］をデッキの下へ: ブレット",turn1:true,can:p=>p.rm.some(anyExact("諸星大","ライ")),aiCan:(p,x)=>myTurn(p)&&x.st==="a"&&opp(p).field.length>0,
    run:async(p,x)=>{const [y]=await pickCards(p,"コスト: デッキの下に移す［諸星大］か［ライ］","",p.rm.filter(anyExact("諸星大","ライ")),{min:1,max:1});if(!y)return false;
      detach(y);p.deck.push(y);log(`　コスト: ${C(y).nm} をデッキの下へ`,"n");giveKw(x,"ブレット");return true}}]};
const ap1000any=async p=>{const t=await chooseChar(p,"AP＋1000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)apTurn(t,1000)};
DEF["0095"]={ // 毛利蘭 D01006
  enter:ap1000any,
  abilities:[{label:"キャラを1枚ターン終了時までAP＋1000",turn1:true,can:()=>allChars().length>0,aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"),run:async p=>{await ap1000any(p);return true}}]};
DEF["0107"]={ // 服部平次 D02004
  onAction:async(p,self,actor)=>{if(actor!==self)return;const n=opp(p).field.filter(y=>y.st!=="a").length;if(n){self.apA+=1000*n;log(`　${C(self).nm} をアクション終了時までAP＋${1000*n}`,"n")}}};
DEF["0121"]={ // 怪盗キッド D03004
  leaveOppTurn:async p=>{const t=await chooseChar(p,"スタンさせるキャラ（レベル5以下のスリープ状態）",y=>y.st==="s"&&lvOf(y)<=5);if(t)stunC(t)}};
DEF["0396"]={ // ジン D07018
  onContact:async(p,self,ct)=>{if(!myTurn(p)||(ct.a!==self&&ct.d!==self))return;const o=ct.a===self?ct.d:ct.a;if(lvOf(o)>6||!allChars().includes(o))return;
    removeCard(o,"効果",{by:p,effect:true});await runQueue()}};
DEF["0931"]={ // ジン PR230
  enter:async p=>{if(partnerIs(p,"黒"))allSleep()},leaveOppTurn:async()=>{allSleep()},hirameki:async o=>{await sleepOne(o,"ヒラメキ: スリープさせるキャラ")}};
DEF["0932"]={ // 毛利蘭 PR234
  enter:async p=>{const cs=[...p.hand,...p.rm].filter(y=>C(y).t==="イベント"&&named("シャッフルロマンス")(y));if(!cs.length)return;
    const [e]=await pickCards(p,"セットする［シャッフルロマンス］","",cs,{max:1,ai:c=>c.slice(0,1)});if(e)await setEventOn(p,e)},
  onSetOff:async(p,self,info)=>{if(myTurn(p)||info.down||!info.card||!named("シャッフルロマンス")(info.card)||!p.rm.includes(info.card)||turnCount(self,"ran932"))return;
    if(!await yes(p,"毛利蘭","リムーブエリアに置かれた［シャッフルロマンス］を手札に加えますか？",true))return;useTurn(self,"ran932");detach(info.card);p.hand.push(info.card);log(`　${C(info.card).nm} を手札に加えた`,"n")}};
