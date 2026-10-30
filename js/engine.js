"use strict";
// ================= ゲーム処理 =================
function checkDeck(p){ // デッキ0枚で即リフレッシュ
  if(p.deck.length>0||G.over)return;
  if(p.rm.length===0){lose(p,"リフレッシュできない（リムーブエリア0枚）");return}
  p.deck=shuffle(p.rm.splice(0));p.refreshed=true;
  log(`${p.name} がリフレッシュ（デッキ${p.deck.length}枚）。${opp(p).name} は証拠を1つ得る`,"w");
  gainEvidence(opp(p),1);
}
function popDeck(p){if(G.over)return null;const x=p.deck.shift();checkDeck(p);return x}
function draw(p,n=1){for(let i=0;i<n;i++){const x=popDeck(p);if(x){x.st="a";p.hand.push(x)}}}
function gainEvidence(p,n=1){for(let i=0;i<n;i++){const x=popDeck(p);if(x){x.st="a";p.ev.push(x)}}}
function toFile(p,n=1){for(let i=0;i<n;i++){const x=popDeck(p);if(x){x.st="a";p.file.push(x)}}}
function resetMods(x){x.negT=0;x.apM=0;x.apT=0;x.apC=0;x.apA=0;x.lvT=0;x.lpM=0;x.lpT=0;x.kw=[];x.nmT=null;x.viaAb=false;x.fresh=false;x.st="a"}
function removeCard(x,why,opt={}){ // リムーブエリアへ（現場からなら離れたときの効果を予約）
  const p=ownerOf(x);if(!p)return;const wasField=p.field.includes(x);
  detach(x);resetMods(x);
  if(wasField){for(const s of x.set||[])p.rm.push(s.c);x.set=[]}
  p.rm.push(x);
  const c=C(x);
  if(why)log(`${p.name} の ${c.nm} をリムーブ（${why}）`);
  if(wasField&&G){G.queue.push({x,p,turn:G.turn,by:opt.by||null,effect:!!opt.effect});
    if(!(window.FX&&FX.automated(x))&&(c.f||"").includes("【現場リムーブ時】"))toast(`${c.nm}【現場リムーブ時】を確認`)}
}
async function runQueue(){while(G&&G.queue.length&&!G.over){const i=G.queue.shift();if(window.FX)await FX.onLeave(i);render()}}
function win(p,why){if(G.over)return;if(G.sim){G.over=true;G.winner=p.idx;return}G.over=true;log(`★ ${p.name} の勝利（${why}）`,"t");saveRecord(p,why);clearSave();render();
  if(!window.SIM_FAST)showEndMenu(p,why)}
function lose(p,why){win(opp(p),`${p.name} の敗北: ${why}`)}

// ===== 対戦記録（将来のフィードバック機能用に、行動とその時に選べた選択肢を残す） =====
const REC_KEY="conan-sim-records",REC_MAX=100;
const cardRef=x=>x?{n:x.n,nm:C(x).nm}:null;
function deckLabel(d){const c=C({n:d.caseN});return `${C({n:d.partner}).nm}／${c.c||""}`}
function recOptions(p){ // その場で選べた行動
  const o={hand:p.hand.filter(x=>!playableReason(p,x,false)).map(x=>C(x).nm),
    hint:!p.noHint&&p.file.some(x=>x!==p.partner),
    reason:[...p.field,p.partner].filter(x=>(x!==p.partner||p.pLoc==="area")&&canAct(x,p,"reason")).map(x=>C(x).nm),
    actChara:p.field.filter(x=>canAct(x,p,"chara")).map(x=>C(x).nm),
    actCase:opp(p).ev.length?p.field.filter(x=>canAct(x,p,"case")).map(x=>C(x).nm):[],
    targets:opp(p).field.filter(y=>y.st!=="a").map(y=>C(y).nm),
    assist:p.pLoc==="area"&&p.partner.st==="a",
    solve:p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&p.ev.length>=p.level};
  return o;
}
function recState(p){const o=opp(p);return {file:p.file.length,ev:p.ev.length,level:p.level,solved:p.solved,hand:p.hand.length,deck:p.deck.length,
  field:p.field.map(x=>C(x).nm+(x.st==="a"?"":x.st==="s"?"(S)":"(X)")),oField:o.field.map(x=>C(x).nm+(x.st==="a"?"":x.st==="s"?"(S)":"(X)")),oEv:o.ev.length,oFile:o.file.length}}
// 記録は人の席だけ。やった行動と、ターンごとの「できたのにやらなかったこと」（rec.miss）を残す（1試合数KB）
function recAct(p,kind,x,target){
  if(!G||!G.rec||G.over||p.cpu)return;
  G.rec.acts.push({t:G.turnNo,who:p.idx,kind,card:cardRef(x),target:target==="case"?"事件":cardRef(target)});
  if(kind==="end")recMiss(p);
}
// ターンのはじめに選べたこと（beginTurn から）
function recTurnStart(p){
  if(!G||!G.rec||p.cpu)return;
  G.rec._start={t:G.turnNo,o:recOptions(p),stuck:p.hand.filter(x=>playableReason(p,x,false)).map(x=>C(x).nm),s:recState(p)};
}
function recMiss(p){
  const st=G.rec._start;if(!st||st.t!==G.turnNo)return;
  const did=G.rec.acts.filter(a=>a.t===G.turnNo&&a.who===p.idx),used=did.filter(a=>a.kind==="use"||a.kind==="hintUse").map(a=>a.card&&a.card.nm);
  const o=recOptions(p),s=st.s;
  const m={t:G.turnNo,s:{file:s.file,ev:s.ev,oEv:s.oEv,hand:s.hand,field:s.field.length,oField:s.oField.length},
    play:st.o.hand.filter(nm=>!used.includes(nm)),stuck:st.stuck,reason:o.reason,actChara:o.targets.length?o.actChara:[],actCase:o.actCase,
    hint:!did.some(a=>a.kind==="hint")&&st.o.hint,assist:o.assist&&!p.solved};
  for(const k of Object.keys(m))if(Array.isArray(m[k])&&!m[k].length||m[k]===false)delete m[k];
  (G.rec.miss=G.rec.miss||[]).push(m);delete G.rec._start;
}
function loadRecords(){try{return JSON.parse(localStorage.getItem(REC_KEY)||"[]")}catch(e){return []}}
function saveRecord(w,why){
  if(!G||!G.rec)return;
  const r=G.rec;delete r._start;r.end=new Date().toISOString();r.winner=w.idx;r.why=why;r.turns=G.turnNo;
  r.final=G.P.map(p=>({ev:p.ev.length,file:p.file.length,field:p.field.length,hand:p.hand.length,deck:p.deck.length,solved:p.solved}));
  if(window.SIM_FAST&&!window.SIM_SAVE)return;
  try{const all=loadRecords();all.push(r);while(all.length>REC_MAX)all.shift();localStorage.setItem(REC_KEY,JSON.stringify(all))}catch(e){}
}

// ===== 一手戻す（自分のターン中だけ） =====
function pushUndo(){
  if(!G||G.over||cur().cpu)return;
  try{G.undo.push({s:structuredClone({P:G.P,turn:G.turn,turnNo:G.turnNo,queue:G.queue,phase:G.phase}),uid:UID,
    logN:logCount(),recL:G.rec.log.length,recA:G.rec.acts.length});
    if(G.undo.length>30)G.undo.shift()}catch(e){console.warn(e)}
}
function undo(){
  if(!G||G.busy||!G.undo.length||cur().cpu||G.over)return;
  const u=G.undo.pop();Object.assign(G,u.s);UID=u.uid;
  G.rec.log.length=u.recL;G.rec.acts.length=u.recA;if(G.logC)G.logC.length=u.recL;
  G.ui.mode=null;G.ui.act=null;
  uiUndo(u.logN);saveGame();
}
async function act(fn){ // 人の行動: 戻せるように保存してから実行
  pushUndo();G.busy=(G.busy||0)+1;
  try{await fn()}finally{if(G){G.busy=Math.max(0,(G.busy||1)-1);saveGame()}}
}

// ===== 中断した対戦の保存と再開（接続切れ・リロード・アプリを閉じたとき用） =====
// 落ち着いた時点（ターンのはじめ・人の行動が終わったあと）だけ端末に保存する。CPUのターン中に切れたら、そのターンのはじめからやり直す
const SAVE_KEY="conan-sim-save";
// 同じカードを指す参照（効果の待ち行列など）を保ったまま JSON にする
function packRefs(root){const ids=new Map();
  const f=v=>{if(v===null||typeof v!=="object")return v;
    if(ids.has(v))return {$r:ids.get(v)};const id=ids.size;ids.set(v,id);
    if(Array.isArray(v))return {$i:id,$a:v.map(f)};
    const o={$i:id};for(const k in v)o[k]=f(v[k]);return o};
  return f(root)}
function unpackRefs(root){const ids=[];
  const f=v=>{if(v===null||typeof v!=="object")return v;
    if("$r" in v)return ids[v.$r];
    if("$a" in v){const a=[];ids[v.$i]=a;for(const x of v.$a)a.push(f(x));return a}
    const o={};ids[v.$i]=o;for(const k in v)if(k!=="$i")o[k]=f(v[k]);return o};
  return f(root)}
function snapshotGame(){
  return {v:1,at:new Date().toISOString(),uid:UID,meta:{turnNo:G.turnNo,turnName:cur().name,names:G.P.map(p=>p.name),decks:G.rec.decks},
    g:packRefs({cfg:G.cfg,P:G.P,turn:G.turn,turnNo:G.turnNo,first:G.first,queue:G.queue,phase:G.phase,rec:G.rec,logC:G.logC||[],showOppHand:G.showOppHand})}
}
function saveGame(){
  if(!G||G.sim||G.over||G.busy||G.ending||G.contact||G.phase!=="main"||window.SIM_FAST&&!window.SIM_SAVE)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshotGame()))}catch(e){}
}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}}
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");return s&&s.v===1&&s.g?s:null}catch(e){return null}}
function resumeGame(s){
  UID=s.uid;
  G={...unpackRefs(s.g),over:false,ui:{mode:null},undo:[],busy:0};
  uiNewGame();
  G.rec.log.forEach(([t,m],i)=>uiLog(m,G.logC[i]||undefined));
  uiLog("— 中断したところから再開 —","t");
  render();
  const p=cur();if(p.cpu){const t=cpuTurn(p);if(G.sim)G.sim.next=t}
}

async function startGame(cfg){
  UID=1;clearSave();
  G={cfg,P:[mkPlayer(0,cfg.names[0],cfg.decks[0],!!cfg.cpu0),mkPlayer(1,cfg.names[1],cfg.decks[1],cfg.cpu)],turn:0,turnNo:0,first:0,over:false,ui:{mode:null},queue:[],undo:[],busy:0,showOppHand:!cfg.cpu||!!cfg.cpu0};
  uiNewGame();
  G.first=cfg.first==="rand"?Math.floor(Math.random()*2):+cfg.first;
  G.rec={v:2,start:new Date().toISOString(),names:[...cfg.names],cpu:[!!cfg.cpu0,!!cfg.cpu],decks:cfg.decks.map(deckLabel),
    deckLists:cfg.decks.map(deckToText),first:G.first,log:[],acts:[]};
  G.turn=G.first;
  for(const p of G.P)p.level=caseLevel(p,p.idx===G.first);
  log(`先攻: ${G.P[G.first].name}`,"t");
  for(const p of G.P){draw(p,5)}
  render();
  for(const i of [G.first,1-G.first]){const p=G.P[i];await mulligan(p)}
  for(const p of G.P)log(`${p.name}: パートナー ${C(p.partner).nm} / 事件 ${C(p.caseC).nm}（事件レベル${p.level}）`);
  beginTurn();
}
// マリガンの目安: 1ターン目・2ターン目に手札を使えるか（パスはほぼ負けなので最優先）
// FILE は先攻 1→3枚、後攻 2→4枚 なので、その枚数以下のレベルのカードが要る
function mullPlan(p){
  const fs=p.idx===G.first,L1=fs?1:2,L2=fs?3:4;
  const ok=x=>canPlayColor(C(x),p)&&(C(x).t==="キャラ"||C(x).t==="イベント");
  const lv=x=>C(x).lv||0;
  const pick=(max,ex)=>p.hand.filter(x=>ok(x)&&lv(x)<=max&&x!==ex).sort((a,b)=>(C(b).t==="キャラ")-(C(a).t==="キャラ")||lv(b)-lv(a))[0]||null;
  const k1=pick(L1,null),k2=pick(L2,k1);
  return {fs,L1,L2,k1,k2};
}
async function mulligan(p){
  let back;const P=mullPlan(p);
  if(p.cpu&&ai2(p,"mull2")&&!P.k1)back=[...p.hand]; // SeEd: 1ターン目に出せるカードが無ければ全部引き直す
  else if(p.cpu){
    // 両方そろっていれば重すぎる/色違いだけ戻す。そろわなければ低レベルを残して引き直す
    if(P.k1&&P.k2)back=p.hand.filter(x=>(C(x).lv||0)>=7||!canPlayColor(C(x),p));
    else back=p.hand.filter(x=>x!==P.k1&&x!==P.k2&&((C(x).lv||0)>P.L2||!canPlayColor(C(x),p)));
  }else{
    const tag=x=>x===P.k1?`${P.fs?1:2}ターン目に使える`:x===P.k2?`次のターンに使える`:null;
    const msg=P.k1&&P.k2?"1ターン目・2ターン目とも手札を使えます。":!P.k1?`⚠ 最初のターンに使えるカード（レベル${P.L1}以下）がありません。初手パスはかなり不利です。`:`⚠ 2回目のターンに使えるカード（レベル${P.L2}以下）がもう1枚ありません。`;
    back=await chooseCards(`${p.name}: マリガン（${P.fs?"先攻":"後攻"}）`,`【${P.fs?"先攻":"後攻"}】${p.name} は${P.fs?"先攻":"後攻"}です（${G.P[G.first].name} が先攻）。事件レベル ${p.level}。\nFILEは最初のターン${P.L1}枚、次のターン${P.L2}枚。${msg}\nデッキに戻すカードを選んでください（何枚でも、1回まで）。`,p.hand,{min:0,max:5,okLabel:"戻して引き直す",tag})}
  if(back.length){for(const x of back)detach(x);p.deck.push(...back);shuffle(p.deck);draw(p,back.length);log(`${p.name} はマリガンで${back.length}枚引き直した`)}
  else log(`${p.name} はマリガンしない`);
  render();
}
function beginTurn(){
  if(G.over)return;
  const p=cur();G.turnNo++;p.usedHand=false;p.hinted=false;p.hintN=0;p.noHint=false;G.undo=[];
  log(`— ${G.turnNo}ターン目: ${p.name} —`,"t");
  // オートフェイズ
  if(p.pLoc==="file"){p.file.splice(p.file.indexOf(p.partner),1);p.pLoc="area";log("パートナーがFILEからパートナーエリアに戻った")}
  p.partner.st="a";
  const keep=FX.keepStun(p);
  for(const x of p.field){if(x.st==="x"){if(!keep)x.st="s"}else x.st="a";x.fresh=false}
  if(keep&&p.field.some(x=>x.st==="x"))log("怪盗キッドの効果でスタン状態のキャラは起き上がらない","n");
  draw(p,1);
  const firstTurn=G.turnNo===1;
  toFile(p,firstTurn?1:2);
  log(`オートフェイズ: 1枚ドロー、FILEに${firstTurn?1:2}枚（FILE ${p.file.length}枚）`,"n");
  G.phase="main";recTurnStart(p);render();saveGame();
  if(p.cpu){const t=cpuTurn(p);if(G.sim)G.sim.next=t}
}
async function endTurn(){
  if(G.over||G.ending)return;
  const p=cur();recAct(p,"end",null);G.ending=true;
  await FX.endTurn(p);await runQueue();G.ending=false;
  if(G.over)return;
  const ends=[...p.field,...opp(p).field].filter(x=>/ターン終了時/.test(C(x).f||"")&&!FX.automated(x));
  if(ends.length)log(`ターン終了時の能力を確認: ${ends.map(x=>C(x).nm).join("、")}`,"n");
  for(const q of G.P)for(const x of [...q.field,q.partner]){x.apT=0;x.apA=0;x.lvT=0;x.lpT=0;x.kw=[];x.nmT=null}
  G.ui.mode=null;G.turn=1-G.turn;beginTurn();
}

// 手札の使用（ネクストヒント経由は viaHint）
function playableReason(p,x,viaHint){
  const c=C(x);
  if(G.turn!==p.idx)return "自分のターンではない";
  if(!viaHint&&p.usedHand)return "このターンはもう手札を使用した";
  if(!viaHint&&p.hinted)return "このターンはネクストヒントをした";
  const lv=(window.FX&&FX.handLevel(p,x))??(c.lv||0);
  if(lv>p.file.length)return `レベル${lv} > FILE${p.file.length}枚`;
  if(!canPlayColor(c,p))return `事件の色（${C(p.caseC).c}）と合わない`;
  return (window.FX&&FX.useBlock(p,x))||null;
}
async function useFromHand(p,x,viaHint=false){
  const r=playableReason(p,x,viaHint);if(r){toast(r);return false}
  recAct(p,viaHint?"hintUse":"use",x);
  const c=C(x);
  if(!window.SIM_FAST&&!G.sim&&!(c.t==="イベント"&&FX.automated(x))){render();await cutin(x,`${p.name}: ${c.t==="キャラ"?"登場":"使用"}${viaHint?"（ネクストヒント）":""}`,c.t==="キャラ"?`${c.nm}（Lv${c.lv} AP${c.ap}）`:(c.f||"").split("\n")[0].slice(0,60),{who:p})}
  if(c.t==="キャラ"){
    if(p.field.length>=5){
      const t=p.cpu?[p.field.slice().sort((a,b)=>(C(a).lv||0)-(C(b).lv||0))[0]]:await chooseCards("スイッチ","現場が5体です。リムーブして入れ替えるキャラを選んでください。",p.field,{min:1,max:1});
      if(!t.length)return false;removeCard(t[0],"スイッチ");
    }
    detach(x);x.st=FX.entersSleeping(x)?"s":"a";x.fresh=true;p.field.push(x);
    if(!viaHint)p.usedHand=true;
    log(`${p.name} は ${c.nm}（Lv${c.lv}）を登場させた${viaHint?"（ネクストヒント）":""}`);
    render();await runQueue();await FX.enter(p,x);
  }else{
    detach(x);p.rm.push(x);
    if(!viaHint)p.usedHand=true;
    log(`${p.name} はイベント ${c.nm} を使用した${viaHint?"（ネクストヒント）":""}`);
    render();await FX.event(p,x);
  }
  if(viaHint)await FX.onHintUse(p,x);
  render();return true;
}
function noteEffect(p,x,kind){
  const c=C(x);log(`　効果【${kind}】: ${(c.f||"").replace(/\n/g," ")}`,"n");
  if(!p.cpu)toast(`${c.nm} の効果は手動で処理してください（右パネル）`);
  else toast(`CPUの ${c.nm} の効果は未自動化です。必要なら手動で処理`);
}
async function nextHint(p){
  if(p.noHint){toast("このターンはネクストヒントできない");return}
  const top=[...p.file].reverse().find(x=>x!==p.partner);
  if(!top){toast("FILEにカードがない");return}
  recAct(p,"hint",null);
  p.file.splice(p.file.indexOf(top),1);p.hand.push(top);p.hinted=true;p.hintN=(p.hintN||0)+1;
  log(`${p.name} はネクストヒント${p.hintN>1?`（このターン${p.hintN}回目）`:""}（FILE ${p.file.length}枚）。${p.cpu?"":C(top).nm+" を手札に"}`);
  render();
  if(p.cpu)return top;
  const ok=p.hand.filter(y=>!playableReason(p,y,true));
  const ch=await chooseCards("ネクストヒント: カードを使用",`FILE ${p.file.length}枚。使用するカードを1枚選んでください。`,ok,{min:0,max:1,okLabel:"使用"});
  if(ch.length)await useFromHand(p,ch[0],true);
  render();
}
async function assist(p){
  if(p.pLoc!=="area"||p.partner.st!=="a"){toast("パートナーがアクティブではない");return}
  recAct(p,"assist",p.partner);
  p.partner.st="s";p.pLoc="file";p.file.push(p.partner);
  log(`${p.name} はアシスト（FILE ${p.file.length}枚）`);
  if(p.file.length>=7&&!p.solved){p.solved=true;log(`${p.name} の事件が解決編になった！`,"t");toast("解決編へ");render();await FX.solvedTrigger(p)}
  render();
}
function solve(p){
  if(p.pLoc!=="area"||p.partner.st!=="a"){toast("パートナーがアクティブではない");return}
  if(!p.solved){toast("事件がまだ事件編");return}
  recAct(p,"solve",p.partner);
  p.partner.st="s";
  if(FX.eraseEvidence(p)){
    if(p.ev.length>=p.level){const gone=p.ev.splice(p.ev.length-p.level,p.level);p.rm.push(...gone);win(p,`証拠隠滅（証拠を${p.level}つリムーブ）で相手が敗北`)}
    else{log(`${p.name} は証拠隠滅を宣言したが証拠不足（${p.ev.length}/${p.level}）`,"w");render()}
    return}
  if(p.ev.length>=p.level)win(p,`事件解決（証拠${p.ev.length}/${p.level}）`);
  else{log(`${p.name} は事件解決を宣言したが証拠不足（${p.ev.length}/${p.level}）`,"w");render()}
}
function canAct(x,p,kind){ // kind: reason|chara|case
  if(x.st!=="a")return false;
  if(kind==="reason"&&x.kw.includes("推理不可"))return false;
  if(x===p.partner)return kind==="reason"&&p.pLoc==="area";
  if(!x.fresh)return true;
  const k=staticKw(x,p);
  if(k.swift)return true;
  if(kind==="chara")return k.rush||k.rushC;
  if(kind==="case")return k.rush||k.rushE;
  return false;
}
async function reason(p,x){
  if(!canAct(x,p,"reason")){toast("推理できない（スリープ中か名乗り状態）");return}
  recAct(p,"reason",x);
  x.st="s";
  let lp=x===p.partner?(C(x).lp||1)+x.lpT+x.lpM:lpOf(x);
  log(`${p.name} の ${C(x).nm} が推理（LP${lp}）`);
  await showCpu(p,x,"推理",`${C(x).nm}（LP${lp}）`);
  const o=opp(p);
  const mis=o.field.filter(y=>y.st==="a"&&staticKw(y,o).misread>0);
  if(mis.length){
    let use;
    if(o.cpu)use=mis.slice(0,Math.max(0,lp));
    else use=await chooseCards(`${o.name}: ミスリード`,`${C(x).nm} の推理（LP${lp}）に対し、ミスリードするキャラを選べます（スリープします）。`,mis,{min:0,max:mis.length,okLabel:"ミスリード"});
    for(const y of use){y.st="s";const v=staticKw(y,o).misread;lp-=v;log(`${o.name} の ${C(y).nm} がミスリード${v}（LP${lp}）`);
      render();await cutin(y,"ミスリード！",`${o.name} の ${C(y).nm}：${C(x).nm} の推理 LP−${v}（残りLP${Math.max(0,lp)}）`,{kind:"mis"})}
  }
  const n=Math.max(0,lp);gainEvidence(p,n);log(`${p.name} は証拠を${n}つ得た（証拠${p.ev.length}）`);
  await FX.onReason(p,x);
  clearAct();render();
}
async function declareAction(p,x,target){ // target: inst or "case"
  const kind=target==="case"?"case":"chara";
  if(!canAct(x,p,kind)){toast("アクションできない");return}
  const o=opp(p);
  if(kind==="chara"&&!(o.field.includes(target)&&(target.st==="s"||target.st==="x"||x.kw.includes("アクティブ指定")))){toast("対象はスリープかスタン状態のキャラ");return}
  if(kind==="case"&&o.ev.length===0){toast("相手の証拠が0");return}
  recAct(p,"action",x,target);
  await showCpu(p,x,"アクション",kind==="case"?`${C(x).nm}（AP${apOf(x)}）→ 事件（証拠を狙う）`:`${C(x).nm}（AP${apOf(x)}）→ ${C(target).nm}（AP${apOf(target)}）`,target);
  x.st="s";
  log(`${p.name} の ${C(x).nm}（AP${apOf(x)}）がアクション → ${kind==="case"?"事件":C(target).nm}`);
  render();await FX.onAction(p,x,kind==="case"?null:target);
  // ガードまでにアクションしたキャラや対象が現場を離れたら、アクションはそこで終わる
  if(!p.field.includes(x)||kind==="chara"&&!o.field.includes(target)){log("　アクションしたキャラか対象が現場を離れたので、アクション終了","n");render();await runQueue();clearAct();render();return}
  const kw=staticKw(x,p);
  let guard=null;
  const guards=o.field.filter(y=>{const k=staticKw(y,o);return !k.noGuard&&(y.st==="a"||y.st==="s"&&(k.guardSleep||FX.canGuardSleeping(y)))});
  const forced=guards.filter(y=>staticKw(y,o).mustGuard); // 「ガードできる場合、必ずガードする」
  if(!kw.bullet&&guards.length){
    if(forced.length){
      if(o.cpu)guard=forced.slice().sort((a,b)=>apOf(b)-apOf(a))[0];
      else{const g=await chooseCards(`${o.name}: ガード（必ずガード）`,`${C(x).nm}（AP${apOf(x)}）のアクション。「必ずガードする」キャラがいるので、そのキャラでガードします。`,forced,{min:1,max:1,okLabel:"ガード"});guard=g[0]||forced[0]}
    }
    else if(o.cpu)guard=cpuGuard(o,x,target,guards);
    else{const g=await chooseCards(`${o.name}: ガード`,`${C(x).nm}（AP${apOf(x)}）が${kind==="case"?"事件":C(target).nm+"（AP"+apOf(target)+"）"}にアクション。アクティブなキャラをスリープしてガードできます。`,guards,{min:0,max:1,okLabel:"ガード"});guard=g[0]||null}
  }
  if(guard){if(guard.st==="a")guard.st="s";log(`${o.name} の ${C(guard).nm}（AP${apOf(guard)}）がガード`);
    {render();await cutin(guard,`${o.name}: ガード`,`${C(guard).nm}（AP${apOf(guard)}）`,{who:o})}await contact(p,x,guard)}
  else if(kind==="chara")await contact(p,x,target);
  else{
    const e=o.ev.pop();log(`${o.name} の証拠を1つリムーブ`);
    await hirameki(o,e);
    gainEvidence(p,1);log(`${p.name} は証拠を1つ得た（証拠${p.ev.length}）`);
  }
  render();await runQueue();
  if(!G.over)await FX.actionEnd(p,x);
  clearAct();render();
}
async function hirameki(o,e){
  const c=C(e);o.rm.push(e);
  render();await revealCard(e,`ヒラメキチェック（${o.name}）`,c.hr?`${c.nm}【ヒラメキ】あり！`:`${c.nm}（ヒラメキなし）`,!!c.hr);
  if(!c.hr)return;
  let use;
  if(o.cpu)use=true;
  else use=await ask(`${o.name}: ヒラメキ`,`リムーブされた証拠 ${c.nm}\n${c.hr}`,[{label:"発動する",value:true,primary:true},{label:"発動しない",value:false}]);
  if(!use)return;
  log(`${o.name} の ${c.nm}【ヒラメキ】発動`);
  if(await FX.hirameki(o,e)){render();return}
  if(/カードを1枚引く/.test(c.hr)&&!/選び/.test(c.hr)){draw(o,1);log(`　→ ${o.name} は1枚引いた`,"n")}
  else{log(`　${c.hr}`,"n");toast("ヒラメキの効果を手動で処理してください")}
}
async function contact(p,a,d){ // p=ターンプレイヤー(攻撃側)
  const o=opp(p);const ct={a,d};G.contact=ct;
  log(`コンタクト: ${C(a).nm} AP${apOf(a)} vs ${C(d).nm} AP${apOf(d)}`);
  await FX.onContact(p,ct);
  render();
  const firstIsDef=apOf(ct.d)<=apOf(ct.a); // 同値は非ターンプレイヤーが1番目
  const order=firstIsDef?[o,p]:[p,o];
  const acted={};
  const turnOf=async q=>{const r=await contactRight(q,ct,p);if(r)acted[q.idx]=true;return r};
  const r1=await turnOf(order[0]);
  const r2=await turnOf(order[1]);
  if(!r1&&r2)await turnOf(order[0]);
  // コンタクト中のキャラが現場を離れたら、APの判定はしない
  if(!p.field.includes(ct.a)||!o.field.includes(ct.d)){for(const x of [ct.a,ct.d])x.apC=0;G.contact=null;log("　コンタクト中のキャラが現場を離れたので、コンタクト終了","n");render();await runQueue();return}
  const A=apOf(ct.a),D=apOf(ct.d);
  log(`判定: ${C(ct.a).nm} AP${A} vs ${C(ct.d).nm} AP${D}`);
  const won=A>=D;
  for(const x of [ct.a,ct.d])x.apC=0;
  G.contact=null;
  if(won){await cutin(ct.d,"リムーブ！",`${C(ct.a).nm} AP${A} ≧ ${C(ct.d).nm} AP${D}`,{who:p,ms:1100});
    removeCard(ct.d,"コンタクト",{by:p});render();await FX.contactWin(p,ct.a,ct.d)}
  else{await cutin(ct.d,"防いだ！",`${C(ct.a).nm} AP${A} ＜ ${C(ct.d).nm} AP${D}`,{who:o,ms:1100});log("　アクションした側のAPが低いので何も起きない","n")}
  render();await runQueue();
}
async function contactRight(q,ct,tp){
  if(G.over)return false;
  const mine=q===tp?ct.a:ct.d,theirs=q===tp?ct.d:ct.a;
  if(!q.field.includes(mine)||!opp(q).field.includes(theirs))return false;
  const cuts=FX.noCutin(mine)||q!==tp&&FX.cutinLocked(tp,ct.a)?[]:q.hand.filter(x=>cutinUsable(x,q)); // 条件（自分ターン中など）を満たすものだけ
  const dis=q.hand.filter(x=>C(x).t==="キャラ"&&C(x).dg&&disguiseOk(x,q));
  if(!cuts.length&&!dis.length)return false;
  let choice=null;
  if(q.cpu)choice=cpuContact(q,mine,theirs,cuts,tp);
  else{
    const opts=[...cuts,...dis];
    const sel=await chooseCards(`${q.name}: コンタクト中の行動`,`自分 ${C(mine).nm} AP${apOf(mine)} / 相手 ${C(theirs).nm} AP${apOf(theirs)}\nカットインか変装を1枚使えます（パス可）。`,opts,{min:0,max:1,okLabel:"使う"});
    if(sel.length){const x=sel[0];
      if(cuts.includes(x)&&dis.includes(x)){choice={x,how:await ask("どちらで使う？","",[{label:"カットイン",value:"cut",primary:true},{label:"変装",value:"dis"}])}}
      else choice={x,how:cuts.includes(x)?"cut":"dis"}}
  }
  if(!choice){log(`${q.name} はパス`,"n");return false}
  const x=choice.x;
  {render();await cutin(x,`${q.name}: ${choice.how==="cut"?"カットイン":"変装"}`,choice.how==="cut"?((C(x).ci||"").split("\n")[0]||`AP＋${FX.grantedCutin(q,x)}`):`${C(mine).nm} → ${C(x).nm}`,{who:q})}
  if(choice.how==="cut"){
    // 与えられたカットイン（AP＋1000）と自分のカットインの両方があれば、どちらか1つを使う
    const gv=FX.grantedCutin(q,x),own=ownCutinOk(x,q);let useOwn=own;
    if(own&&gv!=null)useOwn=q.cpu?(ownCutinAp(x,q)??-1)>=gv:await ask("どちらのカットインを使う？","",[{label:(C(x).ci||"").split("\n")[0].slice(0,40),value:true,primary:true},{label:`AP＋${gv}（与えられたカットイン）`,value:false}]);
    const v=useOwn?ownCutinAp(x,q):gv;detach(x);q.rm.push(x);
    if(v!=null){mine.apC+=v;log(`${q.name} はカットイン ${C(x).nm}: ${C(mine).nm} AP＋${v}（AP${apOf(mine)}）`)}
    else{log(`${q.name} はカットイン ${C(x).nm}: ${C(x).ci.replace(/\n/g," ")}`);if(!FX.has(x,"cutin"))toast("カットイン効果を手動で処理")}
    await FX.cutin(q,x,mine,useOwn);
  }else{
    detach(x);const fi=q.field.indexOf(mine);
    Object.assign(x,{st:mine.st,apM:mine.apM,apT:mine.apT,apC:mine.apC,lpM:mine.lpM,lpT:mine.lpT,kw:mine.kw.slice(),fresh:mine.fresh});
    q.field[fi]=x;resetMods(mine);q.deck.push(mine);
    if(ct.a===mine)ct.a=x;else ct.d=x;
    log(`${q.name} は ${C(mine).nm} を ${C(x).nm} に変装（AP${apOf(x)}）`);
    render();await FX.disguise(q,x);
  }
  render();
  if(!q.cpu)await sleep(50);
  return true;
}

