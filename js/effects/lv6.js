"use strict";
// カード個別効果（レベル6、2026-11-10）。部品は lv4/lv5/lv7/mr8/main.js のものを使う。
// 追加した仕組み（hooks.js・mech.js・engine.js 側）:
//  - DEF の reasonLp(q,self,x,lp)（相手のキャラが推理するとき、LPを書き換える。中森青子 B01045）
//  - DEF の onOppCutDis の第5引数 choice（{x,how}）と G.cutNeg（相手のカットインの効果を無効にする。服部平蔵 B02030）
//  - DEF の rescue(p,self,x)（相手ターン中、他のキャラが離れる代わりに、このキャラをリムーブして手札に移す。松田陣平 B01092: mech.js saveLeave）
//  - DEF の untargetAlly(q,self,y)（自分の他のキャラを指定してアクションできない。白鳥任三郎 B04072）
//  - DEF の onOppSetOff(q,self,info)（相手のキャラにセットされていたカードが離れたとき。大岡紅葉 B02020）
//  - DEF の onAllySleep(p,self,x)（自分のキャラがアクティブからスリープ状態になったとき。阿笠博士 B03008。engine.js noteSlept）
//  - DEF の onOppMisread(q,self)（相手がミスリードしたとき。小嶋元次 B05015）・noOppDisguiseFx(q,self)（相手の【変装時】は発動しない。京極真 B04034）

// --- 部品 ---
const l6_hiDraw=async o=>{drawN(o,1)};
const l6_hiToHand=(f,title)=>async o=>{await pickRmToHand(o,f,title)};
const l6_hiActivate=async o=>{const t=await chooseChar(o,"ヒラメキ: アクティブにするキャラ",()=>true,{ai:ownPick(o)});if(t)activateC(t)};
const l6_auraOwnTurn=(f,v=1000)=>(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&y!==self&&f(y)?v:0;
const l6_nonBlue=y=>["赤","黄","緑","白","黒"].some(c=>hasColor(y,c));
const l6_rushIfAlly=f=>async(p,x)=>{if(p.field.some(y=>y!==x&&f(y)))giveKw(x,"突撃")};
const l6_ownTurnOnce=(self,k)=>{if(turnCount(self,k))return false;useTurn(self,k);return true};
const l6_mySleepers=p=>p.field.filter(y=>y.st==="s");

// ================= 緑 =================
DEF["0025"]={onAllyContactWin:async(p,self,w,v)=>{giveKw(self,"突撃")}}; // 伊織無我 B01031
DEF["0030"]={ // 遠山銀司郎 B01036
  onAction:async(p,self,actor,target)=>{if(!target||!p.field.includes(actor)||!hasColor(actor,"緑")||!l6_ownTurnOnce(self,"ginshi"))return;await sleepOne(p)}};
DEF["0032"]={apAura:l6_auraOwnTurn(y=>hasColor(y,"緑")),hirameki:l6_hiDraw}; // 服部平蔵 B01038
DEF["0190"]={ // 大岡紅葉 B02020
  enter:async p=>{const o=opp(p);const t=await chooseChar(p,"相手のデッキの上を裏向きでセットするキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t&&o.deck.length)setTop(o,t)},
  onOppSetOff:async(q,self,info)=>{if(!myTurn(q)||!l6_ownTurnOnce(self,"momi6"))return;
    const t=await chooseChar(q,"自分のデッキの上を裏向きでセットするキャラ",y=>!isOpp(q,y),{ai:ownPick(q)});if(t&&q.deck.length)setTop(q,t);drawN(q,1)}};
DEF["0191"]={ // 沖田総司 B02021
  abilities:[{label:"相手のキャラ5枚までAP－1000",turn1:true,can:p=>opp(p).field.some(y=>!immune(p,y)),aiCan:p=>opp(p).field.length>0,
    run:async p=>{const xs=await pickCards(p,"AP－1000する相手のキャラ","",opp(p).field.filter(y=>!immune(p,y)),{max:5,ai:c=>c});for(const y of xs)apTurn(y,-1000);return true}}],hirameki:hiSleep};
DEF["0200"]={ // 服部平蔵 B02030
  onOppCutDis:async(p,self,ct,q,ch)=>{if(!ch||ch.how!=="cut")return;const all=[];for(const y of p.field)for(const s of (y.set||[]))all.push({y,s});if(all.length<2)return;
    if(!await yes(p,"服部平蔵","自分のキャラにセットされているカードを合わせて2枚リムーブして、相手のカットインの効果を無効にしますか？",true))return;
    all.sort((a,b)=>(a.s.up===true)-(b.s.up===true));for(const {y,s} of all.slice(0,2)){y.set.splice(y.set.indexOf(s),1);p.rm.push(s.c);noteSetOff(p,y,s.c,!s.up)}G.cutNeg=true;log("　相手のカットインの効果を無効にする","n")},
  abilities:[{label:"自分のキャラの下にデッキの上を裏向きでセット",turn1:true,can:p=>p.deck.length>0&&p.field.length>0,aiCan:p=>p.deck.length>8,
    run:async p=>{const t=await chooseChar(p,"デッキの上を裏向きでセットするキャラ",y=>!isOpp(p,y),{ai:ownPick(p)});if(t)setTop(p,t);return true}}]};
DEF["0288"]={ // 大岡紅葉 B03031
  enter:async p=>{if(!partnerIs(p,"緑"))return;const y=digToHand(p,z=>exactName("服部平次")(z)&&lvOf(z)>=8);if(y)await discard(p,1)},
  hirameki:l6_hiToHand(exactName("服部平次"),"手札に加える［服部平次］")};
DEF["0663"]={ // 遠山和葉 B06040（絆服部平次の AP＋1000）
  apSelf:(p,x)=>myTurn(p)&&bondFor(p,x,"服部平次")?1000:0,enter:l6_rushIfAlly(y=>hasTrait(y,"高校生"))};
DEF["0751"]={ // 遠山和葉 B07019
  enter:async(p,x)=>{if(!p.solved||!(x.entSrc&&x.entSrc.t==="イベント"&&G.fxEvColor==="緑"))return;if(!await yes(p,"遠山和葉","このキャラをスリープさせて、レベル7以下のキャラを1枚リムーブしますか？",true))return;sleepC(x);await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）")}};
DEF["0966"]={ // 遠山和葉 B09022
  enter:async p=>{if(!partnerIs(p,"緑")||!p.solved)return;await l6_sleepDiscardRm(p,y=>lvOf(y)>=6&&hasTrait(y,"探偵"),["服部平次","江戸川コナン"])},
  contactWin:async p=>{drawN(p,1)}};
DEF["0108"]={ // 遠山和葉 D02005
  onAllyEnter:async(p,self,y)=>{if(y!==self&&!exactName("服部平次")(y))return;if(!l6_ownTurnOnce(self,"kazu6"))return;await sleepOne(p)},hirameki:hiSleep};
DEF["0111"]={contactWin:async p=>{drawN(p,1)},noOppCutin:(q,y)=>G.actor===y,hirameki:l6_hiDraw}; // 服部平蔵 D02008（アクション中は相手がカットインを使用できない）
DEF["0168"]={enter:async(p,x)=>{if(p.field.some(y=>hasColor(y,"白")))giveKw(x,"突撃")}}; // 遠山和葉 D06006
DEF["1087"]={ // 稲尾一久 B10026
  abilities:[{label:"スリープ・裏向きのセットを1枚リムーブしてもよい: そのレベル以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&setCardsAll().some(y=>true),aiCan:p=>setCardsAll().length>0&&opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);const fd=setCardsAll().filter(y=>faceDownSet(y).length);if(!fd.length)return true;
      if(!await yes(p,"稲尾一久","裏向きでセットされているカードを1枚リムーブしますか？",true))return true;
      const [h]=await pickCards(p,"リムーブする裏向きのセットのカード","",fd,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>isOpp(p,b)-isOpp(p,a))});if(!h)return true;
      const s=faceDownSet(h)[0];const lv=C(s.c).lv||0;h.set.splice(h.set.indexOf(s),1);ownerOf(h).rm.push(s.c);noteSetOff(ownerOf(h),h,s.c,true);log(`　裏向きのセットを1枚リムーブ（レベル${lv}）`,"n");
      await rmChar(p,y=>lvOf(y)<=lv,`リムーブするキャラ（レベル${lv}以下）`);return true}}]};
// 手札を1枚スリープなど: 自分の現場の条件キャラをスリープさせ、手札1枚をリムーブしてもよい。そうした場合 Lv7以下をリムーブ。drawNames のキャラをスリープさせたら1枚引く
async function l6_sleepDiscardRm(p,f,drawNames=[]){
  const cs=p.field.filter(y=>f(y)&&y.st==="a");if(!cs.length||!p.hand.length)return;
  const [s]=await pickCards(p,"スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!s)return;
  sleepC(s);if(!await yes(p,"手札をリムーブ","手札を1枚リムーブして、レベル7以下のキャラを1枚リムーブしますか？",true))return;
  await discard(p,1);await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");if(drawNames.some(n=>exactName(n)(s)))drawN(p,1)}

// ================= 白 =================
DEF["0037"]={ // 中森青子 B01045
  reasonLp:async(q,self,x,lp)=>{if(q.deck.length<1||turnCount(self,"aoko6"))return lp;if(!await yes(q,"中森青子","デッキの上から5枚をリムーブして、相手の推理するキャラの元のLPを0にしますか？",()=>q.deck.length>12))return lp;
    useTurn(self,"aoko6");millSelf(q,5);const b=C(x).lp||0;x.lpT-=b;return Math.max(0,lp-b)},
  onOppAction:async(q,self,actor)=>{if(q.deck.length<1||turnCount(self,"aoko6"))return;if(!await yes(q,"中森青子","デッキの上から5枚をリムーブして、そのキャラの元のAPを0にしますか？",()=>q.deck.length>12))return;
    useTurn(self,"aoko6");millSelf(q,5);apTurn(actor,-(C(actor).ap||0))}};
DEF["0042"]={enter:async p=>{await revealTopYes(p,y=>hasColor(y,"白"))},hirameki:l6_hiDraw}; // 怪盗1412号 B01050
DEF["0213"]={disguise:async(p,x,mine)=>{if(lpOf(mine)>=2&&hasColor(mine,"白")&&G.contact)G.contact.safe=x}}; // 工藤有希子 B02047
DEF["0216"]={enter:async p=>{digToHand(p,y=>!!C(y).dg)}}; // 中森銀三 B02050
DEF["0304"]={ // 黒羽盗一 B03049
  abilities:[{label:"このキャラをリムーブエリアに移す: デッキの下を公開（FILEの枚数以下のレベルの【白】のキャラなら登場、それ以外は手札）",can:()=>true,aiCan:p=>p.deck.length>4&&myTurn(p),
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});const y=p.deck.pop();if(!y)return true;log(`　デッキの下: ${C(y).nm} を公開`,"n");
      if(isChar(y)&&hasColor(y,"白")&&lvOf(y)<=fileN(p))await enterByEffect(p,y,"a");else{p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}return true}}],hirameki:l6_hiDraw};
DEF["0309"]={ // 鈴木園子 B03054
  lpSelf:p=>p.field.some(y=>exactName("江戸川コナン")(y)&&lvOf(y)>=6)?1:0,
  abilities:[{label:"手札を1枚リムーブ: スリープ状態のキャラをスタン（絆京極真）",turn1:true,can:(p,x)=>bondFor(p,x,"京極真")&&p.hand.length>0&&allChars().some(y=>y.st==="s"),aiCan:p=>allChars().some(y=>y.st==="s"&&isOpp(p,y)),
    run:async p=>{await discard(p,1);const t=await chooseChar(p,"スタンさせるスリープ状態のキャラ",y=>y.st==="s",{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t)stunC(t);return true}}]};
DEF["0311"]={ // 千間降代 B03056
  enter:async p=>{await lookTop(p,1,y=>isChar(y)&&hasTrait(y,"探偵"),{max:1,title:"手札に加える［探偵］のキャラ"})},
  endTurn:async(p,self)=>{if(!p.field.includes(self)||p.field.filter(y=>hasTrait(y,"探偵")&&y.st==="s").length<3)return;
    if(!await yes(p,"千間降代","このキャラをリムーブして、証拠を1つ得ますか？",true))return;removeCard(self,"効果",{by:p});gainEv(p,1)}};
DEF["0312"]={ // 槍田郁美 B03057
  untargetable:(q,y)=>y.st==="s",
  onAllyDeclare:async(p,self,x,a)=>{if(!hasTrait(x,"探偵")||!l6_ownTurnOnce(self,"yari6"))return;drawN(p,1);await discard(p,1)}};
DEF["0315"]={ // 茂木遥史 B03060
  abilities:[{label:"スリープ・他の［探偵］を1枚スリープ: レベル7以下のキャラをスタン",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"探偵")),aiCan:p=>opp(p).field.some(y=>lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);const [c]=await pickCards(p,"スリープさせる［探偵］","",p.field.filter(y=>y!==x&&y.st==="a"&&hasTrait(y,"探偵")),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>apOf(a)-apOf(b))});if(c)sleepC(c);
      const t=await chooseChar(p,"スタンさせるキャラ（レベル7以下）",lvLe(7));if(t)stunC(t);return true}}],hirameki:hiSleep};
DEF["0430"]={ // 白馬探 B04032
  lpSelf:p=>p.field.filter(y=>hasTrait(y,"探偵")).length>=5?1:0,
  abilities:[{label:"〚捜査2〛: レベル5以上が発見されたら［探偵］に突撃",turn1:true,can:()=>true,aiCan:p=>myTurn(p),
    run:async(p,x)=>{const xs=investigate(p,2);if(xs.some(y=>(C(y).lv||0)>=5)){const t=await chooseChar(p,"突撃を与える［探偵］（レベル7以下）",y=>y!==x&&!isOpp(p,y)&&hasTrait(y,"探偵")&&lvOf(y)<=7,{ai:ownPick(p)});if(t)giveKw(t,"突撃")}return true}}]};
DEF["0432"]={ // 京極真 B04034
  noOppCutin:(q,y)=>myTurn(q)&&bondFor(q,y,"鈴木園子"),noOppDisguiseFx:(q,y)=>myTurn(q)&&bondFor(q,y,"鈴木園子"),
  hirameki:l6_hiToHand(exactName("鈴木園子"),"手札に加える［鈴木園子］")};
DEF["0434"]={ // 鈴木史郎 B04036
  abilities:[{label:"1枚引く（［鈴木財閥］が3枚以上）",turn1:true,can:p=>p.field.filter(y=>hasTrait(y,"鈴木財閥")).length>=3,aiCan:()=>true,run:async p=>{drawN(p,1);return true}}]};
DEF["0254"]={enter:async p=>{p.deck.push(...p.rm.splice(0));shuffle(p.deck);log("　リムーブエリアのカードをすべてデッキの下に移してシャッフル","n")}}; // 白馬探 B04038
DEF["0551"]={ // 中森青子 B05049
  abilities:[{label:"手札の［怪盗キッド］を公開してデッキの上に移す: ［黒羽快斗］に突撃",turn1:true,can:p=>p.hand.some(exactName("怪盗キッド")),aiCan:p=>myTurn(p)&&p.field.some(exactName("黒羽快斗")),
    run:async p=>{const [h]=await pickCards(p,"デッキの上に移す［怪盗キッド］","",p.hand.filter(exactName("怪盗キッド")),{min:1,max:1,ai:c=>c});if(!h)return false;detach(h);p.deck.unshift(h);log(`　${C(h).nm} を公開してデッキの上に移した`,"n");
      const t=await chooseChar(p,"突撃を与える［黒羽快斗］",y=>!isOpp(p,y)&&exactName("黒羽快斗")(y),{ai:ownPick(p)});if(t)giveKw(t,"突撃");return true}}],
  hirameki:l6_hiToHand(exactName("黒羽快斗"),"手札に加える［黒羽快斗］")};
DEF["0557"]={ // 鈴木史郎 B05055
  abilities:[{label:"スリープ: 手札からレベル5以下の［鈴木財閥］を登場",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"鈴木財閥")&&lvOf(y)<=5),aiCan:()=>true,
    run:async(p,x)=>{sleepCost(x);await playFromHandSt(p,y=>hasTrait(y,"鈴木財閥")&&lvOf(y)<=5,"登場させる［鈴木財閥］（レベル5以下）","a");return true}}],
  hirameki:l6_hiToHand(y=>isChar(y)&&hasTrait(y,"鈴木財閥"),"手札に加える［鈴木財閥］")};
DEF["0765"]={ // 中森青子 B07036
  enter:async p=>{if(!p.solved)return;const cs=p.field.filter(y=>hasColor(y,"白")&&y.st==="a");if(!cs.length||!p.hand.length)return;
    const [s]=await pickCards(p,"スリープさせる【白】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!s)return;sleepC(s);
    if(!await yes(p,"手札をリムーブ","手札を1枚リムーブして、レベル7以下のキャラを1枚リムーブしますか？",true))return;await discard(p,1);await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");if(exactName("黒羽快斗")(s))drawN(p,1)}};
DEF["0769"]={ // 黒羽千影 B07040
  abilities:[{label:"［怪盗］か［マジシャン］に突撃［キャラ］かブレット",turn1:true,can:p=>partnerIs(p,"白"),aiCan:p=>myTurn(p),
    run:async p=>{const t=await chooseChar(p,"能力を与える［怪盗］か［マジシャン］",y=>!isOpp(p,y)&&(hasTrait(y,"怪盗")||hasTrait(y,"マジシャン")),{ai:ownPick(p)});if(!t)return true;
      const m=await pickMode(p,"千影",["突撃［キャラ］","ブレット"],0);giveKw(t,m===0?"突撃［キャラ］":"ブレット");return true}}]};
DEF["0773"]={apAura:l6_auraOwnTurn(y=>hasTrait(y,"マジシャン")),hirameki:l6_hiDraw}; // ジョディ・ホッパー B07044
DEF["0774"]={endTurn:async(p,self)=>{if(self.st!=="a"&&p.field.includes(self)&&p.pLoc==="area"&&hasTrait(p.partner,"ビッグジュエル"))activateC(self)}}; // セリザベス女王 B07045
DEF["0775"]={apSelf:p=>myTurn(p)&&p.pLoc==="area"&&hasTrait(p.partner,"ビッグジュエル")?1000:0}; // ドロン刑事 B07046
DEF["0670"]={ // 佐々木小次郎 B06049
  enter:l6_rushIfAlly(y=>hasTrait(y,"YAIBA")),
  onAction:async(p,self,actor,target)=>{if(actor===self&&!target)self.noHirT=G.turnNo},noOppHirameki:(q,y)=>y.noHirT===G.turnNo&&G.actor===y};
DEF["0674"]={enter:async p=>{digToHand(p,y=>C(y).t==="イベント"&&hasTrait(y,"YAIBA"))}}; // 鉄刃 B06053
DEF["0681"]={ // 龍神 B06060
  abilities:[{label:"リムーブエリアに移す: ［YAIBA］をアクティブか突撃",can:()=>true,aiCan:p=>myTurn(p)&&p.field.some(y=>hasTrait(y,"YAIBA")),
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});const t=await chooseChar(p,"アクティブか突撃を与える［YAIBA］",y=>!isOpp(p,y)&&hasTrait(y,"YAIBA"),{ai:ownPick(p)});if(!t)return true;
      const m=await pickMode(p,"龍神",["アクティブにする","突撃を与える"],t.st==="a"?1:0);if(m===0)activateC(t);else giveKw(t,"突撃");return true}}]};
DEF["0985"]={ // 江戸川文代 B09042
  abilities:[{label:"スリープ: ［闇の男爵］に突撃",can:(p,x)=>x.st==="a"&&p.field.some(exactName("闇の男爵")),aiCan:p=>myTurn(p),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"突撃を与える［闇の男爵］",y=>!isOpp(p,y)&&exactName("闇の男爵")(y),{ai:ownPick(p)});if(t)giveKw(t,"突撃");return true}}],
  hirameki:l6_hiToHand(exactName("闇の男爵"),"手札に加える［闇の男爵］")};
DEF["0987"]={ // 工藤有希子 B09044
  abilities:[{label:"スリープ・デッキの下に移す: 手札からレベル6以下の【青】か【白】を登場",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&(hasColor(y,"青")||hasColor(y,"白"))&&lvOf(y)<=6),aiCan:()=>true,
    run:async(p,x)=>{sleepCost(x);toDeckBottom(x);await playFromHandSt(p,y=>(hasColor(y,"青")||hasColor(y,"白"))&&lvOf(y)<=6,"登場させるレベル6以下の【青】か【白】","a");return true}}],
  hirameki:l6_hiToHand(y=>isChar(y)&&(hasColor(y,"青")||hasColor(y,"白"))&&lvOf(y)<=6,"手札に加えるレベル6以下の【青】か【白】")};
DEF["0989"]={ // 鈴木次郎吉 B09046
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&hasTrait(y,"鈴木財閥")))drawN(p,1);if(p.field.some(y=>hasTrait(y,"探偵"))){const t=await chooseChar(p,"スタンさせるキャラ（レベル7以下）",lvLe(7));if(t)stunC(t)}}};
DEF["0990"]={ // 闇の男爵 B09047
  onAction:async(p,self,actor)=>{if(actor===self)await l6_baron(p)},onReason:async(p,self,x)=>{if(x===self)await l6_baron(p)}};
async function l6_baron(p){const ok2=p.pLoc==="area"&&C(p.partner).t==="パートナー"&&(C(p.partner).c||"").split(/[,、]/).length>=2&&C(p.partner).mr;
  const m=await pickMode(p,"闇の男爵",["リムーブエリアのレベル4以下の【青】か【白】を登場","キャラをスタンさせて1枚引く"],0);
  if(m===0)await enterFromRm(p,y=>(hasColor(y,"青")||hasColor(y,"白"))&&lvOf(y)<=4,"登場させるレベル4以下の【青】か【白】");
  else if(ok2){const t=await chooseChar(p,"スタンさせるキャラ");if(t)stunC(t);drawN(p,1)}}
DEF["1096"]={ // 鈴木園子 B10036
  endTurn:async(p)=>{const t=await chooseChar(p,"アクティブにするレベル8以上のキャラ",y=>!isOpp(p,y)&&lvOf(y)>=8,{ai:ownPick(p)});if(t)activateC(t)},
  abilities:[{label:"スリープ: 相手のキャラと自分のスリープ状態のキャラとのコンタクトを発生させる（事件緑＆白・パートナー白・解決編）",
    can:(p,x)=>condOk("事件緑＆白",p)===true&&partnerIs(p,"白")&&p.solved&&x.st==="a"&&myTurn(p)&&p.field.some(y=>y!==x&&y.st==="s")&&opp(p).field.some(y=>!immune(p,y)),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="s"&&apOf(y)>=6000),
    run:async(p,x)=>{sleepCost(x);const [a]=await pickCards(p,"アクションした側にするスリープ状態のキャラ","",p.field.filter(y=>y!==x&&y.st==="s"),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});
      const t=await chooseChar(p,"コンタクトさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>isOpp(p,y)).sort((m,n)=>apOf(m)-apOf(n)).slice(0,1)});if(a&&t)await contact(p,a,t);return true}}]};
DEF["0443"]={enter:async p=>{digToHand(p,y=>["赤井秀一","諸星大","ライ"].some(n=>exactName(n)(y)))},hirameki:l6_hiDraw}; // 宮野明美 B04051
DEF["1103"]={ // 真田一三 B10043
  lpSelf:p=>p.field.filter(y=>hasTrait(y,"マジシャン")).length>=5?1:0,
  cutin:async p=>{if(myTurn(p))return;await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"マジシャン")&&!exactName("真田一三")(y),"手札に加える［マジシャン］")}};
DEF["1104"]={disguise:async(p,x,mine)=>{const t=await chooseChar(p,"AP＋2000する［毛利蘭］",y=>!isOpp(p,y)&&exactName("毛利蘭")(y),{ai:ownPick(p)});if(t)apTurn(t,2000)}}; // シャロン・ヴィンヤード B10044
DEF["0124"]={onAction:async(p,self,actor)=>{if(actor===self&&l6_ownTurnOnce(self,"hak6"))drawN(p,1)},onReason:async(p,self,x)=>{if(x===self&&l6_ownTurnOnce(self,"hak6"))drawN(p,1)}}; // 白馬探 D03007
DEF["0127"]={endTurn:async(p,self)=>{if(self.st==="a"||!p.hand.length||!p.field.includes(self))return;if(!await yes(p,"京極真","手札を1枚リムーブして、このキャラをアクティブにしますか？",()=>p.hand.length>=3))return;await discard(p,1);activateC(self)},hirameki:l6_hiDraw}; // 京極真 D03011
DEF["0171"]={ // 白馬探 D06013
  enter:async p=>{const xs=p.deck.splice(0,4);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を公開`,"n");
    if(xs.some(y=>hasColor(y,"緑"))&&xs.some(y=>hasColor(y,"白"))){const t=await chooseChar(p,"スタンさせるスリープ状態のキャラ",y=>y.st==="s",{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t)stunC(t)}
    shuffle(xs);p.deck.push(...xs);checkDeck(p)}};

// ================= 赤 =================
const l6_nonBlack=y=>["赤","黄","緑","白","青"].some(c=>hasColor(y,c));
const l6_millOpp=(p,n)=>{const o=opp(p);const xs=o.deck.splice(0,n);o.rm.push(...xs);log(`　${o.name} のデッキの上から${xs.length}枚をリムーブ`,"n");checkDeck(o)};
const l6_recentRefreshed=p=>!!opp(p).refreshed;
DEF["0056"]={onAction:async(p,self,actor,target)=>{if(actor===self&&!target&&l6_ownTurnOnce(self,"sera6"))activateC(self)}}; // 世良真純 B01066
DEF["0060"]={ // アンドレ・キャメル B01070
  onOppAction:async(q,self,actor,target)=>{if(target===self){self.apC+=1000;log(`　${C(self).nm} はこのコンタクト中AP＋1000`,"n")}},
  abilities:[{label:"スリープ: キャラにブレットを与える",can:(p,x)=>x.st==="a",aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"ブレットを与えるキャラ",y=>!isOpp(p,y),{ai:ownPick(p)});if(t)giveKw(t,"ブレット");return true}}],hirameki:l6_hiDraw};
DEF["0229"]={ // メアリー B02066
  enter:async p=>{drawN(p,1);await discard(p,1)},
  leaveOppTurn:async p=>{await enterFromRmSt(p,y=>exactName("メアリー")(y)&&lvOf(y)<=5,"スリープ状態で登場させる［メアリー］（レベル5以下）")}};
DEF["0329"]={apAura:l6_auraOwnTurn(y=>hasColor(y,"赤")),hirameki:l6_hiDraw}; // ジェイムズ・ブラック B03075
DEF["0571"]={kwSelf:()=>["アクティブ指定"],hirameki:hiSleep}; // アンドレ・キャメル B05071
DEF["0574"]={ // 小倉功雅 B05074
  abilities:[{label:"スリープ: キャラをAP＋1000",can:(p,x)=>x.st==="a",aiCan:p=>myTurn(p),run:async(p,x)=>{sleepCost(x);await ownAp(p,1000);return true}},
    {label:"スリープ・［大橋彩代］を1枚スリープ: キャラをLP＋1かAP＋3000",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&y.st==="a"&&exactName("大橋彩代")(y)),aiCan:p=>myTurn(p),
      run:async(p,x)=>{sleepCost(x);const a=p.field.find(y=>y!==x&&y.st==="a"&&exactName("大橋彩代")(y));if(a)sleepC(a);
        const t=await chooseChar(p,"LP＋1かAP＋3000するキャラ",()=>true,{ai:ownPick(p)});if(!t)return true;const m=await pickMode(p,"小倉功雅",["LP＋1","AP＋3000"],1);if(m===0){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}else apTurn(t,3000);return true}}]};
DEF["0579"]={noOppHirameki:true,hirameki:async o=>{const q=opp(o);const xs=await pickCards(o,"表向きにする相手の裏向きの証拠","",q.ev.filter(e=>!e.up),{max:2,ai:c=>c});for(const e of xs)flipUp(q,e)}}; // 世良真純 B05079
DEF["0699"]={enter:async(p,x)=>{if(x.byFxT===G.turnNo&&x.viaAb){apTurn(x,1000);giveKw(x,"突撃")}}}; // アンドレ・キャメル B06079
DEF["0804"]={leaveOppTurn:async p=>{await playFromHandSt(p,y=>["シェリー","宮野志保","宮野明美","降谷零"].some(n=>exactName(n)(y))&&lvOf(y)<=5,"スリープ状態で登場させるレベル5以下のキャラ","s")}}; // 宮野エレーナ B07075
DEF["0887"]={ // ジョディ・スターリング B08049
  onAction:async(p,self,actor,target)=>{if(target&&p.field.includes(actor))actor.actCT=G.turnNo},
  endTurn:async(p,self)=>{if(p.field.includes(self)&&p.field.filter(y=>hasTrait(y,"FBI")).length>=4)drawN(p,1)},
  abilities:[{label:"スリープ: このターンアクション［キャラ］した［FBI］をアクティブ",turn1:true,can:(p,x)=>x.st==="a"&&p.field.some(y=>y.actCT===G.turnNo&&hasTrait(y,"FBI")&&y.st!=="a"),aiCan:p=>myTurn(p),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"アクティブにする［FBI］",y=>!isOpp(p,y)&&y.actCT===G.turnNo&&hasTrait(y,"FBI"),{ai:ownPick(p)});if(t)activateC(t);return true}}]};
DEF["0897"]={ // 諸星大 B08059
  lvSelf:(p,x)=>myTurn(p)&&p.field.filter(y=>(C(y).lv||0)===7).length>=2?1:0,apSelf:p=>myTurn(p)&&p.field.filter(y=>(C(y).lv||0)===7).length>=2?1000:0,
  kwSelf:p=>myTurn(p)&&p.field.filter(y=>(C(y).lv||0)===7).length>=2?["突撃"]:[]};
DEF["1006"]={kwSelf:p=>l6_recentRefreshed(p)?["突撃［キャラ］"]:[],enter:async p=>{if(partnerIs(p,"赤")&&!l6_recentRefreshed(p))l6_millOpp(p,4)}}; // 本堂瑛海 B09064
DEF["1008"]={ // メアリー B09066
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&hasTrait(y,"赤井家")))await sleepOne(p)},
  endTurn:async(p,self)=>{if(partnerIs(p,"赤")&&self.st==="s"&&p.field.includes(self)){drawN(p,1);await discard(p,1)}}};
DEF["1116"]={kwSelf:p=>l6_recentRefreshed(p)?["突撃［キャラ］"]:[],enter:async p=>{if(partnerIs(p,"赤")&&p.field.some(l6_hasBlackY)){l6_millOpp(p,2);await sleepOne(p)}}}; // ジェイムズ・ブラック B10057
function l6_hasBlackY(y){return hasColor(y,"黒")}
DEF["0136"]={onAction:async(p,self,actor,target)=>{if(!target&&p.field.includes(actor))giveKw(self,"突撃")},hirameki:l6_hiDraw}; // 世良真純 D04005
DEF["0487"]={ // 宮野厚司 PR100
  cutin:async p=>{if(!p.solved||p.file.length<4)return;const y=fileTopCard(p);if(!y||!await yes(p,"宮野厚司","FILEエリアの上から1枚を手札に加えて、［シェリー］［宮野志保］［宮野明美］を登場させますか？",true))return;
    p.file.splice(p.file.indexOf(y),1);p.hand.push(y);noteFileHand(p);log(`　FILEの ${C(y).nm} を手札に`,"n");await enterFromRm(p,z=>["シェリー","宮野志保","宮野明美"].some(n=>exactName(n)(z))&&lvOf(z)<=5,"登場させるレベル5以下のキャラ")},hirameki:l6_hiDraw};

// ================= 黄 =================
DEF["0072"]={ // 降谷零 B01084
  endTurn:async(p,self)=>{if(!p.field.includes(self))return;const xs=investigate(p,1);if(!xs.some(y=>(C(y).lv||0)>=5))return;
    const t=await chooseChar(p,"アクティブにするキャラ（レベル6以下）",y=>y!==self&&!isOpp(p,y)&&lvOf(y)<=6,{ai:ownPick(p)});if(t)activateC(t)}};
DEF["0075"]={ // 風見裕也 B01087
  abilities:[{label:"LP＋1かAP＋2000（絆降谷零）",turn1:true,can:(p,x)=>bondFor(p,x,"降谷零"),aiCan:p=>myTurn(p),
    run:async(p,x)=>{const m=await pickMode(p,"風見裕也",["LP＋1","AP＋2000"],1);if(m===0){x.lpT+=1;log(`　${C(x).nm} をターン終了時までLP＋1`,"n")}else apTurn(x,2000);return true}}],hirameki:l6_hiDraw};
DEF["0076"]={ // 黒田兵衛 B01088
  abilities:[{label:"スリープ・手札を1枚リムーブ: 他のレベル8以下の【黄】に突撃［キャラ］",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.length>0,aiCan:p=>myTurn(p)&&p.hand.length>3,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const t=await chooseChar(p,"突撃［キャラ］を与えるキャラ",y=>y!==x&&!isOpp(p,y)&&hasColor(y,"黄")&&lvOf(y)<=8,{ai:ownPick(p)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0079"]={apSelf:(p,x)=>myTurn(p)&&bondFor(p,x,"佐藤美和子")?3000:0,hirameki:hiSleep}; // 高木渉 B01091
DEF["0080"]={rescue:(p,self,x)=>lvOf(x)>=lvOf(self),hirameki:l6_hiDraw}; // 松田陣平 B01092
DEF["0235"]={enter:l6_rushIfAlly(keisatsu5)}; // 白鳥任三郎 B02074
DEF["0237"]={ // 大和敢助 B02076
  enter:async p=>{const [y]=await pickCards(p,"デッキの下に移す［長野県警］","",p.rm.filter(z=>isChar(z)&&hasTrait(z,"長野県警")),{max:1,ai:c=>c.slice(0,1)});if(!y)return;p.rm.splice(p.rm.indexOf(y),1);p.deck.push(y);log(`　${C(y).nm} をデッキの下に移した`,"n");drawN(p,1)},hirameki:hiSleep};
DEF["0240"]={onContact:async(p,self,ct)=>{if(!myTurn(p)||!keisatsu5(ct.a)||!p.field.includes(ct.a)||!l6_ownTurnOnce(self,"chiba6"))return;drawN(p,1);await discard(p,1)},hirameki:l6_hiDraw}; // 千葉和伸 B02079
DEF["0339"]={enter:async p=>{await lookToRm(p,3,y=>isChar(y)&&hasTrait(y,"警察"),"手札に加える［警察］のキャラ")}}; // 伊達航 B03086
DEF["0340"]={enter:async(p,x)=>{if(partnerIs(p,"黄")&&opp(p).field.length>=3)giveKw(x,"突撃［キャラ］")}}; // 萩原研二 B03087
DEF["0346"]={protectAlly:(q,self,y)=>!!G.evtBy&&G.evtBy!==q&&y.st==="s"&&hasTrait(y,"警察")}; // 西村京兵 B03093
DEF["0348"]={onOppAction:async(q,self)=>{if(self.st!=="s"||!l6_ownTurnOnce(self,"matsu6"))return;const t=await chooseChar(q,"アクティブにする［警察］",y=>!isOpp(q,y)&&hasTrait(y,"警察"),{ai:ownPick(q)});if(t)activateC(t)}}; // 松本清長 B03095
DEF["0351"]={enter:async(p,x)=>{if(x.st==="s")activateC(x)},hirameki:l6_hiActivate}; // 諸伏高明 B03098
DEF["0457"]={ // 風見裕也 B04071
  enter:async p=>{if(p.field.filter(y=>hasTrait(y,"警察")).length<3)return;const t=await chooseChar(p,"スタンさせるスリープ状態のキャラ",y=>y.st==="s",{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t)stunC(t)},
  hirameki:l6_hiToHand(exactName("降谷零"),"手札に加える［降谷零］")};
DEF["0458"]={ // 白鳥任三郎 B04072
  untargetAlly:(q,self,y)=>self.st==="s"&&lvOf(y)<=5&&(hasColor(y,"青")||hasColor(y,"黄")),
  abilities:[{label:"スリープ: キャラをAP＋2000",can:(p,x)=>x.st==="a",aiCan:p=>myTurn(p),run:async(p,x)=>{sleepCost(x);await ownAp(p,2000);return true}}]};
DEF["0587"]={enter:async(p,x)=>{if(p.solved)giveKw(x,"突撃［キャラ］");else drawN(p,1)}}; // 上原由衣 B05089
DEF["0588"]={ // 安室透 B05090
  enter:async p=>{const y=await playFromHandSt(p,z=>hasColor(z,"黄")&&lvOf(z)<=4,"スリープ状態で登場させるレベル4以下の【黄】","s");if(!y)return;if(hasTrait(y,"警察"))drawN(p,1);if(hasTrait(y,"喫茶ポアロ"))activateC(y)},
  cutin:async p=>{if(partnerIs(p,"黄")&&p.solved)drawN(p,1)}};
DEF["0595"]={ // 鮫崎島治 B05097
  noRefEv:true,
  abilities:[{label:"デッキの上から5枚までリムーブ",turn1:true,can:p=>p.deck.length>0,aiCan:p=>p.deck.length>14&&myTurn(p),
    run:async p=>{const n=Math.min(p.deck.length-1,+(await pickMode(p,"何枚リムーブする？",["1枚","2枚","3枚","4枚","5枚"],p.deck.length>25?4:1))+1);if(n>0)millSelf(p,n);return true}}],hirameki:hiSleep};
DEF["0811"]={ // 三池苗子 B07083
  enter:async p=>{if(!p.solved)drawN(p,1)},
  abilities:[{label:"デッキの下に移す: ［警視庁］に突撃［キャラ］",can:p=>p.field.some(y=>hasTrait(y,"警視庁")),aiCan:p=>myTurn(p),
    run:async(p,x)=>{toDeckBottom(x);const t=await chooseChar(p,"突撃［キャラ］を与える［警視庁］",y=>!isOpp(p,y)&&hasTrait(y,"警視庁"),{ai:ownPick(p)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0816"]={ // 山村ミサオ B07088
  endTurn:async(p,self)=>{if(p.field.some(exactName("諸伏景光")))activateC(self)},
  abilities:[{label:"スリープ・手札を1枚リムーブ: リムーブエリアの［警察］を手札に",can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警察")),aiCan:p=>p.hand.length>3,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"警察"),"手札に加える［警察］");return true}}]};
DEF["1021"]={ // 知苑大哉 B09081
  enter:async p=>{if(!p.hand.length||!p.rm.some(exactName("知苑禄江")))return;if(!await yes(p,"知苑大哉","手札を1枚リムーブして、［知苑禄江］を登場させますか？",true))return;await discard(p,1);await enterFromRm(p,exactName("知苑禄江"),"登場させる［知苑禄江］")},
  hirameki:async o=>{if(!G.actor||!allChars().includes(G.actor)||!o.hand.length||!await yes(o,"知苑大哉","手札を1枚リムーブして、アクション中のキャラをスタンさせますか？",true))return;await discard(o,1);stunC(G.actor)}};
DEF["1022"]={ // 知苑禄江 B09082
  abilities:[{label:"スリープ・［知苑大哉］を1枚スリープ: レベル8以下のキャラをスタン",can:(p,x)=>x.st==="a"&&p.field.some(y=>y.st==="a"&&exactName("知苑大哉")(y)),aiCan:p=>opp(p).field.some(y=>lvOf(y)<=8),
    run:async(p,x)=>{sleepCost(x);const a=p.field.find(y=>y.st==="a"&&exactName("知苑大哉")(y));if(a)sleepC(a);const t=await chooseChar(p,"スタンさせるキャラ（レベル8以下）",lvLe(8));if(t)stunC(t);return true}}]};
DEF["1025"]={enter:async p=>{const t=await chooseChar(p,"突撃を与える【白】の［警察］（レベル7以上）",y=>!isOpp(p,y)&&hasColor(y,"白")&&hasTrait(y,"警察")&&lvOf(y)>=7,{ai:ownPick(p)});if(t)giveKw(t,"突撃")}}; // 目暮十三 B09085
DEF["0150"]={apAura:l6_auraOwnTurn(y=>hasColor(y,"黄")),hirameki:l6_hiDraw}; // 黒田兵衛 D05005
DEF["0151"]={enter:async p=>{if(!p.hand.length||!p.rm.some(y=>isChar(y)&&hasColor(y,"黄")&&lvOf(y)<=4))return;if(!await yes(p,"目暮十三","手札を1枚リムーブして、リムーブエリアのレベル4以下の【黄】を登場させますか？",true))return;await discard(p,1);await enterFromRmSt(p,y=>hasColor(y,"黄")&&lvOf(y)<=4,"スリープ状態で登場させる【黄】（レベル4以下）")}}; // 目暮十三 D05006
DEF["0503"]={ // 降谷零 D09010
  onAllyContactWin:async(p,self,w,v)=>{if(!hasTrait(w,"警察")||turnCount(self,"furu6")||!p.hand.length)return;if(!await yes(p,"降谷零","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=3))return;useTurn(self,"furu6");await discard(p,1);gainEv(p,1)},hirameki:hiSleep};
DEF["0488"]={ // 萩原研二 SP012
  enter:async p=>{if(!p.solved)return;const names=["降谷零","諸伏景光","伊達航","萩原研二","松田陣平"];const cs=p.field.filter(y=>y.st==="a"&&names.some(n=>exactName(n)(y)));if(!cs.length)return;
    if(!await yes(p,"萩原研二","［降谷零］などを1枚スリープさせて、スリープ状態のレベル6以下のキャラをリムーブしますか？",true))return;
    const [s]=await pickCards(p,"スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!s)return;sleepC(s);await rmChar(p,y=>y.st==="s"&&lvOf(y)<=6,"リムーブするスリープ状態のキャラ（レベル6以下）")}};
DEF["1162"]={ // 降谷零 PR309
  leaveOppTurn:async p=>{const y=p.deck[0];if(!y)return;log(`　デッキの上: ${C(y).nm} を見た`,"n");if(await yes(p,"降谷零",`${C(y).nm} をリムーブエリアに移しますか？`,()=>true)){p.deck.shift();p.rm.push(y);checkDeck(p)}},
  hirameki:async o=>{await hiStunActor(o)}};

// ================= 黒 =================
DEF["0363"]={ // スコッチ B03114
  abilities:[{label:"このキャラをリムーブ: レベル7以下のキャラをリムーブ（パートナー黒）",can:p=>partnerIs(p,"黒"),aiCan:p=>opp(p).field.some(y=>lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{removeCard(x,"効果",{by:p});await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");return true}}]};
DEF["0373"]={endTurn:async(p,self)=>{if(self.st!=="a"&&p.field.includes(self))removeCard(self,"効果",{by:p})}}; // テキーラ B03124
DEF["0376"]={abilities:[{label:"キャラをAP－2000",turn1:true,can:()=>true,aiCan:p=>myTurn(p),run:async p=>{const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000);return true}}],hirameki:hiSleep}; // ピスコ B03127
DEF["0378"]={disguise:async p=>{drawN(p,1)}}; // ベルモット B03129
DEF["0605"]={ // キール B05109
  enter:async p=>{if(!partnerIs(p,"黒")||!p.solved||!p.hand.length)return;if(!await yes(p,"キール","手札を1枚リムーブして、レベル6以下のキャラをリムーブしますか？",true))return;await discard(p,1);await rmChar(p,lvLe(6),"リムーブするキャラ（レベル6以下）")},hirameki:l6_hiDraw};
DEF["0607"]={leaveOppTurn:async p=>{await enterFromRm(p,y=>exactName("ウォッカ")(y)&&lvOf(y)<=5,"登場させる［ウォッカ］（レベル5以下）")},hirameki:async o=>{if(o.solved)await hiStunActor(o)}}; // ゾンビ B05111
DEF["0608"]={abilities:[{label:"スリープ: 手札から【カットイン】を持つレベル5以下の【黒】を登場",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&hasColor(y,"黒")&&!!C(y).ci&&lvOf(y)<=5),aiCan:()=>true,
  run:async(p,x)=>{sleepCost(x);await playFromHandSt(p,y=>hasColor(y,"黒")&&!!C(y).ci&&lvOf(y)<=5,"登場させる【カットイン】を持つ【黒】（レベル5以下）","a");return true}}]}; // バーボン B05112
DEF["0612"]={forceByEvt:true,leaveOppTurn:async p=>{await enterFromRmSt(p,y=>hasColor(y,"黒")&&lvOf(y)<=4,"スリープ状態で登場させる【黒】（レベル4以下）")}}; // 火傷の男 B05116
DEF["0827"]={ // コルン B07100
  enter:async p=>{if(!partnerIs(p,"黒"))return;const o=opp(p);log(`　${o.name} は手札を公開`,"n");
    const [y]=await pickCards(p,"リムーブさせる【カットイン】を持つカード（レベル8以下）","",o.hand.filter(z=>!!C(z).ci&&(C(z).lv||0)<=8),{max:1,ai:c=>c.slice(0,1)});if(!y)return;
    o.hand.splice(o.hand.indexOf(y),1);o.rm.push(y);log(`　${o.name} は ${C(y).nm} をリムーブ`,"n");if(o.hand.length<=4)drawN(o,1)}};
DEF["0917"]={ // 広田雅美 B08081
  enter:async p=>{if(!p.solved||!p.hand.length||!opp(p).field.some(y=>lvOf(y)<=8&&!immune(p,y)))return;if(!await yes(p,"広田雅美","手札を1枚リムーブして、相手のレベル8以下のキャラを手札に移しますか？",true))return;await discard(p,1);
    const t=await chooseChar(p,"手札に移すキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8);if(t)toHandFromField(t)},
  onOppChoose:async(q,self,y,p)=>{if(q.field.every(z=>!l6_nonBlack(z))||turnCount(self,"hiro6"))return false;useTurn(self,"hiro6");
    if(p.hand.length&&await yes(p,"広田雅美の効果",`手札を1枚リムーブしないと、${C(y).nm} を選んだ効果は無効になります。リムーブしますか？`,()=>p.hand.length>=2)){await discard(p,1);return false}log(`　${C(self).nm}: 効果は無効になった`,"n");return true}};
DEF["0926"]={enter:async(p,x)=>{if(p.field.some(l6_nonBlack))giveKw(x,"突撃")}}; // ベルモット B08090
DEF["1032"]={apSelf:p=>myTurn(p)&&l6_recentRefreshed(p)?2000:0,enter:async(p,x)=>{if(p.field.some(y=>hasColor(y,"赤")))apTurn(x,1000)}}; // ウォッカ B09093
DEF["1043"]={ // ラム B09104
  enter:async(p,x)=>{const t=await chooseChar(p,"突撃を与える【現場リムーブ時】を持つキャラ",y=>y!==x&&!isOpp(p,y)&&/【現場リムーブ時】/.test(C(y).f||""),{ai:ownPick(p)});if(t)giveKw(t,"突撃")},
  leaveOppTurn:async p=>{if(p.cpu?opp(p).deck.length>8:await yes(p,"ラム","相手のデッキの上から4枚をリムーブしますか？",true))l6_millOpp(p,4)}};
DEF["0392"]={apAura:l6_auraOwnTurn(y=>hasColor(y,"黒")),hirameki:l6_hiDraw}; // ラム D07010

// ================= 青 =================
DEF["0182"]={abilities:[{label:"【青】以外の色を持つキャラをAP＋2000",turn1:true,can:()=>allChars().some(l6_nonBlue),aiCan:p=>myTurn(p)&&p.field.some(y=>l6_nonBlue(y)&&y.st==="a"),
  run:async p=>{const t=await chooseChar(p,"AP＋2000する【青】以外の色を持つキャラ",l6_nonBlue,{ai:ownPick(p)});if(t)apTurn(t,2000);return true}}],hirameki:l6_hiDraw}; // 灰原哀 B02010
DEF["0266"]={onAllySleep:async(p,self,x)=>{if(!myTurn(p)||!hasTrait(x,"少年探偵団")||!l6_ownTurnOnce(self,"agasa6"))return;drawN(p,1);await discard(p,1)},hirameki:l6_hiDraw}; // 阿笠博士 B03008
DEF["0413"]={ // 灰原哀 B04008
  abilities:[{label:"スリープ・手札の［少年探偵団］を2枚リムーブ: レベル7以下のキャラをリムーブ（解決編）",can:(p,x)=>p.solved&&x.st==="a"&&p.hand.filter(y=>isChar(y)&&hasTrait(y,"少年探偵団")).length>=2,aiCan:p=>opp(p).field.some(y=>lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);await discard(p,2,"リムーブする［少年探偵団］のキャラ",p,y=>isChar(y)&&hasTrait(y,"少年探偵団"));await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");return true}}],hirameki:l6_hiDraw};
DEF["0521"]={onOppMisread:async(q,self)=>{apTurn(self,3000)},hirameki:async o=>{await enterFromRmSt(o,y=>exactName("小嶋元太")(y)&&lvOf(y)<=6,"登場させる［小嶋元太］（レベル6以下）","a")}}; // 小嶋元次 B05015
DEF["0522"]={enter:async p=>{await lookToRm(p,3,y=>isChar(y)&&hasTrait(y,"少年探偵団"),"手札に加える［少年探偵団］のキャラ")}}; // 小嶋元太 B05016
DEF["0523"]={enter:async p=>{digToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"青"))}}; // 円谷朝美 B05017
DEF["0744"]={ // 本堂瑛祐 B07012
  enter:async p=>{if(!p.solved||!p.field.some(l6_nonBlue))return;const t=await chooseChar(p,"デッキの下に移すキャラ（レベル4以下）",y=>isOpp(p,y)&&lvOf(y)<=4);if(t)toDeckBottom(t)},
  hirameki:l6_hiToHand(y=>isChar(y)&&hasTrait(y,"高校生")&&l6_nonBlue(y),"手札に加える【青】以外の［高校生］")};
DEF["0849"]={ // 吉田歩美 B08008
  enter:async p=>{const bl=p.field.filter(y=>hasColor(y,"青"));if(!bl.length)return;const [s]=await pickCards(p,"重ねる［少年探偵団］","",p.rm.filter(y=>isChar(y)&&hasTrait(y,"少年探偵団")),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(!s)return;
    const [t]=await pickCards(p,"下に重ねる先の【青】のキャラ","",bl,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});if(!t)return;p.rm.splice(p.rm.indexOf(s),1);stackUnder(t,[s]);giveKw(t,"アクティブ指定")},hirameki:hiSleep};
DEF["0850"]={ // 小林澄子 B08009
  abilities:[{label:"スリープ・デッキの上から2枚リムーブ: 手札からレベル4以下の［少年探偵団］を登場",turn1:true,can:(p,x)=>x.st==="a"&&p.deck.length>=2&&p.hand.some(y=>isChar(y)&&hasTrait(y,"少年探偵団")&&lvOf(y)<=4),aiCan:p=>p.deck.length>10,
    run:async(p,x)=>{sleepCost(x);millSelf(p,2);await playFromHandSt(p,y=>hasTrait(y,"少年探偵団")&&lvOf(y)<=4,"登場させる［少年探偵団］（レベル4以下）","a");return true}}],
  hirameki:l6_hiToHand(y=>isChar(y)&&hasTrait(y,"少年探偵団"),"手札に加える［少年探偵団］")};
DEF["0953"]={ // 赤木英雄 B09008
  kwSelf:(p,x)=>apOf(x)>=6000?["突撃"]:[],
  enter:async p=>{if(!p.hand.length||!setCardsAll().length)return;if(!await yes(p,"赤木英雄","手札を1枚リムーブして、セットされているカードを1枚リムーブしますか？",true))return;await discard(p,1);await removeAnySet(p,"リムーブするセットされたカード")}};
DEF["1076"]={ // 妃英理 B10014
  traitAura:(p,self,x,t)=>x===self&&t==="毛利探偵事務所",
  lpSelf:p=>new Set(p.field.filter(y=>hasTrait(y,"毛利探偵事務所")).map(nameOf)).size>=4?1:0,
  hirameki:l6_hiToHand(y=>isChar(y)&&hasTrait(y,"毛利探偵事務所"),"手札に加える［毛利探偵事務所］")};
DEF["0097"]={enter:async p=>{if(p.hand.some(y=>isChar(y)&&hasTrait(y,"少年探偵団")&&lvOf(y)<=4)&&await yes(p,"阿笠博士","手札から［少年探偵団］をスリープ状態で登場させますか？",true)){if(await playFromHandSt(p,y=>hasTrait(y,"少年探偵団")&&lvOf(y)<=4,"スリープ状態で登場させる［少年探偵団］（レベル4以下）","s"))return}
  await ownAp(p,1000,"AP＋1000するキャラ")}}; // 阿笠博士 D01008
DEF["0493"]={enter:l6_rushIfAlly(y=>hasTrait(y,"少年探偵団"))}; // 円谷光彦 D08011
