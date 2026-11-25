"use strict";
// ================= CPU =================
// 全体の設計: notes/cpu-architecture-plan-2026-11-24.md（プロジェクト共有フォルダ）。
//   探索（search.js）が「出すカード・ヒント・能力・突撃の動かし方」の案を選び、cpuTurn がその案を段階ごとに実行する。
//   cpuTurn の段階: 案を決める → 宣言能力（先に使う案のとき）→ 事件解決 → 勝ち切りの判定 → 手札（アシスト・使う・ヒント）→ 宣言能力
//                   → 守りの判定 → 突撃・迅速 → ミスリードを先に使わせる → キャラへのアクション → 事件アクション/推理 → パートナー
// 実験の歴史（勝率）は notes/cpu-flag-history-2026-11-24.md。2026-11-24 に、不採用の実験（cut, reason, mull2, play2, rsnw, end2, guard2, cut2,
//   combo, early6, mid, lose, def2, annoy）を削除し、定着したもの（sit2, tgt2, case2, act2, hint, assist系, hold9, rushb, ab2, fileplan）はスイッチを外して普通のコードにした。
// 切り替えられるのは AI_SWITCH のスイッチだけ（守り・勝ち切りの発動条件。探索に構えを入れる段階で見直す）。
//   既定はすべてオン。席ごとに切るときは cfg.aiOff[席] に名前を入れる（tools/bench.js の -名前）。新しい実験は AI_OFF0 に入れて既定オフで足す（bench の +名前）
const AI_SWITCH=["fin2","threat2","resist","wary","combo2","multi","asst3","order","asst4","fair","stance","keep2","disg"]; // multi: 探索で案ごとに3回試して平均（search.js の rolloutN）
const AI_OFF0=["strat","strat2","eval2","eval3","val2","val3","ci2","deck","deckL"]; // 既定オフの実験: strat・strat2（配り直しの場合分け、48.1%・50.0%）、eval2（評価に次の手番の勝ち負け、50.4%）、eval3（終盤の証拠を高く、keep2と合わせて50.2%）
// asst3（既定オン 11/24）: 序盤の無駄なアシストを減らす。bench 4000戦 53.3%（51.9〜54.7）
// fair・stance・keep2（既定オン 11/25）: 探索で後から足して試す案（行動順・構え・ガード役なし）を突撃の加点込みで比べる（fair）と、
//   構えとガード役なしが選ばれるようになった。bench（各1602戦で打ち切り）: fair だけ 53.4%（51.9〜54.8）、fair＋stance 55.7%（54.1〜57.4）、
//   fair＋keep2 53.9%（52.3〜55.4）、3つとも 55.7%（54.1〜57.4）。keep2 は勝率の差は無いが SeEd の感覚（ガード役は必須ではない）に近いので採用
// asst4（既定オン 11/24）: 手札の枚数（手札過多）ではアシストしない。出せるカードが増えるとき・解決編に入るときだけ。bench 2000戦: asst4なしのCPUが 49.4%（48.4〜50.4）＝勝率は変わらず、人間に近いので採用
// disg（既定オン 11/25）: 負けるコンタクトを変装で返す。bench（1602戦で打ち切り）52.2%（51.1〜53.3）。変装は1戦平均0.18回（変装札のあるデッキは16中8）、そのぶんカットインが1.06→0.97回に減った
// order（既定オン 11/24）: アクションを手札より先にする順も探索で試す。4000戦 50.8%（49.5〜52.1、差なし）。SeEdの要望で採用
const ai2=(p,f)=>!((window.AI_OFF||AI_OFF0).includes(f))&&!(G&&G.cfg.aiOff&&(G.cfg.aiOff[p.idx]||[]).includes(f));
const strongChar=x=>{const c=C(x);return c&&c.t==="キャラ"&&(c.lv||0)>=6&&!!(c.f||"").trim()};

// ---- 相手の手番に決めること: ガード ----
// 価値の低いキャラでガードする。守るかはカードの強さと手札で決める（Lv8以上は必ず守り、Lv5以下は手札があれば守らない）
function cpuGuard(o,atk,target,guards){
  const A=apOf(atk);
  const strong=guards.filter(g=>apOf(g)>A).sort((a,b)=>(C(a).lv||0)-(C(b).lv||0)||apOf(a)-apOf(b));
  if(target!=="case"&&apOf(target)<=A){const lv=C(target).lv||0;
    if(lv<=5&&target!==o.partner&&o.hand.length>0)return null;if(lv>=8)return strong[0]||null}
  if(target==="case")return strong[0]||null;
  if(apOf(target)>A)return null; // 対象が勝てるならガード不要
  return strong[0]||null;
}
// ---- コンタクト: カットイン ----
// コンボ探し（search.js の explore）のときは、カットインを切る／切らないを試しに変える
function cpuContact(q,mine,theirs,cuts,tp,dis=[]){
  if(!ai2(q,"disg"))dis=[];
  const d=cpuContact0(q,mine,theirs,cuts,tp,dis);
  if(!(G.sim&&G.sim.explore))return d;
  const opts=[null,...cuts.filter(x=>cutinAp(x,q)!=null||FX.has(x,"cutin")).map(x=>({x,how:"cut"})),...dis.map(x=>({x,how:"dis"}))];
  const i=explore(q,"カットイン",opts,Math.max(0,opts.findIndex(o=>o?d&&o.x===d.x&&o.how===d.how:!d)),o=>o?`${o.how==="dis"?"変装 ":""}${C(o.x).nm}(${o.x.n})→${C(mine).nm}(${mine.n})・${q===tp?"自分":"相手"}ターン`:`切らない（${C(mine).nm}(${mine.n})）`);
  return opts[i]||null;
}
// ---- コンタクト: 変装（disg） ----
// 変装したら x のAPがいくつになるか。mine の修整（AP＋・状態）を引き継ぐので、盤面で一瞬入れ替えて apOf を測り、すぐ戻す（同期処理なので他に影響しない）。
// 【変装時】の「このコンタクト中、このキャラをAP＋N」と「キャラをAP－N」（相手のコンタクト中のキャラに使う）は文面から足す
function disguiseAp(q,mine,x){
  const fi=q.field.indexOf(mine);if(fi<0)return null;
  const keys=["st","apM","apT","apC","lpM","lpT","kw","fresh"],save={};for(const k of keys)save[k]=x[k];
  const ct=G.contact,side=ct&&(ct.a===mine?"a":ct.d===mine?"d":null);
  Object.assign(x,{st:mine.st,apM:mine.apM,apT:mine.apT,apC:mine.apC,lpM:mine.lpM,lpT:mine.lpT,kw:mine.kw.slice(),fresh:mine.fresh});
  q.field[fi]=x;if(side)ct[side]=x;
  let v;try{v=apOf(x)}finally{q.field[fi]=mine;if(side)ct[side]=mine;Object.assign(x,save)}
  const f=C(x).f||"";
  if(!FX.disguiseOff(q)){
    const up=f.match(/【変装時】[^【]*このコンタクト中、このキャラをAP[＋+](\d+)/);if(up)v+=+up[1];
    const dn=f.match(/【変装時】キャラを1枚まで選び、ターン終了時までAP[－-](\d+)/);if(dn)v+=+dn[1]}
  return v}
// 負けるコンタクトで、変装すれば勝てる（守る側は相手のAPを上回る）なら変装する。
// カットインでも勝てるときは、変装先のレベルが今のキャラ以上（入れ替えて得をする）なら変装、そうでなければカットインを残す
function cpuDisguise(q,mine,theirs,tp,dis){
  const T=apOf(theirs);
  const c=dis.map(x=>({x,v:disguiseAp(q,mine,x)})).filter(o=>o.v!=null&&(q===tp?o.v>=T:o.v>T));
  if(!c.length)return null;
  c.sort((a,b)=>(lvOf(a.x)-lvOf(b.x))||(a.v-b.v)); // いちばん小さい（失って惜しくない）変装札から
  return c[0].x}
function cpuContact0(q,mine,theirs,cuts,tp,dis=[]){
  const need=q===tp?apOf(theirs)-apOf(mine):apOf(theirs)-apOf(mine)+1; // 攻撃側は同値で勝ち
  // コンボ: スコッチ B10086 のコンタクト中にバーボンのカットイン → スコッチが起きて、もう一度アクションできる
  if(q===tp&&idOf(mine)==="1141"&&partnerIs(q,"黒")&&!turnCount(mine,"scotch")){
    const o=opp(q),bb=cuts.filter(x=>C(x).nm.includes("バーボン")&&cutinAp(x,q)!=null&&cutinAp(x,q)>=need).sort((a,b)=>cutinAp(a,q)-cutinAp(b,q))[0];
    const next=o.field.some(y=>y!==theirs&&y.st!=="a"&&apOf(y)<=apOf(mine))||o.ev.length>0;
    if(bb&&next)return {x:bb,how:"cut"}}
  if(need<=0)return null;
  // ジン B01098: 自分のターンに負けそうなら、自分よりレベルの高い相手のキャラと相打ちにする
  if(q===tp){const gin=cuts.find(x=>idOf(x)==="0086");if(gin&&lvOf(theirs)>=Math.max(6,lvOf(mine)))return {x:gin,how:"cut"}}
  // 負けるときだけ、APが足りる中でいちばん小さいカットインを切る
  // ci2: AP以外の効果で相手のコンタクト中のキャラをリムーブできるカットイン（元太・光彦 B11008/B11009 など、DEF の ciKill）。
  //   負けるコンタクトでも相手のキャラを取れて1枚引けるので、AP＋のカットインより先に使う
  if(ai2(q,"ci2")){const k=cuts.find(x=>{const e=def(x);return e&&e.ciKill&&e.ciKill(q,theirs)});if(k)return {x:k,how:"cut"}}
  const c=cuts.map(x=>({x,v:cutinAp(x,q)})).filter(o=>o.v!=null&&o.v>=need).sort((a,b)=>a.v-b.v);
  const dg=dis.length?cpuDisguise(q,mine,theirs,tp,dis):null;
  if(dg&&(!c.length||lvOf(dg)>=lvOf(mine)))return {x:dg,how:"dis"};
  if(c.length)return {x:c[0].x,how:"cut"};
  return null;
}

// コンボ表（js/combo_table.js）: 手番のはじめに、parts がそろっていて行動が使えるコンボを1つ返す（表の先頭に近いものほど優先）
function comboNow(p){
  for(const e of COMBO2){
    if(!e.parts.every(pt=>(pt.where==="手札"?p.hand:p.field).some(x=>x.n===pt.n)))continue;
    if(e.act.kind==="hand"){const x=p.hand.find(x=>x.n===e.act.n);if(x&&!playableReason(p,x,false))return {e,x}}
    else{const x=p.field.find(x=>x.n===e.act.n);const ab=x&&FX.abilities(p,x).find(a=>a.label===e.act.label);if(ab&&ab.ok)return {e,x,ab}}}
  return null}

// ---- 盤面の見積り（純粋な関数。盤面を変えない） ----
const misreadOf=q=>q.field.reduce((a,y)=>a+(y.st==="a"?(staticKw(y,q).misread||0):0),0); // q のアクティブなミスリードの合計
// 脅威の見積り（threat2）: 相手 o が次の手番で増やせる証拠の最大量と、その手番で勝てるか。
// 従来の oppPot は「いまアクティブなキャラのLP」だけだった。実際は、①スリープ中のキャラも相手の手番の始めに起き上がる（スタン状態は起きない）
// ②FILEにいるパートナーも手番の始めに戻る ③キャラは推理の代わりに事件アクション（自分の証拠がある限り＋1）もできる ④手札の登場時「証拠を得る」効果、を数える。
// 設計: notes/cpu-defense-design-2026-11-23.md
function threatNext(me,o){
  const parts=[];let g=0;
  const add=(y,nm)=>{const v=Math.max(lpOf(y),me.ev.length>0?1:0);if(v>0){g+=v;parts.push(nm+"+"+v)}};
  for(const y of o.field)if(y.st!=="x")add(y,C(y).nm);
  if(o.partner&&o.partner.st!=="x"&&(o.pLoc==="area"||o.pLoc==="file"))add(o.partner,"パートナー");
  const fileNext=o.file.length+2; // 手番の始めのオートフェイズでFILEに2枚
  const ent=o.hand.filter(x=>C(x).t==="キャラ"&&(C(x).lv||0)<=fileNext+1).map(x=>{const m=/【登場時】[^\n]*証拠を(\d)つ得/.exec(C(x).f||"");return m?+m[1]:0}).filter(v=>v>0).sort((a,b)=>b-a).slice(0,2);
  for(const v of ent){g+=v;parts.push("登場時+"+v)}
  const guards=me.field.filter(y=>y.st==="a").length;
  const mis=misreadOf(me);
  const gMin=Math.max(0,g-guards-mis);
  const near=o.solved||fileNext>=7;
  return {gainMax:g,gainMin:gMin,need:o.ev.length+g-o.level+1,lethal:near&&o.ev.length+g>=o.level,lethalMin:near&&o.ev.length+gMin>=o.level,parts};
}
// 勝ち切り（fin2）の判定。SeEd: 推理すれば勝ちなのにアクションして勝ち筋を消している場面がある。迅速はほぼ証拠1枚。
// 解決編でパートナーがアクティブで、今の現場の推理（LPの合計。相手のミスリード分を引く）と、手札の迅速キャラ1枚の推理で、事件レベルに届くなら on。
// 届くには迅速キャラを先に出す必要があれば swift にそのカード
function finishCheck(p,o){
  const fin={on:false,swift:null};
  if(!(ai2(p,"fin2")&&p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&!FX.noSolve(p)&&p.ev.length<p.level))return fin;
  const need=p.level-p.ev.length;
  const mis=misreadOf(o);
  const rs=p.field.filter(x=>x!==p.partner&&canAct(x,p,"reason")).reduce((a,x)=>a+lpOf(x),0);
  if(rs-mis>=need)fin.on=true;
  else{const sw=p.hand.filter(x=>C(x).t==="キャラ"&&/〚迅速〛/.test(C(x).f||"")&&!playableReason(p,x,false)&&p.field.length<fieldMax(p)).sort((a,b)=>(C(b).lp||0)-(C(a).lp||0))[0];
    if(sw&&rs+(C(sw).lp||0)-mis>=need){fin.on=true;fin.swift=sw}}
  if(fin.on&&!G.sim)dl("fin",{who:p.idx,need,swift:fin.swift?C(fin.swift).nm:"",mis});
  return fin}
// 守りに入るか（抵抗 resist）。相手が事件を解決編にしていて次の手番に勝ちそうなら、キャラへのアクションをやめて全員で相手の事件にアクションし、証拠を減らす。
// threat2 がオンなら、防御（ガード役・ミスリード）で減らしても相手が勝てるときだけ（最大値で判定すると終盤は常に危険になり、攻めが止まった）
function defenseCheck(p,o){
  const oppPot=o.field.reduce((a,y)=>a+(y.st==="a"?lpOf(y):0),0)+(o.pLoc==="area"&&o.partner.st==="a"?lpOf(o.partner):0); // 従来の見積り（wary で threat2 がオフのとき）
  const thr=ai2(p,"threat2")?threatNext(p,o):null;
  if(thr&&!G.sim)dl("threat",{who:p.idx,gainMax:thr.gainMax,gainMin:thr.gainMin,need:thr.need,lethal:thr.lethal,parts:thr.parts});
  const resist=ai2(p,"resist")&&o.solved&&o.ev.length>=o.level-2&&o.ev.length>0||!!thr&&thr.lethalMin&&o.ev.length>0;
  return {oppPot,thr,resist}}
// wary（弱い警戒）: 解決編でなくても、迅速・突撃などで証拠を1つ余計に取られて、現場のLP+1で勝たれる形なら、自分の証拠を貯めるより相手の証拠を削る。
// 判定はアクションの段階に入ったとき（突撃などで相手の証拠が減った後）の証拠数で行う
const waryNow=(p,o,d)=>ai2(p,"wary")&&!d.resist&&!d.calm&&o.ev.length>0&&(d.thr?o.ev.length+d.thr.gainMax>=o.level:o.ev.length+d.oppPot+1>=o.level);

// ---- デッキ別CPU（段階⑤、js/deckcpu/*.js） ----
// デッキ別のファイルは DECK_CPU.名前={detect(p), play(p,x), plan(p,pl)} を登録する（方針の上書きだけ。無ければ共通CPUのまま）。
//   play: 手札のカード x を使う優先度への加点（bestHand。探索なしの手番と、試しの手番の中の動き）
//   plan: 探索の案 pl（出すカード・アシスト）の点数への加点（chooseTurnPlan。対戦データから学んだ表など）
// スイッチ: deck=SeEdの方針を手で書いたもの（play）、deckL=対戦データから学んだ表（plan と play の両方に足す）。席ごとに初回だけデッキを判定する
function deckCpu(p){if(!window.DECK_CPU||!(ai2(p,"deck")||ai2(p,"deckL")))return null;
  if(p.deckCpu===undefined){p.deckCpu="";for(const k in DECK_CPU)if(DECK_CPU[k].detect(p)){p.deckCpu=k;break}}
  return p.deckCpu?DECK_CPU[p.deckCpu]:null} // 関数は探索の盤面コピーに入れられないので、席には名前だけ持つ
function deckHook(p,name,...a){const d=deckCpu(p);return d&&d[name]?d[name](p,...a)||0:0}
// 局面の区切り（デッキ別CPUと対戦データの集計で共通）: 序盤=FILE4以下 / 終盤=解決編で証拠があと3以内 / それ以外は中盤
const deckPhase=p=>p.solved&&p.ev.length>=p.level-3?"late":p.file.length<=4&&!p.solved?"early":"mid";

// ---- 手札を使う優先度 ----
// レベル×10、除去イベント+45、登場時に除去するキャラ+25、現場がいっぱいのキャラ−30
function bestHand(p,viaHint){
  const cs=p.hand.filter(x=>!playableReason(p,x,viaHint)&&(C(x).t==="キャラ"||FX.eventAi(p,x)));
  const score=x=>{const c=C(x);let v=(c.lv||0)*10;
    if(c.t==="イベント")v+=/リムーブする|デッキの下|スタン/.test(c.f||"")?45:(c.lv||0)<=2?8:20;
    if(c.t==="キャラ"&&/【登場時】[^\n]*(リムーブ|スタン)/.test(c.f||"")&&FX.has(x,"enter"))v+=25;
    if(c.t==="キャラ"&&p.field.length>=fieldMax(p))v-=30;
    return v+deckHook(p,"play",x)};
  return cs.sort((a,b)=>score(b)-score(a))[0]||null}
// SeEd:「烏丸蓮耶の影」「小さくなった名探偵」のようにFILEの枚数で出せるレベルが決まるイベントは、先にアシストしてから使う
const fileEv=x=>!!x&&C(x).t==="イベント"&&/手札から自分のFILEエリアの枚数以下のレベル/.test(C(x).f||"");
const fileRef=x=>!!x&&/FILE/.test(C(x).f||"");
// 解決編に入った後もアシストできる（FILEが9未満の間）。SeEd: 解決編でもパートナーは推理よりアシストを優先する。
// 無駄なアシスト（アシストしたあとに最も点数が高いカードが、アシストなしでも出せる）なら推理。ただしFILE数を参照する効果のカードはアシストの価値あり（SeEd）
function assistUseful(p){p.file.push(p.partner);const after=bestHand(p,false);p.file.pop();return !!after&&(!!playableReason(p,after,false)||fileRef(after))}
const canAssist=p=>!p.solved||p.file.length<9&&assistUseful(p);
// hold9: FILE7以上になるアシストで解決編に入る。まだ出せない重い（Lv8以上）カードが手札にあり、FILEが近い間は、その前にアシストして解決編に入るのを控える（SeEd: Lv9を出してから解決編へ）
const holdForHeavy=p=>!p.solved&&p.file.length+1>=7&&p.hand.some(x=>{const l=C(x).lv||0;return l>=8&&l>p.file.length+1&&l-p.file.length<=3});

// ================= CPUの手番 =================
async function cpuTurn(p){
  const g0=G; // 途中で新しい対戦が始まったら、古いCPUの手番はそこで止める
  const step=async ms=>{if(G!==g0)await new Promise(()=>{});if(G.sim)return;if(window.SIM_TURBO){if(G.ui.act)G.ui.act=null;await sleep(0);return}clearAct();render();await sleep(window.SIM_FAST?(ms||450):(ms||450)*1.8*pace())};
  await step(600);
  const plan=await choosePlan(p);
  if(G!==g0)return;
  const cb=plan.combo;
  if(cb){if(!G.sim){G.comboFired=(G.comboFired||0)+1;if(G.rec)(G.rec.combo=G.rec.combo||[]).push({t:G.turnNo,who:p.idx,how:cb.e.how||cb.e.act.n});dl("combo",{who:p.idx,how:cb.e.how||cb.e.act.n})}
    if(cb.ab){G.ui.act={a:cb.x,t:null};await FX.useAbility(p,cb.x,cb.ab);await step();if(G.over)return}}
  if(!G.sim&&window.FIND_COMBOS&&(G.cfg.findFor==null||G.cfg.findFor===p.idx)){await findCombos(p);if(G!==g0)return}
  const o=opp(p);
  const t={p,o,plan,step,hold:new Set()}; // 段階の間で受け渡すもの
  if(plan.abFirst){await abilityPhase(t);if(G.over)return}
  // 1) 事件解決
  if(p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&p.ev.length>=p.level&&!FX.noSolve(p)){solve(p);return}
  t.fin=finishCheck(p,o);
  if(plan.order==="act"){await actFirstTurn(t);if(G.over)return}
  else{
  // 2) 手札（アシスト・使う・ネクストヒント）
  await handPhase(t);
  if(G.over)return;
  // 2.5) 宣言能力
  await abilityPhase(t);
  if(G.over)return;
  // 守りに入るか
  t.def=defenseCheck(p,o);
  if(plan.stance==="defend")t.def.resist=true;else if(plan.stance==="attack"){t.def.resist=false;t.def.calm=true} // 探索が選んだ構え（stance）で上書き
  // 2.8) 出たばかりでもアクションできるキャラ（突撃・迅速）
  await rushPhase(t);
  if(G.over)return;
  // 相手にアクティブなミスリードが2体以上いるなら、先にパートナーで推理して使わせ、スリープしたところをアクションで倒す
  if(!t.def.resist&&p.pLoc==="area"&&p.partner.st==="a"&&!p.solved&&canAct(p.partner,p,"reason")&&o.field.filter(y=>y.st==="a"&&(staticKw(y,o).misread||0)>0).length>=2){await reason(p,p.partner);await step();if(G.over)return}
  // 3) キャラへのアクション（勝てる相手）
  if(!t.def.resist&&!t.fin.on)await attackPhase(t);
  if(G.over)return;
  // 4) 事件へのアクション / 推理
  await actorPhase(t);
  if(G.over)return;
  }
  // 5) パートナー
  await partnerPhase(t);
  if(G.over)return;
  log(`${p.name} はターン終了`,"n");await step(300);
  if(G.sim){await simTurnEnd();return}
  endTurn();
}
// 行動順の入れ替え（order、実験。SeEd 11/24: アクションしてから手札を使う、アクションしてスリープにしてから効果を使う）:
// plan.order==="act" のとき、場のキャラのアクション（キャラ・事件・推理）を先にして、そのあとで手札・宣言能力・突撃を行う。どちらの順が良いかは探索が試して決める
async function actFirstTurn(t){
  const {p,o,plan,step}=t;
  const defNow=()=>{t.def=defenseCheck(p,o);if(plan.stance==="defend")t.def.resist=true;else if(plan.stance==="attack"){t.def.resist=false;t.def.calm=true}};
  defNow();
  if(!t.def.resist&&!t.fin.on)await attackPhase(t);
  if(G.over)return;
  await actorPhase(t);
  if(G.over)return;
  await handPhase(t);
  if(G.over)return;
  await abilityPhase(t);
  if(G.over)return;
  defNow();
  await rushPhase(t);
  if(G.over)return;
  if(!t.def.resist&&!t.fin.on)await attackPhase(t); // 手札や能力で倒せる相手が増えた・スリープした相手がいれば
  if(G.over)return;
  await actorPhase(t);
}
// 案を決める。コンボ表にあるコンボが組めているなら探索せずにその行動。試しの手番なら探索から渡された案。本番なら探索する
async function choosePlan(p){
  const cb=ai2(p,"combo2")?comboNow(p):null;
  const plan=(cb?{play:cb.e.act.kind==="hand"?cb.x.n:undefined}:G.sim?(G.sim.planFor===p.idx?G.sim.plan:null):(searchOn(p)?await chooseTurnPlan(p):null))||{};
  if(cb)plan.combo=cb;
  return plan}
// 宣言能力（事件の能力を含む）。使えるものを1つずつ、使えなくなるまで（最大8回）
async function abilityPhase({p,plan,step}){
  for(let guard=0;guard<8;guard++){
    let used=false;
    for(const x of [...p.field,p.caseC,...p.hand,...areaCards(p)]){
      for(const ab of FX.abilities(p,x)){
        if(!ab.ok||ab.noAi)continue;
        const def=plan.ab==="none"?false:(plan.ab==="force"||!ab.aiCan||!!ab.aiCan(p,x));
        if(!(G.sim&&G.sim.explore?explore(p,"能力",[false,true],+def,o=>`${o?"使う":"使わない"}: ${C(x).nm}(${x.n}) ${ab.label}`):def))continue;
        G.ui.act={a:x,t:null};await FX.useAbility(p,x,ab);await step();used=true;break}
      if(used||G.over)break}
    if(!used||G.over)break}
}
// 手札: 先にアシストするか → 1枚使う → ネクストヒント（コンボのときだけ）とヒント後の1枚
async function handPhase(t){
  const {p,plan,step,fin}=t;
  const planned=()=>plan.play==="none"?null:plan.play?p.hand.find(x=>x.n===plan.play&&!playableReason(p,x,false))||bestHand(p,false):bestHand(p,false);
  // アシストでFILEが1枚増えると、今は出せない高レベルが出せるなら先にアシストする。FILE6以上か手札5枚以上でも先にアシスト
  // 勝ち切り（fin.on）のときはアシストしない: パートナーがFILEに行くと、推理で証拠が揃っても事件解決できない（SeEd 11/24 実況T13）
  if(canAssist(p)&&!(fin&&fin.on)&&p.pLoc==="area"&&p.partner.st==="a"&&!p.usedHand&&!holdForHeavy(p)){
    const lv=x=>x?(C(x).lv||0):-1;const now=bestHand(p,false);
    p.file.push(p.partner);const after=bestHand(p,false);p.file.pop();
    // asst3（SeEd 11/24: 序盤に、Lv2を出すのにアシストしてFILE3にしている）: 「手札過多」は手札5枚ではなく7枚以上。それ以外で先にアシストするかは探索（plan.assist）が試して決める
    // asst4（SeEd 11/24: 手札過多でも意味ないならアシストしない。出すカードを決めて逆算してアシストする）: 手札の枚数ではアシストしない
    const many=ai2(p,"asst4")?false:ai2(p,"asst3")?p.hand.length>=7:p.hand.length>=5;
    const up=after&&lv(after)>lv(now)&&!(ai2(p,"asst3")&&plan.play); // asst3: 探索が出すカードを決めているなら、そのカードのためのアシストは plan.assist で示される
    if(plan.assist||(p.file.length>=6||many)||up||fileEv(planned())){await assist(p);await step()}
  }
  let pick1=fin.swift&&!playableReason(p,fin.swift,false)?fin.swift:planned();
  if(pick1){await useFromHand(p,pick1);await step()}
  if(G.over)return;
  // ネクストヒントは何回でも可。FILE4以下ではしない。ヒント後のFILEぴったりで高レベル（Lv6以上）を使えるコンボがあるときだけ
  for(let n=0;n<4&&!G.over&&!p.noHint&&plan.hint!==false;n++){
    if(p.file.length<=4)break;
    const after=p.file.length-1,top=[...p.file].reverse().find(x=>x!==p.partner);
    const combo=[...p.hand,top].some(x=>x&&canPlayColor(C(x),p)&&(C(x).t==="キャラ"||FX.eventAi(p,x))&&(C(x).lv||0)<=after&&(C(x).lv||0)>=Math.max(6,after-1));
    if(!combo)break;
    if(!await nextHint(p))break;await step();
    const c2=bestHand(p,true);if(c2){await useFromHand(p,c2,true);await step();pick1=pick1||c2}
  }
}
// 出たばかりでもアクションできるキャラ（突撃・迅速）。探索（plan.act）で動かし方を選ぶ。stay は動かさず起こしておく
async function rushPhase(t){
  const {p,o,plan,step,hold,def,fin}=t;
  const rs=p.field.filter(x=>x.fresh&&x.st==="a"&&x!==p.partner&&(canAct(x,p,"chara")||canAct(x,p,"case"))).sort((a,b)=>apOf(b)-apOf(a));
  if(rs.length&&G.sim)G.sim.rushSeen=true;
  if(plan.act==="stay"){for(const x of rs)hold.add(x);return}
  if(!plan.act||def.resist||fin.on)return;
  for(const x of rs){
    for(const way of plan.act==="case"?["case","chara"]:["chara","case"]){
      if(G.over||!p.field.includes(x)||x.st!=="a")break;
      if(way==="chara"){const tg=o.field.filter(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(x,p,"chara",y)&&apOf(x)>=apOf(y)).sort((a,b)=>lpOf(b)-lpOf(a)||(C(b).lv||0)-(C(a).lv||0))[0];
        if(tg){await declareAction(p,x,tg);await step();break}}
      else if(o.ev.length>0&&canAct(x,p,"case")){await declareAction(p,x,"case");await step();break}}}
}
// キャラへのアクション。倒す価値のある相手（LP2以上・効果あり・Lv6以上）を、LP→効果→レベルの順に、勝てるキャラで狙う（SeEd）
async function attackPhase({p,o,step,hold}){
  for(;;){
    const atks=p.field.filter(x=>!hold.has(x)&&canAct(x,p,"chara")).sort((a,b)=>apOf(b)-apOf(a));
    // 「必ずガードする」相手のキャラがいれば、APで勝てるキャラでアクションしてガードさせる
    const fg=o.field.find(y=>staticKw(y,o).mustGuard&&canGuardNow(o,y));
    if(fg){const a=p.field.filter(x=>x.st==="a"&&!hold.has(x)&&!staticKw(x,p).bullet&&apOf(x)>=apOf(fg)).sort((a,b)=>apOf(a)-apOf(b))
        .find(x=>o.field.some(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(x,p,"chara",y))||canAct(x,p,"case")&&o.ev.length>0);
      if(a){await declareAction(p,a,o.field.find(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(a,p,"chara",y))||"case");await step();if(G.over)break;continue}}
    const tg=o.field.filter(y=>y.st!=="a"&&!FX.noTarget(p,y)).sort((a,b)=>(C(b).lv||0)-(C(a).lv||0))
      .filter(y=>lpOf(y)>=2||strongChar(y)||(C(y).lv||0)>=6).sort((a,b)=>lpOf(b)-lpOf(a)||(strongChar(b)-strongChar(a))||(C(b).lv||0)-(C(a).lv||0));
    let done=false;
    for(const y of tg){const a=atks.find(x=>apOf(x)>=apOf(y)&&canAct(x,p,"chara",y));if(a){await declareAction(p,a,y);await step();done=true;break}}
    if(!done||G.over)break;
  }
}
// 事件アクションをするか（推理より先に）。抵抗・警戒中、または遅れているとき・序盤に相手の証拠が2以上のとき（SeEd: 遅れていれば事件アクション、先行していれば推理）
const caseFirst=(p,o,x,t,wary)=>!t.fin.on&&o.ev.length>0&&canAct(x,p,"case")&&(t.def.resist||wary||(o.ev.length>p.ev.length||G.turnNo<=4&&o.ev.length>=2));
// 残ったアクティブなキャラで、事件アクションか推理。現場3体以上ならガード役を1体残す（抵抗中・勝ち切り中は全員）
async function actorPhase(t){
  const {p,o,step,hold}=t;
  const keep=t.plan.keep!=null?t.plan.keep:t.def.resist||t.fin.on?0:p.field.length>=3?1:0; // keep2: 探索が「残さない」を選んだらそれに従う
  const actors=p.field.filter(x=>x.st==="a"&&!hold.has(x)).sort((a,b)=>lpOf(b)-lpOf(a));
  const wary=waryNow(p,o,t.def);
  let left=actors.length;
  for(const x of actors){
    if(G.over)return;
    if(left<=keep)break;
    if(caseFirst(p,o,x,t,wary)){await declareAction(p,x,"case");left--;await step();continue}
    if(lpOf(x)>=1&&canAct(x,p,"reason")){await reason(p,x);left--;await step();continue}
    if(!t.fin.on&&o.ev.length>0&&canAct(x,p,"case")){await declareAction(p,x,"case");left--;await step()}
  }
}
// パートナー: FILE6以上ならアシスト（重いカード待ちを除く）、解決できるなら解決、解決編ならアシスト、それ以外は推理
async function partnerPhase({p,step}){
  if(!(p.pLoc==="area"&&p.partner.st==="a"))return;
  if(!p.solved&&p.file.length>=6&&!holdForHeavy(p))await assist(p);
  else if(p.solved&&p.ev.length>=p.level&&!FX.noSolve(p))solve(p);
  else if(p.solved&&canAssist(p)&&!(p.ev.length>=p.level))await assist(p);
  else await reason(p,p.partner);
  await step();
}

// ---- 対象選びの点数（2026-11-14 回答フォーム30問 → simulator/cpu-judgment-survey-2026-11-14.md） ----
// how: "rm"=リムーブ / "bt"=デッキの下 / "st"=スタン。場にいる間に効く強いカード・アクティブなミスリードを最優先で消す。登場時のみは使用済みで優先度が下がる
// スタンは宣言スリープ持ち・登場時のみ向き、デッキの下はカットイン／ヒラメキ／リムーブエリアから回収できるカードを避ける
function tgtInfo(x){const c=C(x),f=c.f||"",L=f.split("\n");
  const decl=L.filter(l=>/【宣言】/.test(l)),pers=L.filter(l=>/【(自分|相手)ターン中】/.test(l)&&!/【現場リムーブ時】/.test(l)),enter=L.some(l=>/【登場時】/.test(l));
  return {pers:pers.length>0,decl:decl.length>0,declSleep:decl.some(l=>/【スリープ】/.test(l)),enterOnly:enter&&!pers.length&&!decl.length,
    helper:[...decl,...pers].some(l=>/(他の|自分の)[^。]{0,14}キャラ/.test(l)),recur:/【カットイン】|【ヒラメキ】|リムーブエリア/.test(f)}}
function aiTgtScore(p,x,how){
  let v=lvOf(x)*10+apOf(x)/1000;if(!how)return v;
  const i=tgtInfo(x),mis=(staticKw(x,ownerOf(x))||{}).misread||0,hot=!!p.solved;
  if(how==="st"){if(x.st==="x")return -999;
    v=lvOf(x)*6+(C(x).lp||0)*4+apOf(x)/1000;
    if(i.declSleep)v+=30;else if(i.decl)v+=10;if(i.enterOnly)v+=12;if(i.pers)v-=25;if(i.helper)v-=20;if(mis&&x.st==="a")v+=10;return v}
  if(i.pers)v+=35;if(mis&&x.st==="a")v+=(hot?40:20)*mis;if(i.helper)v+=15;if(i.decl&&!i.declSleep)v+=6;
  if(i.enterOnly)v-=25;if(how==="bt"&&i.recur)v-=45;if(how==="rm"&&i.recur)v+=10;return v}
