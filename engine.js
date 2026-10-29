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
function resetMods(x){x.apM=0;x.apT=0;x.apC=0;x.lpM=0;x.lpT=0;x.kw=[];x.fresh=false;x.st="a"}
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
function win(p,why){if(G.over)return;if(G.sim){G.over=true;G.winner=p.idx;return}G.over=true;log(`★ ${p.name} の勝利（${why}）`,"t");saveRecord(p,why);render();
  const endMenu=()=>ask("ゲーム終了",`${p.name} の勝利\n${why}`,[{label:"フィードバックを書く",value:"fb",primary:true},{label:"もう一度（同じデッキ）",value:"again"},{label:"デッキ選択に戻る",value:"setup"},{label:"盤面を見る",value:"view"}]).then(async v=>{
    if(v==="fb"){await feedbackPage(G.rec);endMenu()}else if(v==="again")startGame(G.cfg);else if(v==="setup")showSetup()});
  if(!window.SIM_FAST)endMenu()}
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

// ===== 対戦後のフィードバック（改善点・CPUへのアドバイス） =====
// 対戦記録に一緒に保存し、GitHubのIssueとしても送れる（Claudeが後で読める）
const FB_REPO="SSSSeEd/conan-sim";
function feedbackPage(rec){
  return modal((m,done)=>{
    const old=rec&&rec.feedback||{};
    const sum=rec?`${rec.names[0]}（${rec.decks[0]}） vs ${rec.names[1]}（${rec.decks[1]}）・${rec.turns||"?"}ターン・${rec.winner!=null?rec.names[rec.winner]+" の勝ち":"途中"}`:"";
    m.insertAdjacentHTML("beforeend",`<div class="mt">フィードバック</div>
      <div class="mb" style="font-size:12px;color:var(--ink-dim)">${rec?esc(sum)+"\n書いた内容はこの対戦の記録と一緒に保存されます。":"アプリ全体への要望・バグ報告です。"}「GitHubに送る」を押すと、Claudeが次の作業で読めるように送信画面が開きます。${rec?"対戦ログなどの詳細はクリップボードにコピーされるので、開いた画面の本文の最後に貼り付けてください。":""}</div>
      <label class="fbl">アプリの改善点・バグ<textarea id="fbApp" rows="4" placeholder="例: アクションの後に画面が戻らない、カードの効果が違う など">${esc(old.app||"")}</textarea></label>
      <label class="fbl">CPUへのアドバイス<textarea id="fbCpu" rows="4" placeholder="例: 2ターン目にパスしないで、このカードを先に出すべき など">${esc(old.cpu||"")}</textarea></label>
      <div class="opts"><button class="primary" id="fbSave">保存</button><button id="fbGh">${rec?"保存して":""}GitHubに送る</button><button id="fbClose">閉じる</button></div>`);
    const save=()=>{const fb={app:m.querySelector("#fbApp").value.trim(),cpu:m.querySelector("#fbCpu").value.trim(),at:new Date().toISOString()};
      if(rec){rec.feedback=fb;try{const all=loadRecords();const i=all.findIndex(r=>r.start===rec.start);if(i>=0){all[i].feedback=fb;localStorage.setItem(REC_KEY,JSON.stringify(all))}}catch(e){}}
      return fb};
    m.querySelector("#fbSave").onclick=()=>{save();toast("保存しました");done(true)};
    m.querySelector("#fbClose").onclick=()=>done(false);
    m.querySelector("#fbGh").onclick=async()=>{const fb=save();
      const acts=rec?rec.acts.filter(a=>!rec.cpu[a.who]).slice(-30).map(a=>`- ${a.t}T ${a.kind}${a.card?" "+a.card.nm:""}${a.target?" → "+(a.target.nm||a.target):""}`).join("\n"):"";
      const main=`${rec?`## 対戦\n${sum}\n決着: ${rec.why||""}\n先攻: ${rec.names[rec.first]}\n\n`:""}## アプリの改善点・バグ\n${fb.app||"（なし）"}\n\n## CPUへのアドバイス\n${fb.cpu||"（なし）"}`;
      let detail=rec?`<details><summary>自分の行動（最後の30件）</summary>\n\n${acts}\n</details>\n\n<details><summary>ログ（最後の60行）</summary>\n\n\`\`\`\n${rec.log.slice(-60).map(x=>x[1]).join("\n")}\n\`\`\`\n</details>\n\n<details><summary>デッキ</summary>\n\n\`\`\`\n${rec.deckLists.join("\n---\n")}\n\`\`\`\n</details>`:"";
      // URLが長いとGitHubが500を返す（未ログイン時はログイン画面へのリダイレクトで更に長くなる）ので短く保つ
      let body=main+(detail?"\n\n## 対戦ログ\n（ここにコピーした対戦ログを貼り付け）\n":"");
      const title=`[フィードバック] ${(fb.app||fb.cpu||"対戦の感想").split("\n")[0].slice(0,40)}`;
      const mk=b=>`https://github.com/${FB_REPO}/issues/new?labels=feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(b)}`;
      if(mk(body).length>2000){ // 長すぎるときは本文ごとクリップボードへ回す
        detail=main+(detail?"\n\n"+detail:"");body=`${rec?sum+"\n\n":""}（本文が長いのでコピーしました。ここに貼り付けてください）\n`}
      window.open(mk(body),"_blank"); // ポップアップがブロックされないよう、コピーより先に開く
      if(detail){let copied=false;try{await navigator.clipboard.writeText(detail);copied=true}catch(e){}
        if(copied)toast("内容をコピーしました。送信画面の「貼り付け」と書いた所に貼ってください");
        else await ask("コピーできませんでした","下の内容を選んでコピーし、送信画面に貼り付けてください。\n\n"+detail,[{label:"OK",value:1,primary:true}])}
      done(true)};
  });
}

// ===== 一手戻す（自分のターン中だけ） =====
function pushUndo(){
  if(!G||G.over||cur().cpu)return;
  try{G.undo.push({s:structuredClone({P:G.P,turn:G.turn,turnNo:G.turnNo,queue:G.queue,phase:G.phase}),uid:UID,
    logN:document.getElementById("log").children.length,recL:G.rec.log.length,recA:G.rec.acts.length});
    if(G.undo.length>30)G.undo.shift()}catch(e){console.warn(e)}
}
function undo(){
  if(!G||G.busy||!G.undo.length||cur().cpu||G.over)return;
  const u=G.undo.pop();Object.assign(G,u.s);UID=u.uid;
  const L=document.getElementById("log");while(L.children.length>u.logN)L.lastChild.remove();
  G.rec.log.length=u.recL;G.rec.acts.length=u.recA;
  G.ui.mode=null;G.ui.act=null;_sel=null;
  document.getElementById("detail").classList.remove("open");document.getElementById("selPane").innerHTML=SEL_HINT;
  render();toast("一手戻しました");
}
async function act(fn){ // 人の行動: 戻せるように保存してから実行
  pushUndo();G.busy=(G.busy||0)+1;
  try{await fn()}finally{if(G)G.busy=Math.max(0,(G.busy||1)-1)}
}

async function startGame(cfg){
  UID=1;
  G={cfg,P:[mkPlayer(0,cfg.names[0],cfg.decks[0],!!cfg.cpu0),mkPlayer(1,cfg.names[1],cfg.decks[1],cfg.cpu)],turn:0,turnNo:0,first:0,over:false,ui:{mode:null},queue:[],undo:[],busy:0,showOppHand:!cfg.cpu||!!cfg.cpu0};
  document.getElementById("setup").hidden=true;document.getElementById("app").hidden=false;
  document.getElementById("board").innerHTML=`<div id="oppSide"></div><div id="mid"><div id="guide"></div><div id="log" aria-live="polite"></div></div><div id="meSide"></div>`;
  _sel=null;document.getElementById("selPane").innerHTML=SEL_HINT;document.getElementById("hoverPane").innerHTML="";
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
  G.phase="main";recTurnStart(p);render();
  if(p.cpu){const t=cpuTurn(p);if(G.sim)G.sim.next=t}
}
async function endTurn(){
  if(G.over||G.ending)return;
  const p=cur();recAct(p,"end",null);G.ending=true;
  await FX.endTurn(p);await runQueue();G.ending=false;
  if(G.over)return;
  const ends=[...p.field,...opp(p).field].filter(x=>/ターン終了時/.test(C(x).f||"")&&!FX.automated(x));
  if(ends.length)log(`ターン終了時の能力を確認: ${ends.map(x=>C(x).nm).join("、")}`,"n");
  for(const q of G.P)for(const x of [...q.field,q.partner]){x.apT=0;x.lpT=0;x.kw=[]}
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
  return null;
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
  clearAct();render();
}
async function declareAction(p,x,target){ // target: inst or "case"
  const kind=target==="case"?"case":"chara";
  if(!canAct(x,p,kind)){toast("アクションできない");return}
  const o=opp(p);
  if(kind==="chara"&&!(o.field.includes(target)&&(target.st==="s"||target.st==="x"))){toast("対象はスリープかスタン状態のキャラ");return}
  if(kind==="case"&&o.ev.length===0){toast("相手の証拠が0");return}
  recAct(p,"action",x,target);
  await showCpu(p,x,"アクション",kind==="case"?`${C(x).nm}（AP${apOf(x)}）→ 事件（証拠を狙う）`:`${C(x).nm}（AP${apOf(x)}）→ ${C(target).nm}（AP${apOf(target)}）`,target);
  x.st="s";
  log(`${p.name} の ${C(x).nm}（AP${apOf(x)}）がアクション → ${kind==="case"?"事件":C(target).nm}`);
  render();await FX.onAction(p,x);
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
// 証拠をめくって見せる（タップで早送り）
function revealCard(x,title,sub,hit){
  if(window.SIM_TURBO||G&&G.sim)return Promise.resolve();
  return new Promise(res=>{
    const d=document.createElement("div");d.id="reveal";if(hit)d.classList.add("hit");
    d.innerHTML=`<div class="rvt">${esc(title)}</div><div class="flip"><div class="fin"><div class="face back"></div><div class="face front"></div></div></div><div class="rvs"></div>`;
    d.querySelector(".front").appendChild(cardEl(x));
    document.body.appendChild(d);
    const rm=()=>{if(!d.isConnected)return;d.remove();res()};
    setTimeout(()=>{d.querySelector(".rvs").textContent=sub},1000);
    d.onclick=()=>{if(d.querySelector(".rvs").textContent)rm();else{d.querySelector(".rvs").textContent=sub;d.querySelectorAll(".fin").forEach(f=>{f.style.animation="none";f.style.transform="rotateY(180deg)"})}};
    setTimeout(rm,hit?2600:1900);
  })}
// 帯の演出（タップで早送り）。SIM_FAST のときは出さない（テスト用）
// 演出の速さ（≡メニューで変更・端末に保存）。人が対戦しているときだけ使う
const SPEEDS={slow:{label:"ゆっくり",m:1.5},normal:{label:"ふつう",m:1},fast:{label:"はやい",m:.6}};
function speedKey(){try{return localStorage.getItem("conan-sim-speed")||"slow"}catch(e){return "slow"}}
function pace(){if(window.SIM_FAST)return 0;if(G&&G.cfg&&G.cfg.cpu0)return 1;return (SPEEDS[speedKey()]||SPEEDS.slow).m}
function cutin(x,title,sub,{who=null,kind="",ms=1300,fx=null}={}){
  if(!G||window.SIM_FAST||G.sim)return Promise.resolve();
  ms=Math.round(ms*pace());
  return new Promise(res=>{
    const d=document.createElement("div");d.className="cutin "+(kind||(who&&who.idx===0?"me":"op"))+(fx?" fx":"");
    d.innerHTML=`<div class="band">${x?'<div class="ccard"></div>':""}<div class="ctx"><div class="ct">${esc(title)}</div>${sub?`<div class="cs">${esc(sub)}</div>`:""}${fx?`<div class="fxt">${hl(fx)}</div>`:""}</div></div><div class="tap">タップで次へ</div>`;
    if(x)d.querySelector(".ccard").appendChild(cardEl(x));
    document.body.appendChild(d);
    let t;const end=()=>{if(d.classList.contains("out"))return;clearTimeout(t);d.classList.add("out");setTimeout(()=>{d.remove();res()},220)};
    d.onclick=end;t=setTimeout(end,ms);
  })}
// 効果を使ったことを、カードと効果文で大きく見せる（effects.js から呼ばれる）
async function showFx(p,x,kind,text,{after=false}={}){
  if(!G||window.SIM_FAST||G.sim||!x)return;
  const t=String(text||"").trim();
  render();
  await cutin(x,`${p.name}: ${C(x).nm}`,`【${kind}】の効果${after?"が発動":"を使う"}`,{who:p,fx:t.slice(0,220),ms:Math.min(4200,1500+t.length*28)});
}
// 行動を見せる: 行動するカードと対象を光らせ、帯で知らせる（自分の行動も同じように見せる）
async function showCpu(p,x,title,sub,target){
  if(window.SIM_FAST||G.sim)return;
  G.ui.act={a:x,t:target&&target!=="case"?target:null};render();
  await cutin(x,`${p.name}: ${title}`,sub,{who:p,ms:p.cpu?1300:900});
  await sleep(250*pace());
}
function clearAct(){if(G&&G.ui.act){G.ui.act=null;render()}}
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

