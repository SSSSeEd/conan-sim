"use strict";
// カード個別効果（白）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 白（怪盗キッド） ---
DEF["0687"]={ // 怪盗キッド＆白馬探
  abilities:[{label:"相手のAP8000以下のキャラをデッキの下へ",turn1:true,
    can:(p,x)=>allChars().some(y=>!isOpp(p,y)&&y.st==="a"&&(y===x||C(y).ct&&C(y).ct.split(",").some(t=>hasTrait(x,t))))&&opp(p).field.some(y=>apOf(y)<=8000),
    run:async(p,x)=>{
      const costs=p.field.filter(y=>y.st==="a"&&(y===x||(C(y).ct||"").split(",").some(t=>hasTrait(x,t))));
      const [c]=await pickCards(p,"コスト: スリープさせるキャラ","このキャラか、同じ特徴を持つキャラ",costs,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>(a===x)-(b===x)||lvOf(a)-lvOf(b))});
      if(!c)return false;c.st="s";log(`　コスト: ${C(c).nm} をスリープ`,"n");
      const t=await chooseChar(p,"デッキの下に移す相手のキャラ（AP8000以下）",y=>isOpp(p,y)&&apOf(y)<=8000);
      if(t)toDeckBottom(t);return true}}],
  endTurn:async(p,x)=>{const n=p.field.filter(y=>y.st!=="a").length;if(n<3)return;
    const t=await chooseChar(p,"ターン終了時: アクティブにするキャラ",y=>y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(t)activateC(t)},
  partnerToo:true}; // この能力はパートナーエリアでも発動する
DEF["0301"]={ // 怪盗キッド B03046
  enter:async(p,x)=>{const t=await chooseChar(p,"登場時: スタンさせるキャラ");if(t)stunC(t)}};
DEF["0119"]={ // 怪盗キッド PR149
  enter:async(p,x)=>{if(!partnerIs(p,"白")||!p.hand.length)return;
    if(!await yes(p,"登場時","手札を1枚リムーブして、キャラを1枚スタン＋証拠を1つ得ますか？",()=>p.hand.length>=2))return;
    await discard(p,1);const t=await chooseChar(p,"スタンさせるキャラ");if(t)stunC(t);gainEv(p,1)}};
DEF["0205"]={ // 怪盗キッド B02038
  disguise:async(p,x)=>{drawN(p,1);x.apC+=1000;log(`　${C(x).nm} はこのコンタクト中AP＋1000`,"n")},
  enter:async(p,x)=>{const cs=p.rm.filter(y=>C(y).t==="キャラ"&&hasColor(y,"白")&&lvOf(y)<=4);if(!cs.length)return;
    const [y]=await pickCards(p,"登場時: リムーブエリアから登場","レベル4以下の【白】のキャラをスリープ状態で登場",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(y)await enterByEffect(p,y,"s")}};
DEF["0437"]={ // 「よォ名探偵…」
  event:async(p,x)=>{if(!partnerIs(p,"白")||!p.solved){log("　条件（パートナー白・解決編）を満たさないので効果なし","n");return}
    const t1=await chooseChar(p,"スタンさせるキャラ（1枚目）",y=>lvOf(y)<=10);if(!t1)return;stunC(t1);
    const t2=await chooseChar(p,"スタンさせるキャラ（2枚目・レベル合計10以下）",y=>y!==t1&&lvOf(y)+lvOf(t1)<=10);if(t2)stunC(t2)},
  ai:p=>p.solved&&partnerIs(p,"白")&&opp(p).field.length>0};
DEF["0210"]={ // 怪盗キッド B02044
  enter:async(p,x)=>{await lookTop(p,2,y=>C(y).t==="キャラ"&&!!C(y).dg,{title:"【変装】を持つキャラを1枚まで手札に"})},
  disguise:async(p,x)=>{await lookTop(p,2,y=>C(y).t==="キャラ"&&!!C(y).dg,{title:"【変装】を持つキャラを1枚まで手札に"})}};
DEF["0215"]={ // 中森青子 B02049
  onAction:async(p,self,actor)=>{if(!hasTrait(actor,"怪盗")||turnCount(self,"aoko"))return;useTurn(self,"aoko");actor.apT+=1000;log(`　${C(self).nm}: ${C(actor).nm} をターン終了時までAP＋1000`,"n")}};
DEF["1105"]={ // 中森銀三 B10045
  endTurn:async(p,x)=>{if(p.solved&&p.field.some(y=>C(y).nm.includes("中森青子"))&&x.st!=="a"){activateC(x)}}};

// --- 白（キッド・優作） ---
DEF["0979"]={ // 怪盗キッド B09036
  enter:async(p,x)=>{const cs=p.hand.filter(y=>isChar(y)&&lvOf(y)<=8);if(!cs.length)return;
    const cnt=n=>p.field.filter(y=>namesOf(y).includes(n)).length;
    const y=await revealFromHand(p,y=>isChar(y)&&lvOf(y)<=8,"カード名を書き換えるキャラを公開",{ai:c=>{const b=c.slice().sort((a,b)=>cnt(C(b).nm)-cnt(C(a).nm))[0];return b&&cnt(C(b).nm)>cnt(nameOf(x))?[b]:[]}});
    if(y){x.nmT=C(y).nm;log(`　${C(x).nm} のカード名はターン終了時まで［${x.nmT}］`,"n")}},
  abilities:[{label:"同じカード名のキャラの数に応じて効果",turn1:true,can:(p,x)=>p.file.length>=5&&p.field.filter(y=>sameName(y,x)).length>=2,
    run:async(p,x)=>{const n=p.field.filter(y=>sameName(y,x)).length;if(n>=2)await bottomChar(p,y=>y!==x&&apLe(8000)(y));if(n>=5)giveKw(x,"突撃［事件］");return true}}]};
DEF["0782"]={ // ロボット黒羽快斗 B07053
  enter:async(p,x)=>{if(await revealFromHand(p,named("黒羽快斗","怪盗キッド"),"公開する［黒羽快斗］か［怪盗キッド］",{ai:c=>myTurn(p)?c.slice(0,1):[]}))giveKw(x,"突撃")}};
DEF["0547"]={ // 怪盗キッド＆黒羽快斗 B05045
  abilities:[{label:"デッキの上から5枚リムーブ: AP8000以下のキャラをデッキの下へ",turn1:true,can:p=>partnerIs(p,"白")&&p.deck.length>5,aiCan:p=>p.deck.length>15&&oppHas(p,apLe(8000)),
    run:async(p,x)=>{millSelf(p,5);await bottomChar(p,y=>y!==x&&apLe(8000)(y));return true}},
    {label:"FILEの上から1枚を手札に、手札1枚をFILEの一番下へ",turn1:true,partner:true,noAi:true,can:p=>p.file.some(y=>y!==p.partner),
    run:async p=>{const top=[...p.file].reverse().find(y=>y!==p.partner);p.file.splice(p.file.indexOf(top),1);p.hand.push(top);log(`　FILEの上の ${C(top).nm} を手札に`,"n");
      const [y]=await pickCards(p,"FILEの一番下に移すカード","",p.hand,{min:1,max:1});if(y){detach(y);p.file.unshift(y);log(`　${C(y).nm} をFILEの一番下へ`,"n")}return true}}]};
DEF["0873"]={ // 工藤優作 B08034
  enter:async(p,x)=>{if(!condOk("事件白",p)||!partnerIs(p,"白"))return;await rmChar(p,y=>y!==x&&apLe(8000)(y));
    const t=await chooseChar(p,"デッキの上から1枚を裏向きでセットするキャラ",y=>!isOpp(p,y),{ai:cs=>cs.slice(0,1)});if(t)setTop(p,t)},
  onReason:async(p,self)=>{if(turnCount(self,"yus"))return;const cs=p.field.filter(y=>faceDownSet(y).length);if(!cs.length)return;
    if(!await yes(p,"工藤優作","セットされている裏向きのカードを1枚リムーブして、1枚引きますか？",true))return;useTurn(self,"yus");
    const [y]=await pickCards(p,"裏向きのカードをリムーブするキャラ","",cs,{min:1,max:1});if(y)removeSetCost(p,y);drawN(p,1)}};
DEF["0622"]={ // 工藤優作 PR137
  enter:async p=>{if(!partnerIs(p,"白"))return;const f=y=>y.st==="s"&&lvOf(y)<=7;
    const can1=p.file.length>=7;
    const v=p.cpu?(can1&&oppHas(p,f)&&p.deck.length>10?1:2):(can1?await ask(`${p.name}: 工藤優作 登場時`,"1つ選んで行います",[{label:"デッキの上から4枚リムーブ: スリープ状態のレベル7以下をスタン",value:1,primary:true},{label:"2枚引き、手札を2枚リムーブ",value:2}]):2);
    if(v===1){millSelf(p,4);const t=await chooseChar(p,"スタンさせるキャラ",f);if(t)stunC(t)}else{drawN(p,2);await discard(p,2)}}};
DEF["0310"]={ // 瀬戸瑞紀 B03055
  abilities:[{label:"【スリープ】このキャラをリムーブ: レベル5以上のキャラをスリープ",can:(p,x)=>x.st==="a"&&allChars().some(y=>y.st==="a"&&lvOf(y)>=5),aiCan:p=>!myTurn(p)||oppHas(p,y=>y.st==="a"&&lvOf(y)>=7),
    run:async(p,x)=>{x.st="s";removeCard(x,"コスト");await runQueue();const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a"&&lvOf(y)>=5);if(t)sleepC(t);return true}}]};
DEF["0692"]={ // 「閃光弾!?」
  event:async p=>{for(const y of allChars())if(y.st==="s")stunC(y)},
  ai:p=>opp(p).field.filter(y=>y.st==="s").length>p.field.filter(y=>y.st==="s").length};

// --- 白（工藤家・盗一） ---
const YUSAKU=named("工藤優作");
DEF["0981"]={ // 黒羽盗一 B09038
  disguise:async p=>{await pickRmToHand(p,YUSAKU,"手札に加える［工藤優作］")},
  enter:async(p,x)=>{const f=y=>isChar(y)&&YUSAKU(y)&&lvOf(y)<=6;if(!p.hand.some(f)||p.field.length>=5||!await yes(p,"登場時","このキャラをスリープさせて、手札からレベル6以下の［工藤優作］を登場させますか？",true))return;
    sleepC(x);const y=await playFromHand(p,f);if(y&&p.field.includes(y))setTop(p,y);drawN(p,1)}};
DEF["0980"]={ // 工藤優作 B09037
  apSelf:p=>myTurn(p)&&condOk("絆黒羽盗一",p)?1000:0,
  enter:async(p,x)=>{if(condOk("絆工藤有希子",p))giveKw(x,"突撃［事件］")}};
DEF["0872"]={ // 工藤有希子 B08033
  enter:async(p,x)=>{for(let i=0;i<p.field.length;i++)setTop(p,x)},
  abilities:[{label:"セットされた裏向きのカードを2枚リムーブ: 【白】のキャラをAP＋2000＋突撃［キャラ］",turn2:true,
    can:(p,x)=>partnerIs(p,"白")&&turnCount(x,"yk")<2&&setTotal(p.field)>=2,aiCan:p=>myTurn(p)&&p.field.some(y=>hasColor(y,"白")&&y.st==="a")&&opp(p).field.some(y=>y.st!=="a"),
    run:async(p,x)=>{useTurn(x,"yk");for(let i=0;i<2;i++){const cs=p.field.filter(y=>faceDownSet(y).length);const [y]=await pickCards(p,"コスト: 裏向きのカードをリムーブするキャラ","",cs,{min:1,max:1});if(!y)return false;removeSetCost(p,y)}
      const t=await chooseChar(p,"AP＋2000と突撃［キャラ］を与える【白】のキャラ",y=>!isOpp(p,y)&&hasColor(y,"白"),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t){apTurn(t,2000);giveKw(t,"突撃［キャラ］")}return true}}]};
DEF["0875"]={ // クリス・ヴィンヤード B08036
  abilities:[{label:"【スリープ】［工藤有希子］をセット: レベル7以下をデッキの下へ",can:(p,x)=>x.st==="a"&&p.rm.some(named("工藤有希子")),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);const [y]=await pickCards(p,"裏向きでセットする［工藤有希子］","",p.rm.filter(named("工藤有希子")),{max:1,ai:c=>c.slice(0,1)});if(!y)return true;
      detach(y);x.set.push({c:y,up:false});log(`　${C(x).nm} に ${C(y).nm} を裏向きでセット`,"n");await runQueue();await bottomChar(p,z=>z!==x&&lvLe(7)(z));return true}}]};
DEF["0554"]={ // 工藤優作 B05052
  apSelf:p=>myTurn(p)&&condOk("絆工藤有希子",p)?3000:0,
  kwSelf:p=>myTurn(p)&&condOk("絆工藤有希子",p)?["突撃"]:[],
  abilities:[{label:"手札かセットされたカードを1枚リムーブ: リムーブエリアのレベル3以下を登場",turn1:true,can:p=>condOk("絆工藤新一",p)&&p.field.length<5&&(p.hand.length>0||setTotal(allChars())>0)&&p.rm.some(y=>isChar(y)&&lvOf(y)<=3),
    run:async p=>{if(setTotal(allChars())>0&&(p.cpu||await ask(`${p.name}: コスト`,"",[{label:"セットされたカードをリムーブ",value:true,primary:true},{label:"手札をリムーブ",value:false}]))){if(!await removeAnySet(p,"コスト: 裏向きのカードをリムーブするキャラ"))return false}
      else await discard(p,1);await enterFromRm(p,y=>lvOf(y)<=3,"登場させるキャラ（レベル3以下）");return true}}]};
