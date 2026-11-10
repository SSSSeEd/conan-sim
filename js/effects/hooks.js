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
// G.fxSrc: 今解決している効果のカード（「自分のMRの能力によって選ばれた」の判定用）
async function withSrc(x,fn){const s0=G.fxSrc;G.fxSrc=x;try{return await fn()}finally{G.fxSrc=s0}}
async function fxIf(p,x,kind,fn0){const fn=()=>withSrc(x,fn0);const n0=G.rec?G.rec.log.length:0;
  if(typeof showFx!=="function"||!G.rec){await resolving(fn,p);return}
  await resolving(fn,p);
  if(G.rec.log.length>n0)await showFx(p,x,kind,effText(x,kind),{after:true})}

// 効果の解決中に起きた「手札から公開したとき」は、今の効果（一番外側）を解決し終えてから発動する（毛利蘭 B09004・B10006 など）
// by: 効果を使っているプレイヤー（G.fxBy）。「相手の能力や効果によって」の判定に使う（removeCard / sleepC / stunC / toDeckBottom など）
async function resolving(fn,by){G.fxD=(G.fxD||0)+1;const pv=G.fxBy;if(by)G.fxBy=by;try{return await fn()}finally{G.fxBy=pv;G.fxD--;if(!G.fxD)await flushReveal()}}
async function flushReveal(){while(G.revealQ&&G.revealQ.length&&!G.over){const r=G.revealQ.shift();await resolving(()=>FX.runReveal(r.p,r.x),r.p)}}
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
    const free=p.galeFree===G.turnNo;if(free)p.galeFree=0; // 風の女神 B09090: このターン次に登場したキャラは【疾風】の条件を無視できる（2番目以降でも発動）
    await FX.enter0(p,x);
    const d=def(x);if((first||free)&&d&&d.gale&&p.field.includes(x)){p.galeFired=G.turnNo;await fxPre(p,x,"疾風");log(`　【疾風】${C(x).nm}`,"n");await resolving(()=>d.gale(p,x),p);render();await runQueue()}
    for(const y of [...p.field,...areaCards(p)]){const e=def(y);if(e&&e.onAllyEnter&&(inArea(p,y)?e.partnerToo:p.field.includes(y)))await fxIf(p,y,"登場",()=>e.onAllyEnter(p,y,x))}
    {const o=opp(p);for(const y of o.field.slice()){const e=def(y);if(e&&e.onOppEnter&&o.field.includes(y)&&p.field.includes(x))await fxIf(o,y,"登場",()=>e.onOppEnter(o,y,x))}} // 相手のキャラが登場したとき（ハチ）
    await runQueue()},
  async enter0(p,x){const d=def(x);if(d&&d.enter){await fxPre(p,x,"登場時");log(`　【登場時】${C(x).nm}`,"n");await resolving(()=>withSrc(x,()=>d.enter(p,x)),p);render();if(d.partial&&/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時")}else if(/【登場時】/.test(C(x).f||""))noteEffect(p,x,"登場時");await runQueue()},
  async event(p,x){const d=def(x);if(d&&d.event){await fxPre(p,x,"イベント");G.evtBy=p;try{await resolving(()=>withSrc(x,()=>d.event(p,x)),p)}finally{G.evtBy=null}render()}else noteEffect(p,x,"イベント");await runQueue();
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onEventUse&&p.field.includes(y))await fxIf(p,y,"イベント使用",()=>e.onEventUse(p,y,x))}await runQueue()},
  disguiseOff(p){const o=opp(p);return o.field.some(y=>{const e=def(y);return e&&e.noOppDisguiseFx&&e.noOppDisguiseFx(o,y)})}, // 京極真 B04034: 相手のキャラの【変装時】は発動しない
  async disguise(p,x,mine){const d=def(x);if(d&&d.disguise&&!FX.disguiseOff(p)){await fxPre(p,x,"変装時");log(`　【変装時】${C(x).nm}`,"n");await resolving(()=>d.disguise(p,x,mine),p)}else if(/【変装時】/.test(C(x).f||""))noteEffect(p,x,"変装時");
    const o=opp(p);for(const y of o.field.slice()){const e=def(y);if(e&&e.onOppDisguise&&o.field.includes(y))await fxIf(o,y,"変装",()=>e.onOppDisguise(o,y,x))} // 相手が【変装】を使用したとき（茶木神太郎）
    for(const q of G.P)for(const y of q.field.slice()){const e=def(y);if(e&&e.onAnyDisguise&&y!==x&&q.field.includes(y))await fxIf(q,y,"変装",()=>e.onAnyDisguise(q,y,x))}}, // このキャラ以外のキャラが【変装】したとき（茶木神太郎 B03058）
  async disguiseReplaced(p,mine,by){const d=def(mine);return !!(d&&d.disguiseReplaced&&await d.disguiseReplaced(p,mine,by))}, // 変装で入れ替わるキャラが、デッキの下の代わりにリムーブされるか
  noRefEv(p){return opp(p).field.some(y=>{const d=def(y);return d&&d.noRefEv})},
  async hirameki(o,e){const d=def(e);if(d&&d.hirameki&&!opp(o).field.some(y=>{const z=def(y);return z&&z.noOppHirameki&&(z.noOppHirameki===true||z.noOppHirameki(opp(o),y))})){await fxPre(o,e,"ヒラメキ");await resolving(()=>d.hirameki(o,e),o);return true}return false},
  async cutin(p,card,mine,own=true){const d=def(card);if(own&&d&&d.cutin)await fxIf(p,card,"カットイン",()=>d.cutin(p,card,mine));
    if(mine&&def(mine)&&def(mine).onCutinInContact&&ownerOf(mine)===p)await fxIf(p,mine,"コンタクト",()=>def(mine).onCutinInContact(p,mine,card));
    if(own&&mine)for(const y of [...p.field,...areaCards(p)]){const e=def(y);if(e&&e.onAllyCutin&&(inArea(p,y)?e.partnerToo:p.field.includes(y)))await fxIf(p,y,"カットイン",()=>e.onAllyCutin(p,y,mine,card))}}, // 自分がカットインを使用したとき（キャンティ＆コルン）
  // 工藤新一 B07003: 現場にいると、手札の【青】のカードは「【カットイン】AP＋1000」を持つ
  grantedCutin:(p,x)=>{if(!p||!p.hand.includes(x))return null;let v=null;
    if(hasColor(x,"青")&&p.field.some(y=>idOf(y)==="0735"))v=1000;
    if(G.turn===p.idx&&isChar(x)&&hasColor(x,"緑")&&hasTrait(x,"YAIBA")&&p.field.some(y=>idOf(y)==="0643"&&def(y)))v=Math.max(v||0,2000); // 佐々木小次郎 B06020
    return v},
  // 妃英理 B05007: このターン、［毛利探偵事務所］のアクション中は相手はカットインできない
  cutinLocked:(tp,atk)=>tp.cutLock===G.turnNo&&tp.field.includes(atk)&&hasTrait(atk,"毛利探偵事務所"),
  noCutin:x=>!!x&&!!G.contact&&(G.contact.a===x||G.contact.d===x)&&(turnCount(x,"noCutin")>0||!!(def(x)&&def(x).noOwnCutin)),
  async onAction(p,actor,target){for(const y of [...p.field,...opp(p).field])y.apA=0;
    if(actor.actDrawT===G.turnNo&&p.field.includes(actor)){log(`　${C(actor).nm}: アクションしたのでカードを1枚引く`,"n");drawN(p,1)} // 少年探偵団の活躍 B02014
    if(actor.fevT===G.turnNo&&!target&&p.field.includes(actor)&&p.hand.length&&await yes(p,C(actor).nm,"手札を1枚リムーブして、ターン終了時までブレットを得ますか？",()=>p.hand.length>=2)){await discard(p,1);giveKw(actor,"ブレット")} // 「行け秀一！その熱病でお前の命が尽きるまで…」
    for(const y of p.field.slice()){const d=def(y);if(d&&d.onAction)await fxIf(p,y,"アクション",()=>d.onAction(p,y,actor,target))}
    if(!target&&p.field.includes(actor))for(const sc of setEvents(actor)){const e=def(sc);if(e&&e.setOnCase)await fxIf(p,actor,"アクション",()=>e.setOnCase(p,actor,sc))} // セットされたイベントが与える「アクション［事件］したとき」（BANG）
    const o=opp(p);for(const y of o.field.slice()){const d=def(y);if(d&&d.onOppAction&&o.field.includes(y))await fxIf(o,y,"アクション",()=>d.onOppAction(o,y,actor,target))}},
  async onCaseGain(p,actor){for(const y of p.field.slice()){const d=def(y);if(d&&d.onCaseGain&&p.field.includes(y))await fxIf(p,y,"証拠を得たとき",()=>d.onCaseGain(p,y,actor))}}, // アクション［事件］で証拠を得たとき（メアリー）
  async onContact(p,ct){
    for(const q of G.P)for(const y of q.field)if(y.contactDrawT===G.turnNo&&(y===ct.a||y===ct.d)){log(`　${C(y).nm}: コンタクトしたのでカードを1枚引き、AP＋1000`,"n");drawN(q,1);y.apC+=1000} // 「真さんガンバッてー♡」
    // セットされたイベントの「コンタクトしたとき」（相手ターン中・漆黒の星 B11050）
    for(const q of G.P)if(q!==p)for(const y of q.field.slice())if((y===ct.a||y===ct.d)&&q.field.includes(y))for(const sc of setEvents(y)){const e=def(sc);
      if(e&&e.setContact&&await e.setContact(q,y,sc,ct))ct.safe=y}
    for(const q of G.P)for(const y of q.field.slice()){const d=def(y);if(d&&d.onContact&&q.field.includes(y))await fxIf(q,y,"コンタクト",()=>d.onContact(q,y,ct))}
    // ［FBI］に与えた「レベル7以下のキャラとコンタクトしたとき、コンタクト中のすべてのキャラをリムーブする」（赤井秀一 B04046）
    const [a,b]=[ct.a,ct.d];if([[a,b],[b,a]].some(([u,v])=>u.kw.includes("相打ち7")&&lvOf(v)<=7&&allChars().includes(u)&&allChars().includes(v))){
      log("　コンタクト中のすべてのキャラをリムーブ","n");for(const y of [a,b])removeCard(y,"効果",{by:ownerOf(a),effect:true});await runQueue()}},
  async onReason(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReason&&p.field.includes(y))await fxIf(p,y,"推理",()=>d.onReason(p,y,x))}
    const o=opp(p);for(const y of o.field.slice()){const d=def(y);if(d&&d.onOppReason&&o.field.includes(y))await fxIf(o,y,"相手の推理",()=>d.onOppReason(o,y,x))} // 羽田秀𠮷 B05080
    await runQueue()},
  // 相手がカットインか変装を使用したとき（白鳥任三郎 B04075）
  async onOppCutDis(q,ct,choice){const o=opp(q);for(const y of o.field.slice()){const d=def(y);if(d&&d.onOppCutDis&&o.field.includes(y))await fxIf(o,y,"カットイン/変装",()=>d.onOppCutDis(o,y,ct,q,choice))}},
  async reasonLp(p,x,lp){const o=opp(p);for(const y of o.field.slice()){const d=def(y);if(d&&d.reasonLp&&o.field.includes(y))await fxIf(o,y,"推理",async()=>{lp=await d.reasonLp(o,y,x,lp)})}return lp},
  async onMisread(o,y){const d=def(y);if(d&&d.onMisread&&o.field.includes(y))await fxIf(o,y,"ミスリード",()=>d.onMisread(o,y));
    const q=opp(o);for(const z of q.field.slice()){const e=def(z);if(e&&e.onOppMisread&&q.field.includes(z))await fxIf(q,z,"相手のミスリード",()=>e.onOppMisread(q,z))}}, // 相手がミスリードしたとき（小嶋元次 B05015） // 円谷光彦 B09016
  async onReveal(p,x){if(G.fxD){(G.revealQ=G.revealQ||[]).push({p,x});return}await resolving(()=>FX.runReveal(p,x))},
  async runReveal(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onReveal&&p.field.includes(y))await fxIf(p,y,"公開",()=>d.onReveal(p,y,x))}},
  lpBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;const d=def(x);return d&&d.lpSelf?d.lpSelf(p,x)||0:0},
  kwExtra(x,p){if(!p||!p.field.includes(x))return [];const d=def(x);const out=d&&d.kwSelf?[...d.kwSelf(p,x)]:[];
    for(const s of setEvents(x)){const e=def(s);if(e&&e.setKw)out.push(...e.setKw(p,x))}return out}, // setKw: セットされたイベントが与えるキーワード
  async onHintUse(p,x){for(const y of p.field.slice()){const d=def(y);if(d&&d.onHintUse&&p.field.includes(y))await fxIf(p,y,"ネクストヒント",()=>d.onHintUse(p,y,x))}
    const pd=def(p.partner);if(pd&&pd.onHintUse&&p.pLoc==="area")await fxIf(p,p.partner,"ネクストヒント",()=>pd.onHintUse(p,p.partner,x))},
  useBlock(p,x){if(p.banNm&&p.banNm.t===G.turnNo&&C(x).nm.includes(p.banNm.nm))return `このターンは［${p.banNm.nm}］を使用できない`;
    if(p.noEvT===G.turnNo&&C(x).t==="イベント")return "このターンはイベントを使用できない"; // 「朝日射し夕日輝く鉄の瓶…」
    const cd=def(p.caseC);if(cd&&cd.handBlock&&C(x).t==="キャラ"){const r=cd.handBlock(p,x);if(r)return r} // 事件が課す「手札から使用できない」（集められた名探偵 など）
   const d=def(x);return d&&d.useBlock?d.useBlock(p,x):null},
  lvBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;const d=def(x);if(d&&d.lvSelf)b+=d.lvSelf(p,x)||0;
    for(const q of G.P)for(const y of q.field){const d=def(y);if(d&&d.lvAura)b+=d.lvAura(q,y,x)||0}return b},
  async onGuarded(p,actor,guard,target){actor.guardedT=G.turnNo;const d=def(actor); // アクションがガードされた（京極真 B09041）
    if(d&&d.onGuarded&&p.field.includes(actor))await fxIf(p,actor,"ガードされたとき",()=>d.onGuarded(p,actor,guard))
    const o=opp(p);for(const y of o.field.slice()){const e=def(y);if(e&&e.onAllyGuard&&o.field.includes(y))await fxIf(o,y,"ガード",()=>e.onAllyGuard(o,y,guard,target))}}, // 自分のキャラがガードしたとき（千葉和伸 B04073）。target=指定されていたキャラ（事件なら null）
  // 自分のキャラが推理したとき、証拠を得る代わりの効果（時津潤哉 B03038）。真なら、この推理では証拠を得ない
  async reasonNoEv(p,x,lp){for(const y of p.field.slice()){const d=def(y);if(d&&d.reasonNoEv&&p.field.includes(y)&&await resolving(()=>d.reasonNoEv(p,y,x,lp),p))return true}return false},
  // 自分のメインフェイズ開始時（沖矢昴 B05072・勝又力 B05075）
  async mainStart(p){if(!G||G.over)return;for(const y of p.field.slice()){const d=def(y);if(d&&d.mainStart&&p.field.includes(y))await fxIf(p,y,"メインフェイズ開始時",()=>d.mainStart(p,y))}render();await runQueue()},
  async actionEnd(p,actor){actor.apA=0;for(const y of opp(p).field)y.cSafe=false;const d=def(actor);if(d&&d.actionEnd&&p.field.includes(actor))await fxIf(p,actor,"アクション終了時",()=>d.actionEnd(p,actor));await runQueue()},
  async contactWin(p,winner,victim){if(winner.kw.includes("勝利ドロー")&&p.field.includes(winner))drawN(p,1);
    if(winner.kw.includes("勝利ドロー1")&&p.field.includes(winner)&&!turnCount(winner,"cwd1")){useTurn(winner,"cwd1");log(`　${C(winner).nm}（鈴木園子が与えた能力）`,"n");drawN(p,1)} // 鈴木園子 B07063 // 工藤新一NYの事件 B10100P が与えた「コンタクトでリムーブしたとき1枚引く」
    if(winner.cwLook===G.turnNo&&!turnCount(winner,"cwLook")&&p.field.includes(winner)){useTurn(winner,"cwLook"); // 狙われた唇 B10101 が与えた「相手のキャラをコンタクトでリムーブしたとき、上から4枚見て〚突撃〛のキャラを手札に」
      log(`　${C(winner).nm}（狙われた唇が与えた能力）`,"n");await lookTop(p,4,y=>isChar(y)&&/〚突撃〛/.test(C(y).f||""),{max:1,title:"手札に加える〚突撃〛を持つキャラ"})}
    const d=def(winner);if(d&&d.contactWin&&p.field.includes(winner))await fxIf(p,winner,"コンタクト",()=>d.contactWin(p,winner,victim));
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onAllyContactWin&&p.field.includes(y))await fxIf(p,y,"コンタクト",()=>e.onAllyContactWin(p,y,winner,victim))}},
  async endTurn(p){for(const y of p.field.filter(y=>y.kw.includes("終了時デッキの下")))toDeckBottom(y); // 目暮十三 PR181 が与えた能力
    for(const y of p.field.filter(y=>y.kw.includes("終了時リムーブ")))removeCard(y,"効果",{by:p,effect:true}); // 黒田兵衛 B03089 が与えた能力
    for(const y of p.field.filter(y=>y.kw.includes("終了時手札")))toHandFromField(y); // 園子のアブない夏物語 が与えた能力
    for(const y of p.field.filter(y=>y.kw.includes("終了時証拠")))charToEvidence(y); // 鬼丸猛 B06018 が与えた能力
    // 宣言した能力が予約した「ターン終了時、…」（沖矢昴＆世良真純 B06074）。カードが現場を離れていても発動する
    if(p.endQ){const due=p.endQ.filter(e=>e.t===G.turnNo);p.endQ=p.endQ.filter(e=>e.t>G.turnNo);for(const e of due){log(`　ターン終了時（${e.label}）`,"n");await e.fn()}}
    await runQueue();
    // 同時に発動するターン終了時の効果は、人なら順番を選べる（CPUは現場の左から、パートナーは最後）
    const here=y=>inArea(p,y)||p.field.includes(y);
    let xs=[...p.field.filter(y=>def(y)&&def(y).endTurn),...areaCards(p).filter(y=>def(y)&&def(y).endTurn&&def(y).partnerToo)];
    if(!p.cpu&&xs.length>1&&typeof orderCards==="function")xs=await orderCards(`${p.name}: ターン終了時の効果の順番`,xs,
      {body:"ターン終了時に発動する効果が複数あります。解決する順にカードをタップしてください（①から先に解決）。もう一度タップで取り消し。",okLabel:"この順番で解決",keepLabel:"表示の順のまま解決"});
    for(const y of xs){const d=def(y);if(d&&d.endTurn&&here(y))await fxIf(p,y,"ターン終了時",()=>d.endTurn(p,y))}
    const q=opp(p);for(const y of q.field.slice()){const d=def(y);if(d&&d.oppEndTurn&&q.field.includes(y))await fxIf(q,y,"ターン終了時",()=>d.oppEndTurn(q,y))}await runQueue();
    // セットされたイベントの「ターン終了時」（setEndTurn(持ち主,セット先,イベント,自分のターンか)。トランプ銃・石川五右衛門人形）
    for(const r of [p,q])for(const y of r.field.slice())for(const sc of setEvents(y)){const e=def(sc);if(e&&e.setEndTurn&&r.field.includes(y)&&setEvents(y).includes(sc))await fxIf(r,y,"ターン終了時",()=>e.setEndTurn(r,y,sc,r===p))}
    await runQueue()}, // 相手のターン終了時（ルパン）
  ignoreCaseColor:(c,p,viaHint)=>c.i==="1206"&&condOk("事件黒",p)===true||c.i==="0693"&&condOk("事件YAIBA",p)===true
    ||c.i==="0375"||c.i==="0248"&&!!viaHint||c.i==="1107"&&p&&C(p.caseC).nm.includes("工藤新一NYの事件"), // 犯人 B03126・キール B02087（ネクストヒントのとき）・ラディッシュ B10047 // シャロン・ヴィンヤード B11040【事件黒】・かぐや B06072【事件YAIBA】: 手札から使用するとき事件の色を無視
  // 相手のターンのメインフェイズ開始時: 効果でパートナーエリアに移したキャラ(paRet)を、登場させてもよい。しなければリムーブエリアへ（スコッチ B11084・公安部の潜入捜査官）
  async paReturn(q){for(const x of q.pa.slice()){if(!x.paRet||x.paRet!==G.turnNo||!q.pa.includes(x))continue;x.paRet=0;
      if(await yes(q,C(x).nm,`${C(x).nm} をパートナーエリアから登場させますか？（しないとリムーブエリアへ）`,()=>true)){await enterByEffect(q,x,"a")}
      else{detach(x);resetMods(x);q.rm.push(x);log(`　${q.name} の ${C(x).nm} はリムーブエリアに移った`,"n")}}
    render();await runQueue()},
  async solvedTrigger(p){const d=def(p.caseC);if(d&&d.solvedTrigger){await fxPre(p,p.caseC,"解決編");await resolving(()=>d.solvedTrigger(p),p)}},
  async onLeave(info){ // {x,p,turn,by,effect}。rmLeft: リムーブエリアから離れた（諸伏高明 B05087 など）。setRm: セットされていたイベントがリムーブエリアに置かれた
    if(info.leftSets){for(const c of info.leftSets){const e=DEF[idOf(c)];if(e&&e.setLeave)await fxIf(info.p,c,"セット",()=>e.setLeave(info.p,info.x,c,info))}return} // セットされたイベントが与えた「現場から離れたとき」（コンコン など）
    if(info.setRm){for(const c of info.setRm){const e=def(c);if(e&&e.setToRm&&info.p.rm.includes(c))await fxIf(info.p,c,"セット",()=>e.setToRm(info.p,c,info))}return}
    // セットのトリガー: onSetOn(p,x,n)=このキャラにカードがセットされるたび／onSetOff(p,y,info)=自分の現場のキャラにセットされていたカードが現場から離れるたび（info.down=裏向き）
    if(info.setOn){const e=def(info.x);if(e&&e.onSetOn&&info.p.field.includes(info.x))await fxIf(info.p,info.x,"セット",()=>e.onSetOn(info.p,info.x,info.n));return}
    if(info.setOff){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onSetOff&&info.p.field.includes(y))await fxIf(info.p,y,"セットされたカードが離れたとき",()=>e.onSetOff(info.p,y,info))}
      {const q=opp(info.p);for(const y of q.field.slice()){const e=def(y);if(e&&e.onOppSetOff&&q.field.includes(y))await fxIf(q,y,"相手のセットが離れたとき",()=>e.onOppSetOff(q,y,info))}}return} // onOppSetOff: 相手の現場のキャラにセットされていたカードが離れたとき（大岡紅葉 B02020）
    if(info.fileHand){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onFileHand&&info.p.field.includes(y))await fxIf(info.p,y,"FILEから手札に加えたとき",()=>e.onFileHand(info.p,y))}return}
    if(info.slept){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onAllySleep&&info.p.field.includes(y))await fxIf(info.p,y,"スリープ状態になったとき",()=>e.onAllySleep(info.p,y,info.x))}return} // 自分のキャラがアクティブからスリープ状態になったとき（阿笠博士 B03008）
    if(info.rmLeft){for(const y of info.p.field.slice()){const e=def(y);if(e&&e.onRmLeave&&info.p.field.includes(y))await fxIf(info.p,y,"リムーブエリアから離れたとき",()=>e.onRmLeave(info.p,y,info.x))}return}
    // 自分の現場のキャラがリムーブされたとき（白馬探 B05059。リムーブされたキャラ自身の onAllyRemoved も呼ぶ）。info.st=リムーブ直前の状態
    for(const y of [...info.p.field.slice(),info.x]){const e=def(y);if(e&&e.onAllyRemoved&&(y===info.x||info.p.field.includes(y)))await fxIf(info.p,y,"現場リムーブ時",()=>e.onAllyRemoved(info.p,y,info))}
    const q=opp(info.p);for(const y of q.field.slice()){const e=def(y);if(e&&e.onOppRemoved&&q.field.includes(y))await fxIf(q,y,"相手のキャラがリムーブされたとき",()=>e.onOppRemoved(q,y,info))}
    if(info.turn!==info.p.idx&&idOf(info.x)!=="0968"&&hasTrait(info.x,"大阪府警")&&info.p.field.some(y=>idOf(y)==="0968"&&def(y))){
      log(`　【現場リムーブ時】${C(info.x).nm}（服部平蔵が与えた能力）`,"n");drawN(info.p,1);await discard(info.p,1)}
    if(info.x.leaveDrawT&&info.x.leaveDrawT>=G.turnNo){info.x.leaveDrawT=0;log(`　【現場リムーブ時】${C(info.x).nm}（ジン＆ベルモットが与えた能力）`,"n");drawN(info.p,1)}
    const d=def(info.x);if(!d)return;
    // 白馬探 B10039:【解決編】【自分ターン中】相手のキャラがコンタクトによってリムーブされた場合、そのキャラの【現場リムーブ時】は発動しない
    const supp=info.why==="コンタクト"&&q.solved&&G.turn===q.idx&&q.field.some(y=>def(y)&&def(y).noLeaveOnContact);
    if(d.leaveAny&&!supp)await fxIf(info.p,info.x,"現場リムーブ時",()=>d.leaveAny(info.p,info.x,info));
    if(d.leaveOppTurn&&info.turn!==info.p.idx&&!supp){await fxPre(info.p,info.x,"現場リムーブ時");log(`　【現場リムーブ時】${C(info.x).nm}`,"n");await resolving(()=>d.leaveOppTurn(info.p,info.x),info.p)}
    if(d.selfRemovedOwnTurn&&info.turn===info.p.idx&&info.by===info.p&&info.effect)await fxIf(info.p,info.x,"現場リムーブ時",()=>d.selfRemovedOwnTurn(info.p,info.x))},
  abilities(p,x){const d=def(x);
    let list=[];
    if(G&&(p.ev.includes(x)||(p.file.includes(x)&&x!==p.partner)))list=((p.ev.includes(x)?x.up:x.fu)&&d&&d.zoneAbilities||[]).map((a,i)=>({...a,key:"zab"+i,zone:true})); // 表向きで証拠エリアやFILEエリアにあるときも宣言できる（犯人 B10094）
    else if(p.hand.includes(x))list=(d&&d.handAbilities||[]).map((a,i)=>({...a,key:"hab"+i,hand:true}));
    else{list=(d&&d.abilities||[]).map((a,i)=>({...a,key:"ab"+i})).filter(a=>(x!==p.partner&&!p.pa.includes(x))||a.partner);
      for(const s of x.set||[]){const sd=s.up&&!s.under&&def(s.c);if(sd&&sd.grants)list.push(...sd.grants.map((a,i)=>({...a,key:"g"+idOf(s.c)+i})))}
      if(p.field.includes(x))for(const t of x.tmpAb||[])if(t.t===G.turnNo&&DEF[t.id]&&DEF[t.id].tmpGrants)list.push(...DEF[t.id].tmpGrants.map((a,i)=>({...a,key:"t"+t.id+i})))}
    const base=list.map(a=>({...a,ok:G.turn===p.idx&&!G.contact&&(!a.turn1||!turnCount(x,a.key))&&(!a.turn2||turnCount(x,a.key)<2)&&a.can(p,x)}));
    return base.concat(FX.costSubs(p,x,base))},
  // コスト代替（楠川探偵 B05033: 現場のこのキャラをリムーブすることで、［探偵］は【宣言】のコスト（【スリープ】を含む）を支払わずに宣言できる）。
  // コストが「スリープ」だけの能力（label が「スリープ:」で始まる）は sleepCost を飛ばして run する。それ以外は freeRun(p,x)（コストを払わない版）を持つ能力だけ。
  // 提供側の DEF は costSub:(p,provider,user)=>真偽 を持つ。代替版は通常の能力が使えないときだけ CPU が選ぶ
  costSubs(p,x,base){if(!p.field.includes(x)||!G||G.turn!==p.idx)return [];
    const ks=p.field.filter(k=>k!==x&&def(k)&&def(k).costSub&&def(k).costSub(p,k,x));if(!ks.length)return [];
    const out=[];
    for(const a of base){if(a.hand||a.sub===false)continue;
      const sleepOnly=/^スリープ[:：]/.test(a.label);if(!sleepOnly&&!a.freeRun)continue;
      const canFree=()=>{if(a.freeCan)return a.freeCan(p,x);if(!sleepOnly)return a.can(p,x);const st=x.st;if(st==="s")x.st="a";try{return a.can(p,x)}finally{x.st=st}};
      const ok=G.turn===p.idx&&!G.contact&&(!a.turn1||!turnCount(x,a.key))&&(!a.turn2||turnCount(x,a.key)<2)&&canFree();
      for(const k of ks)out.push({...a,key:a.key,label:`${C(k).nm}をリムーブして宣言（コストなし）: ${a.label.replace(/^[^:：]*[:：]\s*/,"")}`,ok,alt:true,
        aiCan:(p2,x2)=>!a.ok&&(!a.aiCan||a.aiCan(p2,x2)),
        run:async(p2,x2)=>{if(!p2.field.includes(k))return false;removeCard(k,"コスト（コストの代わり）",{by:p2});await runQueue();
          G.costFree={x:x2};try{return a.freeRun?await a.freeRun(p2,x2):await a.run(p2,x2)}finally{G.costFree=null}}})}
    return out},
  async useAbility(p,x,a){if(typeof recAct==="function")recAct(p,"ability:"+a.label,x);if(a.turn1||a.turn2)useTurn(x,a.key);log(`${p.name} の ${C(x).nm} の能力:「${a.label}」`);await fxPre(p,x,"能力",a.label+"\n"+effText(x,"能力"));const r=await resolving(()=>withSrc(x,()=>a.run(p,x)),p);render();await runQueue();
    for(const y of p.field.slice()){const e=def(y);if(e&&e.onAllyDeclare&&p.field.includes(y))await fxIf(p,y,"能力",()=>e.onAllyDeclare(p,y,x,a))} // 自分のキャラが【宣言】能力を使用したとき（江戸川コナン B03002）
    await runQueue();return r},
  apBonus(x){const p=G&&ownerOf(x);if(!p||!p.field.includes(x))return 0;let b=0;
    if(G.turn===p.idx&&hasTrait(x,"サッカー選手"))b+=1000*p.field.filter(y=>idOf(y)==="0954").length; // 赤木守
    if(G.turn===p.idx&&idOf(x)==="1061")b+=1000; // 沖田総司 PR290
    if(G.contact&&(G.contact.a===x||G.contact.d===x))b+=2000*(x.set||[]).filter(s=>s.up&&idOf(s.c)==="0019").length; // シャッフルロマンス
    const d=def(x);if(d&&d.apSelf)b+=d.apSelf(p,x)||0;
    for(const s of setEvents(x)){const e=def(s);if(e&&e.setAp)b+=e.setAp(p,x)||0} // setAp: セットされたイベントが与えるAP（せんぷう剣 など）
    for(const q of G.P)for(const y of [...q.field,...areaCards(q)]){const e=def(y);if(e&&e.apAura&&(!inArea(q,y)||e.partnerToo))b+=e.apAura(q,y,x)||0}
    return b},
  keepStun(p){return opp(p).field.some(y=>idOf(y)==="0301"&&partnerIs(opp(p),"白"))}, // 怪盗キッド B03046
  canGuardSleeping:x=>!!(def(x)&&def(x).guardWhileSleeping&&(def(x).guardWhileSleeping===true||def(x).guardWhileSleeping(ownerOf(x),x)))||(x.guardT||0)>=G.turnNo,
  // handLevel: 手札のこのカード自身のレベル。handLvAura: 現場のキャラが手札のカードのレベルを増減（鉄刃 B06047）
  handLevel(p,x){const d=def(x);const own=d&&d.handLevel?d.handLevel(p,x):null;let a=0;
    for(const y of p.field){const e=def(y);if(e&&e.handLvAura)a+=e.handLvAura(p,y,x)||0}
    return a?Math.max(0,(own??(C(x).lv||0))+a):own},
  // イベントがキャラにセットされたとき（setEventOn から。鉄刃 B06046・B06047）
  async onSet(p,h,c){const d=def(h);if(d&&d.onSet&&p.field.includes(h))await fxIf(p,h,"セット",()=>d.onSet(p,h,c))},
  noSolve:p=>!!(def(p.caseC)&&def(p.caseC).noSolve), // 犯人たちの犯行: 自分は【事件解決】できない
  eraseEvidence:p=>!!(def(p.caseC)&&def(p.caseC).eraseEvidence)&&partnerIs(p,"黒"),
  eventAi(p,x){const d=def(x);return !!(d&&d.event&&(!d.ai||d.ai(p)))},
  automated:x=>!!def0(x)&&!def0(x).partial,
  noAutoWake:x=>/(^|\n)このキャラはオートフェイズにアクティブにならない。/.test(C(x).f||"")||!!(x.lockBy&&allChars().includes(x.lockBy)&&def(x.lockBy)), // 榎本梓 B01082 が選んだキャラ
  entersSleeping:x=>/(^|\n)このキャラはスリープ状態で登場する。/.test(C(x).f||""),
};
Object.assign(FX,MECH_FX);window.FX=FX;
