"use strict";
// カード個別効果（レベル7、2026-11-10）。SeEdの方針: 残りはレベル5→7→4→6 の順。部品は lv5.js・mr8.js・main.js のものを使う。
// 追加した仕組み:
//  - DEF の unselectable(q,y)（相手の能力や効果によって選ばれない）・protectAlly(q,self,y)（自分の他のキャラを選ばれなくする）: core.js immune
//  - DEF の untargetable(q,y)（相手のキャラはこのキャラを指定してアクションできない）: mech.js noTarget
//  - DEF の noOppCutin（相手はカットインを使用できない）: engine.js contactRight
//  - DEF の taunt1（【ターン1】相手のキャラがアクションするとき、指定できるなら必ず指定する）: engine.js declareAction
//  - x.lockBy（このキャラが現場にいるかぎり、選んだキャラはオートフェイズにアクティブにならない）: FX.noAutoWake
//  - x.byFxT（能力や効果によって登場したターン）: core.js enterByEffect／G.actor（アクション中のキャラ）: engine.js declareAction
//  - キーワード「勝利ドロー1」（【ターン1】コンタクトでリムーブしたとき1枚引く）・「突撃［キャラ］喪失」
//  - 佐々木小次郎 B06020 の「手札の【緑】の［YAIBA］はカットインAP＋2000」: FX.grantedCutin

// --- 部品 ---
const hiStunActor=async o=>{if(!o.solved||!G.actor||!allChars().includes(G.actor))return;const t=await chooseChar(o,"ヒラメキ: スタンさせるアクション中のキャラ",y=>y===G.actor,{ai:cs=>cs});if(t)stunC(t)};
const flipUp=(q,e)=>{e.up=true;log(`　${q.name} の裏向きの証拠を1つ表向きにした: ${C(e).nm}`,"n")};
const pickDistinct=(p,cs,max,title)=>pickCards(p,title,"カード名の異なるものを選びます。",cs,{max,ai:c=>{const seen=new Set,out=[];for(const y of c.slice().sort((a,b)=>lvOf(b)-lvOf(a)))if(!seen.has(nameOf(y))){seen.add(nameOf(y));out.push(y)}return out.slice(0,max)}})
  .then(xs=>{const seen=new Set;return xs.filter(y=>!seen.has(nameOf(y))&&seen.add(nameOf(y)))});
const look5Event=async(p,f,title)=>{const xs=p.deck.splice(0,5);if(!xs.length)return null;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const [e]=await pickCards(p,title,"",xs.filter(y=>C(y).t==="イベント"&&f(y)),{max:1,ai:c=>c.slice(0,1)});
  const rest=xs.filter(y=>y!==e);shuffle(rest);p.deck.push(...rest);if(e){p.hand.push(e);log(`　${C(e).nm} を公開して手札に`,"n")}checkDeck(p);return e};
const ownChar=(p,f)=>y=>!isOpp(p,y)&&f(y);

// ================= 青 =================
DEF["0008"]={ // 阿笠博士 B01012
  onAllyEnter:async(p,self,y)=>{if(y.byFxT!==G.turnNo||!hasTrait(y,"少年探偵団")||lvOf(y)>6||turnCount(self,"aga7"))return;useTurn(self,"aga7");activateC(y);giveKw(y,"迅速")}};
DEF["0270"]={ // 死羅神様 B03012
  leaveOppTurn:async p=>{await playFromHand(p,y=>exactName("工藤新一")(y)&&lvOf(y)<=6,"登場させる［工藤新一］（レベル6以下）")},
  hirameki:async o=>{await pickRmToHand(o,exactName("工藤新一"),"手札に加える［工藤新一］")}};
DEF["0736"]={ // 吉田歩美 B07004
  abilities:[{label:"スリープ: デッキの上から4枚見て、レベル8以下の［小嶋元太］か［円谷光彦］を登場",can:(p,x)=>partnerIs(p,"青")&&x.st==="a"&&p.deck.length>0,aiCan:p=>p.field.length<5&&p.deck.length>8,
    run:async(p,x)=>{sleepCost(x);if(await lookEnterOrder(p,4,y=>lvOf(y)<=8&&anyExact("小嶋元太","円谷光彦")(y),"登場させる［小嶋元太］か［円谷光彦］"))await discard(p,1);return true}}]};
DEF["0844"]={ // 阿笠博士 B08003
  enter:async(p,x)=>{const cs=p.rm.filter(y=>isChar(y)&&(C(y).lv||0)===8&&hasTrait(y,"少年探偵団"));if(!cs.length)return;
    const xs=await pickDistinct(p,cs,3,"このキャラの下に重ねるレベル8の［少年探偵団］（3枚まで）");if(xs.length)stackUnder(x,xs)},
  abilities:[{label:"スリープ・下の3枚をリムーブ: 相手が選んだレベル8以下の［少年探偵団］を登場させ、このキャラをリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"青")&&x.st==="a"&&underN(x)>=3,aiCan:()=>true,
    run:async(p,x)=>{sleepCost(x);const us=x.set.filter(s=>s.under).slice(0,3);for(const s of us){x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c)}
      log(`　コスト: ${C(x).nm} の下の${us.length}枚をリムーブ`,"n");const o=opp(p);
      const [y]=await pickCards(o,"登場させるキャラを相手が選ぶ","",us.map(s=>s.c).filter(isChar),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
      if(y&&lvOf(y)<=8&&hasTrait(y,"少年探偵団")){await enterByEffect(p,y,"a");if(p.field.includes(x)){removeCard(x,"効果",{by:p,effect:true});await runQueue()}await discard(p,1)}return true}}]};
DEF["0847"]={ // 小嶋元太 B08006
  abilities:[{label:"スリープ・手札の［少年探偵団］を公開して【青】の下に重ねる: レベル7以下をリムーブ",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"少年探偵団"))&&p.field.some(y=>hasColor(y,"青")),
    aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{const y=await revealFromHand(p,z=>isChar(z)&&hasTrait(z,"少年探偵団"),"コスト: 公開して重ねる［少年探偵団］",{must:true});if(!y)return false;
      const [h]=await pickCards(p,"下に重ねる先の【青】のキャラ","",p.field.filter(z=>hasColor(z,"青")),{min:1,max:1,ai:c=>c.slice(0,1)});if(!h)return false;
      sleepCost(x);stackUnder(h,[y]);await rmChar(p,lvLe(7));return true}}],
  hirameki:hiStunActor};
DEF["0955"]={ // 阿笠博士 B09010
  abilities:[{label:"スリープ: リムーブエリアのレベル4の［少年探偵団］（カード名が異なる）を2枚まで登場、FILEの上を1枚リムーブ",can:(p,x)=>condOk("FILE6",p)&&x.st==="a",aiCan:p=>p.field.length<=3&&p.rm.some(y=>isChar(y)&&(C(y).lv||0)===4&&hasTrait(y,"少年探偵団")),
    run:async(p,x)=>{sleepCost(x);const xs=await pickDistinct(p,p.rm.filter(y=>isChar(y)&&(C(y).lv||0)===4&&hasTrait(y,"少年探偵団")),2,"登場させるレベル4の［少年探偵団］");
      for(const y of xs)await enterByEffect(p,y,"a");const t=takeFileTop(p);if(t){t.fu=false;p.rm.push(t);log(`　FILEの上の ${C(t).nm} をリムーブ`,"n")}return true}}]};
DEF["0490"]={ // 灰原哀 D08005
  apSelf:p=>myTurn(p)?1000*p.ev.filter(e=>e.up).length:0,
  abilities:[{label:"裏向きの証拠を1つ表向き: 突撃",turn1:true,can:p=>p.ev.some(e=>!e.up),aiCan:(p,x)=>myTurn(p)&&x.fresh&&x.st==="a",
    run:async(p,x)=>{const e=p.ev.filter(e=>!e.up).pop();flipUp(p,e);giveKw(x,"突撃");return true}}]};
DEF["0624"]={ // 阿笠博士 PR155
  enter:async p=>{await playFromHandSt(p,y=>exactName("灰原哀")(y)&&lvOf(y)<=6,"スリープ状態で登場させる［灰原哀］（レベル6以下）");drawN(p,1)},
  hirameki:async o=>{await pickRmToHand(o,exactName("灰原哀"),"手札に加える［灰原哀］")}};
DEF["0400"]={ // 鈴木園子 PR042
  enter:async p=>{const f=y=>isChar(y)&&hasTrait(y,"少年探偵団")&&lvOf(y)<=4;if(!partnerIs(p,"青")||!p.hand.length||!p.rm.some(f))return;
    if(!await yes(p,"鈴木園子","手札を1枚リムーブして、リムーブエリアのレベル4以下の［少年探偵団］を2枚までスリープ状態で登場させますか？",()=>p.field.length<=3))return;
    await discard(p,1);const xs=await pickCards(p,"スリープ状態で登場させる［少年探偵団］（2枚まで）","",p.rm.filter(f),{max:2,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,2)});for(const y of xs)await enterByEffect(p,y,"s")}};

// ================= 赤 =================
DEF["0053"]={ // ジョディ・スターリング B01063
  abilities:[{label:"スリープ・他のキャラを1枚スリープ: レベル7以下をリムーブ",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&y.st==="a"),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: スリープさせるキャラ","",p.field.filter(y=>y!==x&&y.st==="a"),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!c)return false;
      sleepCost(x);c.st="s";log(`　コスト: ${C(c).nm} をスリープ`,"n");await rmChar(p,lvLe(7));return true}}]};
DEF["0061"]={ // ジェイムズ・ブラック B01071
  onAction:async(p,self,actor)=>{if(!p.field.includes(actor)||!hasTrait(actor,"FBI")||turnCount(self,"jb1"))return;useTurn(self,"jb1");drawN(p,1)},
  onOppAction:async(p,self,actor,target)=>{if(!target||!p.field.includes(target)||!hasTrait(target,"FBI")||turnCount(self,"jb2"))return;useTurn(self,"jb2");drawN(p,1)}};
DEF["0226"]={ // 羽田秀𠮷 B02063
  noOppCutin:true,lpSelf:p=>condOk("FILE8",p)?1:0,hirameki:hiOppDiscard};
DEF["0323"]={ // 羽田浩司 B03069
  lpSelf:p=>p.ev.length<=3?1:0,
  leaveOppTurn:async p=>{const o=opp(p);if(!await yes(p,"羽田浩司","証拠を1つ得て、相手に証拠を1つ与えますか？",()=>p.ev.length+1>=p.level||p.ev.length<o.ev.length-1))return;gainEv(p,1);gainEv(o,1)},
  hirameki:async o=>{await pickRmToHand(o,y=>hasColor(y,"赤"),"手札に加える【赤】のカード")}};
DEF["0324"]={ // メアリー B03070
  onCaseGain:async(p,self)=>{if(turnCount(self,"mary7")||self.st!=="a")return;
    if(!await yes(p,"メアリー","このキャラをスリープさせて、相手のレベル7以下を手札に移し、相手の手札を1枚リムーブさせますか？",()=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)))return;
    useTurn(self,"mary7");sleepC(self);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(t)toHandFromField(t);await discard(opp(p),1)}};
DEF["0439"]={ // 世良真純 B04047
  abilities:[{label:"スリープ: レベル8以下をリムーブ（FILEが5枚以下）",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&x.st==="a"&&fileN(p)<=5,aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,lvLe(8));return true}}]};
DEF["0441"]={ // 沖矢昴 B04049
  enter:async(p,x)=>{const f=y=>isChar(y)&&hasTrait(y,"FBI");if(!partnerIs(p,"赤")||!p.hand.some(f))return;
    if(!await yes(p,"沖矢昴","このキャラをスリープさせ、手札の［FBI］をリムーブして、レベル7以下をリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)))return;
    sleepC(x);await discard(p,1,"リムーブする［FBI］",p,f);await rmChar(p,lvLe(7))}};
DEF["0695"]={ // 宮野明美 B06075
  abilities:[{label:"スリープ: レベル5以下のスリープ状態をリムーブ、またはレベル7以下をリムーブしてこのキャラをスタン",turn1:true,can:(p,x)=>x.st==="a",aiCan:p=>oppHas(p,lvLe(7)),
    run:async(p,x)=>{sleepCost(x);const i=await pickMode(p,"宮野明美",["レベル5以下のスリープ状態をリムーブ","レベル7以下をリムーブし、このキャラをスタン"],oppHas(p,y=>y.st==="s"&&lvOf(y)<=5)?0:1);
      if(i===0)await rmChar(p,y=>y.st==="s"&&lvOf(y)<=5);else{await rmChar(p,lvLe(7));if(p.field.includes(x))stunC(x)}return true}}]};
DEF["0800"]={apSelf:p=>myTurn(p)&&p.hand.length<=2?2000:0}; // アンドレ・キャメル B07071
DEF["0999"]={ // アンドレ・キャメル B09057
  enter:async(p,x)=>{const f=y=>hasColor(y,"黒")&&lvOf(y)<=6;if(!p.hand.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"アンドレ・キャメル","このキャラをスリープさせて、手札からレベル6以下の【黒】のキャラを登場させますか？",true))return;sleepC(x);await playFromHand(p,f,"登場させる【黒】のキャラ（レベル6以下）")},
  abilities:[{label:"レベル6以上の【黒】をリムーブエリアへ: 1枚引き、アクティブにして突撃［キャラ］",turn1:true,
    can:(p,x)=>partnerIs(p,"赤")&&opp(p).refreshed&&p.field.some(y=>y!==x&&hasColor(y,"黒")&&lvOf(y)>=6),aiCan:(p,x)=>myTurn(p)&&x.st!=="a",
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: リムーブエリアに移す【黒】のキャラ（レベル6以上）","",p.field.filter(y=>y!==x&&hasColor(y,"黒")&&lvOf(y)>=6),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});
      if(!c)return false;removeCard(c,"コスト",{by:p});await runQueue();drawN(p,1);activateC(x);giveKw(x,"突撃［キャラ］");return true}}]};
DEF["1112"]={ // 宮野エレーナ B10053
  abilities:[{label:"スリープ: レベル7以下をリムーブ、またはレベル7以上にブレット",turn1:true,can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&lvOf(y)===7),aiCan:p=>oppHas(p,lvLe(7))||myTurn(p),
    run:async(p,x)=>{sleepCost(x);const i=await pickMode(p,"宮野エレーナ",["レベル7以下をリムーブ","レベル7以上にブレット"],oppHas(p,lvLe(7))?0:1);
      if(i===0)await rmChar(p,lvLe(7));else{const t=await chooseChar(p,"ブレットを与えるキャラ（レベル7以上）",y=>lvOf(y)>=7,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)giveKw(t,"ブレット")}return true}}]};
DEF["1167"]={ // ジェイムズ・ブラック PR329
  lvAura:(q,self,x)=>G.turn===q.idx&&q.hand.length<=2&&ownerOf(x)!==q?-1:0,
  enter:async p=>{if(!partnerIs(p,"赤")||!myTurn(p))return;const cs=p.field.filter(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=7);if(!cs.length||!oppHas(p,lvLe(6)))return;
    if(!await yes(p,"ジェイムズ・ブラック","レベル7以上の【赤】のキャラをスリープさせて、レベル6以下をリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=6)))return;
    const [c]=await pickCards(p,"スリープさせる【赤】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice(0,1)});if(c)sleepC(c);await rmChar(p,lvLe(6))}};

// ================= 黄 =================
DEF["0070"]={ // 榎本梓 B01082（ガードできないは state.js staticKw）
  noActUnless:p=>!partnerIs(p,"黄"),untargetable:q=>partnerIs(q,"黄"),
  enter:async(p,x)=>{const t=await chooseChar(p,"スリープさせるキャラ（レベル7以下）",lvLe(7));if(!t)return;sleepC(t);t.lockBy=x;log(`　${C(x).nm} が現場にいるかぎり、${C(t).nm} はオートフェイズにアクティブにならない`,"n")}};
DEF["0236"]={ // 諸伏高明 B02075
  leaveOppTurn:async p=>{await enterFromRmSt(p,y=>hasTrait(y,"長野県警")&&lvOf(y)<=6,"スリープ状態で登場させる［長野県警］（レベル6以下）")}};
DEF["0238"]={ // 安室透 B02077
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&lvOf(y)>=7&&hasTrait(y,"探偵")))await enterFromRmSt(p,y=>hasTrait(y,"探偵")&&lvOf(y)<=5,"スリープ状態で登場させる［探偵］（レベル5以下）")}};
DEF["0338"]={ // 諸伏景光 B03085
  enter:async p=>{if(!p.hand.length||!p.rm.some(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=6))return;
    if(!await yes(p,"諸伏景光","手札を1枚リムーブして、リムーブエリアのレベル6以下の［警察］をスリープ状態で登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await enterFromRmSt(p,y=>hasTrait(y,"警察")&&lvOf(y)<=6,"スリープ状態で登場させる［警察］（レベル6以下）")},
  hirameki:hiStunActor};
DEF["0347"]={ // 萩原千速 B03094
  onAction:async(p,self,actor)=>{if(actor!==self||p.deck.length<2)return;if(!await yes(p,"萩原千速","デッキの上から2枚をリムーブして、AP＋1000しますか？",()=>p.deck.length>12))return;
    millSelf(p,2);self.apA+=1000;log(`　${C(self).nm} をアクション終了時までAP＋1000`,"n")}};
DEF["0352"]={ // 大和敢助 B03099
  onAction:async(p,self,actor)=>{if(actor!==self||turnCount(self,"yama7"))return;useTurn(self,"yama7");await enterFromRmSt(p,y=>hasTrait(y,"長野県警")&&lvOf(y)<=6,"スリープ状態で登場させる［長野県警］（レベル6以下）")}};
DEF["0454"]={ // 安室透 B04068
  onAction:async(p,self,actor)=>{if(actor!==self||!condOk("FILE5",p)||!fileTopCard(p))return;
    if(!await yes(p,"安室透","FILEの上から1枚を手札に加えて、AP＋2000し、手札から［喫茶ポアロ］を登場させますか？",()=>!p.solved&&fileN(p)>=6))return;
    const y=takeFileTop(p);y.fu=false;p.hand.push(y);log(`　FILEの上の ${C(y).nm} を手札に`,"n");apTurn(self,2000);await playFromHand(p,z=>hasTrait(z,"喫茶ポアロ")&&lvOf(z)<=7,"登場させる［喫茶ポアロ］（レベル7以下）")}};
DEF["0460"]={ // 降谷零 B04074
  abilities:[{label:"スリープ: 〚捜査2〛（［風見裕也］がいれば〚捜査4〛）し、発見したカードと同じレベルのキャラをリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"黄")&&x.st==="a"&&opp(p).deck.length>0,aiCan:p=>opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);const xs=investigate(p,p.field.some(exactName("風見裕也"))?4:2);const lvs=new Set(xs.map(y=>C(y).lv||0));await rmChar(p,y=>lvs.has(lvOf(y)));return true}}]};
DEF["0465"]={ // 目暮十三 B04080
  endTurn:async p=>{for(const col of ["黄","緑"]){const t=await chooseChar(p,`アクティブにする【${col}】の［警察］`,y=>hasColor(y,col)&&hasTrait(y,"警察")&&y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(t)activateC(t)}}};
DEF["0589"]={ // 風見裕也 B05091
  leaveOppTurn:async p=>{await enterFromRmSt(p,y=>exactName("降谷零")(y)&&lvOf(y)<=6,"スリープ状態で登場させる［降谷零］（レベル6以下）")},hirameki:hiSleep};
DEF["0705"]={ // 萩原研二 B06086
  onAction:async(p,self,actor)=>{if(actor!==self)return;const o=opp(p);let n=0;
    for(const q of [p,o]){const fd=q.ev.filter(e=>!e.up);if(!fd.length)continue;const [e]=await pickCards(p,`表向きにする${q===p?"自分":"相手"}の裏向きの証拠`,"",fd,{min:1,max:1,faceUp:false});if(e){flipUp(q,e);n++}}
    if(n===2)apTurn(self,1000)},
  hirameki:async o=>{const fd=opp(o).ev.filter(e=>!e.up);if(!fd.length)return;const [e]=await pickCards(o,"表向きにする相手の裏向きの証拠","",fd,{max:1,faceUp:false,ai:c=>c.slice(0,1)});if(e)flipUp(opp(o),e)}};
DEF["0709"]={ // 榎本梓 B06090
  enter:async(p,x)=>{const f=y=>hasTrait(y,"喫茶ポアロ")&&lvOf(y)<=5;if(!p.rm.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"榎本梓","このキャラをスリープさせて、リムーブエリアのレベル5以下の［喫茶ポアロ］を登場させますか？",true))return;sleepC(x);await enterFromRm(p,f,"登場させる［喫茶ポアロ］（レベル5以下）")},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"喫茶ポアロ"),"手札に加える［喫茶ポアロ］")}};
DEF["0905"]={ // 安室透 B08068
  abilities:[{label:"スリープ・手札の［喫茶ポアロ］を好きな枚数公開: 公開枚数＋現場の［喫茶ポアロ］の数以下のレベルのキャラをリムーブ",can:(p,x)=>x.st==="a",
    aiCan:p=>oppHas(p,y=>lvOf(y)>=3&&lvOf(y)<=p.hand.filter(z=>isChar(z)&&hasTrait(z,"喫茶ポアロ")).length+p.field.filter(z=>hasTrait(z,"喫茶ポアロ")).length),
    run:async(p,x)=>{sleepCost(x);const xs=await pickCards(p,"コスト: 公開する［喫茶ポアロ］（好きな枚数）","",p.hand.filter(z=>isChar(z)&&hasTrait(z,"喫茶ポアロ")),{max:9,ai:c=>c});
      for(const y of xs){log(`　${p.name} は手札の ${C(y).nm} を公開`,"n");await FX.onReveal(p,y)}
      const n=xs.length+p.field.filter(z=>hasTrait(z,"喫茶ポアロ")).length;await rmChar(p,lvLe(n),`リムーブするキャラ（レベル${n}以下）`);return true}}]};
DEF["0501"]={ // 諸伏高明 D09006
  apSelf:(p,x)=>myTurn(p)&&bondFor(p,x,"大和敢助")?2000:0,kwSelf:p=>p.rm.filter(y=>isChar(y)&&hasTrait(y,"長野県警")).length>=2?["突撃"]:[]};
DEF["0939"]={gale:async p=>{await sleepOne(p)},hirameki:hiSleep}; // 萩原研二 D11009
DEF["1158"]={ // 萩原研二 PR305
  apSelf:p=>myTurn(p)&&p.field.filter(y=>hasTrait(y,"警察")).length>=2?1000:0,
  abilities:[{label:"デッキの上から3枚リムーブ: ［松田陣平］のヒラメキを発動",turn1:true,can:(p,x)=>bondFor(p,x,"松田陣平")&&p.deck.length>=3,aiCan:p=>p.deck.length>12&&p.field.some(y=>exactName("松田陣平")(y)&&C(y).hr),
    run:async p=>{millSelf(p,3);const t=await chooseChar(p,"ヒラメキを発動する［松田陣平］",mine1(p,y=>exactName("松田陣平")(y)&&!!C(y).hr),{ai:cs=>cs.slice(0,1)});
      if(t){log(`　${C(t).nm} の【ヒラメキ】を発動`,"n");if(!await FX.hirameki(p,t)&&/カードを1枚引く/.test(C(t).hr))drawN(p,1)}return true}}]};

// ================= 緑 =================
DEF["0021"]={ // 遠山和葉 B01027
  lpSelf:p=>partnerIs(p,"緑")?1:0,
  abilities:[{label:"スリープ: ［服部平次］に突撃",can:(p,x)=>x.st==="a"&&p.field.some(exactName("服部平次")),aiCan:p=>myTurn(p)&&p.field.some(y=>exactName("服部平次")(y)&&y.fresh&&y.st==="a"),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"突撃を与える［服部平次］",mine1(p,exactName("服部平次")),{ai:cs=>cs.filter(y=>y.fresh).concat(cs).slice(0,1)});if(t)giveKw(t,"突撃");return true}}]};
DEF["0189"]={ // 伊織無我 B02019
  enter:async p=>{await look5Event(p,y=>hasColor(y,"緑"),"手札に加える【緑】のイベント")},
  endTurn:async p=>{const t=await chooseChar(p,"アクティブにするカードがセットされているキャラ",y=>(y.set||[]).some(s=>!s.under)&&y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)activateC(t)}};
DEF["0192"]={taunt1:true}; // 鬼丸猛 B02022（必ず指定は engine.js declareAction、ヒラメキは1枚引く）
DEF["0286"]={ // 遠山和葉 B03029
  abilities:[{label:"スリープ・リムーブエリアの【緑】のイベント2枚をデッキの下へ: 手札からレベル5か6の【緑】のイベントを使用",turn1:true,
    can:(p,x)=>x.st==="a"&&p.rm.filter(y=>C(y).t==="イベント"&&hasColor(y,"緑")).length>=2&&evUsable(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0)).length>0,
    aiCan:p=>myTurn(p)&&evUsable(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0)&&FX.eventAi(p,y)).length>0,
    run:async(p,x)=>{const xs=await pickCards(p,"コスト: デッキの下に移す【緑】のイベント（2枚）","",p.rm.filter(y=>C(y).t==="イベント"&&hasColor(y,"緑")),{min:2,max:2});if(xs.length<2)return false;
      for(const y of xs){detach(y);p.deck.push(y)}log("　コスト: 【緑】のイベント2枚をデッキの下へ","n");sleepCost(x);
      await useEventByEffect(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0),"使用する【緑】のイベント（レベル5か6）");return true}}]};
DEF["0287"]={ // 伊織無我 B03030
  unselectable:(q,y)=>bondFor(q,y,"大岡紅葉"),
  onAction:async(p,self,actor)=>{if(actor!==self||turnCount(self,"iori7"))return;useTurn(self,"iori7");await playFromHandSt(p,y=>hasColor(y,"緑")&&lvOf(y)<=6,"スリープ状態で登場させる【緑】のキャラ（レベル6以下）")}};
DEF["0293"]={ // 越水七槻 B03036
  enter:async p=>{await lookTop(p,4,y=>isChar(y)&&hasTrait(y,"探偵"),{max:1,title:"手札に加える［探偵］"})},
  abilities:[{label:"スリープ・手札の［探偵］をリムーブ: 他のレベル7以下をリムーブし、このキャラをデッキの下へ",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"探偵")),
    aiCan:p=>oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=7),
    run:async(p,x)=>{const r=await discard(p,1,"コスト: リムーブする［探偵］",p,y=>isChar(y)&&hasTrait(y,"探偵"));if(!r.length)return false;sleepCost(x);
      await rmChar(p,y=>y!==x&&lvOf(y)<=7);if(p.field.includes(x))toDeckBottom(x);return true}}]};
DEF["0421"]={kwSelf:p=>p.field.filter(y=>hasTrait(y,"警察")).length>=3?["突撃"]:[],hirameki:hiSleep}; // 綾小路文麿 B04020
DEF["0643"]={ // 佐々木小次郎 B06020（手札の【緑】の［YAIBA］のカットインは FX.grantedCutin）
  abilities:[{label:"スリープ・デッキの上から3枚リムーブ: 相手のキャラとコンタクトを発生",can:(p,x)=>x.st==="a"&&p.deck.length>=3&&opp(p).field.length>0,
    aiCan:(p,x)=>myTurn(p)&&p.deck.length>10&&oppHas(p,y=>apOf(y)<apOf(x)&&lvOf(y)>=5),
    run:async(p,x)=>{const t=await chooseChar(p,"コンタクトを発生させる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>apOf(y)<apOf(x)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      sleepCost(x);millSelf(p,3);if(t&&p.field.includes(x)&&opp(p).field.includes(t))await contact(p,x,t);return true}}]};
DEF["0646"]={ // 金棒博士 B06023
  enter:async p=>{drawN(p,1)},
  abilities:[{label:"スリープ・裏向きの証拠を1つ表向き: それが【ヒラメキ】を持つ［YAIBA］なら、そのヒラメキを発動",turn1:true,can:(p,x)=>p.solved&&x.st==="a"&&p.ev.some(e=>!e.up),aiCan:p=>p.ev.some(e=>!e.up),
    run:async(p,x)=>{sleepCost(x);const [e]=await pickCards(p,"コスト: 表向きにする裏向きの証拠","",p.ev.filter(e=>!e.up),{min:1,max:1,faceUp:false});if(!e)return false;flipUp(p,e);
      if(C(e).hr&&hasTrait(e,"YAIBA")&&await yes(p,"金棒博士",`${C(e).nm} の【ヒラメキ】を発動しますか？`,true)){if(!await FX.hirameki(p,e)&&/カードを1枚引く/.test(C(e).hr))drawN(p,1)}return true}}]};
DEF["0649"]={ // コウモリ男 B06026
  leaveOppTurn:async(p,x)=>{if(!p.rm.includes(x))return;detach(x);x.up=true;p.ev.push(x);log(`　${p.name} は ${C(x).nm} を表向きのまま証拠として得た（証拠${p.ev.length}）`)},
  hirameki:async o=>{await flipDown(o,1)}};
DEF["0662"]={ // 沖田総司 B06039
  apSelf:p=>myTurn(p)?1000:0,contactWin:async p=>{drawN(p,1);await discard(p,1)},hirameki:hiSleep};
DEF["0752"]={ // 綾小路文麿 B07020
  abilities:[{label:"スリープ・手札を1枚リムーブ: リムーブエリアのレベル5以下の［マロちゃん］か［警察］を登場",can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&lvOf(y)<=5&&(exactName("マロちゃん")(y)||hasTrait(y,"警察"))),
    aiCan:p=>p.hand.length>=2&&p.field.length<=3,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await enterFromRm(p,y=>lvOf(y)<=5&&(exactName("マロちゃん")(y)||hasTrait(y,"警察")),"登場させる［マロちゃん］か［警察］（レベル5以下）");return true}}]};
DEF["0866"]={ // 大滝悟郎 B08026
  enter:async p=>{await look5Event(p,y=>hasColor(y,"緑")&&(C(y).lv||0)<=6,"手札に加える【緑】のイベント（レベル6以下）")},
  abilities:[{label:"このキャラをリムーブエリアへ: 手札からレベル6以下のイベントを使用",can:p=>p.field.some(exactName("服部平次"))&&evUsable(p,y=>(C(y).lv||0)<=6).length>0,
    aiCan:p=>myTurn(p)&&evUsable(p,y=>(C(y).lv||0)<=6&&FX.eventAi(p,y)).length>0,
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});await runQueue();await useEventByEffect(p,y=>(C(y).lv||0)<=6,"使用するイベント（レベル6以下）");return true}}]};
DEF["0967"]={ // 沖田総司 B09023
  contactWin:async p=>{if(condOk("事件青＆緑",p)===true)oppFileUp(p)},hirameki:hiSleep};
DEF["1165"]={ // 遠山和葉 PR327
  contactWin:async(p,self)=>{if(turnCount(self,"kaz327"))return;useTurn(self,"kaz327");if(!await fileNameGuess(p))return;
    const t=await chooseChar(p,"突撃を与えるレベル6のキャラ",y=>lvOf(y)===6,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)giveKw(t,"突撃")}};

// ================= 白 =================
DEF["0043"]={noCase:true,apSelf:p=>myTurn(p)?1000:0}; // 京極真 B01051
DEF["0044"]={ // 工藤優作 B01052（スリープ状態で登場は FX.entersSleeping）
  enter:async p=>{const y=p.deck.shift();if(!y)return;checkDeck(p);log(`　デッキの上: ${C(y).nm} を公開`,"n");
    if(isChar(y)&&(C(y).lv||0)<=6){p.hand.push(y);await enterByEffect(p,y,"a")}else{p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}}};
DEF["0429"]={ // 中森青子 B04031
  abilities:[{label:"スリープ: ［黒羽快斗］をAP＋1000し突撃",can:(p,x)=>x.st==="a"&&p.field.some(exactName("黒羽快斗")),aiCan:p=>myTurn(p)&&p.field.some(y=>exactName("黒羽快斗")(y)&&y.st==="a"),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"AP＋1000と突撃を与える［黒羽快斗］",mine1(p,exactName("黒羽快斗")),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(t){apTurn(t,1000);giveKw(t,"突撃")}return true}}]};
DEF["0550"]={ // 黒羽快斗 B05048
  protectAlly:(q,self,y)=>y!==self&&exactName("中森青子")(y)&&bondFor(q,self,"中森青子"),
  onAction:async(p,self,actor)=>{if(actor!==self||turnCount(self,"kai7"))return;useTurn(self,"kai7");await enterFromRm(p,y=>hasColor(y,"白")&&lvOf(y)<=5,"登場させる【白】のキャラ（レベル5以下）")},
  hirameki:async o=>{await pickRmToHand(o,exactName("中森青子"),"手札に加える［中森青子］")}};
DEF["0558"]={ // 鈴木次郎吉 B05056
  leaveOppTurn:async p=>{drawN(p,1)},
  abilities:[{label:"スリープ: 手札からレベル6以下の［鈴木財閥］を登場",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"鈴木財閥")&&lvOf(y)<=6),aiCan:p=>p.field.length<5,
    run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>hasTrait(y,"鈴木財閥")&&lvOf(y)<=6,"登場させる［鈴木財閥］（レベル6以下）");return true}}]};
DEF["0673"]={ // 鉄剣十郎 B06052
  enter:async p=>{if(!p.hand.length||!p.rm.some(y=>isChar(y)&&hasTrait(y,"YAIBA")&&lvOf(y)<=6))return;
    if(!await yes(p,"鉄剣十郎","手札を1枚リムーブして、リムーブエリアのレベル6以下の［YAIBA］をスリープ状態で登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await enterFromRmSt(p,y=>hasTrait(y,"YAIBA")&&lvOf(y)<=6,"スリープ状態で登場させる［YAIBA］（レベル6以下）")}};
DEF["0689"]={ // 京極真 B06068
  contactWin:async(p,self)=>{if(!bondFor(p,self,"鈴木園子")||turnCount(self,"kyo68")||!p.hand.length)return;
    if(!await yes(p,"京極真","手札を1枚リムーブして、このキャラをアクティブにし、突撃［事件］を得ますか？（突撃［キャラ］は失う）",()=>opp(p).ev.length>0&&p.hand.length>=2))return;
    useTurn(self,"kyo68");await discard(p,1);activateC(self);giveKw(self,"突撃［キャラ］喪失");giveKw(self,"突撃［事件］")}};
DEF["0766"]={ // 黒羽快斗 B07037
  enter:async p=>{if(p.pa.filter(bigJewel).length<2||!p.rm.some(y=>exactName("中森青子")(y)&&lvOf(y)<=6))return;
    if(!await yes(p,"黒羽快斗","パートナーエリアの［ビッグジュエル］を2枚リムーブして、［中森青子］をスリープ状態で登場させますか？",true))return;
    for(const y of p.pa.filter(bigJewel).slice(0,2)){detach(y);p.rm.push(y)}log("　パートナーエリアの［ビッグジュエル］を2枚リムーブ","n");
    await enterFromRmSt(p,y=>exactName("中森青子")(y)&&lvOf(y)<=6,"スリープ状態で登場させる［中森青子］（レベル6以下）")}};
DEF["0792"]={ // 鈴木園子 B07063
  onAction:async(p,self,actor)=>{if(!p.field.includes(actor)||apOf(actor)<7000||turnCount(self,"sono7"))return;useTurn(self,"sono7");giveKw(actor,"勝利ドロー1")},
  abilities:[{label:"スリープ・手札を1枚リムーブ: LP0の［高校生］をアクティブにしてAP＋1000",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.length>0&&allChars().some(y=>lpOf(y)===0&&hasTrait(y,"高校生")),
    aiCan:p=>myTurn(p)&&p.hand.length>=2&&p.field.some(y=>lpOf(y)===0&&hasTrait(y,"高校生")&&y.st!=="a"),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const t=await chooseChar(p,"アクティブにするLP0の［高校生］",y=>lpOf(y)===0&&hasTrait(y,"高校生"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st!=="a").slice(0,1)});
      if(t){activateC(t);apTurn(t,1000)}return true}}]};
DEF["0983"]={ // 鈴木園子 B09040
  enter:async(p,x)=>{const f=y=>isChar(y)&&hasTrait(y,"鈴木財閥");if(!p.hand.some(f))return;
    if(!await yes(p,"鈴木園子","このキャラをスリープさせ、手札の［鈴木財閥］をリムーブして、そのレベル以下のキャラをリムーブしますか？",()=>p.hand.some(y=>f(y)&&oppHas(p,z=>lvOf(z)<=lvOf(y)&&lvOf(z)>=4))))return;
    sleepC(x);const [h]=await discard(p,1,"リムーブする［鈴木財閥］",p,f);const lv=h?C(h).lv||0:0;await rmChar(p,lvLe(lv),`リムーブするキャラ（レベル${lv}以下）`)},
  abilities:[{label:"相手のレベル6以下に「ガードできる場合、必ずガードする」",turn1:true,can:(p,x)=>bondFor(p,x,"京極真")&&oppHas(p,lvLe(6)),aiCan:p=>myTurn(p)&&oppHas(p,y=>lvOf(y)<=6&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"必ずガードさせる相手のキャラ（レベル6以下）",y=>isOpp(p,y)&&lvOf(y)<=6,{ai:cs=>cs.filter(y=>isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(a)-apOf(b)).slice(0,1)});if(t)giveKw(t,"必ずガード");return true}}]};
DEF["0991"]={ // 中森銀三 B09048
  enter:async p=>{const f=y=>hasColor(y,"黄")&&hasTrait(y,"警察")&&lvOf(y)<=6;if(!p.hand.length||!p.rm.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"中森銀三","手札を1枚リムーブして、リムーブエリアのレベル6以下の【黄】の［警察］をスリープ状態で登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await enterFromRmSt(p,f,"スリープ状態で登場させる【黄】の［警察］（レベル6以下）")},
  abilities:[{label:"レベル6以上の【黄】の［警察］をこのキャラの下に重ねる: レベル6以下をリムーブ",can:(p,x)=>condOk("事件白＆黄",p)===true&&p.field.some(y=>y!==x&&hasColor(y,"黄")&&hasTrait(y,"警察")&&lvOf(y)>=6),
    aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=6),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: 下に重ねる【黄】の［警察］（レベル6以上）","",p.field.filter(y=>y!==x&&hasColor(y,"黄")&&hasTrait(y,"警察")&&lvOf(y)>=6),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});
      if(!c)return false;dropSets(p,c);resetMods(c);stackUnder(x,[c]);await rmChar(p,lvLe(6));return true}}]};

// ================= 黒 =================
DEF["0361"]={ // ライ B03112
  onCutinInContact:async(p,mine)=>{mine.apC+=2000;log(`　${C(mine).nm} をコンタクト中AP＋2000`,"n")},
  onAllyRemoved:async(p,self,info)=>{if(info.turn!==p.idx||info.x===self||info.by!==p||!info.effect||!hasColor(info.x,"黒")||turnCount(self,"rye7")||!p.field.includes(self))return;
    useTurn(self,"rye7");self.lpT+=1;log(`　${C(self).nm} をターン終了時までLP＋1`,"n")}};
DEF["0380"]={ // ラム B03131
  abilities:[{label:"【カットイン】を持つ【黒】のキャラに突撃",turn1:true,can:p=>p.field.some(y=>hasColor(y,"黒")&&!!C(y).ci),aiCan:p=>myTurn(p)&&p.field.some(y=>hasColor(y,"黒")&&!!C(y).ci&&y.fresh&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"突撃を与える【黒】のキャラ",mine1(p,y=>hasColor(y,"黒")&&!!C(y).ci),{ai:cs=>cs.filter(y=>y.fresh).concat(cs).slice(0,1)});if(t)giveKw(t,"突撃");return true}}]};
DEF["0471"]={ // ベルモット B04089
  onOppRemoved:async(q,self,info)=>{if(!myTurn(q)||info.by!==q||!info.effect||!partnerIs(q,"黒")||turnCount(self,"ver4")||self.st!=="a"||!q.field.includes(self))return;
    if(!await yes(q,"ベルモット","このキャラをスリープさせて、レベル7以下をリムーブしますか？",()=>oppHas(q,y=>lvOf(y)>=4&&lvOf(y)<=7)))return;useTurn(self,"ver4");sleepC(self);await rmChar(q,lvLe(7))}};
DEF["0718"]={}; // キャンティ B06101（突撃と、【黒】へのカットインAP＋1000はどちらも state.js で処理）
DEF["0927"]={ // マッドサイエンティスト B08091
  enter:async p=>{if(condOk("事件青＆黒",p)!==true||!p.field.some(y=>colorsOf(C(y).c).some(ch=>ch!=="黒")))return;
    await enterFromRmSt(p,y=>hasLeave(y)&&lvOf(y)<=6,"スリープ状態で登場させる【現場リムーブ時】を持つキャラ（レベル6以下）")},
  leaveOppTurn:async p=>{await flipDown(p,1)}};
DEF["1034"]={ // ベルモット B09095
  handLevel:(p,x)=>condOk("事件赤＆黒",p)===true&&p.solved&&myTurn(p)&&opp(p).refreshed?Math.max(0,(C(x).lv||0)-2):null,
  enter:async p=>{if(!opp(p).refreshed)millSelf(opp(p),2)}};
DEF["1040"]={ // 犯人 B09101
  abilities:[{label:"スリープ: レベル7以下をリムーブ",turn1:true,can:(p,x)=>condOk("事件犯人",p)===true&&x.st==="a",aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,lvLe(7));return true}}]};
