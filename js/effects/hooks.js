"use strict";
// カード個別効果（本体から呼ばれる）効果の演出と FX フック。最後に読む。

// ================= 効果の演出 =================
// 効果を使うとき、そのカードと効果文を大きく見せる（本体の showFx）
const FX_LINE={"登場時":/【登場時】/,"変装時":/【変装時】/,"現場リムーブ時":/【現場リムーブ時】|リムーブされたとき|リムーブエリアに移ったとき/,
  "ターン終了時":/ターン終了時/,"アクション終了時":/アクション終了時/,"アクション":/アクションした|アクションするとき|アクション宣言/,"コンタクト":/コンタクト/,
  "イベント使用":/イベントを使用したとき/,"解決編":/解決編に(?:なった|移行した)とき/,"能力":/【宣言】/,"カットイン":/./};
function effText(x,kind){const c=C(x);
  if(kind==="カットイン")return c.ci||"";if(kind==="ヒラメキ")return c.hr||"";if(kind==="イベント")return c.f||"";
  const re=FX_LINE[kind];const ls=(c.f||"").split("\n");return (re&&ls.find(l=>re.test(l)))||c.f||""}
async function fxPre(p,x,kind,text){if(typeof showFx==="function")await showFx(p,x,kind,text??effText(x,kind))}
// 条件つきの効果は、実際に何か起きたときだけ見せる（ログが増えたかで判断）
async function fxIf(p,x,kind,fn){const n0=G.rec?G.rec.log.length:0;
  if(typeof showFx!=="function"||!G.rec){await resolving(fn);return}
  await resolving(fn);
  if(G.rec.log.length>n0)await showFx(p,x,kind,effText(x,kind),{after:true})}

// 効果の解決中に起きた「手札から公開したとき」は、今の効果（一番外側）を解決し終えてから発動する（毛利蘭 B09004・B10006 など）
async function resolving(fn){G.fxD=(G.fxD||0)+1;try{return await fn()}finally{G.fxD--;if(!G.fxD)await flushReveal()}}
async function flushReveal(){while(G.revealQ&&G.revealQ.length&&!G.over){const r=G.revealQ.shift();await resolving(()=>FX.runReveal(r.p,r.x))}}
// セットされている表向きのイベント（下に重ねたカードは除く）
const setEvents=x=>(x.set||[]).filter(s=>s.up&&!s.under).map(s=>s.c);

// ================= フック（本体から呼ばれる） =================
const def=x=>x&&x.negT&&G&&x.negT===G.turnNo?null:DEF[idOf(x)]; // 「元の能力を無効にする」（遠山和葉 B04018）されたキャラは、このターン効果なし
const def0=x=>DEF[idOf(x)];
const FX={
  has:(x,k)=>!!(def(x)&&def(x)[k]),
  async enter(p,x){
    // 【疾風】自分の現場にこのターンで1番に登場したとき
    const first=p.field.includes(x)&&p.galeT!==G.turnNo;if(p.field.includes(x))p.galeT=G.turnNo;
    await FX.enter0(p,x);
    const d=def(x);if(first&&d&&d.gale&&p.field.includes(x)){p.galeFired=G.turnNo;await fxPre(p,x,"疾風");log(`　【疾風】${C(x).nm}`,"n");await resolving(()=>d.gale(p,x));render();await runQueue()}
    for(const y of [...p.field,...areaCards(p)]){const e=def(y);if(e&&e.onAllyEnter&&(inArea(p,y)?e.partnerToo:p.field.includes(y)))await fxIf(p,y,"登場",()=>e.onAllyEnter(p,y,x))}await runQueue()},
  async enter0(p,x){const d=def(x);if(d&&d.enter){await fxPre(p,x,"登場時");log(`　【登場時】${C(x).nm}`,"n");await resolving(()=>d.enter(p,x));render();if(d.partial&&/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時")}else if(/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時");await runQueue()},
  async event(p,x){const d=def(x);if(d&&d.event){await fxPre(p,x,"イベント");G.evtBy=p;try{await resolving(()=>d.event(p,x))}finally{G.evtBy=null}render()}else noteEffect(p,x,"イベント");await runQueue();
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onEventUse&&p.field.includes(y))await fxIf(p,y,"イベント使用",()=>e.onEventUse(p,y,x))}await runQueue()},
  async disguise(p,x){const d=def(x);if(d&&d.disguise){await fxPre(p,x,"変装時");log(`　【変装時】${C(x).nm}`,"n");await d.disguise(p,x)}else if(/【変装時】/.test(C(x).f||""))noteEffect(p,x,"変装時");
    const o=opp(p);for(const y of o.field.slice()){const e=def(y);if(e&&e.onOppDisguise&&o.field.includes(y))await fxIf(o,y,"変装",()=>e.onOppDisguise(o,y,x))}}, // 相手が【変装】を使用したとき（茶木神太郎）
  async disguiseReplaced(p,mine,by){const d=def(mine);return !!(d&&d.disguiseReplaced&&await d.disguiseReplaced(p,mine,by))}, // 変装で入れ替わるキャラが、デッキの下の代わりにリムーブされるか
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
    if(!target&&p.field.includes(actor))for(const sc of setEvents(actor)){const e=def(sc);if(e&&e.setOnCase)await fxIf(p,actor,"アクション",()=>e.setOnCase(p,actor,sc))} // セットされたイベントが与える「アクション［事件］したとき」（BANG）
    const o=opp(p);for(const y of o.field.slice()){const d=def(y);if(d&&d.onOppAction&&o.field.includes(y))await fxIf(o,y,"アクション",()=>d.onOppAction(o,y,actor,target))}},
  async onCaseGain(p,actor){for(const y of p.field.slice()){const d=def(y);if(d&&d.onCaseGain&&p.field.includes(y))await fxIf(p,y,"証拠を得たとき",()=>d.onCaseGain(p,y,actor))}}, // アクション［事件］で証拠を得たとき（メアリー）
  async onContact(p,ct){for(const q of G.P)for(const y of q.field.slice()){const d=def(y);if(d&&d.onContact&&q.field.includes(y))await fxIf(q,y,"コンタクト",()=>d.onContact(q,y,ct))}
    // ［FBI］に与えた「レベル7以下のキャラとコンタクトしたとき、コンタクト中のすべてのキャラをリムーブする」（赤井秀一 B04046）
    const [a,b]=[ct.a,ct.d];if([[a,b],[b,a]].some(([u,v])=>u.kw.includes("相打ち7")&&lvOf(v)<=7&&allChars().includes(u)&&allChars().includes(v))){
      log("　コンタクト中のすべてのキャラをリムーブ","n");for(const y of [a,b])removeCard(y,"効果",{by:ownerOf(a),effect:true});await runQueue()}},
  async onReason(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReason&&p.field.includes(y))await fxIf(p,y,"推理",()=>d.onReason(p,y,x))}await runQueue()},
  async onReveal(p,x){if(G.fxD){(G.revealQ=G.revealQ||[]).push({p,x});return}await resolving(()=>FX.runReveal(p,x))},
  async runReveal(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReveal&&p.field.includes(y))await fxIf(p,y,"公開",()=>d.onReveal(p,y,x))}},
  lpBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;const d=def(x);return d&&d.lpSelf?d.lpSelf(p,x)||0:0},
  kwExtra(x,p){if(!p||!p.field.includes(x))return [];const d=def(x);const out=d&&d.kwSelf?[...d.kwSelf(p,x)]:[];
    for(const s of setEvents(x)){const e=def(s);if(e&&e.setKw)out.push(...e.setKw(p,x))}return out}, // setKw: セットされたイベントが与えるキーワード
  async onHintUse(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onHintUse&&p.field.includes(y))await fxIf(p,y,"ネクストヒント",()=>d.onHintUse(p,y,x))}
    const pd=def(p.partner);if(pd&&pd.onHintUse&&p.pLoc==="area")await fxIf(p,p.partner,"ネクストヒント",()=>pd.onHintUse(p,p.partner,x))},
  useBlock(p,x){if(p.banNm&&p.banNm.t===G.turnNo&&C(x).nm.includes(p.banNm.nm))return `このターンは［${p.banNm.nm}］を使用できない`;const d=def(x);return d&&d.useBlock?d.useBlock(p,x):null},
  lvBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;const d=def(x);if(d&&d.lvSelf)b+=d.lvSelf(p,x)||0;
    for(const q of G.P)for(const y of q.field){const d=def(y);if(d&&d.lvAura)b+=d.lvAura(q,y,x)||0}return b},
  async actionEnd(p,actor){actor.apA=0;const d=def(actor);if(d&&d.actionEnd&&p.field.includes(actor))await fxIf(p,actor,"アクション終了時",()=>d.actionEnd(p,actor));await runQueue()},
  async contactWin(p,winner,victim){if(winner.kw.includes("勝利ドロー")&&p.field.includes(winner))drawN(p,1); // 工藤新一NYの事件 B10100P が与えた「コンタクトでリムーブしたとき1枚引く」
    const d=def(winner);if(d&&d.contactWin&&p.field.includes(winner))await fxIf(p,winner,"コンタクト",()=>d.contactWin(p,winner,victim));
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onAllyContactWin&&p.field.includes(y))await fxIf(p,y,"コンタクト",()=>e.onAllyContactWin(p,y,winner,victim))}},
  async endTurn(p){for(const y of p.field.filter(y=>y.kw.includes("終了時デッキの下")))toDeckBottom(y); // 目暮十三 PR181 が与えた能力
    for(const y of p.field.filter(y=>y.kw.includes("終了時リムーブ")))removeCard(y,"効果",{by:p,effect:true}); // 黒田兵衛 B03089 が与えた能力
    await runQueue();
    // 同時に発動するターン終了時の効果は、人なら順番を選べる（CPUは現場の左から、パートナーは最後）
    const here=y=>inArea(p,y)||p.field.includes(y);
    let xs=[...p.field.filter(y=>def(y)&&def(y).endTurn),...areaCards(p).filter(y=>def(y)&&def(y).endTurn&&def(y).partnerToo)];
    if(!p.cpu&&xs.length>1&&typeof orderCards==="function")xs=await orderCards(`${p.name}: ターン終了時の効果の順番`,xs,
      {body:"ターン終了時に発動する効果が複数あります。解決する順にカードをタップしてください（①から先に解決）。もう一度タップで取り消し。",okLabel:"この順番で解決",keepLabel:"表示の順のまま解決"});
    for(const y of xs){const d=def(y);if(d&&d.endTurn&&here(y))await fxIf(p,y,"ターン終了時",()=>d.endTurn(p,y))}},
  // 相手のターンのメインフェイズ開始時: 効果でパートナーエリアに移したキャラ(paRet)を、登場させてもよい。しなければリムーブエリアへ（スコッチ B11084・公安部の潜入捜査官）
  async paReturn(q){for(const x of q.pa.slice()){if(!x.paRet||x.paRet!==G.turnNo||!q.pa.includes(x))continue;x.paRet=0;
      if(await yes(q,C(x).nm,`${C(x).nm} をパートナーエリアから登場させますか？（しないとリムーブエリアへ）`,()=>true)){await enterByEffect(q,x,"a")}
      else{detach(x);resetMods(x);q.rm.push(x);log(`　${q.name} の ${C(x).nm} はリムーブエリアに移った`,"n")}}
    render();await runQueue()},
  async solvedTrigger(p){const d=def(p.caseC);if(d&&d.solvedTrigger){await fxPre(p,p.caseC,"解決編");await d.solvedTrigger(p)}},
  async onLeave(info){ // {x,p,turn,by,effect}。rmLeft: リムーブエリアから離れた（諸伏高明 B05087 など）。setRm: セットされていたイベントがリムーブエリアに置かれた
    if(info.setRm){for(const c of info.setRm){const e=def(c);if(e&&e.setToRm&&info.p.rm.includes(c))await fxIf(info.p,c,"セット",()=>e.setToRm(info.p,c,info))}return}
    if(info.rmLeft){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onRmLeave&&info.p.field.includes(y))await fxIf(info.p,y,"リムーブエリアから離れたとき",()=>e.onRmLeave(info.p,y,info.x))}return}
    const q=opp(info.p);for(const y of q.field.slice()){const e=def(y);if(e&&e.onOppRemoved&&q.field.includes(y))await fxIf(q,y,"相手のキャラがリムーブされたとき",()=>e.onOppRemoved(q,y,info))}
    if(info.turn!==info.p.idx&&idOf(info.x)!=="0968"&&hasTrait(info.x,"大阪府警")&&info.p.field.some(y=>idOf(y)==="0968"&&def(y))){
      log(`　【現場リムーブ時】${C(info.x).nm}（服部平蔵が与えた能力）`,"n");drawN(info.p,1);await discard(info.p,1)}
    if(info.x.leaveDrawT&&info.x.leaveDrawT>=G.turnNo){info.x.leaveDrawT=0;log(`　【現場リムーブ時】${C(info.x).nm}（ジン＆ベルモットが与えた能力）`,"n");drawN(info.p,1)}
    const d=def(info.x);if(!d)return;
    if(d.leaveOppTurn&&info.turn!==info.p.idx){await fxPre(info.p,info.x,"現場リムーブ時");log(`　【現場リムーブ時】${C(info.x).nm}`,"n");await d.leaveOppTurn(info.p,info.x)}
    if(d.selfRemovedOwnTurn&&info.turn===info.p.idx&&info.by===info.p&&info.effect)await fxIf(info.p,info.x,"現場リムーブ時",()=>d.selfRemovedOwnTurn(info.p,info.x))},
  abilities(p,x){const d=def(x);
    let list=[];
    if(p.hand.includes(x))list=(d&&d.handAbilities||[]).map((a,i)=>({...a,key:"hab"+i,hand:true}));
    else{list=(d&&d.abilities||[]).map((a,i)=>({...a,key:"ab"+i})).filter(a=>(x!==p.partner&&!p.pa.includes(x))||a.partner);
      for(const s of x.set||[]){const sd=s.up&&!s.under&&def(s.c);if(sd&&sd.grants)list.push(...sd.grants.map((a,i)=>({...a,key:"g"+idOf(s.c)+i})))}}
    return list.map(a=>({...a,ok:G.turn===p.idx&&!G.contact&&(!a.turn1||!turnCount(x,a.key))&&a.can(p,x)}))},
  async useAbility(p,x,a){if(typeof recAct==="function")recAct(p,"ability:"+a.label,x);if(a.turn1)useTurn(x,a.key);log(`${p.name} の ${C(x).nm} の能力:「${a.label}」`);await fxPre(p,x,"能力",a.label+"\n"+effText(x,"能力"));const r=await resolving(()=>a.run(p,x));render();await runQueue();return r},
  apBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;
    if(G.turn===p.idx&&hasTrait(x,"サッカー選手"))b+=1000*p.field.filter(y=>idOf(y)==="0954").length; // 赤木守
    if(G.turn===p.idx&&idOf(x)==="1061")b+=1000; // 沖田総司 PR290
    if(G.contact&&(G.contact.a===x||G.contact.d===x))b+=2000*(x.set||[]).filter(s=>s.up&&idOf(s.c)==="0019").length; // シャッフルロマンス
    const d=def(x);if(d&&d.apSelf)b+=d.apSelf(p,x)||0;
    for(const s of setEvents(x)){const e=def(s);if(e&&e.setAp)b+=e.setAp(p,x)||0} // setAp: セットされたイベントが与えるAP（せんぷう剣 など）
    for(const q of G.P)for(const y of [...q.field,...areaCards(q)]){const e=def(y);if(e&&e.apAura&&(!inArea(q,y)||e.partnerToo))b+=e.apAura(q,y,x)||0}
    return b},
  keepStun(p){return opp(p).field.some(y=>idOf(y)==="0301"&&partnerIs(opp(p),"白"))}, // 怪盗キッド B03046
  canGuardSleeping:x=>!!(def(x)&&def(x).guardWhileSleeping)||(x.guardT||0)>=G.turnNo,
  // handLevel: 手札のこのカード自身のレベル。handLvAura: 現場のキャラが手札のカードのレベルを増減（鉄刃 B06047）
  handLevel(p,x){const d=def(x);const own=d&&d.handLevel?d.handLevel(p,x):null;let a=0;
    for(const y of p.field){const e=def(y);if(e&&e.handLvAura)a+=e.handLvAura(p,y,x)||0}
    return a?Math.max(0,(own??(C(x).lv||0))+a):own},
  // イベントがキャラにセットされたとき（setEventOn から。鉄刃 B06046・B06047）
  async onSet(p,h,c){const d=def(h);if(d&&d.onSet&&p.field.includes(h))await fxIf(p,h,"セット",()=>d.onSet(p,h,c))},
  eraseEvidence:p=>!!(def(p.caseC)&&def(p.caseC).eraseEvidence)&&partnerIs(p,"黒"),
  eventAi(p,x){const d=def(x);return !!(d&&d.event&&(!d.ai||d.ai(p)))},
  automated:x=>!!def0(x)&&!def0(x).partial,
  noAutoWake:x=>/(^|\n)このキャラはオートフェイズにアクティブにならない。/.test(C(x).f||""),
  entersSleeping:x=>/(^|\n)このキャラはスリープ状態で登場する。/.test(C(x).f||""),
};
window.FX=FX;
