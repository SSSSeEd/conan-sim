"use strict";
// カード個別効果（プリセット4デッキの68種類）。キーはカードID（再録・パラレルも同じID）。
// 各スクリプトは async で、選択は pickCards / yes を通す（CPUは ai 関数、人は画面で選ぶ）。

// ================= 共通ヘルパー =================
const idOf=x=>C(x).i;
const fieldOf=p=>p.field;
const allChars=()=>[...G.P[0].field,...G.P[1].field];
const isOpp=(p,x)=>ownerOf(x)!==p;
const lvOf=x=>Math.max(0,(C(x).lv||0)+(x.lvT||0)+(window.FX&&G?FX.lvBonus(x):0));
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
  if(p.cpu){const v=!!(typeof aiVal==="function"?aiVal():aiVal);
    return G.sim&&G.sim.explore?!!explore(p,"はい/いいえ",[false,true],+v,o=>`${o?"はい":"いいえ"}: ${title}／${String(body).slice(0,40)}`):v}
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
  const cs=allChars().filter(y=>filter(y)&&!immune(p,y));
  if(!cs.length){log(`　（対象なし）`,"n");return null}
  const [x]=await pickCards(p,title,"",cs,{min,max:1,ai:ai||aiBestTargets(p,1)});
  if(x&&await negateChosen(p,x))return null;
  return x||null;
}
// 毛利蘭 B10011【絆工藤新一】: 相手のイベントの効果では選べない（リムーブされない）
function immune(p,y){const q=ownerOf(y);if(!q||q===p||!q.field.includes(y))return false;
  if(["0002","0514"].includes(idOf(y))&&condOk("絆江戸川コナン",q))return true; // 灰原哀【絆江戸川コナン】相手の能力や効果によって選ばれない
  return !!(G.evtBy===p&&idOf(y)==="1073"&&condOk("絆工藤新一",q))}
// 工藤新一 B04003【絆毛利蘭】【相手ターン中】【ターン1】: 自分の［毛利蘭］が相手の能力や効果で選ばれたら、相手は手札を1枚リムーブしないと無効
async function negateChosen(p,y){const q=ownerOf(y);if(!q||q===p||G.turn!==p.idx||!C(y).nm.includes("毛利蘭"))return false;
  const s=q.field.find(z=>idOf(z)==="0408"&&def(z)&&!turnCount(z,"shinRan")&&condOk("絆毛利蘭",q));if(!s)return false;useTurn(s,"shinRan");
  if(p.hand.length&&await yes(p,"工藤新一の効果",`手札を1枚リムーブしないと、${C(y).nm} を選んだ効果は無効になります。リムーブしますか？`,()=>p.hand.length>=2)){await discard(p,1);return false}
  log(`　${C(s).nm}: 効果は無効になった`,"n");return true}
// 効果で現場に出す（登場時が発動する）
async function enterByEffect(p,x,state="a"){
  if(p.field.length>=5){
    const [t]=await pickCards(p,"スイッチ","現場が5体です。リムーブするキャラを選んでください。",p.field,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
    if(!t)return false;removeCard(t,"スイッチ");
  }
  detach(x);resetMods(x);x.st=FX.entersSleeping(x)?"s":state;x.fresh=true;x.viaAb=!G.evtBy;p.field.push(x);
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
// --- ガード・カットインを崩す効果（環境デッキで使われるもの） ---
const canGuardNow=(o,y)=>{const k=staticKw(y,o);return !k.noGuard&&(y.st==="a"||y.st==="s"&&(k.guardSleep||FX.canGuardSleeping(y)))};
// 「必ずガードさせる」: 自分のアクティブなキャラでAP勝ちできる相手のキャラを、レベルの高い順に狙う
const forceGuardTargets=p=>{const o=opp(p);
  const atk=p.field.filter(a=>a.st==="a"&&!staticKw(a,p).bullet&&(canAct(a,p,"chara")&&o.field.some(y=>y.st!=="a")||canAct(a,p,"case")&&o.ev.length>0));
  return o.field.filter(y=>canGuardNow(o,y)&&!staticKw(y,o).mustGuard&&atk.some(a=>apOf(a)>=apOf(y))).sort((a,b)=>lvOf(b)-lvOf(a))};
const forceGuard=label=>({label,turn1:true,
  can:p=>opp(p).field.length>0,
  run:async(p,x)=>{const t=await chooseChar(p,"ターン終了時まで「必ずガードする」を与える相手のキャラ",y=>isOpp(p,y),{ai:()=>forceGuardTargets(p).slice(0,1)});
    if(t){t.kw.push("必ずガード");log(`　${C(t).nm} はターン終了時まで「ガードできる場合、必ずガードする」`,"n")}return true},
  aiCan:p=>forceGuardTargets(p).length>0});
DEF["0511"]={partial:true, // 江戸川コナン＆工藤新一 B05005（ネクストヒント時の効果は未対応）
  abilities:[forceGuard("相手のキャラに「必ずガードする」を与える")]};
DEF["1061"]={partial:true, // 沖田総司 PR290（自分ターン中のレベル＋1は未対応。AP＋1000は apBonus）
  abilities:[{...forceGuard("相手のキャラに「必ずガードする」を与える"),can:p=>condOk("事件緑＆白",p)&&opp(p).field.length>0}]};
DEF["0513"]={ // 妃英理 B05007
  enter:async(p,x)=>{const f=y=>C(y).t==="キャラ"&&lvOf(y)<=6&&(C(y).nm.includes("工藤新一")||hasTrait(y,"毛利探偵事務所"));
    if(!await yes(p,"登場時","このキャラをスリープして、手札からレベル6以下の工藤新一か［毛利探偵事務所］のキャラを1枚まで登場させ、1枚引きますか？",()=>p.hand.some(f)))return;
    sleepC(x);await playFromHand(p,f,"レベル6以下の工藤新一か［毛利探偵事務所］");drawN(p,1)},
  abilities:[{label:"手札を1枚リムーブ: ［毛利探偵事務所］のアクションに相手はカットインできない",turn1:true,
    can:p=>condOk("絆毛利小五郎",p)&&p.hand.length>0&&p.cutLock!==G.turnNo,
    run:async p=>{if(!(await discard(p,1)).length)return false;p.cutLock=G.turnNo;log(`　このターン、${p.name} の［毛利探偵事務所］のアクション中は相手はカットインできない`,"n");return true},
    aiCan:p=>{const o=opp(p);return p.hand.length>=2&&o.hand.length>0&&p.field.some(y=>hasTrait(y,"毛利探偵事務所")&&(canAct(y,p,"chara")&&o.field.some(z=>z.st!=="a"&&apOf(z)<=apOf(y)+2000)||canAct(y,p,"case")&&o.ev.length>0))}}]};
const giveKw=(y,k)=>{if(!y.kw.includes(k))y.kw.push(k);log(`　${C(y).nm} はターン終了時まで〚${k}〛`,"n")};
// ブレットが効くキャラ: 動けて、相手にAPで負けるガード役がいる
const bulletWorth=(p,y)=>{const o=opp(p);return y.st==="a"&&!staticKw(y,p).bullet&&(canAct(y,p,"chara")&&o.field.some(z=>z.st!=="a"&&apOf(z)<=apOf(y))||canAct(y,p,"case")&&o.ev.length>0)&&o.field.some(z=>canGuardNow(o,z)&&apOf(z)>apOf(y))};
DEF["0481"]={ // 沖矢昴 PR085
  enter:async(p,x)=>{const t=await chooseChar(p,"登場時: ターン終了時まで〚ブレット〛を与えるキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&bulletWorth(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)giveKw(t,"ブレット")}};
DEF["0220"]={ // 沖矢昴 B02057
  endTurn:async(p,x)=>{if(!partnerIs(p,"赤")||x.st==="a")return;const t=await chooseChar(p,"ターン終了時: リムーブするキャラ（AP8000以下）",y=>y!==x&&apOf(y)<=8000);if(t)removeCard(t,"効果",{by:p,effect:true})},
  abilities:[{label:"スリープ: レベル7以下の【赤】に〚ブレット〛か〚突撃［事件］〛",turn1:true,
    can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7),
    run:async(p,x)=>{x.st="s";log(`　コスト: ${C(x).nm} をスリープ`,"n");const o=opp(p);
      const [y]=await pickCards(p,"〚ブレット〛か〚突撃［事件］〛を与えるキャラ（レベル7以下の【赤】）","",p.field.filter(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7),{min:0,max:1,ai:cs=>cs.filter(y=>y.st==="a"&&(bulletWorth(p,y)||y.fresh&&o.ev.length>0)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(!y)return true;
      const rushE=p.cpu?y.fresh&&!canAct(y,p,"case"):!await yes(p,"どちらを与える？","「はい」で〚ブレット〛、「いいえ」で〚突撃［事件］〛");
      giveKw(y,rushE?"突撃［事件］":"ブレット");return true},
    aiCan:(p,x)=>{const o=opp(p);return p.field.some(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7&&y.st==="a"&&(bulletWorth(p,y)||y.fresh&&!canAct(y,p,"case")&&o.ev.length>0))}}]};
const akaiCard=y=>C(y).nm.includes("赤井秀一")||C(y).nm==="ライ";
DEF["0328"]={ // 沖矢昴 B03074（各ターン2回）
  abilities:[{label:"手札の赤井秀一かライをリムーブ: 〚突撃〛か〚ブレット〛",
    can:(p,x)=>turnCount(x,"oki2")<2&&p.hand.some(akaiCard),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: リムーブする赤井秀一かライ","",p.hand.filter(akaiCard),{min:1,max:1});if(!c)return false;
      useTurn(x,"oki2");detach(c);p.rm.push(c);log(`　コスト: 手札の ${C(c).nm} をリムーブ`,"n");
      const rush=p.cpu?x.fresh&&!canAct(x,p,"case"):await yes(p,"どちらを持つ？","「はい」で〚突撃〛、「いいえ」で〚ブレット〛");
      giveKw(x,rush?"突撃":"ブレット");return true},
    aiCan:(p,x)=>{const o=opp(p);return p.hand.length>=3&&x.st==="a"&&(x.fresh&&!canAct(x,p,"case")&&o.ev.length>0||bulletWorth(p,x))}}]};

// ================= 環境デッキのカード（2026-10-30 追加） =================
// 共通の小さな処理
const nameOf=x=>x.nmT||C(x).nm;
const ALIAS={"0782":"怪盗キッド"}; // ロボット黒羽快斗: 現場にいるこのキャラは［怪盗キッド］としても扱う
const namesOf=x=>{const n=[nameOf(x)];const p=ownerOf(x);if(ALIAS[idOf(x)]&&p&&p.field.includes(x))n.push(ALIAS[idOf(x)]);return n};
const sameName=(a,b)=>namesOf(a).some(n=>namesOf(b).includes(n));
const named=(...ns)=>y=>namesOf(y).some(n=>ns.some(m=>n.includes(m)));
const isChar=y=>C(y).t==="キャラ";
const hasLeave=y=>/【現場リムーブ時】/.test(C(y).f||"");
function apTurn(x,v){x.apT+=v;log(`　${C(x).nm} をターン終了時までAP${v>=0?"＋":"－"}${Math.abs(v)}`,"n")}
// 手札から条件に合うカードを1枚公開（してもよい）。公開したら FX.onReveal（毛利蘭 B09004 など）
async function revealFromHand(p,filter,title,{must=false,ai}={}){
  const cs=p.hand.filter(filter);if(!cs.length)return null;
  const [y]=await pickCards(p,title,"公開するカードを選びます（公開したカードは手札に戻ります）。",cs,{min:must?1:0,max:1,ai:ai||(c=>c.slice(0,1))});
  if(!y)return null;log(`　${p.name} は手札の ${C(y).nm} を公開`,"n");await FX.onReveal(p,y);return y}
// リムーブエリアから条件に合うキャラを1枚まで登場
async function enterFromRm(p,filter,title){
  const cs=p.rm.filter(y=>isChar(y)&&filter(y));if(!cs.length)return null;
  const [y]=await pickCards(p,title,"",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(!y)return null;await enterByEffect(p,y,"a");return y}
function millSelf(p,n){const xs=p.deck.slice(0,n);for(const y of xs){detach(y);p.rm.push(y)}if(xs.length)log(`　${p.name} はデッキの上から${xs.length}枚をリムーブ: ${xs.map(y=>C(y).nm).join("、")}`,"n");checkDeck(p);return xs}
// 〚捜査N〛: 相手はデッキの上からN枚を公開し、デッキの下に移す
function investigate(p,n){const o=opp(p);const xs=o.deck.slice(0,n);for(const y of xs){detach(y);o.deck.push(y)}
  log(`　〚捜査${n}〛${o.name} のデッキの上: ${xs.map(y=>`${C(y).nm}(Lv${C(y).lv||0})`).join("、")||"なし"}`,"n");return xs}
const rmBy=(p,t)=>{if(t)removeCard(t,"効果",{by:p,effect:true})};
const oppHas=(p,f)=>opp(p).field.some(y=>f(y)&&!immune(p,y));
// 「AP8000以下のキャラを1枚まで選び、リムーブする」などをまとめて
async function rmChar(p,f,title="リムーブするキャラ"){const t=await chooseChar(p,title,f);rmBy(p,t);return t}
async function bottomChar(p,f,title="デッキの下に移すキャラ"){const t=await chooseChar(p,title,f);if(t)toDeckBottom(t);return t}
const apLe=v=>y=>apOf(y)<=v,lvLe=v=>y=>lvOf(y)<=v;
// 宣言能力の部品: 【スリープ】コスト
const sleepCost=(x)=>{x.st="s";log(`　コスト: ${C(x).nm} をスリープ`,"n")};
const myTurn=p=>G.turn===p.idx;

// --- 黄（警察） ---
DEF["0619"]={ // 諸伏景光 SP009
  enter:async(p,x)=>{if(!partnerIs(p,"黄")||!myTurn(p))return;
    if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（［警察］のキャラがあれば突撃）",()=>p.deck.length>10))return;
    if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"警察")))giveKw(x,"突撃")}};
DEF["0706"]={ // 萩原千速 B06087
  contactWin:async(p,x)=>{if(p.file.length<6||!p.field.includes(x))return;const f=y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=7&&!C(y).nm.includes("萩原千速");
    if(!p.hand.some(f)||!await yes(p,"萩原千速","このキャラをリムーブして、手札からレベル7以下の［警察］を登場させますか？",true))return;
    removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();await playFromHand(p,f)}};
DEF["0941"]={ // 横溝重悟 D11014
  gale:async(p,x)=>{const t=await chooseChar(p,"疾風: AP－1000するキャラ");if(t)apTurn(t,-1000)},
  abilities:[{label:"【スリープ】手札1枚リムーブ: リムーブエリアのレベル5以下の［警察］を登場",
    can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const y=await enterFromRm(p,y=>hasTrait(y,"警察")&&lvOf(y)<=5,"登場させる［警察］（レベル5以下）");
      if(y&&C(y).nm.includes("萩原千速"))drawN(p,1);return true}}]};
DEF["1011"]={ // 萩原千速 B09071
  gale:async(p,x)=>{giveKw(x,"アクティブ指定");log(`　（相手のアクティブ状態のキャラを指定してアクションできる）`,"n")},
  contactWin:async(p,x)=>{if(turnCount(x,"chi"))return;useTurn(x,"chi");const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};
DEF["1014"]={ // 松田陣平 B09074
  gale:async p=>drawN(p,1),
  enter:async p=>{await searchTop(p,4,y=>isChar(y)&&/【疾風】/.test(C(y).f||""),1,"【疾風】を持つキャラを1枚まで手札に",1)}};
DEF["1015"]={ // 宮本由美 B09075
  gale:async p=>{if(p.solved)await enterFromRm(p,y=>hasTrait(y,"警察")&&lvOf(y)<=6,"登場させる［警察］（レベル6以下）")},
  abilities:[{label:"【スリープ】: ［警察］のキャラをAP＋2000",can:(p,x)=>x.st==="a"&&allChars().some(y=>hasTrait(y,"警察")),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"AP＋2000する［警察］",y=>hasTrait(y,"警察"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,2000);return true}}]};
DEF["0808"]={ // 風見裕也 B07080
  enter:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(7)(y))},
  abilities:[{label:"【スリープ】レベル7以下の［警視庁］をデッキの下へ: キャラをリムーブ",
    can:(p,x)=>partnerIs(p,"黄")&&p.file.length>=5&&x.st==="a"&&p.field.some(y=>hasTrait(y,"警視庁")&&lvOf(y)<=7),aiCan:p=>opp(p).field.some(y=>lvOf(y)>=7),
    run:async(p,x)=>{const cs=p.field.filter(y=>hasTrait(y,"警視庁")&&lvOf(y)<=7);
      const [c]=await pickCards(p,"コスト: デッキの下に移す［警視庁］","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;
      sleepCost(x);toDeckBottom(c);await rmChar(p,()=>true);return true}}]};
DEF["0703"]={ // 安室透＆榎本梓 B06084
  enter:async(p,x)=>{if(!partnerIs(p,"黄"))return;const o=opp(p);log(`　${o.name} は手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`);await rmChar(p,y=>y!==x&&lvLe(9)(y))},
  abilities:[{label:"1枚引いて〚捜査1〛",turn1:true,partner:true,can:p=>p.deck.length>1,
    run:async p=>{drawN(p,1);if(investigate(p,1).some(y=>(C(y).lv||0)<=7))await discard(p,1);return true}}]};

// --- 赤（FBI・赤井家） ---
DEF["0438"]={ // 赤井秀一 B04046
  lvAura:(q,self,y)=>G.turn===q.idx&&opp(q).field.includes(y)?-1:0,
  enter:async p=>{drawN(p,1);await playFromHand(p,y=>hasTrait(y,"FBI")&&lvOf(y)<=6,"レベル6以下の［FBI］を登場")},
  abilities:[{label:"［FBI］に「レベル7以下とコンタクトしたら両方リムーブ」を与える",turn1:true,can:p=>p.field.some(y=>hasTrait(y,"FBI")),
    aiCan:p=>p.field.some(y=>hasTrait(y,"FBI")&&y.st==="a"&&canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"&&lvOf(y)>=5&&lvOf(y)<=7),
    run:async p=>{const t=await chooseChar(p,"能力を与える［FBI］",y=>!isOpp(p,y)&&hasTrait(y,"FBI"),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>lvOf(a)-lvOf(b)).slice(0,1)});
      if(t){giveKw(t,"相打ち7")}return true}}]};
DEF["0886"]={ // アンドレ・キャメル B08048
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target)return;target.lvT=(target.lvT||0)-1;log(`　${C(target).nm} をターン終了時までレベル－1（Lv${lvOf(target)}）`,"n");
    if(lvOf(target)<=6){self.apA=(self.apA||0)+3000;log(`　${C(self).nm} はアクション終了時までAP＋3000`,"n")}},
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&hasTrait(y,"FBI")))giveKw(x,"突撃")}};
DEF["0320"]={ // 赤井秀一 B03066
  enter:async(p,x)=>{if(!oppHas(p,y=>lvOf(y)<=7))return;if(!await yes(p,"登場時","相手に証拠を1つ与えて、レベル7以下のキャラをリムーブしますか？",()=>opp(p).ev.length<4))return;
    gainEv(opp(p),1);await rmChar(p,y=>y!==x&&lvLe(7)(y))}};
DEF["0321"]={ // 沖矢昴 B03067
  apSelf:p=>partnerIs(p,"赤")&&myTurn(p)?1000:0,
  abilities:[{label:"レベル7以上の［赤井秀一］か［ライ］をリムーブ: アクティブにする",turn1:true,noAi:true,
    can:(p,x)=>partnerIs(p,"赤")&&x.st!=="a"&&p.field.some(y=>named("赤井秀一","ライ")(y)&&lvOf(y)>=7),
    run:async(p,x)=>{const cs=p.field.filter(y=>named("赤井秀一","ライ")(y)&&lvOf(y)>=7);const [c]=await pickCards(p,"コスト: リムーブするキャラ","",cs,{min:1,max:1});if(!c)return false;
      removeCard(c,"コスト");await runQueue();activateC(x);return true}}]};
DEF["1000"]={ // 羽田秀𠮷 B09058
  enter:async(p,x)=>{const f=y=>hasTrait(y,"赤井家")&&lvOf(y)<=6;if(!p.hand.length||!p.rm.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、リムーブエリアのレベル6以下の［赤井家］を登場させますか？",true))return;
    sleepC(x);await discard(p,1);await enterFromRm(p,f,"登場させる［赤井家］（レベル6以下）")},
  abilities:[{label:"他の［赤井家］をスリープ: 1枚引く",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家")),aiCan:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家")&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家"));const [c]=await pickCards(p,"コスト: スリープさせる［赤井家］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);drawN(p,1);return true}}]};

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

// --- 青（新一・蘭・小五郎） ---
DEF["0409"]={ // 毛利蘭 B04004
  contactWin:async(p,x)=>{if(turnCount(x,"ran")||!p.hand.length)return;if(!await yes(p,"毛利蘭","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=2))return;useTurn(x,"ran");await discard(p,1);gainEv(p,1)},
  onOppAction:async(q,self,actor,target)=>{if(!target||!q.field.includes(target)||!named("工藤新一")(target)||!condOk("絆工藤新一",q)||turnCount(self,"ran2"))return;useTurn(self,"ran2");activateC(self)}};
DEF["1073"]={}; // 毛利蘭 B10011（相手のイベントで選ばれない: immune、カットイン: ownCutinAp）
DEF["0735"]={ // 工藤新一 B07003（手札の【青】にカットインを与える: FX.grantedCutin）
  enter:async(p,x)=>{if(!partnerIs(p,"青"))return;const o=opp(p);const t=await chooseChar(p,"デッキの下に移す相手のキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8);if(!t)return;
    const nm=C(t).nm;toDeckBottom(t);const cs=o.rm.filter(y=>C(y).nm===nm);
    if(cs.length){const [y]=await pickCards(p,"相手のリムーブエリアから同じカード名のキャラをデッキの下へ","",cs,{max:1,ai:c=>c.slice(0,1)});if(y){detach(y);o.deck.push(y);log(`　${o.name} の ${C(y).nm} をデッキの下へ`,"n")}}}};
DEF["0949"]={ // 毛利蘭 B09004
  onReveal:async(p,self,y)=>{if(!condOk("絆工藤新一",p)||!myTurn(p)||turnCount(self,"ran3")||!named("工藤新一","毛利蘭")(y)||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"毛利蘭","手札を1枚リムーブして、レベル7以下のキャラをリムーブしますか？",()=>p.hand.length>=2))return;useTurn(self,"ran3");await discard(p,1);await rmChar(p,lvLe(7))}};
DEF["0727"]={ // 毛利小五郎 PR174
  enter:async p=>{if(p.solved)return;const f=y=>hasTrait(y,"毛利探偵事務所");if(!p.hand.some(f))return;
    if(!await yes(p,"登場時","手札の［毛利探偵事務所］を1枚リムーブして、2枚引きますか？",true))return;await discard(p,1,"リムーブする［毛利探偵事務所］",p,f);drawN(p,2)},
  apSelf:p=>p.solved&&myTurn(p)&&p.field.filter(y=>hasTrait(y,"毛利探偵事務所")).length>=3?2000:0};
DEF["0408"]={ // 工藤新一 B04003（選ばれたときの無効: negateChosen）
  abilities:[{label:"【スリープ】［毛利蘭］を公開: AP8000以下のキャラをデッキの下へ",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.some(named("毛利蘭")),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=5),
    run:async(p,x)=>{if(!await revealFromHand(p,named("毛利蘭"),"公開する［毛利蘭］",{must:true}))return false;sleepCost(x);await bottomChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["1057"]={ // 工藤新一 PR274
  apAura:(q,self,y)=>G.turn===q.idx&&y!==self&&q.field.includes(y)&&colorsOf(C(q.caseC).c).some(ch=>ch!=="青")?1000:0,
  abilities:[{label:"【スリープ】: レベル9以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&allChars().some(y=>y!==x&&lvOf(y)<=9),aiCan:p=>oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=9),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}}]};
DEF["1071"]={ // 工藤新一 B10009
  enter:async(p,x)=>{if(x.viaAb)apTurn(x,1000);
    if(partnerIs(p,"青")&&await revealFromHand(p,named("毛利蘭"),"公開する［毛利蘭］",{ai:c=>myTurn(p)?c.slice(0,1):[]}))giveKw(x,"突撃")}};
DEF["0947"]={ // 工藤新一&毛利蘭 B09002
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||turnCount(self,"sr")||!named("工藤新一","毛利蘭")(y))return;if(!oppHas(p,lvLe(9)))return;useTurn(self,"sr");
    const t=await chooseChar(p,"リムーブかデッキの下に移す相手のキャラ（レベル9以下）",z=>isOpp(p,z)&&lvOf(z)<=9);if(!t)return;
    const v=p.cpu?"rm":await ask(`${p.name}: 工藤新一&毛利蘭`,`${C(t).nm} をどうしますか？`,[{label:"リムーブ",value:"rm",primary:true},{label:"デッキの下へ",value:"bottom"}]);
    if(v==="rm")rmBy(p,t);else toDeckBottom(t)},
  endTurn:async(p,self)=>{const f=y=>lvOf(y)>=8&&y.st!=="a"&&named("工藤新一","毛利蘭")(y);if(!p.field.some(f))return;
    if(!await revealFromHand(p,named("工藤新一","毛利蘭"),"ターン終了時: 公開する［工藤新一］か［毛利蘭］"))return;
    const t=await chooseChar(p,"アクティブにするキャラ",y=>!isOpp(p,y)&&f(y),{ai:cs=>cs.slice(0,1)});if(t)activateC(t)},
  partnerToo:true};
DEF["0512"]={ // 毛利小五郎 B05006
  abilities:[{label:"アクティブなら突撃／スリープかスタンならAP8000以下をリムーブして1枚引く",turn1:true,
    can:(p,x)=>partnerIs(p,"青")&&p.field.some(y=>C(y).nm.includes("妃英理")||y!==x&&hasTrait(y,"毛利探偵事務所")),aiCan:(p,x)=>x.st==="a"?x.fresh&&!canAct(x,p,"chara"):oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(x.st==="a")giveKw(x,"突撃");else{await rmChar(p,y=>y!==x&&apLe(8000)(y));drawN(p,1)}return true}}]};
DEF["0631"]={ // 江戸川コナン B06006
  apSelf:(p,x)=>myTurn(p)?1000*(x.set||[]).filter(s=>s.under).length:0,
  enter:async(p,x)=>{millSelf(p,1);const cs=p.rm.filter(y=>isChar(y)&&(hasTrait(y,"探偵")||hasTrait(y,"少年探偵団")));
    const got=await pickCards(p,"このキャラの下に重ねるキャラ（2枚まで）","",cs,{max:2,ai:c=>c.slice(0,2)});
    for(const y of got){detach(y);x.set.push({c:y,up:true,under:true})}if(got.length)log(`　${C(x).nm} の下に${got.length}枚重ねた`,"n")}};

// --- 緑（平次・和葉・紅葉） ---
DEF["0427"]={ // 「後ろの女に一言遺したろ思てなァ…」
  useBlock:p=>p.file.length>5?"FILEが6枚以上":null,
  event:async(p,x)=>{if(!partnerIs(p,"緑")||!p.solved){log("　条件（パートナー緑・解決編）を満たさないので効果なし","n");return}
    await rmChar(p,y=>apOf(y)>=7000,"リムーブするキャラ（AP7000以上）");await rmChar(p,apLe(5000),"リムーブするキャラ（AP5000以下）")},
  ai:p=>p.solved&&partnerIs(p,"緑")&&oppHas(p,y=>apOf(y)>=7000||apOf(y)<=5000)};
DEF["0419"]={ // 遠山和葉 B04018
  onAllyEnter:async(p,self,y)=>{if(y!==self&&!C(y).nm.includes("服部平次"))return;
    const t=await chooseChar(p,"ターン終了時まで元の能力を無効にするキャラ",z=>isOpp(p,z),{ai:cs=>cs.filter(z=>def0(z)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(t){t.negT=G.turnNo;log(`　${C(t).nm} はターン終了時まで元の能力を失う`,"n")}},
  leaveOppTurn:async p=>drawN(p,1),
  abilities:[{label:"【スリープ】手札1枚リムーブ: リムーブエリアのレベル5以下の［服部平次］を登場",
    can:(p,x)=>partnerIs(p,"緑")&&p.solved&&x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&C(y).nm.includes("服部平次")&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await enterFromRm(p,y=>C(y).nm.includes("服部平次")&&lvOf(y)<=5,"登場させる［服部平次］");return true}}]};
DEF["0404"]={ // 服部平次 PR060
  enter:async(p,x)=>{if(!p.solved||opp(p).field.filter(y=>y.st!=="a").length<2)return;await rmChar(p,y=>y.st==="s"&&lvOf(y)<=7)}};
DEF["0652"]={ // ヘビ男 B06029
  enter:async p=>{if(!p.ev.length||!p.hand.length||!await yes(p,"登場時","証拠を1つ手札に加えて、手札から1枚を裏向きで証拠にしますか？",false))return;
    const [e]=await pickCards(p,"手札に加える証拠","",p.ev,{min:1,max:1,faceUp:false});if(!e)return;detach(e);p.hand.push(e);
    const [y]=await pickCards(p,"裏向きで証拠にするカード","",p.hand,{min:1,max:1});if(y){detach(y);y.up=false;p.ev.push(y);log(`　証拠を1枚入れ替えた`,"n")}}};
const setCardsAll=()=>allChars().filter(y=>faceDownSet(y).length);
async function removeAnySet(p,title){const cs=setCardsAll();const [y]=await pickCards(p,title,"",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>isOpp(p,b)-isOpp(p,a))});if(!y)return null;removeSetCost(ownerOf(y),y);return y}
DEF["0532"]={ // 服部平蔵 B05028
  abilities:[{label:"セットされた裏向きのカードを1枚リムーブ: AP8000以下のキャラをリムーブ",turn1:true,can:p=>partnerIs(p,"緑")&&setCardsAll().length>0,aiCan:p=>oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(!await removeAnySet(p,"裏向きのカードをリムーブするキャラ"))return false;await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}},
    {label:"【スリープ】: 自分の［警察］と相手のキャラにデッキの上から1枚ずつセット",can:(p,x)=>x.st==="a"&&allChars().length>0,aiCan:p=>p.field.some(y=>hasTrait(y,"警察")),
    run:async(p,x)=>{sleepCost(x);const a=await chooseChar(p,"セットする自分の［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:cs=>cs.slice(0,1)});if(a)setTop(p,a);
      const b=await chooseChar(p,"セットする相手のキャラ",y=>isOpp(p,y));if(b)setTop(opp(p),b);return true}}]};
DEF["0533"]={ // 大岡紅葉 B05029
  abilities:[{label:"【スリープ】: 自分のキャラにデッキの上から1枚セット",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:p=>!myTurn(p)||p.field.every(y=>y.st!=="a"||!canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"セットするキャラ",y=>!isOpp(p,y),{ai:cs=>cs.slice(0,1)});if(t)setTop(p,t);return true}},
    {label:"セットされた裏向きのカードを2枚リムーブ: レベル7以下のキャラをリムーブ",turn1:true,can:p=>partnerIs(p,"緑")&&setCardsAll().reduce((n,y)=>n+faceDownSet(y).length,0)>=2,aiCan:p=>oppHas(p,lvLe(7)),
    run:async(p,x)=>{for(let i=0;i<2;i++)if(!await removeAnySet(p,`裏向きのカードをリムーブするキャラ（${i+1}枚目）`))return false;await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0729"]={ // 「助けて平次ィ!!!」
  event:async p=>{if(!await yes(p,"イベント","デッキの上から3枚をリムーブして、リムーブエリアのレベル6以下のキャラを登場させますか？",()=>p.deck.length>8))return;
    millSelf(p,3);await enterFromRm(p,y=>lvOf(y)<=6,"登場させるキャラ（レベル6以下）")},
  ai:p=>p.deck.length>8&&p.field.length<5};

// --- 青黒（灰原・シェリー・組織） ---
DEF["0929"]={ // 灰原哀＆シェリー B08093
  abilities:[{label:"【現場リムーブ時】を持つ【青】か【黒】のキャラを公開: レベル9以下をリムーブ",turn1:true,can:p=>p.hand.some(y=>isChar(y)&&hasLeave(y)&&(hasColor(y,"青")||hasColor(y,"黒"))),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=9),
    run:async(p,x)=>{if(!await revealFromHand(p,y=>isChar(y)&&hasLeave(y)&&(hasColor(y,"青")||hasColor(y,"黒")),"公開するキャラ",{must:true}))return false;await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}},
    {label:"【青】と【黒】のキャラを1枚ずつAP＋1000",turn1:true,partner:true,can:p=>p.field.length>0,aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara")),
    run:async p=>{for(const col of ["青","黒"]){const t=await chooseChar(p,`AP＋1000する【${col}】のキャラ`,y=>hasColor(y,col),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>(b.st==="a")-(a.st==="a")).slice(0,1)});if(t)apTurn(t,1000)}return true}}],
  leaveOppTurn:async p=>{if(p.hand.length<=2)drawN(p,1)}};
DEF["0915"]={ // ピンガ B08079
  apSelf:p=>myTurn(p)?1000:0,
  leaveOppTurn:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"【スリープ】: AP8000以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&colorsOf(C(p.caseC).c).some(ch=>ch!=="黒")&&allChars().some(y=>y!==x&&apOf(y)<=8000),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=5),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["0919"]={ // ラム B08083
  leaveOppTurn:async p=>drawN(p,1),
  abilities:[{label:"【スリープ】: 手札から【現場リムーブ時】を持つレベル5以下のキャラを登場",can:(p,x)=>condOk("事件青＆黒",p)&&x.st==="a"&&p.field.length<5&&p.hand.some(y=>isChar(y)&&hasLeave(y)&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>hasLeave(y)&&lvOf(y)<=5);return true}}]};
DEF["0918"]={ // ピスコ B08082
  enter:async(p,x)=>{if(myTurn(p)&&await revealFromHand(p,y=>isChar(y)&&hasLeave(y),"公開する【現場リムーブ時】を持つキャラ"))giveKw(x,"突撃")},
  leaveOppTurn:async p=>{const f=y=>isChar(y)&&colorsOf(C(y).c).some(ch=>ch!=="黒");if(!p.hand.some(f)||!await yes(p,"ピスコ","手札の【黒】以外の色を持つキャラを1枚リムーブして、1枚引きますか？",true))return;
    await discard(p,1,"リムーブするキャラ",p,f);drawN(p,1)}};
DEF["0921"]={ // シェリー B08085
  leaveOppTurn:async p=>{if(!condOk("事件青＆黒",p))return;const e=opp(p).ev.find(z=>!z.up);if(e){e.up=true;log(`　${opp(p).name} の裏向きの証拠を1つ表向きにした`,"n")}}};
DEF["1038"]={ // バーボン B09099
  enter:async p=>{if(opp(p).refreshed){drawN(p,1);await discard(p,1)}else{const o=opp(p);const y=popDeck(o);if(y){o.rm.push(y);log(`　${o.name} のデッキの上の ${C(y).nm} をリムーブ`,"n");checkDeck(o)}}}};

// --- 赤単ハンドレス（手札2枚以下・宮野家） ---
const handLe=(p,n=2)=>p.hand.length<=n;
const lv7Count=p=>p.field.filter(y=>lvOf(y)===7).length;
const solvedLv=n=>({lvSelf:p=>p.solved?n:0}); // 【解決編】現場にいるこのキャラをレベル＋N
DEF["0794"]={ // 世良真純＆メアリー B07065
  abilities:[{label:"手札1枚リムーブ: キャラをリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&p.hand.length>0&&allChars().some(y=>y!==x),aiCan:p=>oppHas(p,y=>lvOf(y)>=6),
    run:async(p,x)=>{await discard(p,1);await rmChar(p,y=>y!==x);return true}},
    {label:"1枚引く（手札2枚以下）",turn1:true,partner:true,can:p=>handLe(p),run:async p=>{drawN(p,1);return true}}]};
DEF["0796"]={ // 沖矢昴 B07067
  enter:async(p,x)=>{if(partnerIs(p,"赤")&&opp(p).hand.length>=p.hand.length)await rmChar(p,y=>y!==x&&lvLe(8)(y))},
  abilities:[{label:"レベル6以上の【赤】をスリープ: レベル7以下をリムーブ",turn1:true,
    can:(p,x)=>handLe(p)&&x.st!=="a"&&p.field.some(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6),aiCan:(p,x)=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)&&p.field.some(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6);const [c]=await pickCards(p,"コスト: スリープさせる【赤】のキャラ","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0798"]={ // 本堂瑛海 B07069
  abilities:[{label:"レベル8以下をリムーブ（手札2枚以下）",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&handLe(p)&&allChars().some(y=>y!==x&&lvOf(y)<=8),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(8)(y));return true}},
    {label:"【スリープ】手札1枚とFILEの上1枚をリムーブ: リムーブエリアのレベル7以下の【赤】を登場",turn1:true,
    can:(p,x)=>p.file.length>=8&&x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasColor(y,"赤")&&lvOf(y)<=7),aiCan:p=>p.field.length<5,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const top=[...p.file].reverse().find(y=>y!==p.partner);if(top){p.file.splice(p.file.indexOf(top),1);p.rm.push(top);log(`　FILEの上の ${C(top).nm} をリムーブ`,"n")}
      await enterFromRm(p,y=>hasColor(y,"赤")&&lvOf(y)<=7,"登場させる【赤】のキャラ（レベル7以下）");return true}}]};
DEF["0797"]={ // 羽田秀𠮷 B07068
  enter:async(p,x)=>{const f=y=>isChar(y)&&hasColor(y,"赤")&&lvOf(y)<=5;if(!partnerIs(p,"赤")||!p.hand.length||!p.rm.some(f))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、リムーブエリアのレベル5以下の【赤】をスリープ状態で登場させますか？",true))return;
    sleepC(x);await discard(p,1);const cs=p.rm.filter(f);const [y]=await pickCards(p,"登場させる【赤】のキャラ（レベル5以下）","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(y&&await enterByEffect(p,y,"s")&&handLe(p)){activateC(y);activateC(x)}}};
DEF["0885"]={ // 沖矢昴 B08047
  endTurn:async p=>{if(p.hand.length<2)drawN(p,2-p.hand.length)},
  abilities:[{label:"【スリープ】手札が2枚になるまでリムーブ: キャラをリムーブ",can:(p,x)=>partnerIs(p,"赤")&&x.st==="a"&&allChars().some(y=>y!==x),aiCan:p=>p.hand.length<=3&&oppHas(p,y=>lvOf(y)>=6),
    run:async(p,x)=>{sleepCost(x);if(p.hand.length>2)await discard(p,p.hand.length-2);await rmChar(p,y=>y!==x);return true}}]};
DEF["0894"]={ // 宮野厚司 B08056
  abilities:[{label:"【スリープ】: 手札からレベル7以下の［宮野エレーナ］［宮野志保］［宮野明美］を登場",
    can:(p,x)=>p.file.length>=5&&x.st==="a"&&p.field.length<5&&p.hand.some(y=>isChar(y)&&lvOf(y)<=7&&named("宮野エレーナ","宮野志保","宮野明美")(y)),
    run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>lvOf(y)<=7&&named("宮野エレーナ","宮野志保","宮野明美")(y));return true}}]};
DEF["0896"]={ // 宮野志保 B08058
  endTurn:async p=>{if(lv7Count(p)<3)return;drawN(p,1);const t=await chooseChar(p,"スタンさせる相手のキャラ",y=>isOpp(p,y));if(t)stunC(t)},
  enter:async(p,x)=>{const f=y=>y!==x&&y.st!=="a"&&lvOf(y)<=8;if(p.file.length<8||!p.hand.length||!oppHas(p,f))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、スリープかスタン状態のレベル8以下をデッキの下に移しますか？",true))return;
    sleepC(x);await discard(p,1);await bottomChar(p,f)}};
DEF["0799"]={ // 新出智明 B07070
  enter:async(p,x)=>{if(!handLe(p))return;const t=await chooseChar(p,"AP＋1000と突撃を与える【赤】のキャラ（レベル7以上）",y=>!isOpp(p,y)&&hasColor(y,"赤")&&lvOf(y)>=7,{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});
    if(t){apTurn(t,1000);giveKw(t,"突撃")}}};
DEF["0895"]={ // 宮野エレーナ B08057
  ...solvedLv(2),
  abilities:[{label:"【スリープ】デッキの上から9枚リムーブ: Lv5・4・1をデッキの下へ、3枚なら相手のキャラをデッキの下へ",turn1:true,
    can:(p,x)=>p.solved&&x.st==="a"&&lv7Count(p)>=3&&p.deck.length>9,aiCan:p=>p.deck.length>18&&opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);millSelf(p,9);let n=0;
      for(const lv of [5,4,1]){const cs=p.rm.filter(y=>(C(y).lv||0)===lv);const [y]=await pickCards(p,`デッキの下に移すレベル${lv}のカード`,"",cs,{max:1,ai:c=>c.slice(0,1)});if(y){detach(y);p.deck.push(y);n++}}
      log(`　リムーブエリアから${n}枚をデッキの下へ`,"n");if(n===3)await bottomChar(p,y=>isOpp(p,y));return true}}]};
DEF["1055"]={...solvedLv(2),enter:async(p,x)=>{if(lv7Count(p)>=3)giveKw(x,"突撃［事件］")}}; // 宮野明美 PR264
DEF["0888"]={ // 宮野明美 B08050
  ...solvedLv(3),
  enter:async p=>{const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const fam=named("諸星大","宮野志保","宮野エレーナ","宮野厚司");
    const [y]=await pickCards(p,"手札に加えるカード（1枚まで）","残りはリムーブエリアへ",xs,{max:1,ai:c=>c.slice().sort((a,b)=>(fam(b)-fam(a))||aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);
    if(y&&!fam(y))await discard(p,1)}};
DEF["1118"]=solvedLv(5); // 宮野明美 B10059
DEF["1117"]={}; // 世良真純 B10058（カットイン: ownCutinAp）
DEF["1120"]={ // 骨董盆は隠せない
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"手札1枚とデッキの上2枚をリムーブ: AP＋2000か1枚引く",turn1:true,can:p=>p.solved&&p.hand.length>0&&p.deck.length>2,
    aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara"))&&p.hand.length>=2,
    run:async p=>{await discard(p,1);millSelf(p,2);
      const v=p.cpu?(handLe(p)&&!p.field.some(y=>y.st==="a")?2:1):await ask(`${p.name}: 骨董盆は隠せない`,"1つ選んで行います",[{label:"キャラ1枚をAP＋2000",value:1,primary:true},{label:"1枚引く（手札2枚以下）",value:2}]);
      if(v===2){if(handLe(p))drawN(p,1)}else{const t=await chooseChar(p,"AP＋2000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,2000)}return true}}]};

// --- 黄単佐藤高木 ---
const SATO=named("佐藤美和子","高木渉");
const allSato=p=>p.field.length>0&&p.field.every(SATO);
const apLeSelf=x=>y=>y!==x&&apOf(y)<=apOf(x);
DEF["0899"]={ // 佐藤美和子＆高木渉 B08062
  onAllyEnter:async(p,self,y)=>{if(y===self||!partnerIs(p,"黄")||!myTurn(p)||turnCount(self,"st")||!SATO(y))return;if(!oppHas(p,apLe(8000)))return;useTurn(self,"st");await rmChar(p,z=>z!==self&&apLe(8000)(z))},
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&allSato(q)?1000:0,partnerToo:true};
DEF["0455"]={ // 佐藤美和子 B04069
  lpSelf:p=>p.field.filter(y=>hasTrait(y,"警察")).length>=3?1:0,
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&named("高木渉")(y)&&condOk("絆高木渉",q)?1000:0,
  enter:async(p,x)=>{if(partnerIs(p,"黄")&&p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察")).length>=3)await rmChar(p,y=>y!==x&&lvLe(8)(y))}};
DEF["0910"]={ // 高木渉 B08073
  endTurn:async(p,x)=>{if(condOk("絆佐藤美和子",p)&&allSato(p)&&x.st!=="a")activateC(x)},
  abilities:[{label:"【スリープ】: このキャラのAP以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&allChars().some(apLeSelf(x)),aiCan:(p,x)=>oppHas(p,y=>apLeSelf(x)(y)&&lvOf(y)>=5)&&!canAct(x,p,"chara"),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,apLeSelf(x));return true}}]};
DEF["1125"]={ // 高木渉 B10069
  lpSelf:p=>partnerIs(p,"黄")&&condOk("絆佐藤美和子",p)?1:0,
  abilities:[{label:"手札の［佐藤美和子］か［高木渉］をリムーブ: このキャラのAP以下をリムーブして1枚引く",turn1:true,can:p=>p.hand.some(SATO),aiCan:(p,x)=>oppHas(p,y=>apLeSelf(x)(y)&&lvOf(y)>=5),
    run:async(p,x)=>{await discard(p,1,"リムーブする［佐藤美和子］か［高木渉］",p,SATO);await rmChar(p,apLeSelf(x));drawN(p,1);return true}}]};
DEF["0456"]={ // 高木渉 B04070
  abilities:[{label:"［佐藤美和子］をスリープ＋手札1枚リムーブ: アクティブにする",turn1:true,noAi:true,
    can:(p,x)=>condOk("絆佐藤美和子",p)&&x.st!=="a"&&p.hand.length>0&&p.field.some(y=>y.st==="a"&&named("佐藤美和子")(y)),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&named("佐藤美和子")(y));const [c]=await pickCards(p,"コスト: スリープさせる［佐藤美和子］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);await discard(p,1);activateC(x);return true}}]};
DEF["0810"]={ // 高木渉 B07082
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&lvOf(y)>=7&&hasTrait(y,"警視庁"))){const cs=p.rm.filter(y=>isChar(y)&&named("佐藤美和子")(y)&&lvOf(y)<=5);
    const [y]=await pickCards(p,"スリープ状態で登場させる［佐藤美和子］","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s")}}};
DEF["1131"]={apAura:(q,self,y)=>G.turn===q.idx&&y!==self&&q.field.includes(y)&&hasColor(y,"黄")&&hasTrait(y,"警視庁")&&condOk("絆高木渉",q)?1000:0}; // 佐藤美和子 B10075
DEF["0909"]={ // 佐藤美和子 B08072
  enter:async(p,x)=>{if(condOk("絆高木渉",p)&&p.solved&&allSato(p))await rmChar(p,apLeSelf(x))}};
DEF["1020"]={apAura:(q,self,y)=>G.turn!==q.idx&&q.field.includes(y)&&named("佐藤美和子")(y)&&condOk("絆佐藤美和子",q)?1000:0}; // 高木渉 B09080
DEF["1019"]={ // 佐藤美和子 B09079
  enter:async p=>{const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [y]=await pickCards(p,"手札に加える［高木渉］（1枚まで）","残りはリムーブエリアへ",xs.filter(named("高木渉")),{max:1,ai:c=>c.slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p)}};
DEF["0908"]={ // 佐藤正義 B08071
  abilities:[{label:"このキャラをリムーブ: デッキの上から4枚見て［佐藤美和子］を手札に",can:p=>p.deck.length>0,aiCan:p=>myTurn(p)&&!p.hand.some(named("佐藤美和子")),
    run:async(p,x)=>{removeCard(x,"コスト");await runQueue();await lookTop(p,4,named("佐藤美和子"),{title:"［佐藤美和子］を1枚まで手札に"});return true}}],
  cutin:async(p,card,mine)=>{if(mine&&named("佐藤美和子")(mine))drawN(p,1)}};
DEF["0913"]={ // 揺れる警視庁 1200万人の人質
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠2つを表に＋キャラ1枚をデッキの下へ: レベル4以下の［佐藤美和子］か［高木渉］をスリープで登場",turn1:true,
    can:p=>p.solved&&p.field.length>=2&&p.ev.filter(e=>!e.up).length>=2&&p.rm.some(y=>isChar(y)&&SATO(y)&&lvOf(y)<=4),aiCan:p=>p.field.length<5&&allSato(p),
    run:async p=>{const [c]=await pickCards(p,"コスト: デッキの下に移すキャラ","",allChars(),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>aiScoreTarget(p,b)-aiScoreTarget(p,a)).slice(0,1)});if(!c)return false;
      if(!flipEvidence(p,2))return false;toDeckBottom(c);if(!allSato(p))return true;
      const cs=p.rm.filter(y=>isChar(y)&&SATO(y)&&lvOf(y)<=4);const [y]=await pickCards(p,"スリープ状態で登場させるキャラ","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s");return true}}]};

// --- 黄単長野県警 ---
const NAGANO=y=>isChar(y)&&hasTrait(y,"長野県警");
DEF["0234"]={ // 上原由衣 B02073
  abilities:[{label:"【スリープ】このキャラをリムーブ: ［長野県警］に迅速を与える",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"長野県警")),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.fresh&&hasTrait(y,"長野県警")&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const t=await chooseChar(p,"迅速を与える［長野県警］",y=>y!==x&&!isOpp(p,y)&&hasTrait(y,"長野県警"),{ai:cs=>cs.filter(y=>y.fresh).slice(0,1)});x.st="s";removeCard(x,"コスト");await runQueue();if(t)giveKw(t,"迅速");return true}}]};
DEF["0500"]={ // 大和敢助 D09004
  lpSelf:p=>myTurn(p)&&condOk("絆諸伏高明",p)?1:0,
  enter:async(p,x)=>{drawN(p,1);const [y]=await discard(p,1);if(y&&NAGANO(y))await rmChar(p,z=>z!==x&&apLe(8000)(z))}};
DEF["0509"]={ // 空城の計
  event:async p=>{const y=await enterFromRm(p,y=>hasTrait(y,"長野県警")&&lvOf(y)<=5,"登場させる［長野県警］（レベル5以下）");if(y)giveKw(y,"突撃")},
  ai:p=>p.field.length<5&&p.rm.some(y=>NAGANO(y)&&lvOf(y)<=5)};
DEF["0510"]={ // 死亡の館、赤い壁
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: ［長野県警］に突撃［キャラ］",turn1:true,can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&p.field.some(y=>hasTrait(y,"長野県警")),
    aiCan:p=>myTurn(p)&&p.field.some(y=>y.fresh&&y.st==="a"&&hasTrait(y,"長野県警")&&!canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"),
    run:async p=>{if(!flipEvidence(p,3))return false;const t=await chooseChar(p,"突撃［キャラ］を与える［長野県警］",y=>hasTrait(y,"長野県警"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.fresh).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0585"]={ // 諸伏高明 B05087
  onRmLeave:async(p,self,y)=>{if(!partnerIs(p,"黄")||!myTurn(p)||turnCount(self,"kom")||!NAGANO(y)||!oppHas(p,apLe(7000)))return;useTurn(self,"kom");await rmChar(p,z=>z!==self&&apLe(7000)(z))},
  endTurn:async p=>{const cs=p.rm.filter(y=>NAGANO(y)&&lvOf(y)<=6);if(!cs.length)return;
    const [y]=await pickCards(p,"ターン終了時: 手札に加える［長野県警］（レベル6以下）","",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(!y)return;detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`);await runQueue();if(p.hand.length>=6)await discard(p,1)}};
DEF["0586"]={ // 大和敢助 B05088
  apSelf:p=>myTurn(p)&&condOk("絆上原由衣",p)?1000:0,
  onRmLeave:async(p,self,y)=>{if(!myTurn(p)||turnCount(self,"yam")||!NAGANO(y))return;useTurn(self,"yam");const t=await chooseChar(p,"AP－1000するキャラ");if(t)apTurn(t,-1000)},
  abilities:[{label:"リムーブエリアの［長野県警］をデッキの下へ: 突撃を得る",turn1:true,can:p=>partnerIs(p,"黄")&&p.rm.some(NAGANO),aiCan:(p,x)=>myTurn(p)&&x.fresh&&x.st==="a"&&!canAct(x,p,"chara"),
    run:async(p,x)=>{const [y]=await pickCards(p,"コスト: デッキの下に移す［長野県警］","",p.rm.filter(NAGANO),{min:1,max:1});if(!y)return false;detach(y);p.deck.push(y);await runQueue();giveKw(x,"突撃");return true}}]};
DEF["0534"]={ // 遠山銀司郎 B05030
  apSelf:(p,x)=>myTurn(p)?1000*(x.set||[]).filter(s=>!s.under).length:0,
  enter:async(p,x)=>setTop(p,x)};

// --- 黒（ジン・ウォッカ・ベルモット） ---
DEF["0382"]={ // 「見ィーつけた♪」
  event:async p=>{const f=y=>isChar(y)&&!!C(y).ci&&hasColor(y,"黒")&&lvOf(y)<=6;
    const got=await pickCards(p,"手札に加えるキャラ（2枚まで）","",p.rm.filter(f),{max:2,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,2)});
    for(const y of got){detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}
    const y=await playFromHand(p,f,"【カットイン】を持つレベル6以下の【黒】を登場");if(y)giveKw(y,"突撃［キャラ］")},
  ai:p=>p.rm.some(y=>isChar(y)&&!!C(y).ci&&hasColor(y,"黒"))};
DEF["0391"]={ // ベルモット D07008
  abilities:[{label:"【スリープ】このキャラをデッキの下へ: 手札からレベル5以下を登場して突撃",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&lvOf(y)<=5),aiCan:p=>myTurn(p)&&p.hand.some(y=>isChar(y)&&lvOf(y)>=4&&lvOf(y)<=5),
    run:async(p,x)=>{x.st="s";toDeckBottom(x);const y=await playFromHand(p,y=>lvOf(y)<=5);if(y)giveKw(y,"突撃");return true}}]};
DEF["0602"]={ // ジン＆ウォッカ B05106
  onOppRemoved:async(q,self)=>{if(!partnerIs(q,"黒")||!myTurn(q)||turnCount(self,"jv")||!oppHas(q,apLe(8000)))return;useTurn(self,"jv");await rmChar(q,z=>z!==self&&apLe(8000)(z))},
  abilities:[{label:"自分のレベル8以下のキャラをリムーブ: 1枚引く",turn1:true,partner:true,can:p=>p.field.some(y=>lvOf(y)<=8),aiCan:p=>p.field.some(y=>lvOf(y)<=8&&hasLeave(y)&&!myTurn(p))||p.field.some(y=>idOf(y)==="0603"),
    run:async(p,x)=>{const cs=p.field.filter(y=>lvOf(y)<=8);const [c]=await pickCards(p,"リムーブする自分のキャラ（レベル8以下）","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>(idOf(b)==="0603")-(idOf(a)==="0603")||lvOf(a)-lvOf(b))});if(!c)return false;
      removeCard(c,"自分の効果",{by:p,effect:true});await runQueue();drawN(p,1);return true}}]};
DEF["0603"]={ // ウォッカ B05107
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒")||!p.rm.includes(x))return;if(!await yes(p,"ウォッカ","リムーブエリアからスリープ状態で登場させますか？",true))return;await enterByEffect(p,x,"s")}};
DEF["0717"]={ // ベルモット B06100
  enter:async p=>{const f=y=>!!C(y).ci&&hasColor(y,"黒");if(!p.hand.some(f)||!await yes(p,"登場時","手札の【カットイン】を持つ【黒】を1枚リムーブして、2枚引きますか？",()=>p.hand.filter(f).length>=2||p.hand.length<=2))return;
    await discard(p,1,"リムーブする【カットイン】を持つ【黒】",p,f);drawN(p,2)}};
DEF["0720"]={ // ジン B06103
  handAbilities:[{label:"自分の【黒】のキャラをリムーブ: このキャラをスリープ状態で登場",can:(p,x)=>p.solved&&p.field.some(y=>hasColor(y,"黒"))&&!(p.banNm&&p.banNm.t===G.turnNo),aiCan:p=>p.field.some(y=>hasColor(y,"黒")&&lvOf(y)<=4),
    run:async(p,x)=>{const cs=p.field.filter(y=>hasColor(y,"黒"));const [c]=await pickCards(p,"リムーブする自分の【黒】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;
      removeCard(c,"自分の効果",{by:p,effect:true});await runQueue();await enterByEffect(p,x,"s");p.banNm={t:G.turnNo,nm:"ジン"};log("　このターン、［ジン］は使用も登場もできない","n");return true}}]};
DEF["0821"]={ // ジン B07094
  endTurn:async(p,x)=>{const own=p.field.filter(y=>lvOf(y)<=7);if(!partnerIs(p,"黒")||!p.hand.length||!own.length||!opp(p).field.length)return;
    if(!await yes(p,"ジン ターン終了時","手札を1枚と自分のレベル7以下のキャラを1枚リムーブして、キャラを1枚リムーブしますか？",()=>opp(p).field.some(y=>lvOf(y)>=6)&&own.some(y=>lvOf(y)<=4)))return;
    await discard(p,1);const [c]=await pickCards(p,"リムーブする自分のキャラ（レベル7以下）","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(c){removeCard(c,"自分の効果",{by:p,effect:true});await runQueue()}
    await rmChar(p,y=>y!==x)}};
DEF["0822"]={ // ベルモット B07095
  enter:async(p,x)=>{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a"&&y!==x);if(t)sleepC(t)},
  abilities:[{label:"【スリープ】: スリープ状態のレベル6以下をリムーブ",can:(p,x)=>partnerIs(p,"黒")&&x.st==="a"&&allChars().some(y=>y.st==="s"&&lvOf(y)<=6),aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)<=6),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y.st==="s"&&lvOf(y)<=6);return true}}]};

// --- 青単少年探偵団 ---
const DBOYS=y=>isChar(y)&&hasTrait(y,"少年探偵団");
const underN=x=>(x.set||[]).filter(s=>s.under).length;
function stackUnder(x,ys){for(const y of ys){detach(y);x.set=x.set||[];x.set.push({c:y,up:true,under:true})}if(ys.length)log(`　${C(x).nm} の下に${ys.length}枚重ねた（${underN(x)}枚）`,"n")}
function toHandFromField(t){const q=ownerOf(t);for(const s of t.set||[])q.rm.push(s.c);t.set=[];detach(t);resetMods(t);q.hand.push(t);log(`　${q.name} の ${C(t).nm} を手札に移した`,"n")}
DEF["0002"]={ // 灰原哀 B01006（選ばれない: immune）
  abilities:[{label:"【スリープ】: 手札からレベル5以下の［少年探偵団］を登場",can:(p,x)=>x.st==="a"&&p.field.length<5&&p.hand.some(y=>DBOYS(y)&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);const y=await playFromHand(p,y=>DBOYS(y)&&lvOf(y)<=5);if(y&&C(y).nm.includes("江戸川コナン"))drawN(p,1);return true}}]};
DEF["0514"]={ // 灰原哀 B05008（選ばれない: immune）
  abilities:[{label:"他の［少年探偵団］に突撃［キャラ］",turn1:true,can:(p,x)=>p.solved&&p.field.some(y=>y!==x&&DBOYS(y)),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&DBOYS(y)&&y.fresh&&y.st==="a"&&!canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"突撃［キャラ］を与える［少年探偵団］",y=>y!==x&&!isOpp(p,y)&&DBOYS(y),{ai:cs=>cs.filter(y=>y.fresh).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0264"]={ // 結成 少年探偵団 B03006
  enter:async(p,x)=>{const cs=[],seen=new Set;for(const y of p.rm)if(DBOYS(y)&&!seen.has(C(y).nm)){seen.add(C(y).nm);cs.push(y)}
    let got=await pickCards(p,"このキャラの下に重ねるキャラ（カード名が異なるものを5枚まで）","",p.rm.filter(DBOYS),{max:5,ai:()=>cs.slice(0,5)});
    const names=new Set;got=got.filter(y=>!names.has(C(y).nm)&&names.add(C(y).nm));stackUnder(x,got)},
  kwSelf:(p,x)=>underN(x)>=1?["突撃"]:[],
  onAction:async(p,self,actor)=>{if(actor!==self)return;if(underN(self)>=3)drawN(p,1);if(underN(self)>=5)gainEv(p,1)}};
DEF["0489"]={ // 江戸川コナン D08003
  enter:async(p,x)=>{if(!partnerIs(p,"青")||!p.hand.some(DBOYS)||!oppHas(p,apLe(8000)))return;
    if(!await yes(p,"登場時","手札の［少年探偵団］を1枚リムーブして、AP8000以下のキャラをリムーブしますか？",true))return;await discard(p,1,"リムーブする［少年探偵団］",p,DBOYS);await rmChar(p,y=>y!==x&&apLe(8000)(y))},
  endTurn:async p=>{if(p.field.filter(DBOYS).length>=3)drawN(p,1)}};
DEF["0511"]={...DEF["0511"],partial:false, // 江戸川コナン＆工藤新一 B05005
  abilities:DEF["0511"].abilities.map(a=>({...a,partner:true})),
  onHintUse:async(p,self,y)=>{if(!partnerIs(p,"青")||!hasColor(y,"青")||turnCount(self,"ch"))return;useTurn(self,"ch");await bottomChar(p,z=>z!==self&&apLe(8000)(z))}};
DEF["0630"]={ // 阿笠博士 B06005
  enter:async(p,x)=>{const got=await pickCards(p,"このキャラの下に重ねる［少年探偵団］（2枚まで）","",p.rm.filter(DBOYS),{max:2,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,2)});
    if(!got.length)return;const s=got.reduce((n,y)=>n+(C(y).lv||0),0);stackUnder(x,got);await rmChar(p,y=>y!==x&&lvOf(y)<=s,`リムーブするキャラ（レベル${s}以下）`)},
  abilities:[{label:"【スリープ】: 下に重なっているカードを2枚まで他のキャラの下へ",turn1:true,noAi:true,can:(p,x)=>x.st==="a"&&underN(x)>0&&p.field.some(y=>y!==x),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"重ねる先のキャラ",y=>y!==x&&!isOpp(p,y));if(!t)return true;
      const us=x.set.filter(s=>s.under);const got=await pickCards(p,"移すカード（2枚まで）","",us.map(s=>s.c),{max:2});
      for(const c of got){const s=x.set.find(s=>s.c===c);x.set.splice(x.set.indexOf(s),1);t.set=t.set||[];t.set.push(s)}log(`　${got.length}枚を ${C(t).nm} の下に移した`,"n");return true}}]};
DEF["0632"]={ // 灰原哀 B06007
  enter:async(p,x)=>{if(!partnerIs(p,"青"))return;const f=y=>isOpp(p,y)&&lvOf(y)<=7;
    const v=p.cpu?(oppHas(p,f)?2:myTurn(p)?1:3):await ask(`${p.name}: 灰原哀 登場時`,"1つ選んで行います",[{label:"突撃を得る",value:1,primary:true},{label:"相手のレベル7以下を手札に移す",value:2},{label:"2枚引く",value:3}]);
    if(v===1)giveKw(x,"突撃");else if(v===2){const t=await chooseChar(p,"手札に移す相手のキャラ（レベル7以下）",f);if(t)toHandFromField(t)}else drawN(p,2)}};
DEF["0740"]={ // 小嶋元太 B07008
  handLevel:(p,x)=>partnerIs(p,"青")&&p.solved&&myTurn(p)?Math.max(0,(C(x).lv||0)-p.field.filter(y=>DBOYS(y)||C(y).nm.includes("阿笠博士")).length):null,
  enter:async(p,x)=>{const f=y=>isOpp(p,y)&&lvOf(y)<=8;if(p.file.length<5||!oppHas(p,f)||!await yes(p,"登場時","このキャラをスリープさせて、相手のレベル8以下を手札に移しますか？",true))return;
    sleepC(x);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル8以下）",f);if(t)toHandFromField(t)}};
DEF["0742"]={ // 円谷光彦 B07010
  enter:async p=>{const xs=p.deck.slice(0,2);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [y]=await pickCards(p,"手札に加える［少年探偵団］（1枚まで）","残りはリムーブエリアへ",xs.filter(DBOYS),{max:1,ai:c=>c.slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);if(y&&p.solved)await discard(p,1)},
  abilities:[{label:"【スリープ】: ［少年探偵団］をAP＋3000",can:(p,x)=>x.st==="a"&&allChars().some(DBOYS),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&DBOYS(y)&&y.st==="a"&&canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"AP＋3000する［少年探偵団］",DBOYS,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,3000);return true}}]};

// --- 赤単赤井家・FBI ---
DEF["0401"]={enter:async(p,x)=>{if(p.field.some(y=>y!==x&&(C(y).nm.includes("沖矢昴")||hasTrait(y,"赤井家"))))giveKw(x,"突撃")}}; // 世良真純 PR043
DEF["0568"]={ // 赤井務武 B05068
  enter:async(p,x)=>{if(!partnerIs(p,"赤")||!myTurn(p))return;if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（［赤井家］のキャラがあれば突撃）",()=>p.deck.length>10))return;
    if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"赤井家")))giveKw(x,"突撃")}};
DEF["0440"]={ // 羽田秀𠮷 B04048
  enter:async p=>{if(!partnerIs(p,"赤"))return;const n=Math.max(0,7-p.hand.length);if(!n)return;drawN(p,n);
    const back=await pickCards(p,`デッキの下に移すカード（${n}枚）`,"選んだカードはシャッフルしてデッキの下へ",p.hand,{min:n,max:n,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b)).slice(0,n)});
    for(const y of shuffle(back)){detach(y);p.deck.push(y)}log(`　手札${back.length}枚をデッキの下へ`,"n")},
  abilities:[{label:"カード名を指定し、デッキの上から2枚見て手札に",turn1:true,can:p=>p.deck.length>0,
    run:async p=>{const names=[...new Set(p.deck.map(y=>C(y).nm))];let nm;
      if(p.cpu){const cnt={};for(const y of p.deck)cnt[C(y).nm]=(cnt[C(y).nm]||0)+1;nm=names.sort((a,b)=>cnt[b]-cnt[a])[0]}
      else{const opts=names.map(n=>p.deck.find(y=>C(y).nm===n));const [y]=await chooseCards(`${p.name}: カード名を指定`,"指定するカード名のカードを選びます（デッキの並びは分かりません）",opts,{min:1,max:1,okLabel:"指定"});nm=y&&C(y).nm}
      if(!nm)return false;log(`　［${nm}］を指定`,"n");await lookTop(p,2,y=>C(y).nm===nm,{title:`［${nm}］を1枚まで手札に`});return true}}]};
DEF["0698"]={ // 羽田秀𠮷 B06078
  abilities:[{label:"レベル6以上の［赤井家］をスリープ＋デッキの上から3枚リムーブ: ［赤井家］が落ちたらAP8000以下をリムーブ",turn1:true,
    can:p=>p.deck.length>3&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6),aiCan:p=>p.deck.length>12&&oppHas(p,apLe(8000))&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6);const [c]=await pickCards(p,"コスト: スリープさせる［赤井家］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"赤井家")))await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["0700"]={ // 世良真純 B06080
  leaveOppTurn:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"レベル7以下をリムーブ（スリープかスタン状態のとき）",turn1:true,can:(p,x)=>x.st!=="a"&&allChars().some(y=>y!==x&&lvOf(y)<=7),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0696"]={ // ジェイムズ・ブラック B06076
  enter:async p=>{if(!p.solved)return;const t=await chooseChar(p,"手札に移す相手のキャラ（レベル5以下）",y=>isOpp(p,y)&&lvOf(y)<=5);if(t)toHandFromField(t)},
  abilities:[{label:"【スリープ】: 相手は手札を1枚リムーブ",can:(p,x)=>x.st==="a"&&opp(p).hand.length>=4,aiCan:(p,x)=>!canAct(x,p,"chara"),run:async(p,x)=>{sleepCost(x);const o=opp(p);await discard(o,1,"手札をリムーブ",o);return true}}]};

// --- 黒（バーボン・ベルモット） ---
DEF["0085"]={cutin:async p=>{drawN(p,2);await discard(p,1)}}; // ウォッカ B01097
DEF["0483"]={cutin:async p=>{if(p.solved)drawN(p,1)}}; // バーボン PR087（【黒】にカットインならAP＋1000: ownCutinAp）
const BO=y=>isChar(y)&&hasTrait(y,"黒ずくめの組織");
DEF["0715"]={ // ベルモット＆シェリー B06098
  abilities:[{label:"AP8000以下のキャラをリムーブ",turn1:true,can:(p,x)=>p.field.filter(BO).length>=2&&allChars().some(y=>y!==x&&apOf(y)<=8000),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}},
    {label:"デッキの上から3枚見て【カットイン】を持つ【黒】を手札に",turn1:true,partner:true,can:p=>p.field.filter(BO).length>=2&&p.deck.length>0,aiCan:p=>p.deck.length>8,
    run:async p=>{const xs=p.deck.slice(0,3);log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
      const [y]=await pickCards(p,"手札に加える【カットイン】を持つレベル8以下の【黒】（1枚まで）","残りはリムーブエリアへ",xs.filter(y=>!!C(y).ci&&hasColor(y,"黒")&&(C(y).lv||0)<=8),{max:1,ai:c=>c.slice(0,1)});
      for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);if(y&&(C(y).lv||0)>=4)await discard(p,1);return true}}]};

// --- 緑（紅葉・伊織・大阪府警） ---
const IORI=named("伊織無我"),MOMI=named("大岡紅葉");
const setTotal=cs=>cs.reduce((n,y)=>n+faceDownSet(y).length,0);
async function removeSets2(p){for(let i=0;i<2;i++)if(!await removeAnySet(p,`裏向きのカードをリムーブするキャラ（${i+1}枚目）`))return false;return true}
function rmToHand(p,y){if(!y)return;detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}
async function pickRmToHand(p,f,title){const [y]=await pickCards(p,title,"",p.rm.filter(f),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});rmToHand(p,y);return y}
DEF["0167"]={ // 服部平次 D06003
  onAction:async(p,self,actor)=>{if(actor!==self||!partnerIs(p,"緑")||turnCount(self,"hei"))return;useTurn(self,"hei");await pickRmToHand(p,y=>/【カットイン】AP[＋+]/.test(C(y).ci||""),"手札に加える「【カットイン】AP＋」を持つカード")}};
DEF["0621"]={ // 伊織無我 PR136
  lpSelf:p=>condOk("絆大岡紅葉",p)?1:0,
  contactWin:async(p,x)=>{if(turnCount(x,"io"))return;useTurn(x,"io");const t=await chooseChar(p,"デッキの上から1枚を裏向きでセットするキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(ownerOf(t),t)}};
DEF["0749"]={ // 伊織無我 B07017
  apSelf:p=>condOk("絆大岡紅葉",p)?1000:0,
  contactWin:async p=>{await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"緑")&&(C(y).lv||0)>=6,"手札に加えるレベル6以上の【緑】のイベント")}};
DEF["0754"]={ // 沖田総司 B07022
  enter:async(p,x)=>{const y=await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"高校生"),"公開する［高校生］のキャラ",{ai:c=>myTurn(p)?c.slice().sort((a,b)=>colorsOf(C(b).c).some(ch=>ch!=="緑")-colorsOf(C(a).c).some(ch=>ch!=="緑")).slice(0,1):[]});
    if(!y)return;giveKw(x,"突撃");if(colorsOf(C(y).c).some(ch=>ch!=="緑"))apTurn(x,1000)}};
DEF["0834"]={ // 大滝悟郎 PR200
  kwSelf:p=>setTotal(p.field)>=2?["突撃"]:[],
  abilities:[{label:"［警察］にデッキの上から1枚セット",turn1:true,can:p=>p.deck.length>0&&p.field.some(y=>hasTrait(y,"警察")),
    run:async p=>{const t=await chooseChar(p,"セットする［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:cs=>cs.slice(0,1)});if(t)setTop(p,t);return true}}]};
DEF["0859"]={ // 大岡紅葉＆伊織無我 B08019
  onAllyEnter:async(p,self,y)=>{if(y===self||!partnerIs(p,"緑")||!myTurn(p)||turnCount(self,"mi")||!(IORI(y)||MOMI(y))||!oppHas(p,apLe(8000)))return;useTurn(self,"mi");await rmChar(p,z=>z!==self&&apLe(8000)(z))},
  abilities:[{label:"セットされた裏向きのカードを2枚リムーブ: 1枚引く",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&(IORI(y)||MOMI(y)))&&setTotal(allChars())>=2,aiCan:p=>setTotal(opp(p).field)>=1,
    run:async p=>{if(!await removeSets2(p))return false;drawN(p,1);return true}}]};
DEF["0863"]={ // 大岡紅葉 B08023
  enter:async p=>{const has=p.field.some(IORI);
    const v=p.cpu?(has?(myTurn(p)?2:1):3):await ask(`${p.name}: 大岡紅葉 登場時`,"1つ選んで行います",[{label:"［伊織無我］にセットしてAP＋2000",value:1,primary:true},{label:"［伊織無我］にセットして突撃",value:2},{label:"相手のキャラにセットしてスリープ",value:3}]);
    if(v===3){const t=await chooseChar(p,"セットしてスリープさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(t){setTop(opp(p),t);sleepC(t)}return}
    const t=await chooseChar(p,"［伊織無我］",y=>!isOpp(p,y)&&IORI(y),{ai:cs=>cs.slice(0,1)});if(!t)return;setTop(p,t);if(v===1)apTurn(t,2000);else giveKw(t,"突撃")}};
DEF["0865"]={ // 伊織無我 B08025
  abilities:[{label:"デッキの上から3枚リムーブ: ［大岡紅葉］か［伊織無我］ならAP8000以下をリムーブしてセット",turn1:true,can:p=>partnerIs(p,"緑")&&p.deck.length>3,aiCan:p=>p.deck.length>12&&oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(millSelf(p,3).some(y=>IORI(y)||MOMI(y))){await rmChar(p,y=>y!==x&&apLe(8000)(y));if(p.field.includes(x))setTop(p,x)}return true}}]};
DEF["0869"]={ // 小も大を兼ねる
  event:async p=>{if(!partnerIs(p,"緑")){log("　条件（パートナー緑）を満たさないので効果なし","n");return}
    const y=await enterFromRm(p,y=>IORI(y)&&lvOf(y)<=7,"登場させる［伊織無我］（レベル7以下）");
    if(y){const v=p.cpu?(opp(p).field.some(z=>z.st!=="a")?1:2):await ask(`${p.name}: 小も大を兼ねる`,`${C(y).nm} に与える能力`,[{label:"突撃［キャラ］",value:1,primary:true},{label:"アクティブ状態のキャラを指定してアクションできる",value:2}]);
      giveKw(y,v===1?"突撃［キャラ］":"アクティブ指定")}
    await pickRmToHand(p,y=>MOMI(y)&&lvOf(y)<=7,"手札に加える［大岡紅葉］（レベル7以下）")},
  ai:p=>partnerIs(p,"緑")&&p.rm.some(y=>IORI(y))};
DEF["0870"]={ // 執事になった理由
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠1つを表に: ［伊織無我］をAP＋2000",turn1:true,can:p=>p.solved&&p.ev.some(e=>!e.up)&&p.field.some(MOMI)&&p.field.some(IORI),aiCan:p=>myTurn(p)&&p.field.some(y=>IORI(y)&&y.st==="a"),
    run:async p=>{if(!flipEvidence(p,1))return false;const t=await chooseChar(p,"AP＋2000する［伊織無我］",y=>!isOpp(p,y)&&IORI(y),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(t)apTurn(t,2000);return true}}]};
DEF["0970"]={ // 伊織無我 B09026
  apSelf:p=>myTurn(p)&&condOk("絆大岡紅葉",p)?2000:0,
  onAllyContactWin:async(p,self,winner)=>{if(!IORI(winner)||turnCount(self,"io2"))return;const cs=p.rm.filter(y=>isChar(y)&&MOMI(y)&&lvOf(y)<=6);if(!cs.length)return;useTurn(self,"io2");
    const [y]=await pickCards(p,"スリープ状態で登場させる［大岡紅葉］","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s")}};
DEF["0971"]={ // 大岡紅葉 B09027
  abilities:[{label:"セットされた裏向きのカードか手札を1枚リムーブ: スリープ状態のキャラをスタン",turn1:true,can:p=>(setTotal(p.field)>0||p.hand.length>0)&&allChars().some(y=>y.st==="s"),aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)>=5),
    run:async p=>{if(setTotal(p.field)>0){const cs=p.field.filter(y=>faceDownSet(y).length);const [y]=await pickCards(p,"コスト: 裏向きのカードをリムーブするキャラ","",cs,{min:1,max:1});if(y)removeSetCost(p,y)}else await discard(p,1);
      const t=await chooseChar(p,"スタンさせるキャラ",y=>y.st==="s");if(t)stunC(t);return true}}]};
DEF["0968"]={ // 服部平蔵 B09024（他の［大阪府警］の現場リムーブ時: FX.onLeave）
  abilities:[{label:"【スリープ】［警察］を公開: 相手のレベル7以下をリムーブ",can:(p,x)=>partnerIs(p,"緑")&&x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"警察")),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{if(!await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"警察"),"公開する［警察］",{must:true}))return false;sleepCost(x);
      const t=await chooseChar(p,"リムーブする相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(!t)return true;const sl=t.st==="s";rmBy(p,t);await runQueue();if(sl&&p.field.includes(x))setTop(p,x);return true}}]};

// --- 黄（公安） ---
DEF["0233"]={ // 降谷零 B02072
  abilities:[{label:"【スリープ】: 〚捜査X〛して、発見したレベルの合計以下をリムーブ",turn1:true,can:(p,x)=>x.st==="a"&&p.field.some(y=>hasTrait(y,"警察")),aiCan:p=>opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);const n=p.field.filter(y=>hasTrait(y,"警察")).length;const s=investigate(p,n).reduce((a,y)=>a+(C(y).lv||0),0);
      await rmChar(p,y=>y!==x&&lvOf(y)<=s,`リムーブするキャラ（レベル${s}以下）`);return true}}]};
DEF["0911"]={ // 降谷零 B08074
  enter:async(p,x)=>{const o=opp(p);const ts=[...new Set([...o.deck,...o.hand,...o.field,...o.rm].flatMap(y=>(C(y).ct||"").split(",").filter(Boolean)))];if(!ts.length)return;
    let t;if(p.cpu){const cnt={};for(const y of [...o.field,...o.rm])for(const k of (C(y).ct||"").split(",").filter(Boolean))cnt[k]=(cnt[k]||0)+1;t=ts.sort((a,b)=>(cnt[b]||0)-(cnt[a]||0))[0]}
    else t=await ask(`${p.name}: 降谷零 登場時`,"指定する〚特徴〛",ts.slice(0,12).map((k,i)=>({label:k,value:k,primary:!i})));
    log(`　［${t}］を指定`,"n");const n=investigate(p,3).filter(y=>hasTrait(y,t)).length;
    if(n>=1)giveKw(x,"突撃［キャラ］");if(n>=2)giveKw(x,"突撃");if(n>=3)giveKw(x,"迅速")}};

// ================= 効果文から自動で組み立てる（同じ書き方のカードはまとめて処理） =================
// 1行ずつ型に当てはめる。全部の行が分かったカードだけ「自動」にする（分からない行があれば手動のまま）
const COLS="青|赤|黄|緑|白|黒";
const PRE=`(?:【パートナー(${COLS})】(?:（[^）]*）)?)?`; // 先頭の【パートナー色】
const needPartner=(p,col)=>!col||partnerIs(p,col);
const bySet=(kind,v)=>kind==="レベル"?y=>lvOf(y)<=v:y=>apOf(y)<=v;
const traitOf=t=>y=>hasTrait(y,t);
const searchTop=async(p,n,filter,max,title,dis)=>{const got=await lookTop(p,n,filter,{max,title});if(got.length&&dis)await discard(p,dis);return got};
// 除去（キャラを1枚まで選び、リムーブ／デッキの下／スタン）。行頭の条件タグは condOk で判定する
const TAGS=`((?:【(?!登場時|宣言|自分ターン中|相手ターン中|ターン\\d)[^】]+】(?:（[^）]*）)?)*)`;
const tagsOk=(p,s)=>[...(s||"").matchAll(/【([^】]+)】/g)].every(m=>condOk(m[1],p)===true);
const RM_TARGET=`(?:(レベル|AP)(\\d+)以下の)?(スリープ状態の|スリープ状態かスタン状態の)?キャラを1枚まで選び、(リムーブする|デッキの下に移す|スタンさせる)。(?:（[^）]*）)?`;
const rmFilter=(m,i)=>{const lim=m[i]?bySet(m[i],+m[i+1]):()=>true;const st=m[i+2]?(m[i+2]==="スリープ状態の"?y=>y.st==="s":y=>y.st!=="a"):()=>true;return y=>lim(y)&&st(y)};
async function rmOne(p,m,i,src){const how=m[i+3];const t=await chooseChar(p,`${src}: ${how.replace("する","").replace("させる","")}するキャラ`,rmFilter(m,i));if(!t)return;
  if(how==="リムーブする")removeCard(t,"効果",{by:p,effect:true});else if(how==="デッキの下に移す")toDeckBottom(t);else stunC(t)}
const rmAi=(m,i)=>p=>opp(p).field.some(rmFilter(m,i));
// [正規表現, (一致, カード) => {フック名: 処理}, 他の行が分からなくてもこの行だけ自動にしてよいか]
const LINE_RULES=[
  [new RegExp(`^${TAGS}【登場時】${RM_TARGET}(?:カードを(\\d)枚引く。)?$`),m=>({enter:async p=>{if(!tagsOk(p,m[1]))return;await rmOne(p,m,2,"登場時");if(m[6])drawN(p,+m[6])}}),true],
  [new RegExp(`^${TAGS}${RM_TARGET}$`),m=>({event:async p=>{if(!tagsOk(p,m[1])){log("　条件を満たさないので効果なし","n");return}await rmOne(p,m,2,"イベント")},ai:p=>tagsOk(p,m[1])&&rmAi(m,2)(p)}),true],
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
const CORE_LINE=/^(?:【[^】]+】)*(?:〚(?:突撃|迅速|ブレット|ミスリード\d)|【解決編】【事件解決】|【アシスト】|このキャラはスリープ状態で登場する。$|このキャラは(?:スリープ状態でも)?ガードできない。$|このキャラはスリープ状態でもガードできる。$|[^［]+［ID：\d+］はデッキに何枚でも入れることができる。$)/;
// カットイン（本体の ownCutinAp がAPを足す）。AP＋N のあとに続く効果は cutin フックにする
const CI_CORE=/^(?:AP[＋+]\d+|自分のリムーブエリアにある〚カード名［[^］]+］〛1枚につき、AP[＋+]\d+（このカードも含める）|自分の現場にいる〚特徴［[^］]+］〛のキャラ1枚につき、AP[＋+]\d+|AP[＋+]\d+、自分の手札が\d枚以下の場合、代わりにAP[＋+]\d+|(?:〚(?:カード名|特徴)?［[^］]+］〛か?)+(?:のキャラ)?に【カットイン】する場合、AP[＋+]\d+)$/;
const CI_RULES=[
  [new RegExp(`^AP[＋+]\\d+、自分の事件が【(${COLS})】以外の色を持たない場合、カードを(\\d)枚引く。$`),m=>({cutin:async p=>{if(colorsOf(C(p.caseC).c).every(ch=>ch===m[1]))drawN(p,+m[2])}})],
  [/^AP[＋+]\d+、〚特徴［([^］]+)］〛のキャラに【カットイン】した場合、カードを(\d)枚引く。$/,m=>({cutin:async(p,card,mine)=>{if(mine&&hasTrait(mine,m[1]))drawN(p,+m[2])}})],
];
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
  let d={},alone={},ok=true,any=false;
  for(const raw of (c.f||"").split("\n")){const line=raw.trim();if(!line||CORE_LINE.test(line))continue;
    const r=LINE_RULES.find(([re])=>re.test(line));if(!r){ok=false;continue}
    const h=r[1](line.match(r[0]),c);d=merge(d,h);if(r[2])alone=merge(alone,h);any=true}
  for(const raw of (c.ci||"").split("\n")){const line=raw.trim();if(!line.startsWith("【カットイン】"))continue;
    const body=line.replace(/^【カットイン】(?:【[^】]+】)*/,"").replace(/（[^）]*）$/,"");
    if(CI_CORE.test(body))continue;const r=CI_RULES.find(([re])=>re.test(body));if(!r){ok=false;continue}
    d=merge(d,r[1](body.match(r[0]),c));any=true}
  if(!ok)d=alone; // 分からない行があるカードは、単独で動く行（除去など）だけ自動にする
  if(c.t==="イベント"&&!ok)delete d.event; // イベントは全文が分かるときだけ
  const hr=(c.hr||"").trim().replace(/^【ヒラメキ】(?:（[^）]*）)?/,"");
  if(hr){const r=HR_RULES.find(([re])=>re.test(hr));if(r){d.hirameki=r[1](hr.match(r[0]));any=true}else if(ok&&any)d.partial=true}
  if(!ok&&any)d.partial=true;
  return any||ok?d:null; // 本体だけで処理できるカード（突撃だけ、カットインのAPだけなど）は空の定義で「自動」にする
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
const def=x=>x&&x.negT&&G&&x.negT===G.turnNo?null:DEF[idOf(x)]; // 「元の能力を無効にする」（遠山和葉 B04018）されたキャラは、このターン効果なし
const def0=x=>DEF[idOf(x)];
const FX={
  has:(x,k)=>!!(def(x)&&def(x)[k]),
  async enter(p,x){
    // 【疾風】自分の現場にこのターンで1番に登場したとき
    const first=p.field.includes(x)&&p.galeT!==G.turnNo;if(p.field.includes(x))p.galeT=G.turnNo;
    await FX.enter0(p,x);
    const d=def(x);if(first&&d&&d.gale&&p.field.includes(x)){await fxPre(p,x,"疾風");log(`　【疾風】${C(x).nm}`,"n");await d.gale(p,x);render();await runQueue()}
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onAllyEnter&&p.field.includes(y))await fxIf(p,y,"登場",()=>e.onAllyEnter(p,y,x))}await runQueue()},
  async enter0(p,x){const d=def(x);if(d&&d.enter){await fxPre(p,x,"登場時");log(`　【登場時】${C(x).nm}`,"n");await d.enter(p,x);render();if(d.partial&&/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時")}else if(/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時");await runQueue()},
  async event(p,x){const d=def(x);if(d&&d.event){await fxPre(p,x,"イベント");G.evtBy=p;try{await d.event(p,x)}finally{G.evtBy=null}render()}else noteEffect(p,x,"イベント");await runQueue()},
  async disguise(p,x){const d=def(x);if(d&&d.disguise){await fxPre(p,x,"変装時");log(`　【変装時】${C(x).nm}`,"n");await d.disguise(p,x)}else if(/【変装時】/.test(C(x).f||""))noteEffect(p,x,"変装時")},
  async hirameki(o,e){const d=def(e);if(d&&d.hirameki){await fxPre(o,e,"ヒラメキ");await d.hirameki(o,e);return true}return false},
  async cutin(p,card,mine,own=true){const d=def(card);if(own&&d&&d.cutin)await fxIf(p,card,"カットイン",()=>d.cutin(p,card,mine));
    if(mine&&def(mine)&&def(mine).onCutinInContact&&ownerOf(mine)===p)await fxIf(p,mine,"コンタクト",()=>def(mine).onCutinInContact(p,mine,card))},
  // 工藤新一 B07003: 現場にいると、手札の【青】のカードは「【カットイン】AP＋1000」を持つ
  grantedCutin:(p,x)=>p&&p.hand.includes(x)&&hasColor(x,"青")&&p.field.some(y=>idOf(y)==="0735")?1000:null,
  // 妃英理 B05007: このターン、［毛利探偵事務所］のアクション中は相手はカットインできない
  cutinLocked:(tp,atk)=>tp.cutLock===G.turnNo&&tp.field.includes(atk)&&hasTrait(atk,"毛利探偵事務所"),
  noCutin:x=>!!x&&turnCount(x,"noCutin")>0&&G.contact&&(G.contact.a===x||G.contact.d===x),
  async onAction(p,actor,target){for(const y of [...p.field,...opp(p).field])y.apA=0;
    for(const y of p.field.slice()){const d=def(y);if(d&&d.onAction)await fxIf(p,y,"アクション",()=>d.onAction(p,y,actor,target))}
    const o=opp(p);for(const y of o.field.slice()){const d=def(y);if(d&&d.onOppAction&&o.field.includes(y))await fxIf(o,y,"アクション",()=>d.onOppAction(o,y,actor,target))}},
  async onContact(p,ct){for(const q of G.P)for(const y of q.field.slice()){const d=def(y);if(d&&d.onContact&&q.field.includes(y))await fxIf(q,y,"コンタクト",()=>d.onContact(q,y,ct))}
    // ［FBI］に与えた「レベル7以下のキャラとコンタクトしたとき、コンタクト中のすべてのキャラをリムーブする」（赤井秀一 B04046）
    const [a,b]=[ct.a,ct.d];if([[a,b],[b,a]].some(([u,v])=>u.kw.includes("相打ち7")&&lvOf(v)<=7&&allChars().includes(u)&&allChars().includes(v))){
      log("　コンタクト中のすべてのキャラをリムーブ","n");for(const y of [a,b])removeCard(y,"効果",{by:ownerOf(a),effect:true});await runQueue()}},
  async onReason(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReason&&p.field.includes(y))await fxIf(p,y,"推理",()=>d.onReason(p,y,x))}await runQueue()},
  async onReveal(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReveal&&p.field.includes(y))await fxIf(p,y,"公開",()=>d.onReveal(p,y,x))}},
  lpBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;const d=def(x);return d&&d.lpSelf?d.lpSelf(p,x)||0:0},
  kwExtra(x,p){const d=def(x);return d&&d.kwSelf&&p&&p.field.includes(x)?d.kwSelf(p,x):[]},
  async onHintUse(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onHintUse&&p.field.includes(y))await fxIf(p,y,"ネクストヒント",()=>d.onHintUse(p,y,x))}
    const pd=def(p.partner);if(pd&&pd.onHintUse&&p.pLoc==="area")await fxIf(p,p.partner,"ネクストヒント",()=>pd.onHintUse(p,p.partner,x))},
  useBlock(p,x){if(p.banNm&&p.banNm.t===G.turnNo&&C(x).nm.includes(p.banNm.nm))return `このターンは［${p.banNm.nm}］を使用できない`;const d=def(x);return d&&d.useBlock?d.useBlock(p,x):null},
  lvBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;const d=def(x);if(d&&d.lvSelf)b+=d.lvSelf(p,x)||0;
    for(const q of G.P)for(const y of q.field){const d=def(y);if(d&&d.lvAura)b+=d.lvAura(q,y,x)||0}return b},
  async actionEnd(p,actor){actor.apA=0;const d=def(actor);if(d&&d.actionEnd&&p.field.includes(actor))await fxIf(p,actor,"アクション終了時",()=>d.actionEnd(p,actor));await runQueue()},
  async contactWin(p,winner,victim){const d=def(winner);if(d&&d.contactWin&&p.field.includes(winner))await fxIf(p,winner,"コンタクト",()=>d.contactWin(p,winner,victim));
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onAllyContactWin&&p.field.includes(y))await fxIf(p,y,"コンタクト",()=>e.onAllyContactWin(p,y,winner,victim))}},
  async endTurn(p){for(const y of p.field.slice()){const d=def(y);if(d&&d.endTurn&&p.field.includes(y))await fxIf(p,y,"ターン終了時",()=>d.endTurn(p,y))}
    const pd=def(p.partner);if(pd&&pd.endTurn&&pd.partnerToo&&p.pLoc==="area")await fxIf(p,p.partner,"ターン終了時",()=>pd.endTurn(p,p.partner))},
  async solvedTrigger(p){const d=def(p.caseC);if(d&&d.solvedTrigger){await fxPre(p,p.caseC,"解決編");await d.solvedTrigger(p)}},
  async onLeave(info){ // {x,p,turn,by,effect}。rmLeft: リムーブエリアから離れた（諸伏高明 B05087 など）
    if(info.rmLeft){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onRmLeave&&info.p.field.includes(y))await fxIf(info.p,y,"リムーブエリアから離れたとき",()=>e.onRmLeave(info.p,y,info.x))}return}
    const q=opp(info.p);for(const y of q.field.slice()){const e=def(y);if(e&&e.onOppRemoved&&q.field.includes(y))await fxIf(q,y,"相手のキャラがリムーブされたとき",()=>e.onOppRemoved(q,y,info))}
    if(info.turn!==info.p.idx&&idOf(info.x)!=="0968"&&hasTrait(info.x,"大阪府警")&&info.p.field.some(y=>idOf(y)==="0968"&&def(y))){
      log(`　【現場リムーブ時】${C(info.x).nm}（服部平蔵が与えた能力）`,"n");drawN(info.p,1);await discard(info.p,1)}
    const d=def(info.x);if(!d)return;
    if(d.leaveOppTurn&&info.turn!==info.p.idx){await fxPre(info.p,info.x,"現場リムーブ時");log(`　【現場リムーブ時】${C(info.x).nm}`,"n");await d.leaveOppTurn(info.p,info.x)}
    if(d.selfRemovedOwnTurn&&info.turn===info.p.idx&&info.by===info.p&&info.effect)await fxIf(info.p,info.x,"現場リムーブ時",()=>d.selfRemovedOwnTurn(info.p,info.x))},
  abilities(p,x){const d=def(x);
    let list=[];
    if(p.hand.includes(x))list=(d&&d.handAbilities||[]).map((a,i)=>({...a,key:"hab"+i,hand:true}));
    else{list=(d&&d.abilities||[]).map((a,i)=>({...a,key:"ab"+i})).filter(a=>x!==p.partner||a.partner);
      for(const s of x.set||[]){const sd=s.up&&!s.under&&def(s.c);if(sd&&sd.grants)list.push(...sd.grants.map((a,i)=>({...a,key:"g"+idOf(s.c)+i})))}}
    return list.map(a=>({...a,ok:G.turn===p.idx&&!G.contact&&(!a.turn1||!turnCount(x,a.key))&&a.can(p,x)}))},
  async useAbility(p,x,a){if(typeof recAct==="function")recAct(p,"ability:"+a.label,x);if(a.turn1)useTurn(x,a.key);log(`${p.name} の ${C(x).nm} の能力:「${a.label}」`);await fxPre(p,x,"能力",a.label+"\n"+effText(x,"能力"));const r=await a.run(p,x);render();await runQueue();return r},
  apBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;
    if(G.turn===p.idx&&hasTrait(x,"サッカー選手"))b+=1000*p.field.filter(y=>idOf(y)==="0954").length; // 赤木守
    if(G.turn===p.idx&&idOf(x)==="1061")b+=1000; // 沖田総司 PR290
    if(G.contact&&(G.contact.a===x||G.contact.d===x))b+=2000*(x.set||[]).filter(s=>s.up&&idOf(s.c)==="0019").length; // シャッフルロマンス
    const d=def(x);if(d&&d.apSelf)b+=d.apSelf(p,x)||0;
    for(const q of G.P)for(const y of [...q.field,...(q.pLoc==="area"?[q.partner]:[])]){const e=def(y);if(e&&e.apAura&&(y!==q.partner||e.partnerToo))b+=e.apAura(q,y,x)||0}
    return b},
  keepStun(p){return opp(p).field.some(y=>idOf(y)==="0301"&&partnerIs(opp(p),"白"))}, // 怪盗キッド B03046
  canGuardSleeping:x=>!!(def(x)&&def(x).guardWhileSleeping),
  handLevel(p,x){const d=def(x);return d&&d.handLevel?d.handLevel(p,x):null},
  eraseEvidence:p=>!!(def(p.caseC)&&def(p.caseC).eraseEvidence)&&partnerIs(p,"黒"),
  eventAi(p,x){const d=def(x);return !!(d&&d.event&&(!d.ai||d.ai(p)))},
  automated:x=>!!def0(x)&&!def0(x).partial,
  entersSleeping:x=>/(^|\n)このキャラはスリープ状態で登場する。/.test(C(x).f||""),
};
window.FX=FX;
