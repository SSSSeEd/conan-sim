"use strict";
// カード個別効果（全弾の未自動化カードの自動化。環境デッキに多く入っているものから）。DEF["カードID"]={...}。共通の部品は core.js・p11.js。

// --- 部品 ---
const leaveCard=y=>isChar(y)&&hasLeave(y);
// 現場にいるキャラの裏向きセットを合わせてn枚リムーブ（コスト）。filter に合うキャラのものだけ
const setCostCount=(p,f)=>p.field.filter(f).reduce((n,y)=>n+faceDownSet(y).length,0);
async function payFieldSets(p,f,n){
  if(setCostCount(p,f)<n)return false;
  for(let i=0;i<n;i++){
    const t=await chooseChar(p,"裏向きのカードをリムーブするキャラ",y=>p.field.includes(y)&&f(y)&&faceDownSet(y).length>0,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});
    if(!t||!removeSetCost(p,t))return false}
  return true}
// 【相手ターン中】【現場リムーブ時】手札から（条件に合う）カードを1枚リムーブしてもよい
const handLeaveCost=async(p,f,title)=>{if(!p.hand.some(f))return null;
  if(!await yes(p,title,"手札の【現場リムーブ時】を持つカードを1枚リムーブしますか？",true))return null;
  return (await discard(p,1,"リムーブするカード",p,f))[0]||null};

// --- 黒ずくめ・組織 ---
DEF["0914"]={ // ジン B08078
  abilities:[{label:"スリープ: キャラを1枚リムーブ（リムーブエリアに【現場リムーブ時】持ちが2枚以上）",
    can:(p,x)=>condOk("事件青＆黒",p)===true&&x.st==="a"&&p.rm.filter(leaveCard).length>=2,aiCan:p=>oppHas(p,y=>lvOf(y)>=5),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x);return true}}],
  leaveOppTurn:async p=>{const f=y=>leaveCard(y)&&lvOf(y)<=7&&colorAny(y,"青","黒");
    const y=await handLeaveCost(p,f,"ジン");if(!y)return;drawN(p,1);
    const d=def(y);if(d&&d.leaveOppTurn&&await yes(p,"ジン",`${C(y).nm} の【現場リムーブ時】を発動させますか？`,true))await d.leaveOppTurn(p,y)}};
DEF["0857"]={ // 脇田兼則 B08016
  enter:async p=>{if(condOk("事件青＆黒",p)!==true||p.solved)return;
    const got=await lookTop(p,3,y=>isChar(y)&&colorAny(y,"青","黒"),{max:1,title:"手札に加える【青】か【黒】のキャラ"});if(got.length)await discard(p,1)},
  leaveOppTurn:async p=>{if(await handLeaveCost(p,leaveCard,"脇田兼則"))drawN(p,2)}};
DEF["1031"]={ // キール B09092
  endTurn:async p=>{const o=opp(p);
    const i=await pickMode(p,"キール",["発見済み: 1枚引く（手札6枚以上なら1枚リムーブ）","未発見: 相手のデッキの上から4枚をリムーブ"],o.refreshed?0:1);
    if(i===0){if(!o.refreshed){log("　痕跡［未発見］なので効果なし","n");return}drawN(p,1);if(p.hand.length>=6)await discard(p,1)}
    else{if(o.refreshed){log("　痕跡［発見済み］なので効果なし","n");return}millSelf(o,4)}},
  abilities:[{label:"スリープ: レベル9以下のキャラを1枚リムーブ",can:(p,x)=>condOk("事件赤＆黒",p)===true&&x.st==="a",aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=9),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}}],
  hirameki:async o=>{millSelf(opp(o),4)}};
DEF["1063"]={ // キャンティ PR292
  abilities:[{label:"スリープ＋デッキの上から3枚リムーブ: カットインを持つ【黒】が3枚以上ならレベル7以下をリムーブ",
    can:(p,x)=>x.st==="a"&&p.deck.length>=3,aiCan:p=>p.deck.length>10&&oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);const xs=millSelf(p,3);
      if(xs.filter(y=>C(y).ci&&hasColor(y,"黒")).length>=3)await rmChar(p,y=>y!==x&&lvLe(7)(y),"リムーブするキャラ（レベル7以下）");return true}}],
  cutin:async p=>{if(!myTurn(p))return;const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};

// --- FBI ---
DEF["1004"]={ // ジョディ・スターリング B09062
  enter:async p=>{await lookTop(p,1,y=>isChar(y)&&hasTrait(y,"FBI"),{max:1,title:"手札に加える［FBI］のキャラ"})},
  abilities:[{label:"手札を1枚リムーブ: ターン終了時まで突撃",can:(p,x)=>p.hand.length>=1&&!x.kw.includes("突撃"),aiCan:(p,x)=>myTurn(p)&&p.hand.length>=3&&x.fresh,
    run:async(p,x)=>{await discard(p,1);giveKw(x,"突撃");return true}}]};

// --- 怪盗・ビッグジュエル ---
const kidBj=async(p,x)=>{if(!myTurn(p))return;const bj=p.pa.filter(bigJewel);if(!bj.length||!oppHas(p,y=>lvOf(y)<=7&&y.st!=="a"))return;
  if(!await yes(p,"怪盗キッド","パートナーエリアの［ビッグジュエル］を1枚リムーブして、レベル7以下のスリープかスタンのキャラをリムーブしますか？",true))return;
  const [b]=await pickCards(p,"リムーブする［ビッグジュエル］","",bj,{min:1,max:1});if(!b)return;
  detach(b);p.rm.push(b);log(`　パートナーエリアの ${C(b).nm} をリムーブ`,"n");
  await rmChar(p,y=>y!==x&&lvOf(y)<=7&&y.st!=="a","リムーブするキャラ（スリープかスタン・レベル7以下）")};
DEF["1054"]={ // 怪盗キッド PR269
  apSelf:p=>myTurn(p)?1000*p.pa.filter(bigJewel).length:0,enter:kidBj,disguise:kidBj};

// --- 緑（服部・遠山・警察）---
const policeG=y=>isChar(y)&&hasTrait(y,"警察")&&hasColor(y,"緑");
const heijiOrPolice=y=>named("服部平次")(y)||policeG(y);
DEF["1083"]={ // 遠山和葉 B10022
  abilities:[
    {label:"スリープ: レベル8以下のキャラを1枚リムーブ",can:(p,x)=>partnerIs(p,"緑")&&x.st==="a",aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8),
      run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(8)(y));return true}},
    {label:"裏向きのセットを合わせて2枚リムーブ: レベル7以下のスリープ状態のキャラをリムーブ",turn1:true,
      can:p=>setCostCount(p,heijiOrPolice)>=2,aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)>=4&&lvOf(y)<=7),
      run:async p=>{if(!await payFieldSets(p,heijiOrPolice,2))return false;await rmChar(p,y=>y.st==="s"&&lvLe(7)(y),"リムーブするスリープ状態のキャラ（レベル7以下）");return true}}]};
DEF["1084"]={ // 服部平次 B10023
  enter:async(p,x)=>{if(!partnerIs(p,"緑")||!p.solved)return;sleepC(x);if(!p.hand.length)return;
    if(!await yes(p,"服部平次","手札を1枚リムーブして、リムーブエリアのレベル6以下の【緑】の［警察］を登場させますか？",()=>p.rm.some(y=>policeG(y)&&lvOf(y)<=6)&&p.hand.length>=2))return;
    await discard(p,1);await enterFromRm(p,y=>policeG(y)&&lvOf(y)<=6,"登場させる【緑】の［警察］（レベル6以下）")},
  abilities:[{label:"裏向きのセットを合わせて2枚リムーブ: 1枚引く",turn1:true,can:p=>setCostCount(p,()=>true)>=2,aiCan:p=>setCostCount(p,()=>true)>=2,
    run:async p=>{if(!await payFieldSets(p,()=>true,2))return false;drawN(p,1);return true}}]};
DEF["1085"]={ // 大滝悟郎 B10024
  enter:async p=>{if(!partnerIs(p,"緑")||!p.hand.some(y=>isChar(y)&&hasTrait(y,"警察"))||!oppHas(p,apLe(8000)))return;
    if(!await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"警察"),"公開する［警察］のキャラ"))return;await rmChar(p,apLe(8000))},
  abilities:[{label:"スリープ: ［警察］のキャラにデッキの上から1枚を裏向きでセット",can:(p,x)=>x.st==="a"&&p.field.some(y=>hasTrait(y,"警察"))&&p.deck.length>0,aiCan:p=>p.deck.length>8,
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"セット先の［警察］のキャラ",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(p,t);return true}}],
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};

// ================= 第2弾 =================
const plainChar=y=>isChar(y)&&!(C(y).f||"").trim(); // 【カットイン】と【ヒラメキ】以外の元の能力を持たない
const exact=anyExact; // カード名［A］か［B］…
const bondOk=(p,n)=>condOk("絆"+n,p)===true;
const KEISATSU5=["降谷零","諸伏景光","伊達航","萩原研二","松田陣平"];
const keisatsu=exact(...KEISATSU5);
const lookKeisatsu=(p,n)=>lookTopRm(p,n,keisatsu,"手札に加えるカード（降谷零・諸伏景光・伊達航・萩原研二・松田陣平）");

// --- 黄（降谷・諸伏・伊達・萩原・松田）---
DEF["1123"]={ // 降谷零 B10067
  kwSelf:(p,x)=>bondOk(p,"諸伏景光")?["アクティブ指定"]:[],
  apSelf:(p,x)=>myTurn(p)?1000*(+bondOk(p,"萩原研二")+bondOk(p,"松田陣平")):0,
  endTurn:async(p,x)=>{if(bondOk(p,"伊達航")){activateC(x)}}};
DEF["1122"]={ // 伊達航 B10066
  contactWin:async(p,x)=>{if(!bondOk(p,"降谷零")||turnCount(x,"dt"))return;const f=y=>exact("諸伏景光","萩原研二","松田陣平")(y);
    if(!p.hand.some(f)||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"伊達航","手札の［諸伏景光］［萩原研二］［松田陣平］を1枚リムーブして、レベル7以下のキャラをリムーブしますか？",true))return;
    useTurn(x,"dt");await discard(p,1,"リムーブするカード",p,f);await rmChar(p,lvLe(7))}};
DEF["1124"]={ // 諸伏景光 B10068
  enter:async p=>{if(partnerIs(p,"黄"))await rmChar(p,apLe(8000))},
  endTurn:async p=>{if(bondOk(p,"降谷零"))await lookKeisatsu(p,2)}};
DEF["1133"]={ // 萩原研二 B10077
  apSelf:p=>myTurn(p)&&bondOk(p,"松田陣平")?1000:0,
  enter:async p=>{await lookKeisatsu(p,3)}};
DEF["1130"]={ // 風見裕也 B10074
  enter:async p=>{await enterFromRm(p,plainChar,"登場させる（【カットイン】と【ヒラメキ】以外の能力を持たないキャラ）")},
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};

// --- 赤（羽田・ジョディ・新出）---
DEF["1111"]={ // 羽田秀𠮷 B10052
  endTurn:async p=>{if(p.field.some(plainChar))drawN(p,1)},
  onAllyEnter:async(p,x,y)=>{if(!myTurn(p)||!plainChar(y))return;const t=await chooseChar(p,"ターン終了時までレベル－1するキャラ",z=>isOpp(p,z));if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}},
  abilities:[{label:"スリープ＋手札を1枚リムーブ: レベル9以下のキャラを1枚リムーブ",can:(p,x)=>x.st==="a"&&p.hand.length>=1,aiCan:p=>p.hand.length>=3&&oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=9),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}}]};
DEF["1109"]={ // ジョディ・スターリング B10050
  enter:async p=>{if(!partnerIs(p,"赤"))return;await rmChar(p,lvLe(7));drawN(p,1)},
  abilities:[{label:"スリープ＋このキャラをリムーブエリアへ＋手札を1枚リムーブ: キャラを1枚リムーブ",
    can:(p,x)=>x.st==="a"&&p.hand.length>=1&&p.field.some(y=>plainChar(y)&&lvOf(y)>=5),aiCan:p=>p.hand.length>=3&&oppHas(p,y=>lvOf(y)>=7),
    run:async(p,x)=>{sleepCost(x);removeCard(x,"コスト",{by:p});await discard(p,1);await runQueue();await rmChar(p,()=>true);return true}}]};
DEF["1113"]={ // 新出智明 B10054
  enter:async p=>{if(condOk("事件赤＆黄",p)!==true)return;
    const got=await lookTop(p,4,y=>colorAny(y,"赤","黄"),{max:1,title:"手札に加える【赤】か【黄】のカード"});
    if(got.length&&lvOf(got[0])<=6)await discard(p,1)}};

// --- 黒（ヘルエンジェル・ウォッカ・カルバドス）---
const ciBlack=y=>C(y).ci&&hasColor(y,"黒");
DEF["1144"]={ // ヘルエンジェル B10089
  abilities:[{label:"デッキの上から3枚リムーブ: カットインを持つ【黒】が3枚以上なら、カットインを持つレベル8以上の【黒】に突撃",turn1:true,
    can:p=>partnerIs(p,"黒")&&p.deck.length>=3,aiCan:p=>myTurn(p)&&p.deck.length>10&&p.field.some(y=>y.st==="a"&&ciBlack(y)&&lvOf(y)>=8),
    run:async p=>{const xs=millSelf(p,3);if(xs.filter(ciBlack).length>=3){
      const t=await chooseChar(p,"突撃を与えるキャラ",y=>!isOpp(p,y)&&ciBlack(y)&&lvOf(y)>=8,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)giveKw(t,"突撃")}return true}}]};
DEF["1145"]={ // ウォッカ B10090
  enter:async(p,x)=>{if(!partnerIs(p,"黒")||p.deck.length<3)return;
    if(!await yes(p,"ウォッカ","デッキの上から3枚をリムーブしますか？（カットインを持つ【黒】が3枚以上なら突撃）",()=>p.deck.length>10))return;
    if(millSelf(p,3).filter(ciBlack).length>=3)giveKw(x,"突撃")}};
DEF["1146"]={ // カルバドス B10091
  kwSelf:p=>p.field.filter(ciBlack).length>=4?["突撃"]:[],
  cutin:async(p,card,mine)=>{if(!myTurn(p)||!partnerIs(p,"黒")||!mine||!ciBlack(mine)||!hasColor(mine,"黒")||lvOf(mine)<8)return;
    if(!p.rm.includes(card)||p.field.length>=5)return;if(await enterFromRmCard(p,card))card.ciEnter=G.turnNo},
  endTurn:async(p,x)=>{if(x.ciEnter!==G.turnNo||!p.field.length)return;
    const [t]=await pickCards(p,"デッキの下に移すキャラ（必ず選ぶ）","",p.field,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(t)toDeckBottom(t)}};
async function enterFromRmCard(p,card){if(!p.rm.includes(card))return false;return await enterByEffect(p,card,"a")}

// --- 白（京極真・黒羽快斗）---
DEF["1097"]={ // 京極真 B10037
  onAllyContactWin:async(p,x,winner,victim)=>{if(winner===x||exactName("京極真")(winner)||apOf(winner)<10000||!p.hand.length)return;
    if(!await yes(p,"京極真","手札を1枚リムーブして、このキャラをAP＋4000しますか？",()=>p.hand.length>=2))return;await discard(p,1);apTurn(x,4000)},
  contactWin:async(p,x)=>{x.kyWin=G.turnNo},
  abilities:[{label:"1枚引き、このキャラをアクティブに",turn1:true,
    can:(p,x)=>condOk("事件緑＆白",p)===true&&apOf(x)>=10000&&x.kyWin===G.turnNo,aiCan:(p,x)=>x.st!=="a",
    run:async(p,x)=>{drawN(p,1);activateC(x);return true}}]};
DEF["1098"]={ // 黒羽快斗 B10038
  enter:async(p,x)=>{if(x.viaAb)x.kaitoGrant=G.turnNo},
  contactWin:async(p,x)=>{if(x.kaitoGrant!==G.turnNo||turnCount(x,"kg"))return;useTurn(x,"kg");await enterFromRm(p,y=>lvOf(y)<=3,"登場させるキャラ（レベル3以下）")},
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};

// --- 赤黒 ---
DEF["1049"]={ // 赤井秀一&ジン B09110
  enter:async p=>{if(condOk("事件赤＆黒",p)!==true)return;const t=await rmChar(p,y=>lvOf(y)>=7,"リムーブするキャラ（レベル7以上）");
    if(!t||opp(p).field.includes(t))return;const o=opp(p),nm=nameOf(t);let n=0;
    while(o.deck.length&&n<10){const y=popDeck(o);n++;o.rm.push(y);log(`　${o.name} のデッキの上: ${C(y).nm} を公開してリムーブエリアへ`,"n");if(isChar(y)&&sameName(y,t))break}
    checkDeck(o)},
  abilities:[{label:"1枚引き、手札を1枚リムーブするか、このキャラをリムーブ",turn1:true,partner:true,can:()=>true,aiCan:p=>p.hand.length>=3,
    run:async(p,x)=>{drawN(p,1);const i=p.hand.length?await pickMode(p,"赤井秀一&ジン",["手札を1枚リムーブ","このキャラをリムーブ"],0):1;
      if(i===0)await discard(p,1);else if(inArea(p,x)){detach(x);p.rm.push(x)}else removeCard(x,"コスト",{by:p});await runQueue();return true}}]};
