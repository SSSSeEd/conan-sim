"use strict";
// カード個別効果（環境デッキの最後の未対応カード。仕組みが要るもの）。DEF["カードID"]={...}。共通の部品は core.js・p11.js・later.js。
// 追加した仕組み:
//  - セットのトリガー（engine.js の noteSetOn / noteSetOff → hooks.js の onLeave）: DEF の onSetOn(p,x,n)=このキャラにカードがセットされるたび、onSetOff(p,y,info)=自分のキャラのセットが現場から離れるたび
//  - コスト代替（hooks.js の FX.costSubs）: DEF の costSub(p,provider,user)。能力は「スリープ:」だけのコストか freeRun を持つもの
//  - 効果で手札のイベントを使用（engine.js の useFromHand の第4引数 byEffect。手札の使用の1ターン1回に数えない）
//  - 重ねる（blue.js の stackUnder）／カード名を指定して相手のFILEの上をリムーブ（fileNameGuess）／コンタクトを発生させる（engine.js の contact）

// --- 部品 ---
// 手札から効果でイベントを1枚まで使用する（レベル・事件の色・使用できない効果は通常と同じ。手札の使用には数えない）
const evUsable=(p,f)=>p.hand.filter(y=>C(y).t==="イベント"&&f(y)&&!playableReason(p,y,false,true));
async function useEventByEffect(p,f,title){
  const cs=evUsable(p,f);if(!cs.length)return null;
  const [e]=await pickCards(p,title,"",cs,{min:0,max:1,ai:c=>c.filter(y=>FX.eventAi(p,y)).slice(0,1)});
  if(!e)return null;return (await useFromHand(p,e,false,true))?e:null}
// 自分の現場のキャラ y を x の下に重ねる（y のセットはリムーブされる）
function stackOnto(p,x,y){dropSets(p,y);resetMods(y);stackUnder(x,[y])}
// 「カード名を1つ指定し、相手のFILEの上から1枚をリムーブし、相手はデッキの上から1枚を裏向きのままFILEの上に置く」→ 指定した名前のカードがリムーブされたか
// 人は相手のカード名から選ぶ。CPUは表向き（oppFileUp）ならそれを、そうでなければ相手のデッキとFILEで一番多い名前を指定する（上のカードは覗かない）
async function fileNameGuess(p,title){
  const o=opp(p);const top=[...o.file].reverse().find(y=>y!==o.partner);
  if(!top){log("　相手のFILEにカードがない","n");return false}
  const pool=[...o.deck,...o.file.filter(y=>y!==o.partner),...o.hand,...o.rm,...o.field,...o.ev];
  const cnt=new Map;for(const y of pool)cnt.set(nameOf(y),(cnt.get(nameOf(y))||0)+1);
  let nm;
  if(top.fu)nm=nameOf(top);
  else if(p.cpu){const unk=new Map;for(const y of [...o.deck,...o.file.filter(y=>y!==o.partner&&!y.fu)])unk.set(nameOf(y),(unk.get(nameOf(y))||0)+1);
    nm=[...unk.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||nameOf(top)}
  else{const opts=[...cnt.keys()].sort((a,b)=>cnt.get(b)-cnt.get(a)).map(n=>pool.find(y=>nameOf(y)===n));
    const [y]=await chooseCards(`${p.name}: カード名を指定`,`${title||"相手のFILEの一番上"}のカード名を指定します（相手のFILEの上は${top.fu?`表向きで ${nameOf(top)}`:"裏向き"}です）`,opts,{min:1,max:1,okLabel:"指定"});
    nm=y?nameOf(y):null}
  if(!nm)return false;
  log(`　${p.name} はカード名［${nm}］を指定した`,"n");
  o.file.splice(o.file.indexOf(top),1);top.fu=false;o.rm.push(top);
  log(`　${o.name} のFILEの上の ${nameOf(top)} をリムーブ`,"n");
  const hit=namesOf(top).includes(nm);
  toFile(o,1);log(`　${o.name} はデッキの上から1枚を裏向きのままFILEの上に置いた`,"n");
  log(hit?`　指定したカード名のカードがリムーブされた`:`　指定したカード名ではなかった`,"n");
  return hit}
const hasRushKw=y=>/〚突撃〛/.test(C(y).f||"");

// ================= コンタクト発生（灰原哀 PR313）=================
DEF["1160"]={ // 灰原哀 PR313
  apSelf:p=>myTurn(p)?1000:0,
  enter:async(p,x)=>{
    if(!myTurn(p)||condOk("事件青＆黒",p)!==true||!partnerIs(p,"青"))return;
    const sleepers=()=>p.field.filter(y=>y.st==="a"&&lvOf(y)>=7);
    if(!p.hand.length||!sleepers().length)return;
    if(!await yes(p,"灰原哀",`手札を1枚リムーブし、レベル7以上のキャラを1枚スリープさせて、カードを1枚引き、相手のキャラ1枚とコンタクトしますか？`,()=>p.hand.length>=2&&oppHas(p,y=>apOf(y)<=apOf(x))))return;
    const [s]=await pickCards(p,"スリープさせるキャラ（レベル7以上）","",sleepers(),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>(b.fresh?1:0)-(a.fresh?1:0)||apOf(a)-apOf(b))});
    if(!s)return;
    await discard(p,1);sleepC(s);
    drawN(p,1);
    const t=await chooseChar(p,"コンタクトする相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>isOpp(p,y)&&apOf(y)<=apOf(x)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
    if(!t||!p.field.includes(x)){return}
    log(`　${C(x).nm} と ${C(t).nm} のコンタクトを発生させた（${C(x).nm} がアクションした側）`);
    await contact(p,x,t);await runQueue()},
  leaveOppTurn:async p=>{if(p.deck.length>1&&await yes(p,"灰原哀","デッキのカードを上から1枚リムーブしますか？",()=>p.deck.length>=6))millSelf(p,1)}};

// ================= 重ねる／イベント使用（シャッフルロマンス）=================
DEF["0839"]={ // ハート姫（毛利蘭） D10005
  enter:async(p,x)=>{
    if(condOk("事件シャッフルロマンス",p)!==true||x.st!=="a"||!p.hand.length)return;
    const f=y=>isChar(y)&&named("黒衣の騎士・スペイド")(y)&&lvOf(y)<=8;
    if(!p.rm.some(f))return;
    if(!await yes(p,"ハート姫（毛利蘭）","このキャラをスリープさせ、手札を1枚リムーブして、リムーブエリアのレベル8以下の［黒衣の騎士・スペイド］を登場させますか？",true))return;
    sleepC(x);await discard(p,1);
    await enterFromRm(p,f,"登場させる［黒衣の騎士・スペイド］（レベル8以下）")},
  abilities:[{label:"手札の［シャッフルロマンス］のイベントを1枚まで使用",turn1:true,
    can:p=>bondOk(p,"工藤新一")&&evUsable(p,named("シャッフルロマンス")).length>0,
    aiCan:p=>evUsable(p,named("シャッフルロマンス")).some(y=>FX.eventAi(p,y)),
    run:async p=>{await useEventByEffect(p,named("シャッフルロマンス"),"使用する［シャッフルロマンス］");return true}}]};
DEF["0840"]={ // 工藤新一 D10009
  endTurn:async(p,x)=>{if(p.field.some(y=>y!==x&&named("毛利蘭")(y)))return;
    log(`　自分の現場に［毛利蘭］がいないので ${C(x).nm} をリムーブ`,"n");removeCard(x,"効果",{by:p,effect:true});await runQueue()},
  enter:async p=>{if(!partnerIs(p,"青"))return;
    const t=await chooseChar(p,"デッキの下に移すキャラ（AP8000以下）",apLe(8000),{ai:aiBestTargets(p,1)});if(t)toDeckBottom(t)},
  abilities:[{label:"自分の［毛利蘭］を下に重ねる: ターン終了時まで突撃［キャラ］",turn1:true,
    can:(p,x)=>condOk("事件シャッフルロマンス",p)===true&&p.field.some(y=>y!==x&&named("毛利蘭")(y)),
    aiCan:(p,x)=>x.st==="a"&&p.field.filter(y=>y!==x&&named("毛利蘭")(y)).length>=2&&oppHas(p,y=>y.st!=="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"下に重ねる［毛利蘭］",y=>!isOpp(p,y)&&y!==x&&named("毛利蘭")(y),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(a)-apOf(b)).slice(0,1)});
      if(!t)return false;stackOnto(p,x,t);giveKw(x,"突撃［キャラ］");return true}}]};

// ================= セットされるたび／離れるたび =================
DEF["0188"]={ // 服部平次 B02018
  onSetOn:async(p,x)=>{if(!myTurn(p)||turnCount(x,"hs")>=2)return;useTurn(x,"hs");
    const i=x.st==="a"?1:await pickMode(p,"服部平次",["このキャラをアクティブにする","ターン終了時まで突撃を得る"],0);
    if(i===0)activateC(x);else giveKw(x,"突撃")},
  abilities:[{label:"デッキの上から3枚をリムーブ: 上から1枚を裏向きでこのキャラにセット",turn1:true,
    can:p=>p.deck.length>=4,aiCan:(p,x)=>p.deck.length>=12&&(x.st!=="a"||x.fresh),
    run:async(p,x)=>{millSelf(p,3);setTop(p,x);return true}}]};
DEF["0763"]={ // 小泉紅子 B07034
  onSetOff:async(p,x,info)=>{if(!info.down||!myTurn(p)||condOk("事件赤魔術",p)!==true||turnCount(x,"ks")>=2)return;useTurn(x,"ks");drawN(p,1)},
  abilities:[{label:"スリープ＋手札を1枚リムーブ: デッキの上から1枚を裏向きでこのキャラにセットし、レベル7以下のキャラを1枚リムーブ",
    can:(p,x)=>x.st==="a"&&p.hand.length>=1&&p.deck.length>=2,aiCan:(p,x)=>p.hand.length>=2&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);setTop(p,x);await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");return true}}]};

// ================= コナン B09003 ほか（相手のFILE関連）=================
DEF["0948"]={ // 江戸川コナン B09003
  lvSelf:(p)=>myTurn(p)?-2:0,
  onAllyEnter:async(p,self,y)=>{
    if(y===self||!myTurn(p)||condOk("事件青＆緑",p)!==true||turnCount(self,"cn")||lvOf(y)>7||!colorAny(y,"青","緑"))return;
    const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",apLe(8000),{ai:aiBestTargets(p,1)});
    if(t){useTurn(self,"cn");rmBy(p,t);await runQueue()}},
  abilities:[{label:"デッキの上から1枚をリムーブ: カード名を指定し、相手のFILEの上をリムーブ（一致したらAP＋2000）",turn1:true,
    can:p=>bondOk(p,"服部平次")&&p.deck.length>=2&&opp(p).file.some(y=>y!==opp(p).partner),aiCan:p=>p.deck.length>=8,
    run:async p=>{millSelf(p,1);
      if(await fileNameGuess(p)){const t=await chooseChar(p,"ターン終了時までAP＋2000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)apTurn(t,2000)}
      return true}}]};
DEF["1047"]={ // 工藤新一&服部平次 B09108
  abilities:[
    {label:"相手のキャラを1枚デッキの下へ・相手のFILEの上を表向きに",turn1:true,can:()=>true,aiCan:p=>opp(p).field.length>0,
      run:async p=>{const t=await chooseChar(p,"デッキの下に移す相手のキャラ",y=>isOpp(p,y),{ai:aiBestTargets(p,1)});if(t)toDeckBottom(t);oppFileUp(p);return true}},
    {label:"カード名を指定し、相手のFILEの上をリムーブ（一致したら2枚引いて手札を2枚リムーブ）",turn1:true,partner:true,can:p=>opp(p).file.some(y=>y!==opp(p).partner),aiCan:()=>true,
      run:async p=>{if(await fileNameGuess(p)){drawN(p,2);await discard(p,2)}return true}}]};

// ================= 服部平次＆怪盗キッド B10098（突撃・パートナーエリアへ移して登場）=================
DEF["1153"]={
  partnerToo:true,
  apAura:(q,y,x)=>G.contact&&(G.contact.a===x||G.contact.d===x)&&q.field.includes(x)&&lvOf(x)>=8?2000:0,
  abilities:[{label:"スリープ＋パートナーエリアに移す: リムーブエリアの〚突撃〛を持つレベル8以下の［服部平次］か［怪盗キッド］を登場させる",
    can:(p,x)=>x.st==="a"&&p.rm.some(heiKid),aiCan:(p,x)=>p.rm.some(heiKid)&&oppHas(p,y=>y.st!=="a"),
    run:async(p,x)=>{sleepCost(x);toPartnerArea(p,x,{why:"コスト"});return await heiKidEnter(p)},
    freeCan:p=>p.rm.some(heiKid),freeRun:async p=>await heiKidEnter(p)}]};
const heiKid=y=>isChar(y)&&hasRushKw(y)&&lvOf(y)<=8&&(named("服部平次")(y)||named("怪盗キッド")(y));
async function heiKidEnter(p){
  const [y]=await pickCards(p,"登場させるキャラ（〚突撃〛を持つレベル8以下の［服部平次］か［怪盗キッド］）","",p.rm.filter(heiKid),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(!y)return true;await enterByEffect(p,y,"a");giveKw(y,"アクティブ指定");return true}

// ================= 楠川探偵 B05033（コスト代替）=================
DEF["0537"]={costSub:(p,k,user)=>hasTrait(user,"探偵")};

// ================= 白・赤（パートナーエリア／ガード／カットイン）=================
DEF["0759"]={ // 黒羽快斗＆中森青子 B07030
  abilities:[
    {label:"相手のレベル8以下を1枚デッキの下へ・リムーブエリアの［ビッグジュエル］をパートナーエリアへ",turn1:true,can:p=>partnerIs(p,"白"),aiCan:p=>oppHas(p,y=>lvOf(y)<=8)||p.rm.some(bigJewel),
      run:async p=>{const t=await chooseChar(p,"デッキの下に移す相手のキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8,{ai:aiBestTargets(p,1)});if(t)toDeckBottom(t);
        await toPaWithReturnNo(p,p.rm.filter(bigJewel),"パートナーエリアに移す［ビッグジュエル］のイベント");return true}},
    {label:"パートナーエリアの［ビッグジュエル］を2枚リムーブ: 手札のレベル3以下の【白】のキャラをスリープ状態で登場",turn1:true,partner:true,
      can:p=>p.pa.filter(bigJewel).length>=2&&p.field.some(exactName2)&&p.hand.some(whiteLv3),
      aiCan:p=>p.hand.some(whiteLv3),
      run:async p=>{const bj=p.pa.filter(bigJewel);const got=await pickCards(p,"リムーブする［ビッグジュエル］（2枚）","",bj,{min:2,max:2,ai:c=>c.slice(0,2)});if(got.length<2)return false;
        for(const b of got){detach(b);p.rm.push(b);log(`　パートナーエリアの ${C(b).nm} をリムーブ`,"n")}
        const [y]=await pickCards(p,"スリープ状態で登場させる【白】のキャラ（レベル3以下）","",p.hand.filter(whiteLv3),{min:0,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
        if(y)await enterByEffect(p,y,"s");return true}}]};
const whiteLv3=y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=3;
const exactName2=y=>exactName("黒羽快斗")(y)||exactName("怪盗キッド")(y);

DEF["0984"]={ // 京極真 B09041
  onGuarded:async(p,x,guard)=>{if(lvOf(guard)<=6){guard.cSafe=true;log(`　${C(guard).nm} はアクション終了時までコンタクトによってリムーブされない`,"n")}},
  abilities:[{label:"レベル7以上のキャラを1枚リムーブ（このターンにアクションがガードされていた場合）",turn1:true,
    can:(p,x)=>x.guardedT===G.turnNo,aiCan:p=>oppHas(p,y=>lvOf(y)>=7),
    run:async(p,x)=>{await rmChar(p,y=>lvOf(y)>=7);return true}}]};

DEF["0671"]={ // 宮本武蔵 B06050（カットインは「AP＋2000（自分ターン中）」か「［YAIBA］のイベントを手札に（事件YAIBA）」のどちらか1つ）
  cutin:async(p,x,mine)=>{
    const f=y=>C(y).t==="イベント"&&hasTrait(y,"YAIBA");
    if(condOk("事件YAIBA",p)!==true||!p.rm.some(f))return;
    if(myTurn(p)&&mine){ // 本体がAP＋2000を足している。イベントを選ぶならAPは取り消す
      const i=await pickMode(p,"宮本武蔵",["AP＋2000","リムーブエリアの［YAIBA］のイベントを手札に"],0);if(i===0)return;mine.apC-=2000;log(`　${C(mine).nm} のAP＋2000は取り消し`,"n")}
    await pickRmToHand(p,f,"手札に加える［YAIBA］のイベント")}};

// ================= 赤井秀一＆沖矢昴 B05066 =================
DEF["0566"]={
  onOppRemoved:async(q,self)=>{if(!partnerIs(q,"赤")||!myTurn(q)||turnCount(self,"ao")||!oppHas(q,lvLe(8)))return;useTurn(self,"ao");await rmChar(q,z=>z!==self&&lvLe(8)(z),"リムーブするキャラ（レベル8以下）")},
  abilities:[{label:"相手のキャラを1枚ターン終了時までレベル－1",turn1:true,partner:true,can:()=>true,aiCan:p=>oppHas(p,y=>lvOf(y)>=6),
    run:async p=>{const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y),{ai:aiBestTargets(p,1)});if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}return true}}]};

// ================= 事件（環境デッキの残り）=================
DEF["1030"]={...solvedDiscard, // 風の女神 B09090
  abilities:[caseAb("手札の［神奈川県警］のキャラか【疾風】のキャラを1枚リムーブ: このターン次に登場するキャラは【疾風】の条件を無視",
    p=>p.hand.some(y=>isChar(y)&&(hasTrait(y,"神奈川県警")||isGale(y))),
    async p=>{const [y]=await pickCards(p,"コスト: リムーブする［神奈川県警］か【疾風】のキャラ","",p.hand.filter(y=>isChar(y)&&(hasTrait(y,"神奈川県警")||isGale(y))),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b)).slice(0,1)});
      if(!y)return false;detach(y);p.rm.push(y);log(`　コスト: 手札の ${C(y).nm} をリムーブ`,"n");p.galeFree=G.turnNo;log("　このターン次に登場するキャラは【疾風】の条件を無視できる","n");return true},
    p=>{const cost=y=>isChar(y)&&(hasTrait(y,"神奈川県警")||isGale(y)); // CPU: すでに疾風が発動済みで、手札に疾風が残り、コストにする別のカードがあるときだけ
      return p.galeT===G.turnNo&&p.hand.some(y=>isChar(y)&&isGale(y)&&p.hand.some(z=>z!==y&&cost(z)))})]};
DEF["1050"]=flipCase(2,"裏向きの証拠2つを表に: カード名を指定し相手のFILEの上をリムーブ（一致ならレベル6のキャラに突撃［キャラ］）", // 外交官殺人事件 B09111
  p=>opp(p).file.some(y=>y!==opp(p).partner),async p=>{if(await fileNameGuess(p)){const t=await chooseChar(p,"突撃［キャラ］を与えるレベル6のキャラ",y=>!isOpp(p,y)&&lvOf(y)===6,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］")}});
DEF["1052"]={...solvedDiscard, // 「愛しい愛しい…宿敵さん？」 B09113P
  abilities:[caseAb("痕跡で選ぶ: 未発見→証拠1つを表に＋相手のデッキ上2枚リムーブ／発見済み→証拠3つを表に＋レベル7以下のスリープ状態のキャラをリムーブ",
    p=>!opp(p).refreshed?true:(p.field.some(y=>hasColor(y,"赤"))&&p.field.some(y=>hasColor(y,"黒"))),
    async p=>{const o=opp(p);
      if(!o.refreshed){if(faceDownEv(p).length>=1&&await yes(p,"愛しい愛しい…宿敵さん？","痕跡［未発見］: 裏向きの証拠を1つ表向きにして、相手のデッキの上から2枚をリムーブしますか？",true)){flipEvidence(p,1);millSelf(o,2)}return true}
      if(p.field.some(y=>hasColor(y,"赤"))&&p.field.some(y=>hasColor(y,"黒"))&&faceDownEv(p).length>=3&&await yes(p,"愛しい愛しい…宿敵さん？","痕跡［発見済み］: 裏向きの証拠を3つ表向きにして、レベル7以下のスリープ状態のキャラをリムーブしますか？",true)){
        flipEvidence(p,3);await rmChar(p,y=>lvOf(y)<=7&&y.st==="s","リムーブするキャラ（レベル7以下のスリープ状態）")}return true},
    p=>!opp(p).refreshed?faceDownEv(p).length>=1:faceDownEv(p).length>=3&&oppHas(p,y=>lvOf(y)<=7&&y.st==="s"))]};
DEF["1156"]=flipCase(2,"裏向きの証拠2つを表に: 【緑】か【白】のキャラに「相手のキャラをコンタクトでリムーブしたとき、上から4枚見て〚突撃〛のキャラを手札に」を与える", // 狙われた唇 B10101
  ()=>true,async p=>{const t=await chooseChar(p,"能力を与える【緑】か【白】のキャラ",y=>!isOpp(p,y)&&colorAny(y,"緑","白"),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
    if(t){t.cwLook=G.turnNo;log(`　${C(t).nm} はターン終了時まで能力を得た`,"n")}});
DEF["1157"]=flipCase(2,"裏向きの証拠2つを表に: 元の能力が【カットイン】と【ヒラメキ】だけのキャラ1枚につき、デッキの上から1枚見て1枚手札に", // 緋色の真相 B10102
  ()=>true,async p=>{const n=p.field.filter(y=>isChar(y)&&!(C(y).f||"").trim()).length;if(n>0)await lookTop(p,n,()=>true,{max:1,title:"手札に加えるカード"})});
DEF["0659"]={...solvedDiscard, // 鬼丸天下統一プロジェクト B06036
  abilities:[caseAb("裏向きの証拠3つを表に: そのコストで表向きになった【ヒラメキ】を持つ［YAIBA］のカード1枚の【ヒラメキ】を発動してもよい",
    p=>faceDownEv(p).length>=3,
    async p=>{const flipped=faceDownEv(p).slice(-3);if(!flipEvidence(p,3))return false;
      const cs=flipped.filter(e=>C(e).hr&&hasTrait(e,"YAIBA"));if(!cs.length)return true;
      const [e]=await pickCards(p,"【ヒラメキ】を発動する［YAIBA］のカード","",cs,{min:0,max:1,ai:c=>c.slice(0,1)});if(!e)return true;
      log(`　${p.name} の ${C(e).nm}【ヒラメキ】発動`);
      if(!await FX.hirameki(p,e)){if(/カードを1枚引く/.test(C(e).hr)&&!/選び/.test(C(e).hr)){drawN(p,1)}else toast("ヒラメキの効果を手動で処理してください")}
      return true},
    p=>faceDownEv(p).length>=3)]};
