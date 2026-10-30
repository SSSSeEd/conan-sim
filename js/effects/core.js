"use strict";
// カード個別効果（共通）部品と DEF（カードID→効果の表）。効果は js/effects/ の複数ファイルに分かれ、DEF["カードID"]={...} を足している。再録・パラレルは同じID。
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

// 色をまたいで使う部品（各デッキの所にあったものをここへ移した）
const giveKw=(y,k)=>{if(!y.kw.includes(k))y.kw.push(k);log(`　${C(y).nm} はターン終了時まで〚${k}〛`,"n")};
const setCardsAll=()=>allChars().filter(y=>faceDownSet(y).length);
async function removeAnySet(p,title){const cs=setCardsAll();const [y]=await pickCards(p,title,"",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>isOpp(p,b)-isOpp(p,a))});if(!y)return null;removeSetCost(ownerOf(y),y);return y}
function toHandFromField(t){const q=ownerOf(t);for(const s of t.set||[])q.rm.push(s.c);t.set=[];detach(t);resetMods(t);q.hand.push(t);log(`　${q.name} の ${C(t).nm} を手札に移した`,"n")}
const setTotal=cs=>cs.reduce((n,y)=>n+faceDownSet(y).length,0);
async function pickRmToHand(p,f,title){const [y]=await pickCards(p,title,"",p.rm.filter(f),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});rmToHand(p,y);return y}
