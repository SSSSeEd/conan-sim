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

// ================= 第3弾（環境デッキの残りから）=================
const mine1=(p,f)=>y=>!isOpp(p,y)&&f(y);
// 相手のFILEの一番上（パートナー以外）を表向きにする
function oppFileUp(p){const o=opp(p);const top=[...o.file].reverse().find(y=>y!==o.partner);
  if(!top){log("　相手のFILEにカードがない","n");return null}top.fu=true;log(`　相手のFILEの一番上を表向きに: ${C(top).nm}`,"n");return top}
const hasAny=(p,z,f)=>p[z].some(f);

// --- 青・緑（探偵・服部）---
DEF["0176"]={ // 毛利蘭 B02004
  onReason:async(p,x,actor)=>{if(actor===x)await ranTrig(p,x)},
  onAction:async(p,x,actor)=>{if(actor===x)await ranTrig(p,x)},
  leaveOppTurn:async p=>{await pickRmToHand(p,exactName("工藤新一"),"手札に加える［工藤新一］")}};
async function ranTrig(p,x){if(!bondOk(p,"工藤新一")||turnCount(x,"ran"))return;
  const f=y=>lvOf(y)<=5&&(exactName("妃英理")(y)||hasTrait(y,"毛利探偵事務所"));if(!p.rm.some(y=>isChar(y)&&f(y)))return;
  useTurn(x,"ran");await enterFromRm(p,f,"登場させる［妃英理］か［毛利探偵事務所］のキャラ（レベル5以下）")}
DEF["0845"]={ // 江戸川コナン B08004
  kwSelf:p=>partnerIs(p,"青")?["突撃"]:[],
  abilities:[{label:"アクティブな［灰原哀］を1枚スタン: このキャラをアクティブに",turn1:true,
    can:(p,x)=>condOk("事件青＆黒",p)===true&&bondOk(p,"灰原哀")&&p.file.length>=5&&p.rm.filter(y=>isChar(y)&&hasColor(y,"黒")).length>=3&&p.field.some(y=>y.st==="a"&&exactName("灰原哀")(y)),
    aiCan:(p,x)=>x.st!=="a",
    run:async(p,x)=>{const t=await chooseChar(p,"スタンさせる［灰原哀］",y=>!isOpp(p,y)&&y.st==="a"&&exactName("灰原哀")(y),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});
      if(!t)return false;stunC(t);activateC(x);return true}}]};
DEF["0965"]={ // 服部平次 B09021
  enter:async p=>{await rmChar(p,lvLe(8))},
  abilities:[{label:"相手のFILEの上を表向きに（キャラならキャラを1枚AP＋1000）",turn1:true,can:p=>condOk("事件青＆緑",p)===true,aiCan:p=>opp(p).file.length>1,
    run:async p=>{const top=oppFileUp(p);if(top&&isChar(top)){const t=await chooseChar(p,"ターン終了時までAP＋1000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)apTurn(t,1000)}return true}}]};
DEF["0950"]={ // 本堂瑛祐 B09005
  abilities:[{label:"スリープ＋手札の［探偵］のキャラを1枚公開: レベル7以下のキャラを1枚リムーブ",
    can:(p,x)=>condOk("事件青＆緑",p)===true&&x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"探偵")),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{const r=await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"探偵"),"公開する［探偵］のキャラ",{must:true});if(!r)return false;
      sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(7)(y));if(exactName("江戸川コナン")(r)||exactName("工藤新一")(r))oppFileUp(p);return true}}]};
DEF["0838"]={ // 黒衣の騎士・スペイド（工藤新一） D10003
  kwSelf:p=>condOk("事件シャッフルロマンス",p)===true?["突撃"]:[],
  enter:async p=>{const seen=[];let hit=null;
    while(p.deck.length){const y=popDeck(p);seen.push(y);log(`　デッキの上: ${C(y).nm} を公開`,"n");if(exactName("シャッフルロマンス")(y)){hit=y;break}}
    if(hit){seen.splice(seen.indexOf(hit),1);p.hand.push(hit);log(`　${C(hit).nm} を手札に`,"n")}
    p.deck.push(...seen);shuffle(p.deck)}};
DEF["0531"]={ // 服部平次＆遠山和葉 B05027
  partnerToo:true,
  abilities:[{label:"レベル8以下の【緑】のキャラをアクティブに、またはターン終了時まで突撃",turn1:true,
    can:p=>partnerIs(p,"緑")&&p.field.some(y=>hasColor(y,"緑")&&lvOf(y)<=8),aiCan:p=>p.field.some(y=>hasColor(y,"緑")&&lvOf(y)<=8&&y.st!=="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"対象のキャラ（レベル8以下の【緑】）",mine1(p,y=>hasColor(y,"緑")&&lvOf(y)<=8),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(!t)return false;
      const i=t.st==="a"?1:await pickMode(p,"服部平次＆遠山和葉",["アクティブにする","ターン終了時まで突撃"],0);
      if(i===0)activateC(t);else giveKw(t,"突撃");return true}}],
  onAllyEnter:async(p,self,y)=>{if(turnCount(self,"hk")||!exactName("服部平次")(y)&&!exactName("遠山和葉")(y))return;
    useTurn(self,"hk");const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a",{ai:cs=>cs.filter(y=>isOpp(p,y)).slice(0,1)});if(t)sleepC(t)}};
DEF["0639"]={ // 鬼丸猛 B06016
  enter:async p=>{if(!partnerIs(p,"緑")||p.deck.length<3||!oppHas(p,apLe(8000)))return;
    if(!await yes(p,"鬼丸猛","デッキの上から3枚をリムーブして、AP8000以下のキャラをリムーブしますか？",()=>p.deck.length>10))return;
    millSelf(p,3);await rmChar(p,apLe(8000))},
  abilities:[{label:"スリープ: 証拠を1つ手札に加えてもよい。そうしたら手札から1枚を裏向きで証拠に",can:(p,x)=>x.st==="a"&&p.ev.length>0,aiCan:()=>false,
    run:async(p,x)=>{sleepCost(x);const [e]=await pickCards(p,"手札に加える証拠","",p.ev,{max:1,ai:()=>[]});if(!e)return true;
      p.ev.splice(p.ev.indexOf(e),1);e.up=false;p.hand.push(e);log("　証拠を1つ手札に加えた","n");
      const [h]=await pickCards(p,"裏向きで証拠にする手札","",p.hand,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b))});
      if(h){p.hand.splice(p.hand.indexOf(h),1);h.up=false;p.ev.push(h);log("　手札から1枚を裏向きで証拠に","n")}return true}}]};
DEF["0644"]={ // 石川五右衛門 B06021
  onCaseGain:async(p,x,actor)=>{if(actor===x)drawN(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0648"]={ // ケロ介 B06025
  enter:async(p,x)=>{if(!p.field.some(y=>y!==x&&hasTrait(y,"YAIBA")))return;
    const i=await pickMode(p,"ケロ介",["ターン終了時まで突撃","ターン終了時までAP＋1000"],0);if(i===0)giveKw(x,"突撃");else apTurn(x,1000)},
  hirameki:async(o,e)=>{const t=await chooseChar(o,"リムーブする自分のキャラ（しなくてもよい）",mine1(o,()=>true),{ai:()=>[]});
    if(t){rmBy(o,t);await runQueue();await enterByEffect(o,e,"a")}}};

// --- 黒・赤黄（ラム・赤井秀一&安室透・松田陣平&萩原研二・キャンティ&コルン）---
DEF["0623"]={ // ラム PR138
  enter:async(p,x)=>{sleepC(x);if(!p.hand.length)return;
    if(!await yes(p,"ラム","手札を1枚リムーブして、リムーブエリアのレベル6以下の［黒ずくめの組織］を登場させますか？",()=>p.rm.some(y=>isChar(y)&&hasTrait(y,"黒ずくめの組織")&&lvOf(y)<=6)))return;
    await discard(p,1);await enterFromRm(p,y=>hasTrait(y,"黒ずくめの組織")&&lvOf(y)<=6,"登場させる［黒ずくめの組織］（レベル6以下）")},
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};
DEF["1154"]={ // 赤井秀一＆安室透 B10099
  partnerToo:true,
  lvAura:(q,y,x)=>myTurn(q)&&ownerOf(x)!==q?-1:0,
  enter:async p=>{await rmChar(p,lvLe(7))},
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||turnCount(self,"ra")>=2||y===self||!plainChar(y))return;
    if(!await yes(p,"赤井秀一＆安室透",`${C(y).nm} をスリープさせて、そのレベル以下のキャラをリムーブしますか？`,()=>oppHas(p,y2=>lvOf(y2)<=lvOf(y))))return;
    useTurn(self,"ra");sleepC(y);await rmChar(p,z=>z!==y&&lvOf(z)<=lvOf(y),"リムーブするキャラ")}};
DEF["1121"]={ // 松田陣平＆萩原研二 B10065
  partnerToo:true,
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||y===self||turnCount(self,"mh")||!keisatsu(y))return;useTurn(self,"mh");await rmChar(p,lvLe(9))},
  endTurn:async p=>{if(!bondOk(p,"降谷零")||!p.hand.length||!p.rm.some(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=3))return;
    if(!await yes(p,"松田陣平＆萩原研二","手札を1枚リムーブして、リムーブエリアのレベル3以下の［警察］をスリープ状態で登場させますか？",true))return;
    await discard(p,1);const [y]=await pickCards(p,"登場させる［警察］（レベル3以下）","",p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=3),{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(y)await enterByEffect(p,y,"s")},
  abilities:[{label:"［降谷零］［諸伏景光］［伊達航］を1枚ターン終了時までAP＋2000",turn1:true,partner:true,
    can:p=>p.field.some(exactName3),aiCan:p=>myTurn(p)&&p.field.some(exactName3),
    run:async p=>{const t=await chooseChar(p,"AP＋2000するキャラ",mine1(p,exactName3),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(!t)return false;apTurn(t,2000);return true}}]};
function exactName3(y){return anyExact("降谷零","諸伏景光","伊達航")(y)}
DEF["1140"]={ // キャンティ＆コルン B10085
  partnerToo:true,
  onAllyCutin:async(p,self,mine)=>{if(!myTurn(p)||!mine)return;mine.apA=(mine.apA||0)+2000;log(`　${C(mine).nm} をコンタクト中AP＋2000`,"n")},
  abilities:[{label:"デッキの上から3枚リムーブ: カットインを持つ【黒】が3枚以上ならレベル9以下をリムーブし1枚引く",turn1:true,
    can:p=>partnerIs(p,"黒")&&p.deck.length>=3,aiCan:p=>p.deck.length>10&&oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=9),
    run:async p=>{if(millSelf(p,3).filter(ciBlack).length>=3){await rmChar(p,lvLe(9));drawN(p,1)}return true}}]};
DEF["1082"]={ // 服部平蔵＆遠山銀司郎 B10021
  partnerToo:true,
  abilities:[{label:"レベル9以下のキャラをリムーブ。［警察］にデッキの上を裏向きでセット（［警察］が2枚以上）",turn1:true,
    can:p=>partnerIs(p,"緑")&&p.field.filter(y=>hasTrait(y,"警察")).length>=2,aiCan:p=>oppHas(p,lvLe(9)),
    run:async p=>{await rmChar(p,lvLe(9));const t=await chooseChar(p,"セット先の［警察］のキャラ",mine1(p,y=>hasTrait(y,"警察")),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(p,t);return true}},
    {label:"裏向きのセットを1枚リムーブ: 1枚引き、手札を1枚リムーブ",turn2:true,partner:true,can:p=>setCostCount(p,()=>true)>=1,aiCan:p=>setCostCount(p,()=>true)>=1,
      run:async p=>{if(!await payFieldSets(p,()=>true,1))return false;drawN(p,1);await discard(p,1);return true}}]};

// --- 白（ビッグジュエル・紅子）---
const jewelHand=y=>bigJewel(y);
DEF["0762"]={ // 怪盗キッド B07033
  kwSelf:p=>partnerIs(p,"白")?["突撃"]:[],
  apSelf:p=>myTurn(p)&&p.pa.filter(bigJewel).length>=2?2000:0,
  disguise:async p=>{await toPaWithReturnNo(p,p.rm.filter(bigJewel),"パートナーエリアに移す［ビッグジュエル］のイベント")}};
DEF["0761"]={ // 白馬探 B07032
  abilities:[{label:"スリープ＋手札を1枚リムーブ: AP8000以下のキャラを1枚リムーブ。パートナーエリアの［ビッグジュエル］を1枚リムーブしたら2枚引く",
    can:(p,x)=>x.st==="a"&&p.hand.length>=1,aiCan:p=>p.hand.length>=2&&oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await rmChar(p,y=>y!==x&&apLe(8000)(y));
      const bj=p.pa.filter(bigJewel);if(bj.length&&await yes(p,"白馬探","パートナーエリアの［ビッグジュエル］を1枚リムーブして2枚引きますか？",true)){
        const [b]=await pickCards(p,"リムーブする［ビッグジュエル］","",bj,{min:1,max:1});if(b){detach(b);p.rm.push(b);drawN(p,2)}}return true}}]};
DEF["0982"]={ // 中森青子 B09039
  enter:async p=>{const c=[...p.pa,...p.rm].filter(bigJewel);if(!c.length)return;const [y]=await pickCards(p,"手札に加える［ビッグジュエル］のイベント","",c,{max:1,ai:c=>c.slice(0,1)});
    if(y){detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}},
  abilities:[{label:"手札のレベル5の［ビッグジュエル］のイベントを1枚使用: リムーブエリアのレベル3以下の【白】を手札に、手札を1枚リムーブ",turn1:true,
    can:p=>p.hand.some(y=>bigJewel(y)&&lvOf(y)===5&&!playableReason(p,y,false,true)),aiCan:p=>p.hand.some(y=>bigJewel(y)&&lvOf(y)===5&&!playableReason(p,y,false,true)),
    run:async(p,x)=>{const [e]=await pickCards(p,"使用する［ビッグジュエル］のイベント（レベル5）","",p.hand.filter(y=>bigJewel(y)&&lvOf(y)===5&&!playableReason(p,y,false,true)),{min:1,max:1,ai:c=>c.slice(0,1)});
      if(!e||!await useFromHand(p,e,false,true))return false;
      const n=p.hand.length;await pickRmToHand(p,y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=3,"手札に加える【白】のキャラ（レベル3以下）");if(p.hand.length>n)await discard(p,1);return true}}]};
DEF["0789"]={ // クリスタル・マザー B07060
  event:async(p,x)=>{if(!partnerIs(p,"白"))return noEff();drawN(p,1);
    await playFromHand(p,y=>hasColor(y,"白")&&lvOf(y)<=p.file.length,"登場させる【白】のキャラ（FILEの枚数以下のレベル）");
    if(p.rm.includes(x))toPartnerArea(p,x)},
  ai:p=>partnerIs(p,"白"),
  hirameki:async(o,e)=>{if(o.rm.includes(e))toPartnerArea(o,e)}};
DEF["0784"]={ // 紅の盟約 B07055
  event:async p=>{if(!condOk("事件赤魔術",p)||!partnerIs(p,"白"))return noEff();
    await rmChar(p,apLe(8000));
    if(setCostCount(p,()=>true)>=2&&oppHas(p,apLe(6000))&&await yes(p,"紅の盟約","裏向きのセットを合わせて2枚リムーブして、AP6000以下のキャラをもう1枚リムーブしますか？",true)){
      await payFieldSets(p,()=>true,2);await rmChar(p,apLe(6000))}},
  ai:p=>condOk("事件赤魔術",p)&&partnerIs(p,"白")&&oppHas(p,apLe(8000))};
DEF["0760"]={ // 小泉紅子 B07031
  enter:async(p,x)=>{setTop(p,x)},
  abilities:[{label:"スリープ＋手札を1枚リムーブ: キャラを1枚リムーブ。セット2枚をリムーブしたらリムーブエリアのレベル3以下の【白】を登場",
    can:(p,x)=>condOk("事件赤魔術",p)===true&&x.st==="a"&&p.hand.length>=1,aiCan:p=>p.hand.length>=2&&oppHas(p,y=>lvOf(y)>=5),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await rmChar(p,y=>y!==x);
      if(setCostCount(p,()=>true)>=2&&p.rm.some(y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=3)&&await yes(p,"小泉紅子","裏向きのセットを合わせて2枚リムーブして、リムーブエリアのレベル3以下の【白】を登場させますか？",true)){
        await payFieldSets(p,()=>true,2);await enterFromRm(p,y=>hasColor(y,"白")&&lvOf(y)<=3,"登場させる【白】のキャラ（レベル3以下）")}return true}}]};

// ================= 第4弾 =================
const sleepHirameki=async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)};
const fbi=y=>isChar(y)&&hasTrait(y,"FBI");
const ownT=(p)=>({ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});
DEF["0193"]={ // 遠山和葉 B02023
  enter:async p=>{const t=await chooseChar(p,"セット先のキャラ",mine1(p,()=>true),ownT(p));if(t)setTop(p,t)},
  abilities:[{label:"裏向きのセットを1枚リムーブ: キャラを1枚スリープ",turn1:true,can:p=>setCostCount(p,()=>true)>=1,aiCan:p=>setCostCount(p,()=>true)>=1&&oppHas(p,y=>y.st==="a"),
    run:async p=>{if(!await payFieldSets(p,()=>true,1))return false;const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);return true}}],
  hirameki:sleepHirameki};
DEF["0448"]={ // アンドレ・キャメル B04056
  lpSelf:p=>p.solved?1:0,
  enter:async p=>{if(p.solved||!p.hand.some(fbi))return;if(!await yes(p,"アンドレ・キャメル","手札の［FBI］のキャラを1枚リムーブして2枚引きますか？",true))return;
    await discard(p,1,"リムーブする［FBI］のキャラ",p,fbi);drawN(p,2)}};
DEF["0569"]={ // ジェイムズ・ブラック B05069
  abilities:[{label:"スリープ: レベル8以下のキャラを1枚リムーブ（［FBI］が3枚以上）",can:(p,x)=>partnerIs(p,"赤")&&x.st==="a"&&p.field.filter(fbi).length>=3,aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(8)(y));return true}}],
  hirameki:sleepHirameki};
DEF["0661"]={ // 鬼丸猛 B06038
  kwSelf:p=>partnerIs(p,"緑")?["突撃"]:[],
  contactWin:async p=>{drawN(p,1)},
  onCaseGain:async(p,x,actor)=>{if(actor!==x)return;const o=opp(p);if(o.hand.length)await discard(o,1,"リムーブする手札",o)}};
DEF["0669"]={ // 峰さやか B06048
  enter:async p=>{const g=await lookTopRm(p,3,y=>hasTrait(y,"YAIBA"),"手札に加える［YAIBA］のカード");if(g&&p.solved)await discard(p,1)}};
DEF["0672"]={ // 柳生十兵衛三厳 B06051
  contactWin:async(p,x)=>{if(condOk("事件YAIBA",p)!==true||turnCount(x,"yg")||!p.hand.length)return;
    if(!await yes(p,"柳生十兵衛三厳","手札を1枚リムーブして、証拠を1つ得ますか？",true))return;useTurn(x,"yg");await discard(p,1);gainEv(p,1)}};
DEF["0777"]={ // 白馬探 B07048
  enter:async(p,x)=>{setTop(p,x)},
  abilities:[{label:"裏向きのセットを合わせて2枚リムーブ: 1枚引き、手札を1枚リムーブ",turn1:true,can:p=>partnerIs(p,"白")&&setCostCount(p,()=>true)>=2,aiCan:p=>setCostCount(p,()=>true)>=2,
    run:async p=>{if(!await payFieldSets(p,()=>true,2))return false;drawN(p,1);await discard(p,1);return true}}]};
const ciBlackCard=y=>C(y).ci&&hasColor(y,"黒");
DEF["0825"]={ // キャンティ B07098
  enter:async p=>{if(p.solved)return;millSelf(p,2);if(p.rm.some(y=>C(y).ci))drawN(p,1)},
  abilities:[{label:"手札の【カットイン】を持つ【黒】を1枚リムーブ: リムーブエリアのそれ1枚につきAP＋1000",turn1:true,can:p=>p.solved&&p.hand.some(ciBlackCard),aiCan:p=>myTurn(p)&&p.hand.length>=3&&p.rm.filter(ciBlackCard).length>=2,
    run:async(p,x)=>{await discard(p,1,"リムーブする【カットイン】を持つ【黒】",p,ciBlackCard);apTurn(x,1000*p.rm.filter(ciBlackCard).length);return true}}]};
DEF["0952"]={ // 脇田兼則 B09007
  enter:async(p,x)=>{if(!partnerIs(p,"黒")||!p.solved||!p.hand.some(y=>isChar(y)&&exactName("ラム")(y)&&lvOf(y)<=8))return;
    if(!await yes(p,"脇田兼則","このキャラをリムーブして、手札のレベル8以下の［ラム］を登場させますか？",true))return;
    removeCard(x,"効果",{by:p,effect:true});await runQueue();await playFromHand(p,y=>exactName("ラム")(y)&&lvOf(y)<=8,"登場させる［ラム］")},
  leaveOppTurn:async p=>{drawN(p,1)}};
DEF["1033"]={ // ジン B09094
  kwSelf:p=>{const k=[];if(condOk("事件赤＆黒",p)===true)k.push("突撃［キャラ］");if(opp(p).refreshed)k.push("突撃［事件］");return k},
  enter:async p=>{if(!opp(p).refreshed)millSelf(opp(p),2)}};
DEF["1036"]={ // コルン B09097
  enter:async p=>{if(condOk("事件赤＆黒",p)!==true||p.solved)return;const f=y=>colorAny(y,"赤","黒");if(!p.hand.some(f))return;
    if(!await yes(p,"コルン","手札の【赤】か【黒】を1枚リムーブして2枚引きますか？",true))return;
    const [y]=await discard(p,1,"リムーブする【赤】か【黒】のカード",p,f);drawN(p,2);if(y&&lvOf(y)>=7)millSelf(opp(p),3)}};
DEF["1042"]={ // ライ B09103
  apSelf:p=>myTurn(p)&&opp(p).refreshed?2000:0,
  enter:async p=>{if(!p.solved)millSelf(opp(p),3)},hirameki:sleepHirameki};
DEF["1129"]={ // 鬼塚八蔵 B10073
  enter:async(p,x)=>{if(p.solved&&x.viaAb)drawN(p,1)},
  hirameki:async o=>{await pickRmToHand(o,keisatsu,"手札に加える［降谷零］［諸伏景光］［伊達航］［萩原研二］［松田陣平］")}};
DEF["1143"]={ // バーボン B10088
  kwSelf:()=>["突撃"],
  contactWin:async(p,x)=>{if(!partnerIs(p,"黒")||!bondOk(p,"スコッチ")||turnCount(x,"bb")||p.deck.length<3)return;
    if(!await yes(p,"バーボン","デッキの上から3枚をリムーブしますか？（カットインを持つ【黒】が3枚以上なら、リムーブエリアのレベル3以下の【黒】を登場）",()=>p.deck.length>10))return;
    useTurn(x,"bb");if(millSelf(p,3).filter(ciBlack).length>=3)await enterFromRm(p,y=>hasColor(y,"黒")&&lvOf(y)<=3,"登場させる【黒】のキャラ（レベル3以下）")}};
DEF["0485"]={ // 遠山和葉 PR098
  enter:async p=>{if(!p.solved)await lookTop(p,2,y=>isChar(y)&&hasTrait(y,"高校生"),{max:1,title:"手札に加える［高校生］のキャラ"})},
  abilities:[{label:"他の［高校生］のキャラをターン終了時までAP＋1000",turn1:true,can:(p,x)=>p.solved&&p.field.some(y=>y!==x&&hasTrait(y,"高校生")),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&hasTrait(y,"高校生")&&y.st==="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"AP＋1000する［高校生］",y=>!isOpp(p,y)&&y!==x&&hasTrait(y,"高校生"),ownT(p));if(!t)return false;apTurn(t,1000);return true}}]};
DEF["1062"]={ // 紫紅の爪 PR291
  event:async(p,x)=>{if(!partnerIs(p,"白")||!p.solved)return noEff();
    await rmChar(p,y=>apOf(y)>=7000);if(p.rm.includes(x))toPartnerArea(p,x);
    if(p.field.some(exactName("怪盗キッド"))){const cs=p.hand.filter(y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=3);
      if(cs.length){const [y]=await pickCards(p,"スリープ状態で登場させる【白】のキャラ（レベル3以下）","",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(y)await enterByEffect(p,y,"s")}}},
  ai:p=>partnerIs(p,"白")&&p.solved&&oppHas(p,y=>apOf(y)>=7000),
  hirameki:async(o,e)=>{if(o.rm.includes(e))toPartnerArea(o,e)}};
DEF["1161"]={ // ジョディ・スターリング PR308
  abilities:[{label:"スリープ＋デッキの上から3枚リムーブ: ［FBI］が2枚以上ならレベル7以下をリムーブ。相手のキャラをレベル－1",turn1:true,
    can:(p,x)=>partnerIs(p,"赤")&&x.st==="a"&&p.deck.length>=3,aiCan:p=>p.deck.length>10&&oppHas(p,y=>lvOf(y)>=5),
    run:async(p,x)=>{sleepCost(x);if(millSelf(p,3).filter(fbi).length>=2)await rmChar(p,y=>y!==x&&lvLe(7)(y));
      const t=await chooseChar(p,"ターン終了時までレベル－1するキャラ",y=>isOpp(p,y));if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}return true}}]};
// --- 第4弾 ---
DEF["1086"]={ // 鬼丸猛 B10025
  enter:async p=>{const seen=[];let got=null;
    while(p.deck.length&&!got){const y=popDeck(p);if(!y)break;seen.push(y);log(`　${p.name} は ${C(y).nm} を公開`,"n");
      if(C(y).t==="イベント"&&C(y).hr&&C(y).lv===7&&hasColor(y,"緑"))got=y}
    for(const y of seen){if(y===got){p.hand.push(y);log(`　${C(y).nm} を手札に加えた`,"n")}else p.deck.push(y)}
    shuffle(p.deck)},
  onCaseGain:async(p,x)=>{if(!p.solved||!myTurn(p)||turnCount(x,"og"))return;useTurn(x,"og");const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};
DEF["0930"]={...solvedDiscard, // 裏切りの街角 B08094
  abilities:[{label:"裏向きの証拠2つを表に: デッキの上3枚から【現場リムーブ時】のキャラを手札に",turn1:true,
    can:p=>p.solved&&faceDownEv(p).length>=2&&p.field.some(anyExact("シェリー","灰原哀")),aiCan:p=>true,
    run:async p=>{if(!flipEvidence(p,2))return false;await lookTop(p,3,y=>isChar(y)&&hasLeave(y),{max:1,title:"手札に加える【現場リムーブ時】のキャラ"});return true}}]};
const caseAb=(label,can,run,ai=()=>true)=>({label,turn1:true,can:p=>p.solved&&can(p),aiCan:ai,run});
const flipCase=(n,label,extra,fn)=>({...solvedDiscard,abilities:[caseAb(label,p=>faceDownEv(p).length>=n&&extra(p),async p=>{if(!flipEvidence(p,n))return false;await fn(p);return true})]});
const rmEv=(f,t)=>async p=>{await pickRmToHand(p,y=>C(y).t==="イベント"&&f(y),t)};
DEF["1095"]=flipCase(2,"裏向きの証拠2つを表に: 1枚引く（［警察］の【緑】が2枚以上）",p=>p.field.filter(y=>hasTrait(y,"警察")&&hasColor(y,"緑")).length>=2,async p=>drawN(p,1)); // 大阪ダブルミステリー B10034
DEF["1138"]=flipCase(2,"裏向きの証拠2つを表に: デッキの上2枚から［降谷零］などを手札に、残りをリムーブ",p=>p.field.some(anyExact("降谷零")), // 出会っていた5人組 B10082
  async p=>{await lookTopRm(p,2,anyExact("降谷零","諸伏景光","伊達航","萩原研二","松田陣平"),"手札に加えるカード")});
DEF["0790"]=flipCase(1,"裏向きの証拠1つを表に: リムーブエリアの［ビッグジュエル］をパートナーエリアに",()=>true, // 日輪の後光の巻 B07061
  async p=>{await toPaWithReturnNo(p,p.rm.filter(bigJewel),"パートナーエリアに移す［ビッグジュエル］のイベント")});
DEF["0791"]=flipCase(2,"裏向きの証拠2つを表に: リムーブエリアの［赤魔術］のイベントを手札に",p=>p.field.some(anyExact("小泉紅子")), // 緋色の誘惑の巻 B07062
  rmEv(y=>hasTrait(y,"赤魔術"),"手札に加える［赤魔術］のイベント"));
DEF["0686"]=flipCase(2,"裏向きの証拠2つを表に: リムーブエリアの［YAIBA］のイベントを手札に",()=>true, // 伝説の玉探し B06065
  rmEv(y=>hasTrait(y,"YAIBA"),"手札に加える［YAIBA］のイベント"));
DEF["0842"]=flipCase(2,"裏向きの証拠2つを表に: ［シャッフルロマンス］を手札に加える／使用する",p=>p.rm.some(anyExact("シャッフルロマンス"))||p.hand.some(y=>anyExact("シャッフルロマンス")(y)&&C(y).t==="イベント"), // The Black Knight D10026
  async p=>{const inRm=p.rm.filter(anyExact("シャッフルロマンス")),inHand=p.hand.filter(y=>anyExact("シャッフルロマンス")(y)&&C(y).t==="イベント"&&!playableReason(p,y,false,true));
    const opts=[];if(inRm.length)opts.push(0);if(inHand.length)opts.push(1);
    let m=opts[0];if(opts.length>1)m=opts[await pickMode(p,"The Black Knight",["リムーブエリアの［シャッフルロマンス］を手札に加える","手札の［シャッフルロマンス］のイベントを使用する"],0)];
    if(m===0)await pickRmToHand(p,anyExact("シャッフルロマンス"),"手札に加える［シャッフルロマンス］");
    else if(m===1)await useFromHand(p,inHand[0],false,true)});
DEF["0788"]={ // 赤い涙 B07059
  event:async(p,x)=>{if(!partnerIs(p,"白"))return noEff();await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");if(p.rm.includes(x))toPartnerArea(p,x)},
  ai:p=>partnerIs(p,"白")&&oppHas(p,apLe(8000)),hirameki:async(o,e)=>{if(o.rm.includes(e))toPartnerArea(o,e)}};
DEF["0656"]={ // 「わが味方となるべし!!」B06033
  event:async p=>{
    if(p.ev.length&&await yes(p,"わが味方となるべし!!","証拠を1つ手札に加えて、手札から1枚を裏向きで証拠にしますか？",false)){
      const [e]=await pickCards(p,"手札に加える証拠","",p.ev,{max:1,ai:()=>[]});
      if(e){p.ev.splice(p.ev.indexOf(e),1);e.up=false;p.hand.push(e);log("　証拠を1つ手札に加えた","n");
        const [h]=await pickCards(p,"裏向きで証拠にする手札","",p.hand,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b))});
        if(h){p.hand.splice(p.hand.indexOf(h),1);h.up=false;p.ev.push(h);log("　手札から1枚を裏向きで証拠に","n")}}}
    await playFromHand(p,y=>hasColor(y,"緑")&&hasTrait(y,"YAIBA")&&lvOf(y)<=6,"登場させる【緑】の［YAIBA］（レベル6以下）")},
  ai:p=>p.hand.some(y=>isChar(y)&&hasColor(y,"緑")&&hasTrait(y,"YAIBA")&&lvOf(y)<=6),
  hirameki:async(o,e)=>{if(o.rm.includes(e))rmToHand(o,e)}};
DEF["0768"]={ // アン王女 B07039
  abilities:[{label:"パートナーエリアの［ビッグジュエル］を1枚リムーブ: 1枚引く",turn1:true,can:p=>p.solved&&p.pa.some(bigJewel),aiCan:p=>p.pa.some(bigJewel),
    run:async p=>{const [b]=await pickCards(p,"リムーブする［ビッグジュエル］","",p.pa.filter(bigJewel),{min:1,max:1});if(!b)return false;detach(b);p.rm.push(b);drawN(p,1);return true}}]};
DEF["0364"]={ // ラム B03115
  enter:async p=>{await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");
    const g=await lookTop(p,3,ciBlack,{max:1,title:"手札に加える【カットイン】を持つ【黒】"});if(g.length)await discard(p,1)}};
DEF["0934"]={ // 大和敢助 PR236
  abilities:[{label:"スリープ: AP5000以下のスリープ状態のキャラを1枚リムーブ",turn1:true,can:(p,x)=>x.st==="a",aiCan:p=>oppHas(p,y=>y.st!=="a"&&apOf(y)<=5000),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y.st==="s"&&apOf(y)<=5000,"リムーブするスリープ状態のキャラ（AP5000以下）");return true}},
  {label:"スリープ: AP8000以下のキャラを1枚リムーブ（名前の異なる［長野県警］が3枚以上）",turn1:true,
    can:(p,x)=>x.st==="a"&&new Set(p.field.filter(y=>hasTrait(y,"長野県警")).map(nameOf)).size>=3,aiCan:p=>oppHas(p,apLe(8000)),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");return true}}]};
DEF["0998"]={ // 赤井秀一 B09056
  enter:async(p,x)=>{if(condOk("事件赤＆黒",p)!==true||!partnerIs(p,"赤")||x.st!=="a")return;
    if(!await yes(p,"赤井秀一","このキャラをスリープさせて、レベル8以下のキャラをリムーブしますか？",()=>oppHas(p,lvLe(8))))return;
    sleepC(x);await rmChar(p,y=>y!==x&&lvLe(8)(y),"リムーブするキャラ（レベル8以下）");const o=opp(p);
    const can0=o.refreshed&&p.rm.some(y=>isChar(y)&&hasColor(y,"黒")&&lvOf(y)<=3),can1=!o.refreshed;
    if(!can0&&!can1)return;
    const i=can0&&can1?0:(can0?0:1);
    if(i===0)await enterFromRmS(p,y=>hasColor(y,"黒")&&lvOf(y)<=3,"スリープ状態で登場させる【黒】のキャラ（レベル3以下）");
    else millSelf(o,2*o.field.length)}};
DEF["0787"]={ // 「私があなたの心を…盗んであげる…」B07058
  event:async p=>{if(condOk("事件赤魔術",p)!==true)return noEff();
    const y=await enterFromRm(p,y=>hasColor(y,"白")&&lvOf(y)<=3,"登場させる【白】のキャラ（レベル3以下）");if(!y)return;
    apTurn(y,3000);giveKw(y,"突撃［キャラ］");setTop(p,y)},
  ai:p=>condOk("事件赤魔術",p)===true&&p.rm.some(y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=3)};

