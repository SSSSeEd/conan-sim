"use strict";
// ================= CPU =================
// CPUの考え方（issue #1 のアドバイス）。cfg.ai1[idx] が true なら旧CPU
// 旧CPUとの200戦比較: hint 59.5%（採用）/ cut 42.0%・reason 51.0%（不採用、window.AI_OFF=[] で試せる）
// SeEdさんのアンケート回答から（2026-10-28、旧CPUとの対戦）: case2+act2 58.8%（400戦、採用）
//   単独: act2 54.2% / case2 53.8% / mull2 51.7%（各600戦）、end2 49% / rsnw 46% / play2 45.5% / guard2 37% / cut2 35%（各200戦）→ 不採用
//   2026-10-29 再検証（対照=同じCPU同士と比べる、各200戦）: 対照45.5% / guard2 46.0% / cut2 46.5% → 守りを控えても差は無い。以前の37%・35%は誤差
//   2026-10-29 コンボ表（combo）: 今のCPUに 50.2%（400戦）→ 差なし、不採用。探索（search.js）: 62.0%、コンボ表に 64.2%
const AI_OFF0=["cut","reason","mull2","play2","rsnw","end2","guard2","cut2","combo"];
const ai2=(p,f)=>!(G&&G.cfg.ai1&&G.cfg.ai1[p.idx])&&!((window.AI_OFF||AI_OFF0).includes(f))&&!(G&&G.cfg.aiOff&&(G.cfg.aiOff[p.idx]||[]).includes(f));
const strongChar=x=>{const c=C(x);return c&&c.t==="キャラ"&&(c.lv||0)>=6&&!!(c.f||"").trim()};
function cpuGuard(o,atk,target,guards){
  const A=apOf(atk);
  const strong=guards.filter(g=>apOf(g)>A).sort((a,b)=>apOf(a)-apOf(b));
  if(ai2(o,"guard2")){ // SeEd: 序盤や不利にならない事件アクションは通す。守る価値のないキャラは守らない
    const p=opp(o);
    if(target==="case"){const gap=(p.ev.length+1)-(o.ev.length-1);if(G.turnNo<=4&&gap<2||gap<2&&!p.solved)return null;return strong[0]||null}
    if(apOf(target)>A)return null;
    if(!(strongChar(target)||(C(target).lv||0)>=5||target===o.partner))return null;
    return strong[0]||null}
  if(target==="case")return strong[0]||null;
  if(apOf(target)>A)return null; // 対象が勝てるならガード不要
  return strong[0]||null;
}
// コンボ探し（search.js の explore）のときは、カットインを切る／切らないを試しに変える
function cpuContact(q,mine,theirs,cuts,tp){
  const d=cpuContact0(q,mine,theirs,cuts,tp);
  if(!(G.sim&&G.sim.explore))return d;
  const opts=[null,...cuts.filter(x=>cutinAp(x,q)!=null||FX.has(x,"cutin"))];
  const i=explore(q,"カットイン",opts,Math.max(0,opts.findIndex(o=>o===(d&&d.x))),o=>o?`${C(o).nm}(${o.n})→${C(mine).nm}(${mine.n})・${q===tp?"自分":"相手"}ターン`:`切らない（${C(mine).nm}(${mine.n})）`);
  return opts[i]?{x:opts[i],how:"cut"}:null;
}
// コンボ表（search.js のコンボ探しで、今のCPUより良かった手。プリセット4デッキ400戦の集計から）
// cut: 手札のこのカードは、APが足りていても条件が合えばカットインする。skip: この能力は使わない
const COMBO_TABLE=[
  {cut:"0273",side:"def",ok:(q,mine)=>opp(q).field.some(y=>y.st==="a"&&apOf(y)<=5000),why:"津川秀治: 守るときに相手のAP5000以下をスリープ（次のターンの的にする） 34/38で改善"},
  {cut:"1141",ok:(q,mine)=>!!C(mine).ci&&hasColor(mine,"黒"),why:"スコッチ: 【カットイン】を持つ【黒】に使って1枚引く 31/37で改善"},
  {skip:"0092",why:"江戸川コナン D01003: 他のキャラを寝かせて手札交換は損 45/63で改善"},
];
function comboCut(q,mine,tp,cuts){
  if(!ai2(q,"combo"))return null;
  for(const r of COMBO_TABLE){if(!r.cut||r.side==="def"&&q===tp||r.side==="atk"&&q!==tp)continue;
    const x=cuts.find(y=>idOf(y)===r.cut);if(x&&r.ok(q,mine))return {x,how:"cut"}}
  return null}
const comboSkip=(p,x)=>ai2(p,"combo")&&COMBO_TABLE.some(r=>r.skip===idOf(x));
function cpuContact0(q,mine,theirs,cuts,tp){
  const need=q===tp?apOf(theirs)-apOf(mine):apOf(theirs)-apOf(mine)+1; // 攻撃側は同値で勝ち
  // コンボ: スコッチ B10086 のコンタクト中にバーボンのカットイン → スコッチが起きて、もう一度アクションできる
  if(q===tp&&idOf(mine)==="1141"&&partnerIs(q,"黒")&&!turnCount(mine,"scotch")){
    const o=opp(q),bb=cuts.filter(x=>C(x).nm.includes("バーボン")&&cutinAp(x,q)!=null&&cutinAp(x,q)>=need).sort((a,b)=>cutinAp(a,q)-cutinAp(b,q))[0];
    const next=o.field.some(y=>y!==theirs&&y.st!=="a"&&apOf(y)<=apOf(mine))||o.ev.length>0;
    if(bb&&next)return {x:bb,how:"cut"}}
  if(need<=0)return comboCut(q,mine,tp,cuts);
  // 守る（倒す）価値があるときだけカットインを切る
  if(ai2(q,"cut2")){const key=q===tp?theirs:mine;const lv=C(key).lv||0; // SeEd: 序盤はほぼ切らない。Lv6〜9を倒す・守るときに使う
    if(!(lv>=6||key===q.partner||G.turnNo>4&&strongChar(key)))return null}
  if(ai2(q,"cut")){const key=q===tp?theirs:mine;if(!(strongChar(key)||(C(key).lv||0)>=7||key===q.partner))return null}
  const c=cuts.map(x=>({x,v:cutinAp(x,q)})).filter(o=>o.v!=null&&o.v>=need).sort((a,b)=>a.v-b.v);
  if(c.length)return {x:c[0].x,how:"cut"};
  return comboCut(q,mine,tp,cuts);
}
// SeEd の基準: レベル → 登場時の効果 → 除去 → ドロー。現場5体なら強いカードだけ入れ替える
function score2(p,x){const c=C(x),f=c.f||"";let v=(c.lv||0)*10;
  const rm=/リムーブする|デッキの下|スタン/.test(f);
  if(c.t==="イベント")v+=rm?15:4;
  if(c.t==="キャラ"){if(/【登場時】/.test(f)&&FX.has(x,"enter"))v+=/【登場時】[^\n]*(リムーブ|スタン)/.test(f)?12:8;
    if(/引く|ドロー/.test(f))v+=3;
    if(p.field.length>=5){const lo=Math.min(...p.field.map(y=>C(y).lv||0));if(!((c.lv||0)>=6||(c.lv||0)>=lo+3))return -999}}
  return v}
async function cpuTurn(p){
  const g0=G; // 途中で新しい対戦が始まったら、古いCPUの手番はそこで止める
  const step=async ms=>{if(G!==g0)await new Promise(()=>{});if(G.sim)return;if(window.SIM_TURBO){if(G.ui.act)G.ui.act=null;await sleep(0);return}clearAct();render();await sleep(window.SIM_FAST?(ms||450):(ms||450)*1.8*pace())};
  await step(600);
  // 探索（search.js）: 試しの手番で選ばれた組み合わせ。本番の手番のはじめに組み合わせを試して選ぶ
  const plan=(G.sim?(G.sim.planFor===p.idx?G.sim.plan:null):(searchOn(p)?await chooseTurnPlan(p):null))||{};
  if(G!==g0)return;
  if(!G.sim&&window.FIND_COMBOS&&(G.cfg.findFor==null||G.cfg.findFor===p.idx)){await findCombos(p);if(G!==g0)return}
  const o=opp(p);
  // 1) 事件解決
  if(p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&p.ev.length>=p.level){solve(p);return}
  // 2) 手札の使用（基本方針: 毎ターン必ず使う。相手のキャラを減らす効果を優先）
  const best=viaHint=>{
    const cs=p.hand.filter(x=>!playableReason(p,x,viaHint)&&(C(x).t==="キャラ"||FX.eventAi(p,x)));
    if(ai2(p,"play2"))return cs.map(x=>[x,score2(p,x)]).filter(a=>a[1]>-500).sort((a,b)=>b[1]-a[1]).map(a=>a[0])[0]||null;
    const score=x=>{const c=C(x);let v=(c.lv||0)*10;
      if(c.t==="イベント")v+=/リムーブする|デッキの下|スタン/.test(c.f||"")?45:(c.lv||0)<=2?8:20;
      if(c.t==="キャラ"&&/【登場時】[^\n]*(リムーブ|スタン)/.test(c.f||"")&&FX.has(x,"enter"))v+=25;
      if(c.t==="キャラ"&&p.field.length>=5)v-=30;
      return v};
    return cs.sort((a,b)=>score(b)-score(a))[0]||null};
  // アシストでFILEが1枚増えると、今は出せない高レベルが出せるなら先にアシストする
  if(ai2(p,"assist")&&!p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&!p.usedHand){
    const lvOf=x=>x?(C(x).lv||0):-1;const now=best(false);
    p.file.push(p.partner);const after=best(false);p.file.pop();
    if(after&&lvOf(after)>lvOf(now)){await assist(p);await step()}
  }
  let pick1=plan.play==="none"?null:plan.play?p.hand.find(x=>x.n===plan.play&&!playableReason(p,x,false))||best(false):best(false);
  if(pick1){await useFromHand(p,pick1);await step()}
  if(G.over)return;
  const fileCards=()=>p.file.filter(x=>x!==p.partner).length;
  // ネクストヒントは何回でも可。FILEが減るので、FILEに余裕があるときだけ続ける
  for(let n=0;n<4&&!G.over&&!p.noHint&&plan.hint!==false;n++){
    const fc=fileCards(),got=p.hintN>0;
    if(ai2(p,"hint")){ // コンボ（ヒント後のFILEいっぱいの高レベルを使える）があるときだけ
      const after=p.file.length-1,top=[...p.file].reverse().find(x=>x!==p.partner);
      const combo=[...p.hand,top].some(x=>x&&canPlayColor(C(x),p)&&(C(x).t==="キャラ"||FX.eventAi(p,x))&&(C(x).lv||0)<=after&&(C(x).lv||0)>=Math.max(6,after-1));
      if(!combo)break}
    else if(!(!pick1&&!got&&fc>=4||fc>=6&&p.field.length<4||got&&fc>=5&&p.field.length<2))break;
    if(!await nextHint(p))break;await step();
    const c2=best(true);if(c2){await useFromHand(p,c2,true);await step();pick1=pick1||c2}
  }
  if(G.over)return;
  // 2.5) 宣言能力
  for(let guard=0;guard<8;guard++){
    let used=false;
    for(const x of [...p.field,p.caseC,...p.hand]){
      for(const ab of FX.abilities(p,x)){
        if(!ab.ok||ab.noAi)continue;{const def=(!ab.aiCan||!!ab.aiCan(p,x))&&!comboSkip(p,x);if(!(G.sim&&G.sim.explore?explore(p,"能力",[false,true],+def,o=>`${o?"使う":"使わない"}: ${C(x).nm}(${x.n}) ${ab.label}`):def))continue}
        G.ui.act={a:x,t:null};await FX.useAbility(p,x,ab);await step();used=true;break}
      if(used||G.over)break}
    if(!used||G.over)break}
  if(G.over)return;
  // 3) キャラへのアクション（勝てる相手）
  for(;;){
    const atks=p.field.filter(x=>canAct(x,p,"chara")).sort((a,b)=>apOf(b)-apOf(a));
    // 「必ずガードする」相手のキャラがいれば、APで勝てるキャラでアクションしてガードさせる
    const fg=o.field.find(y=>staticKw(y,o).mustGuard&&canGuardNow(o,y));
    if(fg){const a=p.field.filter(x=>x.st==="a"&&!staticKw(x,p).bullet&&apOf(x)>=apOf(fg)).sort((a,b)=>apOf(a)-apOf(b))
        .find(x=>canAct(x,p,"chara")&&o.field.some(y=>y.st!=="a")||canAct(x,p,"case")&&o.ev.length>0);
      if(a){await declareAction(p,a,canAct(a,p,"chara")&&o.field.find(y=>y.st!=="a")||"case");await step();if(G.over)break;continue}}
    let tg=o.field.filter(y=>y.st!=="a").sort((a,b)=>(C(b).lv||0)-(C(a).lv||0));
    if(ai2(p,"act2"))tg=tg.filter(y=>lpOf(y)>=2||strongChar(y)||(C(y).lv||0)>=6).sort((a,b)=>lpOf(b)-lpOf(a)||(strongChar(b)-strongChar(a))||(C(b).lv||0)-(C(a).lv||0)); // SeEd: LP高い→効果→レベル。倒す価値のないキャラは狙わない
    let done=false;
    for(const t of tg){const a=atks.find(x=>apOf(x)>=apOf(t));if(a){await declareAction(p,a,t);await step();done=true;break}}
    if(!done||G.over)break;
  }
  if(G.over)return;
  // 4) 事件へのアクション / 推理
  const keep=p.field.length>=3?1:0;
  let actors=p.field.filter(x=>x.st==="a").sort((a,b)=>lpOf(b)-lpOf(a));
  if(ai2(p,"rsnw"))actors.sort((a,b)=>(C(a).lv||0)-(C(b).lv||0)||lpOf(b)-lpOf(a)); // SeEd: 弱いキャラから動かし、強いキャラを起こして残す
  const oppNear=o.solved&&o.ev.length>=o.level-2; // 相手が次のターンに勝ちそう
  let left=actors.length;
  for(const x of actors){
    if(G.over)return;
    if(left<=keep)break;
    if(ai2(p,"reason")&&x!==p.partner){ // 寝かせると相手にアクションされる。強いキャラや序盤は慎重に
      const late=p.ev.length>=p.level-2;
      const threat=o.field.some(y=>y.st!=="x"&&apOf(y)>=apOf(x));
      if(!late&&threat&&(strongChar(x)||G.turnNo<=4)){continue}}
    if(o.ev.length>0&&canAct(x,p,"case")&&(ai2(p,"end2")&&oppNear||ai2(p,"case2")&&(o.ev.length>p.ev.length||G.turnNo<=4&&o.ev.length>=2))){await declareAction(p,x,"case");left--;await step();continue} // SeEd: 遅れていれば事件アクション、先行していれば推理
    if(lpOf(x)>=1&&canAct(x,p,"reason")){await reason(p,x);left--;await step();continue}
    if(o.ev.length>0&&canAct(x,p,"case")){await declareAction(p,x,"case");left--;await step()}
  }
  if(G.over)return;
  // 5) パートナー
  if(p.pLoc==="area"&&p.partner.st==="a"){
    if(!p.solved&&p.file.length>=6)await assist(p);
    else if(p.solved&&p.ev.length>=p.level)solve(p);
    else await reason(p,p.partner);
    await step();
  }
  if(G.over)return;
  log(`${p.name} はターン終了`,"n");await step(300);
  if(G.sim){await simTurnEnd();return}
  endTurn();
}

