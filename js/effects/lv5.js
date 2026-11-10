"use strict";
// カード個別効果（レベル5、2026-11-10）。SeEdの方針: 残りはレベル5→7→4→6 の順に進める（レベル5は効果の簡単なものが多い）。
// 追加した仕組み（engine.js・hooks.js・state.js・core.js 側）:
//  - mainStart(p,self): 自分のメインフェイズ開始時（engine.js beginTurn → FX.mainStart）
//  - reasonNoEv(p,self,x,lp): 自分のキャラが推理したとき。真を返すとこの推理では証拠を得ない（FX.reasonNoEv）
//  - onAllyGuard(p,self,guard,target): 自分のキャラがガードしたとき（target=指定されていたキャラ、事件なら null）
//  - onAnyDisguise(q,self,x): このキャラ以外のキャラが【変装】したとき（両者）
//  - onOppEvRemoved(p,self): アクション［事件］で相手の証拠がリムーブされたとき（mech.js onEvRemoved）
//  - onDiscardedByOpp(p,x): 相手ターンに相手の効果で手札からリムーブされたとき（core.js discard）
//  - G.noEvGain: ヒラメキで「相手はこのアクションによって証拠を得られない」
//  - DEF の setsToHand（相手の能力・効果・コンタクトで離れるとき、裏向きのセットを手札へ。engine.js dropSets）・noReason（推理できない）
//  - キーワード「突撃［レベル4以下のキャラ］」（canAct の第4引数 target）、removeCard の info.why（"コンタクト" など）
//  - FX.ignoreCaseColor の第3引数 viaHint（ネクストヒントのときだけ事件の色を無視: キール B02087）

// --- 部品 ---
const hiSleep=async o=>{await sleepOne(o,"ヒラメキ: スリープさせるキャラ")};
const hiOppDiscard=async o=>{await discard(opp(o),1)};
const enterFromRmSt=async(p,f,title,st="s")=>{const [y]=await pickCards(p,title,"",p.rm.filter(y=>isChar(y)&&f(y)),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(y)await enterByEffect(p,y,st);return y};
const flipDown=async(p,n,title="裏向きにする表向きの証拠")=>{const ups=p.ev.filter(e=>e.up);if(!ups.length)return;
  const xs=await pickCards(p,title,"",ups,{max:n,ai:c=>c.slice(0,n)});for(const e of xs)e.up=false;if(xs.length)log(`　${p.name} は表向きの証拠を${xs.length}つ裏向きにした`,"n")};
const ownAp=(p,v,title="AP＋するキャラ")=>chooseChar(p,title,()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)}).then(t=>{if(t)apTurn(t,v);return t});
const keisatsu5=y=>isChar(y)&&hasTrait(y,"警察");
// デッキの上からn枚見て、条件に合うキャラを max 枚まで指定の状態で登場させ、残りを好きな順番でデッキの下に
async function lookEnterOrder(p,n,f,title,st="a"){const xs=p.deck.splice(0,n);if(!xs.length)return null;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const [hit]=await pickCards(p,title,"",xs.filter(y=>isChar(y)&&f(y)),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  let rest=xs.filter(y=>y!==hit);if(!p.cpu&&rest.length>1&&typeof orderCards==="function")rest=await orderCards(`${p.name}: 残りを好きな順番でデッキの下へ`,rest);
  p.deck.push(...rest);checkDeck(p);if(hit)await enterByEffect(p,hit,st);return hit}

// ================= 青 =================
DEF["0014"]={leaveOppTurn:async p=>{digToHand(p,exactName("江戸川コナン"))}}; // 宮野志保 B01018
DEF["0178"]={ // 仮面ヤイバー B02006（カットインは state.js ownCutinAp）
  hirameki:async o=>{if(o.field.some(y=>hasTrait(y,"少年探偵団")))drawN(o,2)}};
DEF["0180"]={ // 阿笠博士 B02008
  onAllyEnter:async(p,self,y)=>{if(!hasTrait(y,"少年探偵団")||turnCount(self,"agasa"))return;useTurn(self,"agasa");
    const t=await chooseChar(p,"AP－1000するキャラ");if(t)apTurn(t,-1000)},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"少年探偵団"),"手札に加える［少年探偵団］")}};
DEF["0268"]={ // 小嶋元太 B03010
  abilities:[{label:"スリープ: レベル6以下のキャラをスリープ",can:(p,x)=>x.st==="a",aiCan:p=>opp(p).field.some(y=>y.st==="a"&&lvOf(y)>=4&&lvOf(y)<=6),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"スリープさせるキャラ（レベル6以下）",y=>y.st==="a"&&lvOf(y)<=6);if(t)sleepC(t);return true}}]};
DEF["0272"]={ // 塚本数美 B03014
  endTurn:async(p,self)=>{if(!p.field.includes(self))return;toHandFromField(self);await discard(p,1)}};
DEF["0276"]={ // 比護隆佑 B03018
  leaveOppTurn:async p=>{const xs=p.deck.splice(0,5);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [e]=await pickCards(p,"手札に加えるイベント","",xs.filter(y=>C(y).t==="イベント"),{max:1,ai:c=>c.slice(0,1)});
    const rest=xs.filter(y=>y!==e);shuffle(rest);p.deck.push(...rest);if(e){p.hand.push(e);log(`　${C(e).nm} を公開して手札に`,"n")}checkDeck(p)},
  hirameki:hiSleep};
DEF["0277"]={leaveOppTurn:async p=>{digToHand(p,exactName("阿笠博士"))}}; // フサエ・キャンベル B03019
DEF["0412"]={ // 小林澄子 B04007
  leaveOppTurn:async p=>{await enterFromRmSt(p,y=>exactName("白鳥任三郎")(y)&&lvOf(y)<=6,"スリープ状態で登場させる［白鳥任三郎］")},hirameki:hiSleep};
DEF["0519"]={ // 灰原哀 B05013
  enter:async p=>{await flipDown(p,2)},hirameki:async o=>{await flipDown(o,1)}};
DEF["0527"]={leaveOppTurn:async p=>{digToHand(p,exactName("毛利小五郎"))}}; // 森達夫 B05021
DEF["0633"]={ // 仮面ヤイバー B06008
  enter:async(p,x)=>{if(p.rm.some(y=>isChar(y)&&hasTrait(y,"少年探偵団")))giveKw(x,"突撃")},
  actionEnd:async(p,self)=>{const cs=p.field.filter(y=>y!==self&&!exactName("仮面ヤイバー")(y));if(!cs.length)return;
    const [t]=await pickCards(p,"このキャラを下に重ねるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});
    if(!t)return;dropSets(p,self);resetMods(self);stackUnder(t,[self]);drawN(p,1)}};
DEF["0853"]={ // 比護隆佑 B08012
  onCaseGain:async(p,self,actor)=>{if(actor===self)drawN(p,1)}};
DEF["0856"]={ // 若狭留美 B08015
  endTurn:async(p,self)=>{if(self.st!=="a"&&p.field.some(exactName("灰原哀")))activateC(self)},
  abilities:[{label:"スリープ: 1枚引いて手札を1枚リムーブ",can:(p,x)=>x.st==="a",aiCan:(p,x)=>p.field.some(exactName("灰原哀"))||!myTurn(p),
    run:async(p,x)=>{sleepCost(x);drawN(p,1);await discard(p,1);return true}}]};
DEF["0960"]={ // 円谷朝美 B09015
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>isChar(y)&&(exactName("円谷光彦")(y)||(C(y).lv||0)===4&&hasTrait(y,"少年探偵団")),"手札に加える［円谷光彦］かレベル4の［少年探偵団］")}};
DEF["0497"]={ // 阿笠博士 D08019
  enter:async p=>{if(p.solved&&p.field.some(y=>hasTrait(y,"少年探偵団")))await sleepOne(p)},hirameki:hiSleep};
DEF["0259"]={ // 灰原哀 PR054
  enter:async p=>{drawN(p,1)},leaveOppTurn:async p=>{await discard(p,1)}};
DEF["0620"]={ // 灰原哀 PR135
  enter:async p=>{if(!p.field.some(y=>exactName("阿笠博士")(y)&&lvOf(y)>=6))return;
    const t=await chooseChar(p,"手札に移す相手のキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8);if(t)toHandFromField(t)},
  leaveOppTurn:async p=>{digToHand(p,exactName("阿笠博士"))}};

// ================= 赤 =================
DEF["0055"]={ // 沖矢昴 B01065
  leaveOppTurn:async p=>{if(!oppHas(p,lvLe(5)))return;const o=opp(p);
    if(!await yes(p,"沖矢昴","相手に証拠を1つ与えて、レベル5以下のキャラをリムーブしますか？",()=>o.ev.length+1<o.level-1&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=5)))return;
    gainEv(o,1);await rmChar(p,lvLe(5))},hirameki:hiSleep};
DEF["0057"]={ // メアリー B01067
  onCaseGain:async(p,self,actor)=>{if(actor!==self)return;const t=await chooseChar(p,"手札に移す相手のキャラ（レベル5以下）",y=>isOpp(p,y)&&lvOf(y)<=5);if(t)toHandFromField(t)}};
DEF["0224"]={ // 世良真純 B02061
  enter:async(p,x)=>{const o=opp(p);const cs=p.field.filter(y=>y!==x&&hasColor(y,"赤"));if(!cs.length)return;
    if(!await yes(p,"世良真純","相手に証拠を1つ与えて、【赤】のキャラに突撃［事件］を与えますか？",()=>o.ev.length+1<o.level-1&&p.ev.length+1>=p.level&&cs.some(y=>y.st==="a"&&y.fresh)))return;
    gainEv(o,1);const t=await chooseChar(p,"突撃［事件］を与える【赤】のキャラ",mine1(p,y=>y!==x&&hasColor(y,"赤")),{ai:c=>c.filter(y=>y.fresh&&y.st==="a").slice(0,1)});if(t)giveKw(t,"突撃［事件］")}};
DEF["0225"]={ // 世良真純 B02062
  onOppEvRemoved:async(p,self)=>{if(!myTurn(p)||turnCount(self,"sera"))return;useTurn(self,"sera");drawN(p,1)}};
DEF["0327"]={ // イーサン・本堂 B03073
  actionEnd:async(p,self)=>{removeCard(self,"効果",{by:p,effect:true});await runQueue();await lookEnterOrder(p,4,lvLe(4),"登場させるレベル4以下のキャラ")}};
DEF["0333"]={ // レイチェル・浅香 B03079
  leaveOppTurn:async p=>{await lookTop(p,3,y=>hasColor(y,"赤"),{max:1,title:"手札に加える【赤】のカード"})},hirameki:hiSleep};
DEF["0255"]={ // ジョディ・スターリング B04058
  onCaseGain:async(p,self)=>{if(turnCount(self,"jodie")||self.st!=="a"||!opp(p).hand.length)return;
    if(!await yes(p,"ジョディ・スターリング","このキャラをスリープさせて、相手の手札を1枚リムーブさせますか？",()=>!canAct(self,p,"chara")&&!canAct(self,p,"case")||opp(p).hand.length<=3))return;
    useTurn(self,"jodie");sleepC(self);await discard(opp(p),1)},hirameki:hiOppDiscard};
DEF["0572"]={ // 沖矢昴 B05072
  mainStart:async p=>{if(!p.hand.length||!p.rm.some(anyExact("赤井秀一","ライ")))return;
    if(!await yes(p,"沖矢昴","手札を1枚リムーブして、リムーブエリアの［赤井秀一］か［ライ］を手札に加えますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await pickRmToHand(p,anyExact("赤井秀一","ライ"),"手札に加える［赤井秀一］か［ライ］")}};
DEF["0575"]={ // 勝又力 B05075
  mainStart:async(p,self)=>{const ss=(self.set||[]).filter(s=>!s.under);if(!ss.length)return;
    if(!await yes(p,"勝又力","このキャラにセットされているカードを1枚リムーブして、証拠を1つ得ますか？",true))return;
    const s=ss[0];self.set.splice(self.set.indexOf(s),1);p.rm.push(s.c);noteSetOff(p,self,s.c,!s.up);log(`　${C(self).nm} のセットを1枚リムーブ`,"n");gainEv(p,1)},
  abilities:[{label:"スリープ: デッキの上から1枚をこのキャラに裏向きでセット",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:(p,x)=>!(x.set||[]).length&&p.deck.length>8,
    run:async(p,x)=>{sleepCost(x);setTop(p,x);return true}}]};
DEF["0577"]={ // ジョディ・サンテミリオン B05077
  leaveOppTurn:async p=>{const y=digTop(p,z=>isChar(z)&&exactName("ジョディ・スターリング")(z)&&(C(z).lv||0)<=4);if(y)await enterByEffect(p,y,"a")}};
DEF["0892"]={ // 広田正巳 B08054
  setsToHand:true,
  abilities:[{label:"スリープ: デッキの上から1枚をこのキャラに裏向きでセット",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:(p,x)=>!myTurn(p)||p.deck.length>8&&!canAct(x,p,"chara"),
    run:async(p,x)=>{sleepCost(x);setTop(p,x);return true}}]};
DEF["0141"]={leaveOppTurn:async p=>{await discard(opp(p),1)},hirameki:hiSleep}; // ジョディ・スターリング D04010

// ================= 黄 =================
DEF["0077"]={ // 佐藤美和子 B01089
  onAllyRemoved:async(p,self,info)=>{if(info.turn===p.idx||turnCount(self,"sato5"))return;if(info.x!==self&&!hasColor(info.x,"黄"))return;useTurn(self,"sato5");drawN(p,1)},
  hirameki:hiSleep};
DEF["0341"]={ // 松田陣平 B03088
  abilities:[{label:"レベル7以下をアクティブ・AP＋1000・突撃、1枚引く（［降谷零］［諸伏景光］［伊達航］［萩原研二］がいるとき）",turn1:true,
    can:p=>["降谷零","諸伏景光","伊達航","萩原研二"].every(n=>p.field.some(exactName(n))),aiCan:p=>myTurn(p),
    run:async p=>{const t=await chooseChar(p,"アクティブにするキャラ（レベル7以下）",lvLe(7),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>(a.st==="a")-(b.st==="a")||apOf(b)-apOf(a)).slice(0,1)});
      if(t){activateC(t);apTurn(t,1000);giveKw(t,"突撃")}drawN(p,1);return true}}],
  hirameki:async(o,e)=>{const i=o.ev.indexOf(e);if(i>=0)o.ev.splice(i,1);detach(e);o.hand.push(e);log(`　${C(e).nm} を手札に加えた`,"n")}};
DEF["0345"]={ // 高木渉 B03092
  onAllyRemoved:async(p,self,info)=>{if(info.turn===p.idx||info.x===self||turnCount(self,"taka5")||(C(info.x).lv||0)<6||!hasTrait(info.x,"警察"))return;useTurn(self,"taka5");
    const t=await chooseChar(p,"スタンさせるキャラ（レベル7以下）",lvLe(7));if(t)stunC(t)}};
DEF["0353"]={ // 弓長警部 B03100
  abilities:[{label:"デッキの上から1枚リムーブ: キャラをAP＋1000",turn1:true,can:p=>p.deck.length>0,aiCan:p=>myTurn(p)&&p.deck.length>10&&p.field.some(y=>y.st==="a"),
    run:async p=>{millSelf(p,1);await ownAp(p,1000,"AP＋1000するキャラ");return true}}],hirameki:hiSleep};
DEF["0355"]={ // 横溝重悟 B03102
  onReason:async(p,self,x)=>{if(p.field.includes(x)&&lvOf(x)<=4&&hasTrait(x,"警察"))apTurn(self,1000)},hirameki:hiSleep};
DEF["0459"]={ // 千葉和伸 B04073
  onAllyGuard:async(p,self,guard,target)=>{const v=target&&exactName("三池苗子")(target)?3000:1000;guard.apA=(guard.apA||0)+v;log(`　${C(guard).nm} をアクション終了時までAP＋${v}`,"n")},hirameki:hiSleep};
DEF["0462"]={ // 松田陣平 B04077
  abilities:[{label:"デッキの上から3枚リムーブ: ［警察］があれば自分のキャラに相手のアクティブ状態を指定してアクションできる能力",turn1:true,can:p=>p.solved&&p.deck.length>=3,
    aiCan:p=>myTurn(p)&&p.deck.length>10&&opp(p).field.some(y=>y.st==="a")&&!opp(p).field.some(y=>y.st!=="a")&&p.field.some(y=>y.st==="a"),
    run:async p=>{if(millSelf(p,3).some(keisatsu5)){const t=await chooseChar(p,"能力を与えるキャラ",mine1(p,()=>true),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)giveKw(t,"アクティブ指定")}return true}}],
  hirameki:async o=>{await pickRmToHand(o,exactName("佐藤美和子"),"手札に加える［佐藤美和子］")}};
DEF["0597"]={ // 高木渉 B05099
  leaveOppTurn:async p=>{if(partnerIs(p,"黄"))await enterFromRmSt(p,y=>hasTrait(y,"警察")&&lvOf(y)<=4,"スリープ状態で登場させる［警察］（レベル4以下）")}};
DEF["0814"]={ // 榎本杉人 B07086
  leaveOppTurn:async p=>{if(digToHand(p,exactName("榎本梓")))await discard(p,1)}};
DEF["0815"]={ // 白鳥任三郎 B07087
  abilities:[{label:"［警視庁］を1枚AP＋1000",turn1:true,can:()=>allChars().some(y=>hasTrait(y,"警視庁")),aiCan:p=>myTurn(p)&&p.field.some(y=>hasTrait(y,"警視庁")&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"AP＋1000する［警視庁］",y=>hasTrait(y,"警視庁"),{ai:ownPick(p)});if(t)apTurn(t,1000);return true}}]};
DEF["0906"]={ // 風見裕也 B08069
  abilities:[{label:"このキャラをデッキの下へ: ターン終了時、手札からレベル4以下の［警察］を登場",can:p=>p.hand.some(y=>keisatsu5(y)&&lvOf(y)<=4),aiCan:(p,x)=>myTurn(p)&&x.st!=="a"&&p.field.length<5,
    run:async(p,x)=>{toDeckBottom(x);await runQueue();(p.endQ=p.endQ||[]).push({t:G.turnNo,label:"風見裕也",fn:async()=>{await playFromHand(p,y=>keisatsu5(y)&&lvOf(y)<=4,"登場させる［警察］（レベル4以下）")}});return true}}]};
DEF["1135"]={ // 爆弾犯 B10079（ガードできないは state.js staticKw）
  noReason:true,noActUnless:()=>false,
  endTurn:async(p,self)=>{if(self.st!=="a"||!opp(p).hand.length)return;if(!await yes(p,"爆弾犯","このキャラをスリープさせて、相手の手札を1枚リムーブさせますか？",true))return;sleepC(self);await discard(opp(p),1)}};
DEF["0152"]={ // 松田陣平 D05007
  leaveOppTurn:async p=>{await lookEnterOrder(p,3,y=>hasColor(y,"黄")&&lvOf(y)<=4,"スリープ状態で登場させる【黄】のキャラ（レベル4以下）","s")},hirameki:hiSleep};
DEF["0502"]={ // 上原由衣 D09008
  apSelf:p=>condOk("FILE7",p)&&myTurn(p)?2000:0,onAction:async(p,self,actor)=>{if(actor===self)drawN(p,1)}};
DEF["0505"]={ // 大和敢助 D09014
  enter:async p=>{if(condOk("FILE7",p))await sleepOne(p)},
  abilities:[{label:"スリープ: 相手のレベル5以下のスリープ状態のキャラを手札に移す",can:(p,x)=>partnerIs(p,"黄")&&x.st==="a"&&oppHas(p,y=>y.st==="s"&&lvOf(y)<=5),aiCan:()=>true,
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル5以下のスリープ状態）",y=>isOpp(p,y)&&y.st==="s"&&lvOf(y)<=5);if(t)toHandFromField(t);return true}}]};
DEF["0942"]={ // 目暮十三 D11015
  onAction:async(p,self,actor)=>{if(actor===self)await ownAp(p,1000,"AP＋1000するキャラ")},
  enter:async(p,x)=>{if(opp(p).field.length>=3)giveKw(x,"突撃［キャラ］");if(opp(p).ev.length>=3)giveKw(x,"突撃［事件］")}};
DEF["0482"]={ // 伊達航 PR086
  actionEnd:async(p,self)=>{if(!p.field.includes(self))return;
    if(!await yes(p,"伊達航","このキャラをデッキの下に移して、1枚引き、手札からレベル6以下の［警察］をスリープ状態で登場させますか？",()=>p.hand.some(y=>keisatsu5(y)&&lvOf(y)<=6&&lvOf(y)>=5)))return;
    toDeckBottom(self);await runQueue();drawN(p,1);await playFromHandSt(p,y=>keisatsu5(y)&&lvOf(y)<=6,"スリープ状態で登場させる［警察］（レベル6以下）")},hirameki:hiSleep};
DEF["0626"]={ // 安室透 PR157
  enter:async(p,x)=>{if(!p.solved||!p.field.some(y=>y!==x&&lvOf(y)>=6&&(hasTrait(y,"探偵")||hasTrait(y,"喫茶ポアロ")))||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"安室透","このキャラをスタンさせて、レベル7以下のキャラをリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)))return;stunC(x);await rmChar(p,lvLe(7))}};
DEF["1056"]={ // 風見裕也 PR265
  enter:async p=>{const got=await lookTop(p,1,y=>isChar(y)&&hasTrait(y,"警視庁"),{max:1,title:"手札に加える［警視庁］"});if(got[0])millSelf(p,C(got[0]).lv||0)},
  abilities:[{label:"スリープ・手札を1枚リムーブ: レベル5以下をリムーブ",can:(p,x)=>p.solved&&x.st==="a"&&p.hand.length>0,aiCan:p=>oppHas(p,y=>lvOf(y)>=3&&lvOf(y)<=5)&&p.hand.length>=2,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await rmChar(p,lvLe(5));return true}}]};

// ================= 緑 =================
DEF["0024"]={ // 大岡紅葉 B01030
  onOppRemoved:async(p,self,info)=>{if(info.why!=="コンタクト"||turnCount(self,"momiji"))return;useTurn(self,"momiji");
    await pickRmToHand(p,y=>hasColor(y,"緑")&&!!C(y).ci,"手札に加える【カットイン】を持つ【緑】のカード")}};
DEF["0196"]={ // 綾小路文麿 B02026
  onOppAction:async(p,self)=>{if(turnCount(self,"aya5"))return;useTurn(self,"aya5");drawN(p,1)}};
DEF["0295"]={ // 時津潤哉 B03038
  reasonNoEv:async(p,self,x,lp)=>{if(!myTurn(p)||lp<1||turnCount(self,"toki"))return false;
    if(!await yes(p,"時津潤哉","カードを1枚引きますか？（この推理では証拠を得ません）",()=>p.ev.length+lp>p.level+1))return false;useTurn(self,"toki");drawN(p,1);return true},
  hirameki:hiSleep};
DEF["0424"]={ // 遠山銀司郎 B04023
  enter:async(p,x)=>{if(!condOk("FILE7",p)||!myTurn(p)||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"遠山銀司郎","このキャラをリムーブして、レベル7以下のキャラをリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=7)))return;
    removeCard(x,"効果",{by:p,effect:true});await runQueue();await rmChar(p,lvLe(7))},
  abilities:[{label:"スリープ: デッキの上を公開し、［警察］のキャラなら手札、それ以外はデッキの下",turn1:true,can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:p=>p.deck.length>5,
    run:async(p,x)=>{sleepCost(x);const y=p.deck.shift();if(!y)return true;log(`　デッキの上: ${C(y).nm} を公開`,"n");
      if(keisatsu5(y)){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}else{p.deck.push(y);log("　デッキの下に移した","n")}checkDeck(p);return true}}]};
DEF["0535"]={ // 伊織無我 B05031
  enter:async p=>{const o=opp(p);if(!o.deck.length)return;const t=await chooseChar(p,"相手のデッキの上から1枚をセットするキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t)setTop(o,t)},
  abilities:[{label:"スリープ・このキャラをリムーブエリアへ: 手札かリムーブエリアからレベル6以下の［大岡紅葉］を登場",
    can:(p,x)=>x.st==="a"&&[...p.hand,...p.rm].some(y=>isChar(y)&&exactName("大岡紅葉")(y)&&lvOf(y)<=6),aiCan:()=>true,
    run:async(p,x)=>{sleepCost(x);removeCard(x,"コスト",{by:p});await runQueue();const cs=[...p.hand,...p.rm].filter(y=>isChar(y)&&exactName("大岡紅葉")(y)&&lvOf(y)<=6);
      const [y]=await pickCards(p,"登場させる［大岡紅葉］（レベル6以下）","",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(y)await enterByEffect(p,y,"a");return true}}]};
DEF["0539"]={ // 遠山和葉 B05035
  enter:async(p,x)=>{const y=p.deck.shift();if(!y)return;log(`　デッキの上: ${C(y).nm} を公開`,"n");checkDeck(p);
    if(anyExact("服部平次","遠山和葉")(y)&&await yes(p,"遠山和葉",`${C(y).nm} を手札に加えますか？（加えないとこのキャラに裏向きでセット）`,true)){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n");return}
    x.set=x.set||[];x.set.push({c:y,up:false});log(`　${C(x).nm} に裏向きでセット`,"n");noteSetOn(p,x)}};
DEF["0640"]={ // 天草四郎時定 B06017
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&hasTrait(y,"YAIBA")))drawN(p,1)},hirameki:async o=>{await flipDown(o,1)}};
DEF["0753"]={ // マロちゃん B07021
  endTurn:async(p,self)=>{if(!p.field.some(exactName("綾小路文麿")))removeCard(self,"効果",{by:p,effect:true})},
  enter:async p=>{if(p.field.some(exactName("綾小路文麿")))drawN(p,1)}};
DEF["0976"]={ // 溝端理子 B09032
  abilities:[{label:"スリープ・このキャラをデッキの下へ: 他のレベル6以下に突撃（ターン終了時にリムーブ）",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&lvOf(y)<=6),
    aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.fresh&&y.st==="a"&&lvOf(y)<=6&&!canAct(y,p,"chara")&&!canAct(y,p,"case")),
    run:async(p,x)=>{const t=await chooseChar(p,"突撃を与えるキャラ（レベル6以下）",mine1(p,y=>y!==x&&lvOf(y)<=6),{ai:cs=>cs.filter(y=>y.fresh&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      sleepCost(x);toDeckBottom(x);await runQueue();if(t){giveKw(t,"突撃");giveKw(t,"終了時リムーブ")}return true}}]};
DEF["1088"]={ // 長島茂雄 B10027
  abilities:[{label:"裏向きのセットを1枚リムーブしてもよい: AP＋1000と突撃",turn1:true,can:p=>partnerIs(p,"緑")&&setCardsAll().length>0,aiCan:(p,x)=>myTurn(p)&&x.st==="a",
    run:async(p,x)=>{if(!await removeAnySet(p,"リムーブする裏向きのカード"))return true;apTurn(x,1000);giveKw(x,"突撃");return true}}]};
DEF["1092"]={ // 箕輪奨兵 B10031
  contactWin:async(p,self)=>{self.minoT=G.turnNo},
  endTurn:async(p,self)=>{if(self.minoT===G.turnNo&&p.field.includes(self))charToEvidence(self)},
  enter:async(p,x)=>{if(!p.hand.some(isChar))return;if(!await yes(p,"箕輪奨兵","手札のキャラを1枚リムーブして、突撃［キャラ］を得ますか？",()=>p.hand.filter(isChar).length>=2&&opp(p).field.some(y=>y.st!=="a")))return;
    const r=await discard(p,1,"リムーブする手札のキャラ",p,isChar);if(r.length)giveKw(x,"突撃［キャラ］")}};
DEF["0115"]={ // 服部静華 D02013
  abilities:[{label:"手札を1枚リムーブ: 他のレベル6以下の【緑】に突撃",turn1:true,can:(p,x)=>p.hand.length>0&&opp(p).field.filter(y=>y.st!=="a").length>=2&&p.field.some(y=>y!==x&&hasColor(y,"緑")&&lvOf(y)<=6),
    aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.fresh&&y.st==="a"&&hasColor(y,"緑")&&lvOf(y)<=6&&!canAct(y,p,"chara")),
    run:async(p,x)=>{await discard(p,1);const t=await chooseChar(p,"突撃を与える【緑】のキャラ（レベル6以下）",y=>y!==x&&hasColor(y,"緑")&&lvOf(y)<=6,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.fresh).slice(0,1)});if(t)giveKw(t,"突撃");return true}}]};

// ================= 白 =================
DEF["0039"]={ // 黒羽快斗 B01047
  actionEnd:async(p,self)=>{const f=y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=6&&!exactName("黒羽快斗")(y);if(!p.field.includes(self)||!p.hand.some(f))return;
    if(!await yes(p,"黒羽快斗","このキャラをデッキの下に移して、手札からレベル6以下の【白】のキャラを登場させますか？",()=>opp(p).field.some(y=>y.st!=="a")||opp(p).ev.length>0))return;
    toDeckBottom(self);await runQueue();const y=await playFromHand(p,f,"登場させる【白】のキャラ（レベル6以下）");if(y&&p.field.includes(y)){giveKw(y,"突撃");giveKw(y,"終了時手札")}}};
DEF["0040"]={ // 鈴木園子 B01048
  abilities:[{label:"スリープ: デッキの上から3枚見て1枚を手札に",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:(p,x)=>!myTurn(p)||!canAct(x,p,"chara")&&!canAct(x,p,"case"),
    run:async(p,x)=>{sleepCost(x);await lookTop(p,3,()=>true,{max:1,title:"手札に加えるカード"});return true}}],hirameki:hiSleep};
DEF["0212"]={ // 黒羽盗一 B02046
  enter:async p=>{if(!p.deck.length)return;const t=await chooseChar(p,"セットする【白】のキャラ",mine1(p,y=>hasColor(y,"白")),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t){setTop(p,t);apTurn(t,1000)}}};
DEF["0303"]={ // 工藤優作 B03048
  abilities:[{label:"このキャラをデッキの下へ: レベル7以下のキャラをスタン",can:()=>allChars().some(lvLe(7)),aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{toDeckBottom(x);await runQueue();const t=await chooseChar(p,"スタンさせるキャラ（レベル7以下）",lvLe(7));if(t)stunC(t);return true}}]};
DEF["0313"]={ // 茶木神太郎 B03058
  onAnyDisguise:async(q,self)=>{if(!myTurn(q)||turnCount(self,"chaki"))return;useTurn(self,"chaki");drawN(q,1)}};
DEF["0314"]={ // 土井塔克樹 B03059
  abilities:[{label:"リムーブエリアの【白】のキャラをデッキの下へ: キャラをAP＋1000",turn1:true,can:p=>p.rm.some(y=>isChar(y)&&hasColor(y,"白")),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"),
    run:async p=>{const [y]=await pickCards(p,"コスト: デッキの下に移す【白】のキャラ","",p.rm.filter(y=>isChar(y)&&hasColor(y,"白")),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
      if(!y)return false;detach(y);p.deck.push(y);log(`　コスト: ${C(y).nm} をデッキの下へ`,"n");await ownAp(p,1000,"AP＋1000するキャラ");return true}}],
  hirameki:async o=>{await pickRmToHand(o,exactName("怪盗キッド"),"手札に加える［怪盗キッド］")}};
DEF["0435"]={ // 鈴木園子 B04037
  onContact:async(p,self,ct)=>{if(myTurn(p)||turnCount(self,"sono4"))return;const k=[ct.a,ct.d].find(y=>p.field.includes(y)&&exactName("京極真")(y));if(!k)return;
    const cs=p.hand.filter(exactName("鈴木園子"));if(!cs.length)return;
    if(!await yes(p,"鈴木園子",`手札の［鈴木園子］をリムーブして、${C(k).nm} をこのコンタクトでリムーブされないようにしますか？`,()=>apOf(opp(p).field.includes(ct.a)?ct.a:ct.d)>=apOf(k)))return;
    useTurn(self,"sono4");await discard(p,1,"リムーブする［鈴木園子］",p,exactName("鈴木園子"));k.cSafe=true;log(`　${C(k).nm} はこのコンタクトによってリムーブされない`,"n")},
  hirameki:async o=>{await pickRmToHand(o,exactName("京極真"),"手札に加える［京極真］")}};
DEF["0436"]={ // ワトソン B04039
  onReason:async(p,self,x)=>{if(exactName("白馬探")(x)&&!turnCount(self,"wat")){useTurn(self,"wat");drawN(p,1)}},
  onAction:async(p,self,actor)=>{if(exactName("白馬探")(actor)&&!turnCount(self,"wat")){useTurn(self,"wat");drawN(p,1)}}};
DEF["0560"]={ // 富沢雄三 B05058（［鈴木財閥］は core.js hasTrait）
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"鈴木財閥"),"手札に加える［鈴木財閥］")}};
DEF["0679"]={ // 庄之介 B06058
  enter:async p=>{if(!p.solved||!p.hand.length||!p.field.some(y=>exactName("鉄刃")(y)&&lpOf(y)===0&&y.st!=="a"))return;
    if(!await yes(p,"庄之介","手札を1枚リムーブして、LP0の［鉄刃］をアクティブにしますか？",()=>p.hand.length>=2))return;
    await discard(p,1);const t=await chooseChar(p,"アクティブにする［鉄刃］",mine1(p,y=>exactName("鉄刃")(y)&&lpOf(y)===0),{ai:cs=>cs.slice(0,1)});if(t)activateC(t)},
  hirameki:async o=>{await pickRmToHand(o,y=>C(y).t==="イベント"&&hasTrait(y,"YAIBA"),"手札に加える［YAIBA］のイベント")}};
DEF["0690"]={ // 鈴木園子 B06069
  abilities:[{label:"【事件編】スリープ: 1枚引く",can:(p,x)=>!p.solved&&x.st==="a",aiCan:(p,x)=>!myTurn(p)||!canAct(x,p,"chara")&&!canAct(x,p,"case"),run:async(p,x)=>{sleepCost(x);drawN(p,1);return true}},
    {label:"【解決編】スリープ: 相手のレベル7以下を手札に移す",can:(p,x)=>p.solved&&x.st==="a"&&oppHas(p,lvLe(7)),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
      run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(t)toHandFromField(t);return true}}]};
DEF["0772"]={ // 寺井黄之助 B07043
  leaveOppTurn:async p=>{const ns=["怪盗キッド","黒羽快斗","黒羽盗一"];
    const i=await pickMode(p,"寺井黄之助：カード名を指定",ns.map(n=>`［${n}］`),Math.max(0,ns.findIndex(n=>p.deck.some(exactName(n)))));digToHand(p,exactName(ns[i]))}};
DEF["0880"]={ // 高橋良一 B08041
  enter:async(p,x)=>{setTop(p,x)},
  abilities:[{label:"このキャラの裏向きのセットを1枚リムーブ: キャラならAP＋2000、イベントならLP＋1",turn1:true,can:(p,x)=>faceDownSet(x).length>0,aiCan:p=>myTurn(p),
    run:async(p,x)=>{const s=faceDownSet(x)[0];x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);noteSetOff(p,x,s.c,true);log(`　コスト: ${C(s.c).nm} をリムーブ`,"n");
      if(isChar(s.c))apTurn(x,2000);else if(C(s.c).t==="イベント"){x.lpT+=1;log(`　${C(x).nm} をターン終了時までLP＋1`,"n")}return true}}]};
DEF["0881"]={ // メデューサ B08042
  leaveOppTurn:async p=>{const t=await chooseChar(p,"スタンさせるキャラ（スリープ状態）",y=>y.st==="s");if(t)stunC(t)},hirameki:hiSleep};
DEF["0993"]={ // 白馬探 B09050
  abilities:[{label:"手札を1枚リムーブ: そのレベル以下の［探偵］をスタン",turn1:true,can:p=>p.hand.length>0&&allChars().some(y=>hasTrait(y,"探偵")),
    aiCan:p=>oppHas(p,y=>hasTrait(y,"探偵")&&y.st==="s"&&p.hand.some(h=>(C(h).lv||0)>=lvOf(y))),
    run:async p=>{const [h]=await discard(p,1,"コスト: リムーブする手札",p);const lv=h?C(h).lv||0:0;
      const t=await chooseChar(p,`スタンさせる［探偵］（レベル${lv}以下）`,y=>hasTrait(y,"探偵")&&lvOf(y)<=lv);if(t)stunC(t);return true}}]};
DEF["1107"]={ // ラディッシュ・レッドウッド B10047（事件の色を無視は hooks.js ignoreCaseColor）
  enter:async p=>{drawN(p,1);await discard(p,1)},
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>isChar(y)&&!!C(y).dg&&lvOf(y)<=6,"手札に加える【変装】を持つキャラ（レベル6以下）")}};
DEF["0835"]={ // 鈴木次郎吉 PR201
  enter:async(p,x)=>{if(!partnerIs(p,"白")||p.deck.length<3)return;if(!await yes(p,"鈴木次郎吉","デッキの上から3枚をリムーブしますか？（［京極真］か［鈴木財閥］のキャラがあれば突撃）",()=>p.deck.length>15))return;
    if(millSelf(p,3).some(y=>isChar(y)&&(exactName("京極真")(y)||hasTrait(y,"鈴木財閥"))))giveKw(x,"突撃")}};

// ================= 黒 =================
DEF["0247"]={ // ベルモット B02086
  disguise:async(p,x)=>{const o=opp(p);if(o.hand.length&&await yes(o,"ベルモット","手札を1枚リムーブしますか？（しないと、ベルモットはこのコンタクトでリムーブされない）",()=>o.hand.length>=4))await discard(o,1);
    else{x.cSafe=true;log(`　${C(x).nm} はこのコンタクトによってリムーブされない`,"n")}},
  enter:async(p,x)=>{const t=await chooseChar(p,"AP＋2000とブレットを与えるキャラ",y=>y!==x,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t){apTurn(t,2000);giveKw(t,"ブレット")}}};
DEF["0248"]={ // キール B02087（ネクストヒントのとき事件の色を無視は hooks.js ignoreCaseColor）
  enter:async(p,x)=>{const ss=[];for(const h of opp(p).field)for(const s of h.set||[])if(!s.under)ss.push({h,s});if(!ss.length)return;
    const [c]=await pickCards(p,"リムーブする相手のキャラのセット","",ss.map(e=>e.s.c),{max:1,faceUp:false,ai:c=>c.slice(0,1)});const e=ss.find(e=>e.s.c===c);if(!e)return;
    const q=opp(p);e.h.set.splice(e.h.set.indexOf(e.s),1);q.rm.push(c);noteSetOff(q,e.h,c,!e.s.up);log(`　${C(e.h).nm} のセットを1枚リムーブ`,"n");giveKw(x,"突撃［キャラ］")}};
DEF["0362"]={ // シェリー B03113
  leaveOppTurn:async p=>{await enterFromRmSt(p,y=>!!C(y).ci&&lvOf(y)<=6&&hasColor(y,"黒")&&!exactName("シェリー")(y),"スリープ状態で登場させる【黒】のキャラ")}};
DEF["0375"]={ // 犯人 B03126（事件の色を無視は hooks.js ignoreCaseColor）
  lpSelf:p=>p.solved?0:1,apSelf:p=>p.solved?2000:0,
  hirameki:async()=>{G.noEvGain=true}};
DEF["0473"]={ // ウォッカ B04091
  onOppRemoved:async(q,self,info)=>{if(!myTurn(q)||info.by!==q||!info.effect||!partnerIs(q,"黒")||turnCount(self,"vod4"))return;useTurn(self,"vod4");drawN(q,2);await discard(q,1)}};
DEF["0611"]={ // 弁崎素江 B05115
  onDiscardedByOpp:async(p,x)=>{if(!p.rm.includes(x)||!await yes(p,"弁崎素江","リムーブエリアから登場させますか？",true))return;await enterByEffect(p,x,"a")}};
DEF["0823"]={ // ウォッカ B07096（突撃［レベル4以下のキャラ］は engine.js canAct）
  onOppRemoved:async(q,self,info)=>{if(!myTurn(q)||(C(info.x).lv||0)>4||turnCount(self,"vod7"))return;useTurn(self,"vod7");drawN(q,1)}};
DEF["0826"]={ // 板倉卓 B07099
  selfRemovedOwnTurn:async p=>{if(!partnerIs(p,"黒"))return;await flipAnyDown(p)},
  hirameki:async o=>{await flipAnyDown(o)}};
async function flipAnyDown(p){const cs=[...p.ev,...opp(p).ev].filter(e=>e.up);if(!cs.length)return;
  const [e]=await pickCards(p,"裏向きにする表向きの証拠","",cs,{max:1,ai:c=>c.filter(e=>p.ev.includes(e)).slice(0,1)});if(e){e.up=false;log("　表向きの証拠を1つ裏向きにした","n")}}
DEF["0829"]={ // 犯人 B07102
  enter:async p=>{const cs=p.hand.filter(y=>!!C(y).ci&&hasColor(y,"黒"));if(!cs.length)return;
    const xs=await pickCards(p,"リムーブする【カットイン】を持つ【黒】のカード（好きな枚数）","",cs,{max:cs.length,ai:c=>c.filter(y=>(cutinAp(y,p)||0)<=1000)});
    for(const y of xs){detach(y);p.rm.push(y)}if(xs.length){log(`　手札の${xs.length}枚をリムーブ`,"n");drawN(p,xs.length)}}};
DEF["0922"]={ // テキーラ B08086（カットインは state.js ownCutinAp）
  apSelf:p=>partnerIs(p,"黒")&&myTurn(p)?2000*opp(p).field.length:0};
DEF["0924"]={ // バーボン B08088
  leaveOppTurn:async p=>{if(condOk("事件青＆黒",p)!==true||!p.solved||!p.hand.length||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"バーボン","手札を1枚リムーブして、相手のレベル7以下のキャラをリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)))return;
    await discard(p,1);await rmChar(p,y=>isOpp(p,y)&&lvOf(y)<=7)}};
DEF["1026"]={ // 諸伏高明 B09086
  onCutinInContact:async(p,mine,card)=>{if(exactName("諸伏景光")(card)||hasTrait(card,"長野県警")){mine.apC+=2000;log(`　${C(mine).nm} をコンタクト中AP＋2000`,"n")}}};
DEF["1035"]={ // キャンティ B09096
  abilities:[{label:"スリープ: このキャラと同じAPのキャラをリムーブ",can:(p,x)=>p.solved&&x.st==="a",aiCan:(p,x)=>oppHas(p,y=>apOf(y)===apOf(x)),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&apOf(y)===apOf(x));return true}}]};
DEF["0394"]={ // ライ D07014
  leaveOppTurn:async p=>{const t=await rmChar(p,y=>isOpp(p,y)&&lvOf(y)<=4);if(t)drawN(opp(p),1)}};
