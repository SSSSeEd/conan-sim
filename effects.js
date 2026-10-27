"use strict";
// カード個別効果（プリセット4デッキの68種類）。キーはカードID（再録・パラレルも同じID）。
// 各スクリプトは async で、選択は pickCards / yes を通す（CPUは ai 関数、人は画面で選ぶ）。

// ================= 共通ヘルパー =================
const idOf=x=>C(x).i;
const fieldOf=p=>p.field;
const allChars=()=>[...G.P[0].field,...G.P[1].field];
const isOpp=(p,x)=>ownerOf(x)!==p;
const lvOf=x=>C(x).lv||0;
function hasTrait(x,t){
  if((C(x).ct||"").split(",").includes(t))return true;
  const p=ownerOf(x);
  if(t==="サッカー選手"&&p&&p.field.includes(x)&&["1065","1066"].includes(idOf(x)))return true; // 現場にいるこのキャラは［サッカー選手］を持つ
  return false;
}
const hasColor=(x,col)=>(C(x).c||"").includes(col);
const partnerIs=(p,col)=>condOk("パートナー"+col,p);
const faceDownSet=x=>(x.set||[]).filter(s=>!s.up);

// AI用の評価: 相手のカードほど・レベルが高いほど優先
const aiScoreTarget=(p,x)=>(isOpp(p,x)?1000:-1000)+lvOf(x)*10+apOf(x)/1000;
const aiBestTargets=(p,n=1)=>cs=>cs.slice().sort((a,b)=>aiScoreTarget(p,b)-aiScoreTarget(p,a)).filter(x=>isOpp(p,x)).slice(0,n);
const aiCardValue=(p,x)=>{const c=C(x);let v=lvOf(x);if(c.ci)v+=2;if(c.t==="キャラ"&&lvOf(x)<=p.file.length+2)v+=3;if(!canPlayColor(c,p))v-=5;return v};

async function pickCards(p,title,body,cards,{min=0,max=1,ai,faceUp=true}={}){
  if(!cards.length)return [];
  if(p.cpu){
    let r=ai?ai(cards):cards.slice(0,max);
    r=r.slice(0,max);
    if(r.length<min)r=cards.slice(0,min);
    return r;
  }
  return await chooseCards(`${p.name}: ${title}`,body,cards,{min,max,faceUp,okLabel:"決定"});
}
async function yes(p,title,body,aiVal=true){
  if(p.cpu)return typeof aiVal==="function"?aiVal():aiVal;
  return await ask(`${p.name}: ${title}`,body,[{label:"はい",value:true,primary:true},{label:"いいえ",value:false}]);
}
// 手札を1枚リムーブ（choosePlayer が選ぶ）
async function discard(p,n=1,title="手札をリムーブ",chooser=p,filter=null){
  for(let i=0;i<n;i++){
    const cands=filter?p.hand.filter(filter):p.hand;if(!cands.length)return [];
    const [x]=await pickCards(chooser,title,`${p.name} の手札から1枚リムーブします。`,cands,{min:1,max:1,
      ai:cs=>chooser===p?cs.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b)):cs.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a))});
    if(x){detach(x);p.rm.push(x);log(`　${p.name} は手札の ${C(x).nm} をリムーブ`);if(n===1)return [x]}
  }
  return [];
}
function drawN(p,n=1){draw(p,n);log(`　${p.name} はカードを${n}枚引いた`,"n")}
function gainEv(p,n=1){gainEvidence(p,n);log(`　${p.name} は証拠を${n}つ得た（証拠${p.ev.length}）`)}
function stunC(x){x.st="x";log(`　${C(x).nm} をスタン`,"n")}
function sleepC(x){if(x.st==="a")x.st="s";log(`　${C(x).nm} をスリープ`,"n")}
function activateC(x){x.st=x.st==="x"?"s":"a";log(`　${C(x).nm} を${x.st==="a"?"アクティブ":"スリープ（スタンから）"}に`,"n")}
function toDeckBottom(x){const p=ownerOf(x);const wasField=p.field.includes(x);
  if(wasField){for(const s of x.set||[])p.rm.push(s.c);x.set=[]}
  detach(x);resetMods(x);p.deck.push(x);log(`　${p.name} の ${C(x).nm} をデッキの下へ`,"n")}
function setTop(p,x){const c=popDeck(p);if(!c)return;x.set=x.set||[];x.set.push({c,up:false});log(`　${C(x).nm} にデッキの上から1枚を裏向きでセット`,"n")}

// 現場のキャラを選ぶ（両者の現場から）
async function chooseChar(p,title,filter=()=>true,{ai,min=0}={}){
  const cs=allChars().filter(filter);
  if(!cs.length){log(`　（対象なし）`,"n");return null}
  const [x]=await pickCards(p,title,"",cs,{min,max:1,ai:ai||aiBestTargets(p,1)});
  return x||null;
}
// 効果で現場に出す（登場時が発動する）
async function enterByEffect(p,x,state="a"){
  if(p.field.length>=5){
    const [t]=await pickCards(p,"スイッチ","現場が5体です。リムーブするキャラを選んでください。",p.field,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
    if(!t)return false;removeCard(t,"スイッチ");
  }
  detach(x);resetMods(x);x.st=FX.entersSleeping(x)?"s":state;x.fresh=true;p.field.push(x);
  log(`　${p.name} は ${C(x).nm} を${state==="s"?"スリープ状態で":""}登場させた`);
  render();
  await FX.enter(p,x);
  return true;
}
// デッキの上からn枚見て、条件に合うカードを max 枚まで手札に。残りはデッキの下
async function lookTop(p,n,filter,{max=1,toField=null,title}={}){
  const xs=p.deck.slice(0,n);if(!xs.length)return [];
  const ok=xs.filter(filter);
  log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  let got=[];
  if(!p.cpu){
    got=await chooseCards(`${p.name}: ${title||"デッキの上から見る"}`,ok.length?`デッキの上から${xs.length}枚。暗くなっているカードは条件に合わないので選べません。`:`デッキの上から${xs.length}枚。条件に合うカードはありません。`,xs,{min:0,max,can:y=>ok.includes(y),okLabel:toField?"登場させる":"手札に加える"});
  }else got=ok.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,max);
  for(const x of got){detach(x);
    if(toField)await enterByEffect(p,x,toField);
    else{p.hand.push(x);log(`　${p.name} は ${C(x).nm} を${toField?"登場させた":"手札に加えた"}`)}}
  let rest=xs.filter(x=>!got.includes(x));
  if(!p.cpu&&rest.length>1&&!G.over)rest=await orderCards(`${p.name}: 残りを好きな順番でデッキの下へ`,rest);
  for(const x of rest){detach(x);p.deck.push(x)}
  if(rest.length)log(`　残り${rest.length}枚をデッキの下へ`,"n");
  checkDeck(p);
  return got;
}
// 手札から条件に合うキャラを1枚まで登場
async function playFromHand(p,filter,title="手札から登場"){
  const cs=p.hand.filter(x=>C(x).t==="キャラ"&&filter(x));
  if(!cs.length)return null;
  const [x]=await pickCards(p,title,"登場させるキャラを選べます。",cs,{min:0,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});
  if(!x)return null;
  await enterByEffect(p,x,"a");return x;
}
async function moveSet(p,from){
  const fd=faceDownSet(from);if(!fd.length)return;
  const to=await chooseChar(p,"セットを移すキャラ",y=>p.field.includes(y)&&y!==from&&hasTrait(y,"サッカー選手")&&!faceDownSet(y).length,{ai:cs=>cs.slice(0,1)});
  if(!to)return;
  const s=fd[0];from.set.splice(from.set.indexOf(s),1);to.set=to.set||[];to.set.push(s);
  log(`　${C(from).nm} の裏向きのカードを ${C(to).nm} に移した`,"n");
}
function removeSetCost(p,x){const fd=faceDownSet(x);if(!fd.length)return false;const s=fd[0];x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);log(`　${C(x).nm} の裏向きのカードを1枚リムーブ（コスト）`,"n");return true}
function flipEvidence(p,n){const fd=p.ev.filter(e=>!e.up);if(fd.length<n)return false;for(let i=0;i<n;i++)fd[fd.length-1-i].up=true;log(`　${p.name} は裏向きの証拠を${n}つ表向きにした`,"n");return true}
const lookFilterColor=col=>x=>hasColor(x,col);
const turnCount=(x,key)=>(x.used&&x.used[key]&&x.used[key].t===G.turnNo)?x.used[key].n:0;
const useTurn=(x,key)=>{x.used=x.used||{};const n=turnCount(x,key)+1;x.used[key]={t:G.turnNo,n};return n};

// ================= カード定義 =================
const DEF={};

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

// --- 黒試し（ジン） ---
DEF["0722"]={ // ブラックインパクト！
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: 相手は手札を1枚リムーブ",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&opp(p).hand.length>0,
    run:async p=>{if(!flipEvidence(p,3))return false;const o=opp(p);
      const [y]=await discard(o,1,"手札をリムーブ（ブラックインパクト）",o);if(y&&lvOf(y)<=6)drawN(p,1);return true}}],
  eraseEvidence:true};
DEF["0604"]={ // バーボン B05108
  actionEnd:async(p,x)=>{if(!partnerIs(p,"黒")||p.file.length<6||!p.field.includes(x))return;
    if(!p.hand.some(y=>C(y).t==="キャラ"&&hasColor(y,"黒")&&lvOf(y)<=7))return;
    if(!await yes(p,"アクション終了時","このバーボンをリムーブして、手札からレベル7以下の【黒】のキャラを登場させますか？",true))return;
    removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();
    await playFromHand(p,y=>hasColor(y,"黒")&&lvOf(y)<=7)}};
DEF["0716"]={ // ラム
  enter:async(p,x)=>{if(!condOk("事件黒",p)||!partnerIs(p,"黒"))return;const t=await chooseChar(p,"登場時: リムーブするキャラ（レベル8以下）",y=>lvOf(y)<=8&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true})}};
DEF["1141"]={ // スコッチ
  cutin:async(p,card,mine)=>{if(C(mine).ci&&hasColor(mine,"黒"))drawN(p,1)},
  // 【パートナー黒】【自分ターン中】【ターン1】このキャラのコンタクト中に［バーボン］のカットインを使ったら、アクティブにする（以後このコンタクトではカットイン不可）
  onCutinInContact:async(p,self,card)=>{if(!card||!C(card).nm.includes("バーボン")||!partnerIs(p,"黒")||G.turn!==p.idx||turnCount(self,"scotch"))return;
    useTurn(self,"scotch");self.st="a";useTurn(self,"noCutin");log(`　${C(self).nm}: バーボンのカットインでアクティブに（このコンタクト中はもうカットインできない）`,"n")}};
DEF["1142"]={ // ジン B10087
  onCutinInContact:async(p,self)=>{drawN(p,1)},
  enter:async(p,x)=>{if(!partnerIs(p,"黒"))return;
    if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（【カットイン】を持つ【黒】が3枚ならコンタクトを発生）",()=>p.deck.length>8))return;
    const xs=p.deck.slice(0,3);for(const y of xs){detach(y);p.rm.push(y)}checkDeck(p);
    log(`　リムーブ: ${xs.map(y=>C(y).nm).join("、")}`,"n");
    const n=xs.filter(y=>C(y).ci&&hasColor(y,"黒")).length;
    if(n>=3&&G.turn===p.idx){const t=await chooseChar(p,"コンタクトさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.slice().sort((a,b)=>(apOf(a)<=apOf(x)?0:1)-(apOf(b)<=apOf(x)?0:1)||lvOf(b)-lvOf(a)).slice(0,1)});
      if(t){log(`　${C(x).nm} と ${C(t).nm} のコンタクトが発生`);await contact(p,x,t)}}}};
DEF["0360"]={ // バーボン B03111
  enter:async(p,x)=>{if(!partnerIs(p,"黒"))return;const o=opp(p);
    log(`　${o.name} は手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`);
    const cs=o.hand.filter(y=>lvOf(y)<=7);if(!cs.length)return;
    const [y]=await pickCards(p,"相手の手札からリムーブさせるカード（レベル7以下）","",cs,{min:0,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(o,b)-aiCardValue(o,a)).slice(0,1)});
    if(y){detach(y);o.rm.push(y);log(`　${o.name} の手札の ${C(y).nm} をリムーブ`)}}};
DEF["0721"]={ // カッ
  event:async(p,x)=>{if(!partnerIs(p,"黒")||!p.solved){log("　条件（パートナー黒・解決編）を満たさないので効果なし","n");return}
    for(const y of allChars())removeCard(y,"カッ",{by:p,effect:true});
    const top=[...p.file].reverse().filter(y=>y!==p.partner).slice(0,2);
    for(const y of top){p.file.splice(p.file.indexOf(y),1);p.hand.push(y)}log(`　FILEの上から${top.length}枚を手札に（FILE ${p.file.length}枚）`);
    p.noHint=true;await runQueue();
    await playFromHand(p,y=>hasColor(y,"黒")&&lvOf(y)<=7)},
  ai:p=>p.solved&&partnerIs(p,"黒")&&opp(p).field.length>=p.field.length+1};
DEF["1163"]={ // ベルモット PR310
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒"))return;const t=await chooseChar(p,"リムーブするキャラ（レベル7以下・スリープ状態）",y=>lvOf(y)<=7&&y.st!=="a");if(t)removeCard(t,"ベルモット",{by:p,effect:true})}};
DEF["0365"]={ // ウォッカ B03116
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒")||!p.rm.includes(x))return;
    if(!await yes(p,"ウォッカ","リムーブエリアからスリープ状態で登場させて、カードを1枚引きますか？",true))return;
    await enterByEffect(p,x,"s");drawN(p,1)}};
DEF["0925"]={ // ヘルエンジェル
  leaveOppTurn:async(p,x)=>{drawN(p,1);if(p.solved)await discard(p,1)}};

// --- サッカー4（比護隆佑） ---
DEF["1081"]={ // プロサッカー選手脅迫事件
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠2つを表に: リムーブエリアのサッカー選手/ガジェットを手札に",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=2&&p.field.some(y=>hasTrait(y,"サッカー選手"))&&p.rm.some(y=>lvOf(y)<=6&&((C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"))||(C(y).t==="イベント"&&hasTrait(y,"ガジェット")))),
    run:async p=>{if(!flipEvidence(p,2))return false;
      const cs=p.rm.filter(y=>lvOf(y)<=6&&((C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"))||(C(y).t==="イベント"&&hasTrait(y,"ガジェット"))));
      const [y]=await pickCards(p,"手札に加えるカード","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      if(y){detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}return true}}]};
DEF["1065"]={ // 工藤新一 B10003
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  actionEnd:async(p,x)=>{if(!p.field.includes(x)||turnCount(x,"shin")||!faceDownSet(x).length)return;useTurn(x,"shin");
    const can2=p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手")&&!faceDownSet(y).length);
    const v=p.cpu?(can2?"move":"hand"):await ask(`${p.name}: 工藤新一 アクション終了時`,"",[{label:"セットされたカードを手札に",value:"hand",primary:true},...(can2?[{label:"セットを他のサッカー選手に移す",value:"move"}]:[])]);
    if(v==="hand"){const s=faceDownSet(x)[0];x.set.splice(x.set.indexOf(s),1);p.hand.push(s.c);log(`　セットされていたカードを手札に`,"n")}else await moveSet(p,x)}};
DEF["1066"]={ // 江戸川コナン B10004
  abilities:[{label:"セットを1枚リムーブ: AP8000以下のキャラをリムーブ",
    can:(p,x)=>partnerIs(p,"青")&&p.file.length>=5&&turnCount(x,"conan")<3&&faceDownSet(x).length>0&&p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手"))&&allChars().some(y=>y!==x&&apOf(y)<=8000),
    run:async(p,x)=>{if(!removeSetCost(p,x))return false;const n=useTurn(x,"conan");
      const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",y=>apOf(y)<=8000&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true});
      if(n===3)gainEv(p,1);return true}}]};
DEF["1067"]={ // 灰原哀 B10005
  enter:async(p,x)=>{const cs=p.hand.filter(y=>C(y).t==="キャラ"&&hasTrait(y,"サッカー選手")&&lvOf(y)<=6);if(!cs.length)return;
    if(!await yes(p,"登場時","この灰原哀をスリープさせて、手札からレベル6以下のサッカー選手を登場させますか？",true))return;
    x.st="s";const y=await playFromHand(p,y=>hasTrait(y,"サッカー選手")&&lvOf(y)<=6);if(y&&C(y).nm.includes("比護隆佑"))drawN(p,1)},
  endTurn:async(p,x)=>{if(p.field.filter(y=>hasTrait(y,"サッカー選手")).length>=3)drawN(p,1)}};
const MOVE_SET_AB={label:"【スリープ】: セットを他のサッカー選手に移す",
  can:(p,x)=>x.st==="a"&&faceDownSet(x).length>0&&p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手")&&!faceDownSet(y).length),
  run:async(p,x)=>{x.st="s";await moveSet(p,x);return true},noAi:true};
DEF["1069"]={ // 赤木英雄
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"【スリープ】セットを1枚リムーブ: AP6000以下のキャラをリムーブ",
    can:(p,x)=>x.st==="a"&&faceDownSet(x).length>0&&allChars().some(y=>y!==x&&apOf(y)<=6000),
    run:async(p,x)=>{x.st="s";removeSetCost(p,x);const t=await chooseChar(p,"リムーブするキャラ（AP6000以下）",y=>apOf(y)<=6000&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true});return true}}]};
DEF["1075"]={ // 比護隆佑 B10013
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"セットを1枚リムーブ: 突撃を得る／キャラ1枚をスリープ",
    can:(p,x)=>turnCount(x,"hiko")<2&&faceDownSet(x).length>0,
    run:async(p,x)=>{removeSetCost(p,x);useTurn(x,"hiko");
      const v=p.cpu?(x.fresh&&x.st==="a"?"rush":"sleep"):await ask(`${p.name}: 比護隆佑`,"",[{label:"ターン終了時まで突撃",value:"rush",primary:true},{label:"キャラを1枚スリープ",value:"sleep"}]);
      if(v==="rush"){x.kw.push("突撃");log(`　${C(x).nm} は突撃を得た`,"n")}else{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}return true},
    aiCan:(p,x)=>(x.fresh&&x.st==="a")||opp(p).field.some(y=>y.st==="a")}]};
DEF["1079"]={ // キック力増強シューズ
  event:async(p,x)=>{if(!partnerIs(p,"青")){log("　パートナーの色が条件を満たさないので効果なし","n");return}
    const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",y=>apOf(y)<=8000);if(t)removeCard(t,"効果",{by:p,effect:true});
    const cs=p.field.filter(y=>C(y).nm.includes("江戸川コナン"));if(!cs.length)return;
    const [c]=await pickCards(p,"セットする江戸川コナン","",cs,{min:1,max:1});if(c){detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　キック力増強シューズを ${C(c).nm} にセット`,"n")}},
  ai:p=>opp(p).field.some(y=>apOf(y)<=8000),
  // セットされているキャラが得る能力
  grants:[{label:"ベルトをリムーブ: AP8000以上のキャラをリムーブ",turn1:true,
    can:(p,x)=>(x.set||[]).some(s=>s.up&&idOf(s.c)==="1080")&&allChars().some(y=>apOf(y)>=8000),
    run:async(p,x)=>{const s=x.set.find(s=>s.up&&idOf(s.c)==="1080");if(!s)return false;x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);
      log(`　コスト: ${C(x).nm} にセットされたベルトをリムーブ`,"n");
      const t=await chooseChar(p,"リムーブするキャラ（AP8000以上）",y=>apOf(y)>=8000);if(t)removeCard(t,"効果",{by:p,effect:true});return true},
    aiCan:p=>opp(p).field.some(y=>apOf(y)>=8000)}]};
DEF["1074"]={ // 真田貴大
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"セットを1枚リムーブ: ターン終了時まで突撃",turn1:true,
    can:(p,x)=>faceDownSet(x).length>0&&!x.kw.includes("突撃"),
    run:async(p,x)=>{removeSetCost(p,x);x.kw.push("突撃");log(`　${C(x).nm} は突撃を得た`,"n");return true},aiCan:(p,x)=>x.fresh&&x.st==="a"}]};
DEF["0269"]={ // ゴロ
  abilities:[{label:"デッキの下に移す: LP0の【青】のキャラをLP＋1",
    can:(p,x)=>allChars().some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)===0),
    run:async(p,x)=>{toDeckBottom(x);const t=await chooseChar(p,"LP＋1するキャラ",y=>hasColor(y,"青")&&lpOf(y)===0,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}return true},
    aiCan:(p,x)=>p.field.some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)===0&&y.st==="a"&&!y.fresh)}]};
DEF["1078"]={guardWhileSleeping:true}; // レイ・カーティス
DEF["0019"]={ // シャッフルロマンス
  event:async(p,x)=>{await lookTop(p,5,()=>true,{title:"カードを1枚まで手札に"});
    if(!p.field.length)return;const [c]=await pickCards(p,"シャッフルロマンスをセットするキャラ","",p.field,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>apOf(b)-apOf(a))});
    if(c){detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　シャッフルロマンスを ${C(c).nm} にセット（コンタクト中AP＋2000）`,"n")}},
  ai:p=>true};
DEF["0954"]={ // 赤木守
  hirameki:async o=>{const cs=o.rm.filter(y=>C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"));const [y]=await pickCards(o,"ヒラメキ: 手札に加えるサッカー選手","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(y){detach(y);o.hand.push(y);log(`　${C(y).nm} を手札に`)}}};
const setBelt=(p,x,c)=>{const bonus=hasTrait(c,"サッカー選手")&&!faceDownSet(c).length;
  detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　ベルトを ${C(c).nm} にセット`,"n");
  if(bonus){setTop(p,c);drawN(p,1)}};
const isConan=y=>C(y).nm.includes("江戸川コナン");
const hasGadget=p=>p.field.some(y=>hasTrait(y,"ガジェット")||(y.set||[]).some(s=>s.up&&hasTrait(s.c,"ガジェット")));
DEF["1080"]={ // どこでもボール射出ベルト
  event:async(p,x)=>{const cs=p.field.filter(y=>hasColor(y,"青"));if(!cs.length){log("　セットできる【青】のキャラがいない","n");return}
    const [c]=await pickCards(p,"ベルトをセットする【青】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>(hasTrait(b,"サッカー選手")&&!faceDownSet(b).length)-(hasTrait(a,"サッカー選手")&&!faceDownSet(a).length))});
    if(c)setBelt(p,x,c)},
  ai:p=>p.field.some(y=>hasColor(y,"青")),
  // 【FILE8】【宣言】手札から江戸川コナンにセット（現場にガジェットがないとき）
  handAbilities:[{label:"手札から江戸川コナンにセット",
    can:(p,x)=>p.file.length>=8&&p.field.some(isConan)&&!hasGadget(p),
    run:async(p,x)=>{const [c]=await pickCards(p,"ベルトをセットする江戸川コナン","",p.field.filter(isConan),{min:1,max:1});if(!c)return false;setBelt(p,x,c);return true},
    aiCan:p=>true}]};

// --- 青単SOSアグロ（毛利蘭） ---
DEF["0530"]={ // 妃弁護士SOS
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: 毛利小五郎に突撃［キャラ］とブレット",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&p.field.some(y=>C(y).nm.includes("毛利小五郎")&&lvOf(y)>=5),
    run:async p=>{if(!flipEvidence(p,3))return false;const cs=p.field.filter(y=>C(y).nm.includes("毛利小五郎")&&lvOf(y)>=5);
      const [y]=await pickCards(p,"突撃［キャラ］とブレットを与える毛利小五郎","",cs,{min:1,max:1});if(y){y.kw.push("突撃","ブレット");log(`　${C(y).nm} に突撃［キャラ］とブレット`,"n")}return true},
    aiCan:p=>opp(p).field.some(y=>y.st!=="a")}]};
DEF["0005"]={ // 工藤新一 B01009
  handLevel:(p,x)=>partnerIs(p,"青")&&allChars().length>=6?4:null,
  abilities:[{label:"デッキの下に移す: LP0以下の【青】のキャラをアクティブ",
    can:(p,x)=>allChars().some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)<=0&&y.st!=="a"),
    run:async(p,x)=>{toDeckBottom(x);const t=await chooseChar(p,"アクティブにするキャラ",y=>hasColor(y,"青")&&lpOf(y)<=0&&y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)activateC(t);return true},
    aiCan:(p,x)=>p.field.some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)<=0&&y.st==="s"&&apOf(y)>=5000)&&opp(p).field.some(y=>y.st!=="a")}]};
DEF["0006"]={ // 毛利小五郎 B01010
  contactWin:async(p,x,victim)=>{if(!p.hand.length)return;
    if(!await yes(p,"毛利小五郎","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=2))return;
    await discard(p,1);gainEv(p,1)}};
DEF["0273"]={ // 津川秀治
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ（AP5000以下）",y=>y.st==="a"&&apOf(y)<=5000);if(t)sleepC(t)},
  cutin:async(p,card,mine)=>{const t=await chooseChar(p,"カットイン: スリープさせるキャラ（AP5000以下）",y=>y.st==="a"&&apOf(y)<=5000);if(t)sleepC(t)}};
DEF["0101"]={ // 灰原哀 D01012
  leaveOppTurn:async(p,x)=>{await lookTop(p,3,y=>C(y).t==="キャラ"&&hasColor(y,"青")&&lvOf(y)<=4,{toField:"s",title:"レベル4以下の【青】のキャラを1枚までスリープ状態で登場"})}};
DEF["0092"]={ // 江戸川コナン D01003
  abilities:[{label:"他のキャラを1枚スリープ: 1枚引いて1枚リムーブ、LP＋1",turn1:true,
    can:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"),
    run:async(p,x)=>{const cs=p.field.filter(y=>y!==x&&y.st==="a");
      const [c]=await pickCards(p,"コスト: スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;c.st="s";
      drawN(p,1);await discard(p,1);x.lpT+=1;log(`　${C(x).nm} をターン終了時までLP＋1`,"n");return true},
    aiCan:(p,x)=>x.st==="a"&&!x.fresh&&p.field.some(y=>y!==x&&y.st==="a"&&lpOf(y)<=0&&(y.fresh||apOf(y)<3000))}]};
DEF["0415"]={ // 本堂瑛祐
  leaveOppTurn:async(p,x)=>{const t=await chooseChar(p,"スリープさせるキャラ（レベル4以下）",y=>y.st==="a"&&lvOf(y)<=4);if(t)sleepC(t)}};
DEF["0516"]={cutin:async(p,card,mine)=>{if(partnerIs(p,"青")&&colorsOf(C(p.caseC).c).every(ch=>ch==="青"))drawN(p,1)}}; // 江戸川コナン B05010
// ================= 効果文から自動で組み立てる（同じ書き方のカードはまとめて処理） =================
// 1行ずつ型に当てはめる。全部の行が分かったカードだけ「自動」にする（分からない行があれば手動のまま）
const COLS="青|赤|黄|緑|白|黒";
const PRE=`(?:【パートナー(${COLS})】(?:（[^）]*）)?)?`; // 先頭の【パートナー色】
const needPartner=(p,col)=>!col||partnerIs(p,col);
const bySet=(kind,v)=>kind==="レベル"?y=>lvOf(y)<=v:y=>apOf(y)<=v;
const traitOf=t=>y=>hasTrait(y,t);
const searchTop=async(p,n,filter,max,title,dis)=>{const got=await lookTop(p,n,filter,{max,title});if(got.length&&dis)await discard(p,dis);return got};
// [正規表現, (一致, カード) => {フック名: 処理}]
const LINE_RULES=[
  [/^【登場時】カードを(\d)枚引き、手札を(\d)枚リムーブする。$/,m=>({enter:async p=>{drawN(p,+m[1]);await discard(p,+m[2])}})],
  [/^【登場時】カードを(\d)枚引く。$/,m=>({enter:async p=>drawN(p,+m[1])})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚見る。その中から【(${COLS})】のカードを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。(?:カードを手札に加えた場合、手札を(\\d)枚リムーブする。)?$`),
    m=>({enter:async p=>{if(needPartner(p,m[1]))await searchTop(p,+m[2],lookFilterColor(m[3]),+m[4],`【${m[3]}】のカードを${m[4]}枚まで手札に`,+(m[5]||0))}})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚見る。その中から〚特徴［([^］]+)］〛のキャラを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。(?:カードを手札に加えた場合、手札を(\\d)枚リムーブする。)?$`),
    m=>({enter:async p=>{if(needPartner(p,m[1]))await searchTop(p,+m[2],y=>C(y).t==="キャラ"&&hasTrait(y,m[3]),+m[4],`［${m[3]}］のキャラを${m[4]}枚まで手札に`,+(m[5]||0))}})],
  [new RegExp(`^自分のデッキのカードを上から(\\d)枚見る。その中から【(${COLS})】のキャラを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。手札から自分のFILEエリアの枚数以下のレベルの【(${COLS})】のキャラを(\\d)枚まで登場させる。$`),
    m=>({event:async p=>{await lookTop(p,+m[1],y=>C(y).t==="キャラ"&&hasColor(y,m[2]),{max:+m[3],title:`【${m[2]}】のキャラを${m[3]}枚まで手札に`});
      await playFromHand(p,y=>hasColor(y,m[4])&&lvOf(y)<=p.file.length,`FILE${p.file.length}以下の【${m[4]}】のキャラを登場`)},ai:p=>true})],
  [new RegExp(`^${PRE}(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({event:async p=>{if(!needPartner(p,m[1])){log("　パートナーの色が条件を満たさないので効果なし","n");return}
      const t=await chooseChar(p,`リムーブするキャラ（${m[2]}${m[3]}以下）`,bySet(m[2],+m[3]));if(t)removeCard(t,"効果",{by:p,effect:true})},
      ai:p=>needPartner(p,m[1])&&opp(p).field.some(bySet(m[2],+m[3]))})],
  [new RegExp(`^${PRE}【登場時】(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({enter:async(p,x)=>{if(!needPartner(p,m[1]))return;const t=await chooseChar(p,`登場時: リムーブするキャラ（${m[2]}${m[3]}以下）`,y=>y!==x&&bySet(m[2],+m[3])(y));if(t)removeCard(t,"効果",{by:p,effect:true})}})],
  [new RegExp(`^${PRE}【登場時】手札を(\\d)枚リムーブしてもよい。そうした場合、(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({enter:async(p,x)=>{if(!needPartner(p,m[1])||p.hand.length<+m[2])return;const f=y=>y!==x&&bySet(m[3],+m[4])(y);
      if(!await yes(p,"登場時",`手札を${m[2]}枚リムーブして、${m[3]}${m[4]}以下のキャラをリムーブしますか？`,()=>opp(p).field.some(f)&&p.hand.length>=2))return;
      await discard(p,+m[2]);const t=await chooseChar(p,`リムーブするキャラ（${m[3]}${m[4]}以下）`,f);if(t)removeCard(t,"効果",{by:p,effect:true})}})],
  [/^【相手ターン中】【現場リムーブ時】カードを(\d)枚引く。$/,m=>({leaveOppTurn:async p=>drawN(p,+m[1])})],
  [/^【相手ターン中】【現場リムーブ時】カードを(\d)枚引き、手札を(\d)枚リムーブする。$/,m=>({leaveOppTurn:async p=>{drawN(p,+m[1]);await discard(p,+m[2])}})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚裏向きでこのキャラにセットする。$`),
    m=>({enter:async(p,x)=>{if(needPartner(p,m[1]))for(let i=0;i<+m[2];i++)setTop(p,x)}})],
  [/^カードを(\d)枚引く。$/,m=>({event:async p=>drawN(p,+m[1]),ai:p=>true})],
  [/^相手の現場にいるキャラがこのキャラとのコンタクトによってリムーブされたとき、カードを(\d)枚引く。$/,m=>({contactWin:async p=>drawN(p,+m[1])})],
  [/^この事件が解決編に(?:なった|移行した)とき、自分は手札を(\d)枚リムーブする。$/,m=>({solvedTrigger:async p=>{await discard(p,+m[1],"解決編になったとき: 手札をリムーブ")}})],
  [/^この事件が解決編に(?:なった|移行した)とき、相手はカードを(\d)枚引く。$/,m=>({solvedTrigger:async p=>drawN(opp(p),+m[1])})],
];
// 本体で処理している行（キーワード・パートナーの能力・スリープ登場）
const CORE_LINE=/^(?:【[^】]+】)*(?:〚(?:突撃|迅速|ブレット|ミスリード\d)|【解決編】【事件解決】|【アシスト】|このキャラはスリープ状態で登場する。$)/;
const HR_RULES=[
  [/^カードを(\d)枚引く。$/,m=>async o=>drawN(o,+m[1])],
  [/^キャラを(\d)枚まで選び、スリープさせる。$/,m=>async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}],
  [/^自分のリムーブエリアにある(?:〚カード名［([^］]+)］〛|〚特徴［([^］]+)］〛のキャラ)を(\d)枚まで選び、手札に加える。$/,m=>async o=>{
    const f=m[1]?y=>C(y).nm.includes(m[1]):y=>C(y).t==="キャラ"&&hasTrait(y,m[2]);
    const got=await pickCards(o,"ヒラメキ: 手札に加えるカード","",o.rm.filter(f),{max:+m[3],ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});
    for(const y of got){detach(y);o.hand.push(y);log(`　${C(y).nm} を手札に`)}}],
  [/^このカードを手札に加える。$/,m=>async(o,e)=>{if(e&&o.rm.includes(e)){detach(e);o.hand.push(e);log(`　${C(e).nm} を手札に`)}}],
  [/^自分は証拠を(\d)つ得る。$/,m=>async o=>gainEv(o,+m[1])],
  [/^相手は手札を(\d)枚リムーブする。$/,m=>async o=>{const q=opp(o);await discard(q,+m[1],"ヒラメキ: 手札をリムーブ",q)}],
];
const merge=(a,b)=>{const out={...a};for(const k in b){if(typeof b[k]==="function"&&typeof out[k]==="function"&&k!=="ai"){const f=out[k],g=b[k];out[k]=async(...q)=>{await f(...q);await g(...q)}}else out[k]=b[k]}return out};
function autoDef(c){
  let d={},ok=true,any=false;
  for(const raw of (c.f||"").split("\n")){const line=raw.trim();if(!line||CORE_LINE.test(line))continue;
    const r=LINE_RULES.find(([re])=>re.test(line));if(!r){ok=false;break}
    d=merge(d,r[1](line.match(r[0]),c));any=true}
  if(!ok)d={};
  const hr=(c.hr||"").trim().replace(/^【ヒラメキ】(?:（[^）]*）)?/,"");
  if(hr){const r=HR_RULES.find(([re])=>re.test(hr));if(r){d.hirameki=r[1](hr.match(r[0]));any=true}else if(ok&&any)d.partial=true}
  if(!ok&&any)d.partial=true;
  return any?d:null;
}
for(const c of window.CARD_DB){const d=autoDef(c);if(!d)continue;
  if(DEF[c.i]){if(!DEF[c.i].hirameki&&d.hirameki)DEF[c.i].hirameki=d.hirameki}else DEF[c.i]=d} // 手書きの定義にもヒラメキを補う

// ================= 効果の演出 =================
// 効果を使うとき、そのカードと効果文を大きく見せる（本体の showFx）
const FX_LINE={"登場時":/【登場時】/,"変装時":/【変装時】/,"現場リムーブ時":/【現場リムーブ時】|リムーブされたとき|リムーブエリアに移ったとき/,
  "ターン終了時":/ターン終了時/,"アクション終了時":/アクション終了時/,"アクション":/アクションした|アクションするとき|アクション宣言/,"コンタクト":/コンタクト/,
  "解決編":/解決編に(?:なった|移行した)とき/,"能力":/【宣言】/,"カットイン":/./};
function effText(x,kind){const c=C(x);
  if(kind==="カットイン")return c.ci||"";if(kind==="ヒラメキ")return c.hr||"";if(kind==="イベント")return c.f||"";
  const re=FX_LINE[kind];const ls=(c.f||"").split("\n");return (re&&ls.find(l=>re.test(l)))||c.f||""}
async function fxPre(p,x,kind,text){if(typeof showFx==="function")await showFx(p,x,kind,text??effText(x,kind))}
// 条件つきの効果は、実際に何か起きたときだけ見せる（ログが増えたかで判断）
async function fxIf(p,x,kind,fn){const n0=G.rec?G.rec.log.length:0;
  if(typeof showFx!=="function"||!G.rec){await fn();return}
  await fn();
  if(G.rec.log.length>n0)await showFx(p,x,kind,effText(x,kind),{after:true})}

// ================= フック（本体から呼ばれる） =================
const def=x=>DEF[idOf(x)];
const FX={
  has:(x,k)=>!!(def(x)&&def(x)[k]),
  async enter(p,x){const d=def(x);if(d&&d.enter){await fxPre(p,x,"登場時");log(`　【登場時】${C(x).nm}`,"n");await d.enter(p,x);render()}else if(/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時");await runQueue()},
  async event(p,x){const d=def(x);if(d&&d.event){await fxPre(p,x,"イベント");await d.event(p,x);render()}else noteEffect(p,x,"イベント");await runQueue()},
  async disguise(p,x){const d=def(x);if(d&&d.disguise){await fxPre(p,x,"変装時");log(`　【変装時】${C(x).nm}`,"n");await d.disguise(p,x)}else if(/【変装時】/.test(C(x).f||""))noteEffect(p,x,"変装時")},
  async hirameki(o,e){const d=def(e);if(d&&d.hirameki){await fxPre(o,e,"ヒラメキ");await d.hirameki(o,e);return true}return false},
  async cutin(p,card,mine){const d=def(card);if(d&&d.cutin)await fxIf(p,card,"カットイン",()=>d.cutin(p,card,mine));
    if(mine&&def(mine)&&def(mine).onCutinInContact&&ownerOf(mine)===p)await fxIf(p,mine,"コンタクト",()=>def(mine).onCutinInContact(p,mine,card))},
  noCutin:x=>!!x&&turnCount(x,"noCutin")>0&&G.contact&&(G.contact.a===x||G.contact.d===x),
  async onAction(p,actor){for(const y of p.field.slice()){const d=def(y);if(d&&d.onAction)await fxIf(p,y,"アクション",()=>d.onAction(p,y,actor))}},
  async actionEnd(p,actor){const d=def(actor);if(d&&d.actionEnd&&p.field.includes(actor))await fxIf(p,actor,"アクション終了時",()=>d.actionEnd(p,actor));await runQueue()},
  async contactWin(p,winner,victim){const d=def(winner);if(d&&d.contactWin&&p.field.includes(winner))await fxIf(p,winner,"コンタクト",()=>d.contactWin(p,winner,victim))},
  async endTurn(p){for(const y of p.field.slice()){const d=def(y);if(d&&d.endTurn&&p.field.includes(y))await fxIf(p,y,"ターン終了時",()=>d.endTurn(p,y))}
    const pd=def(p.partner);if(pd&&pd.endTurn&&pd.partnerToo&&p.pLoc==="area")await fxIf(p,p.partner,"ターン終了時",()=>pd.endTurn(p,p.partner))},
  async solvedTrigger(p){const d=def(p.caseC);if(d&&d.solvedTrigger){await fxPre(p,p.caseC,"解決編");await d.solvedTrigger(p)}},
  async onLeave(info){ // {x,p,turn,by,effect}
    const d=def(info.x);if(!d)return;
    if(d.leaveOppTurn&&info.turn!==info.p.idx){await fxPre(info.p,info.x,"現場リムーブ時");log(`　【現場リムーブ時】${C(info.x).nm}`,"n");await d.leaveOppTurn(info.p,info.x)}
    if(d.selfRemovedOwnTurn&&info.turn===info.p.idx&&info.by===info.p&&info.effect)await fxIf(info.p,info.x,"現場リムーブ時",()=>d.selfRemovedOwnTurn(info.p,info.x))},
  abilities(p,x){const d=def(x);
    let list=[];
    if(p.hand.includes(x))list=(d&&d.handAbilities||[]).map((a,i)=>({...a,key:"hab"+i,hand:true}));
    else{list=(d&&d.abilities||[]).map((a,i)=>({...a,key:"ab"+i}));
      for(const s of x.set||[]){const sd=s.up&&def(s.c);if(sd&&sd.grants)list.push(...sd.grants.map((a,i)=>({...a,key:"g"+idOf(s.c)+i})))}}
    return list.map(a=>({...a,ok:G.turn===p.idx&&!G.contact&&(!a.turn1||!turnCount(x,a.key))&&a.can(p,x)}))},
  async useAbility(p,x,a){if(typeof recAct==="function")recAct(p,"ability:"+a.label,x);if(a.turn1)useTurn(x,a.key);log(`${p.name} の ${C(x).nm} の能力:「${a.label}」`);await fxPre(p,x,"能力",a.label+"\n"+effText(x,"能力"));const r=await a.run(p,x);render();await runQueue();return r},
  apBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;
    if(G.turn===p.idx&&hasTrait(x,"サッカー選手"))b+=1000*p.field.filter(y=>idOf(y)==="0954").length; // 赤木守
    if(G.contact&&(G.contact.a===x||G.contact.d===x))b+=2000*(x.set||[]).filter(s=>s.up&&idOf(s.c)==="0019").length; // シャッフルロマンス
    return b},
  keepStun(p){return opp(p).field.some(y=>idOf(y)==="0301"&&partnerIs(opp(p),"白"))}, // 怪盗キッド B03046
  canGuardSleeping:x=>!!(def(x)&&def(x).guardWhileSleeping),
  handLevel(p,x){const d=def(x);return d&&d.handLevel?d.handLevel(p,x):null},
  eraseEvidence:p=>!!(def(p.caseC)&&def(p.caseC).eraseEvidence)&&partnerIs(p,"黒"),
  eventAi(p,x){const d=def(x);return !!(d&&d.event&&(!d.ai||d.ai(p)))},
  automated:x=>!!def(x)&&!def(x).partial,
  entersSleeping:x=>/(^|\n)このキャラはスリープ状態で登場する。/.test(C(x).f||""),
};
window.FX=FX;
