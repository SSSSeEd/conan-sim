"use strict";
// ================= CPU =================
// CPUの考え方（issue #1 のアドバイス）。cfg.ai1[idx] が true なら旧CPU
// 旧CPUとの200戦比較: hint 59.5%（採用）/ cut 42.0%・reason 51.0%（不採用、window.AI_OFF=[] で試せる）
// SeEdさんのアンケート回答から（2026-10-28、旧CPUとの対戦）: case2+act2 58.8%（400戦、採用）
//   単独: act2 54.2% / case2 53.8% / mull2 51.7%（各600戦）、end2 49% / rsnw 46% / play2 45.5% / guard2 37% / cut2 35%（各200戦）→ 不採用
//   2026-10-29 再検証（対照=同じCPU同士と比べる、各200戦）: 対照45.5% / guard2 46.0% / cut2 46.5% → 守りを控えても差は無い。以前の37%・35%は誤差
//   2026-10-29 コンボ表（combo）: 今のCPUに 50.2%（400戦）→ 差なし、不採用。探索（search.js）: 62.0%、コンボ表に 64.2%
const AI_OFF0=["cut","reason","mull2","play2","rsnw","end2","guard2","cut2","combo","early6","mid","lose","threat2","def2","annoy"];
// 2026-11-12 SeEdの使い方の差から試す3案（既定は無効。AI_OFFから外すと有効）: early6=FILE6なら手札の前にアシストして解決編へ / mid=序盤〜中盤は推理より事件アクション / lose=相手が次のターンに解決しそうなら事件アクションで抵抗
const ai2=(p,f)=>!(G&&G.cfg.ai1&&G.cfg.ai1[p.idx])&&!((window.AI_OFF||AI_OFF0).includes(f))&&!(G&&G.cfg.aiOff&&(G.cfg.aiOff[p.idx]||[]).includes(f));
const strongChar=x=>{const c=C(x);return c&&c.t==="キャラ"&&(c.lv||0)>=6&&!!(c.f||"").trim()};
function cpuGuard(o,atk,target,guards){
  const A=apOf(atk);
  const strong=guards.filter(g=>apOf(g)>A).sort((a,b)=>ai2(o,"sit2")?(C(a).lv||0)-(C(b).lv||0)||apOf(a)-apOf(b):apOf(a)-apOf(b)); // sit2: 価値の低いキャラでガード
  if(ai2(o,"sit2")&&target!=="case"&&apOf(target)<=A){const lv=C(target).lv||0; // sit2: 守るかはカードの強さと手札の有無。Lv8以上は必ず守り、Lv5以下は手札があれば守らない
    if(lv<=5&&target!==o.partner&&o.hand.length>0)return null;if(lv>=8)return strong[0]||null}
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
  // ジン B01098: 自分のターンに負けそうなら、自分よりレベルの高い相手のキャラと相打ちにする
  if(q===tp){const gin=cuts.find(x=>idOf(x)==="0086");if(gin&&lvOf(theirs)>=Math.max(6,lvOf(mine)))return {x:gin,how:"cut"}}
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
    if(p.field.length>=fieldMax(p)){const lo=Math.min(...p.field.map(y=>C(y).lv||0));if(!((c.lv||0)>=6||(c.lv||0)>=lo+3))return -999}}
  return v}
// コンボ表（js/combo_table.js）: 手番のはじめに、parts がそろっていて行動が使えるコンボを1つ返す（表の先頭に近いものほど優先）
function comboNow(p){
  for(const e of COMBO2){
    if(!e.parts.every(pt=>(pt.where==="手札"?p.hand:p.field).some(x=>x.n===pt.n)))continue;
    if(e.act.kind==="hand"){const x=p.hand.find(x=>x.n===e.act.n);if(x&&!playableReason(p,x,false))return {e,x}}
    else{const x=p.field.find(x=>x.n===e.act.n);const ab=x&&FX.abilities(p,x).find(a=>a.label===e.act.label);if(ab&&ab.ok)return {e,x,ab}}}
  return null}
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
  const mis=me.field.reduce((a,y)=>a+(y.st==="a"?(staticKw(y,me).misread||0):0),0);
  const gMin=Math.max(0,g-guards-mis);
  const near=o.solved||fileNext>=7;
  return {gainMax:g,gainMin:gMin,need:o.ev.length+g-o.level+1,lethal:near&&o.ev.length+g>=o.level,parts};
}
async function cpuTurn(p){
  const g0=G; // 途中で新しい対戦が始まったら、古いCPUの手番はそこで止める
  const step=async ms=>{if(G!==g0)await new Promise(()=>{});if(G.sim)return;if(window.SIM_TURBO){if(G.ui.act)G.ui.act=null;await sleep(0);return}clearAct();render();await sleep(window.SIM_FAST?(ms||450):(ms||450)*1.8*pace())};
  await step(600);
  // 探索（search.js）: 試しの手番で選ばれた組み合わせ。本番の手番のはじめに組み合わせを試して選ぶ
  const cb=ai2(p,"combo2")?comboNow(p):null; // コンボ表にあるコンボが組めているなら、探索せずにその行動をする
  const plan=(cb?{play:cb.e.act.kind==="hand"?cb.x.n:undefined}:G.sim?(G.sim.planFor===p.idx?G.sim.plan:null):(searchOn(p)?await chooseTurnPlan(p):null))||{};
  if(G!==g0)return;
  if(cb){if(!G.sim){G.comboFired=(G.comboFired||0)+1;if(G.rec)(G.rec.combo=G.rec.combo||[]).push({t:G.turnNo,who:p.idx,how:cb.e.how||cb.e.act.n});dl("combo",{who:p.idx,how:cb.e.how||cb.e.act.n})}
    if(cb.ab){G.ui.act={a:cb.x,t:null};await FX.useAbility(p,cb.x,cb.ab);await step();if(G.over)return}}
  if(!G.sim&&window.FIND_COMBOS&&(G.cfg.findFor==null||G.cfg.findFor===p.idx)){await findCombos(p);if(G!==g0)return}
  const o=opp(p);
  // 宣言能力（事件の能力を含む）。plan.abFirst なら手札を使う前にも行う（事件の能力で手札に加えたカードを同じ手番で使えるように）
  const runAbilities=async()=>{
    for(let guard=0;guard<8;guard++){
      let used=false;
      for(const x of [...p.field,p.caseC,...p.hand,...areaCards(p)]){
        for(const ab of FX.abilities(p,x)){
          if(!ab.ok||ab.noAi)continue;{const def=plan.ab==="none"?false:(plan.ab==="force"||!ab.aiCan||!!ab.aiCan(p,x))&&!comboSkip(p,x);if(!(G.sim&&G.sim.explore?explore(p,"能力",[false,true],+def,o=>`${o?"使う":"使わない"}: ${C(x).nm}(${x.n}) ${ab.label}`):def))continue}
          G.ui.act={a:x,t:null};await FX.useAbility(p,x,ab);await step();used=true;break}
        if(used||G.over)break}
      if(!used||G.over)break}
  };
  if(plan.abFirst){await runAbilities();if(G.over)return}
  // 1) 事件解決
  if(p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&p.ev.length>=p.level&&!FX.noSolve(p)){solve(p);return}
  // fin2（SeEd: 推理すれば勝ちなのにアクションして勝ち筋を消している場面がある。迅速はほぼ証拠1枚）: 解決編でパートナーがアクティブで、
  // 今の現場の推理（LPの合計。相手のミスリード分を引く）と、手札の迅速キャラ1枚の推理で、事件レベルに届くなら、アクション（事件・キャラ）をせず推理だけをして事件解決する。
  // 届くには迅速キャラを先に出す必要があれば、手札の最初の1枚としてそのカードを出す
  const fin={on:false,swift:null};
  if(ai2(p,"fin2")&&p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&!FX.noSolve(p)&&p.ev.length<p.level){
    const need=p.level-p.ev.length;
    const mis=o.field.reduce((a,y)=>a+(y.st==="a"?(staticKw(y,o).misread||0):0),0);
    const rs=p.field.filter(x=>x!==p.partner&&canAct(x,p,"reason")).reduce((a,x)=>a+lpOf(x),0);
    if(rs-mis>=need)fin.on=true;
    else{const sw=p.hand.filter(x=>C(x).t==="キャラ"&&/〚迅速〛/.test(C(x).f||"")&&!playableReason(p,x,false)&&p.field.length<fieldMax(p)).sort((a,b)=>(C(b).lp||0)-(C(a).lp||0))[0];
      if(sw&&rs+(C(sw).lp||0)-mis>=need){fin.on=true;fin.swift=sw}}
    if(fin.on&&!G.sim)dl("fin",{who:p.idx,need,swift:fin.swift?C(fin.swift).nm:"",mis})}
  // 2) 手札の使用（基本方針: 毎ターン必ず使う。相手のキャラを減らす効果を優先）
  const best=viaHint=>{
    const cs=p.hand.filter(x=>!playableReason(p,x,viaHint)&&(C(x).t==="キャラ"||FX.eventAi(p,x)));
    if(ai2(p,"play2"))return cs.map(x=>[x,score2(p,x)]).filter(a=>a[1]>-500).sort((a,b)=>b[1]-a[1]).map(a=>a[0])[0]||null;
    const score=x=>{const c=C(x);let v=(c.lv||0)*10;
      if(c.t==="イベント")v+=/リムーブする|デッキの下|スタン/.test(c.f||"")?45:(c.lv||0)<=2?8:20;
      if(c.t==="キャラ"&&/【登場時】[^\n]*(リムーブ|スタン)/.test(c.f||"")&&FX.has(x,"enter"))v+=25;
      if(c.t==="キャラ"&&p.field.length>=fieldMax(p))v-=30;
      return v};
    return cs.sort((a,b)=>score(b)-score(a))[0]||null};
  // アシストでFILEが1枚増えると、今は出せない高レベルが出せるなら先にアシストする
  // SeEd: 「烏丸蓮耶の影」「小さくなった名探偵」のようにFILEの枚数で出せるレベルが決まるイベントも、先にアシストしてから使う
  const fileEv=x=>!!x&&C(x).t==="イベント"&&/手札から自分のFILEエリアの枚数以下のレベル/.test(C(x).f||"");
  const planned=()=>plan.play==="none"?null:plan.play?p.hand.find(x=>x.n===plan.play&&!playableReason(p,x,false))||best(false):best(false);
  // hold9: FILE7以上になるアシストで解決編に入る（以後もアシストはできるが、CPUは従来は解決編後にアシストしなかった）。まだ出せない重い（Lv8以上）カードが手札にあり、FILEが近い間は、その前にアシストして解決編に入るのを控える（SeEd: Lv9を出してから解決編へ）
  // asolv: 解決編に入った後もアシストできる（FILEが9未満の間）。SeEd: 解決編でもパートナーは推理よりアシストを優先する。無駄なアシスト（FILE9以上）なら推理
  // asolvの「無駄なアシスト」: アシストしたあとに最も点数が高いカードが、アシストなしでも出せるなら無駄。ただしFILE数を参照する効果のカードはアシストの価値あり（SeEd）
  const fileRef=x=>!!x&&/FILE/.test(C(x).f||"");
  const assistUseful=()=>{p.file.push(p.partner);const after=best(false);p.file.pop();return !!after&&(!!playableReason(p,after,false)||fileRef(after))};
  const canAs=()=>!p.solved||ai2(p,"asolv")&&p.file.length<9&&(!ai2(p,"asolv2")||assistUseful());
  const hold9=()=>ai2(p,"hold9")&&!p.solved&&p.file.length+1>=7&&p.hand.some(x=>{const l=C(x).lv||0;return l>=8&&l>p.file.length+1&&l-p.file.length<=3});
  if(ai2(p,"assist")&&canAs()&&p.pLoc==="area"&&p.partner.st==="a"&&!p.usedHand&&!hold9()){
    const lvOf=x=>x?(C(x).lv||0):-1;const now=best(false);
    p.file.push(p.partner);const after=best(false);p.file.pop();
    if(plan.assist||ai2(p,"sit2")&&(p.file.length>=6||p.hand.length>=5)||ai2(p,"early6")&&p.file.length>=6||after&&lvOf(after)>lvOf(now)||ai2(p,"assist2")&&fileEv(planned())){await assist(p);await step()}
  }
  let pick1=fin.swift&&!playableReason(p,fin.swift,false)?fin.swift:planned();
  if(pick1){await useFromHand(p,pick1);await step()}
  if(G.over)return;
  const fileCards=()=>p.file.filter(x=>x!==p.partner).length;
  // ネクストヒントは何回でも可。FILEが減るので、FILEに余裕があるときだけ続ける
  for(let n=0;n<4&&!G.over&&!p.noHint&&plan.hint!==false;n++){
    const fc=fileCards(),got=p.hintN>0;
    if(ai2(p,"sit2")&&p.file.length<=4)break; // sit2: FILE4ではほぼネクストヒントをしない
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
  await runAbilities();
  if(G.over)return;
  // 相手が事件を解決編にしていて、次のターンに解決しそうなら、キャラへのアクションをやめて全員で相手の事件にアクションし、証拠を減らして抵抗する
  const oppPot=o.field.reduce((a,y)=>a+(y.st==="a"?lpOf(y):0),0)+(o.pLoc==="area"&&o.partner.st==="a"?lpOf(o.partner):0);
  const thr=ai2(p,"threat2")?threatNext(p,o):null; // threat2: スリープ中のキャラ・パートナー・事件アクション・登場時の効果まで数えた脅威。resist/wary の判定に使う
  if(thr&&!G.sim)dl("threat",{who:p.idx,gainMax:thr.gainMax,gainMin:thr.gainMin,need:thr.need,lethal:thr.lethal,parts:thr.parts});
  const resist=ai2(p,"resist")&&o.solved&&o.ev.length>=o.level-2&&o.ev.length>0||ai2(p,"lose")&&o.solved&&o.ev.length>0&&o.ev.length+oppPot>=o.level||!!thr&&thr.lethal&&o.ev.length>0;
  // 2.8) 出たばかりでもアクションできるキャラ（突撃・迅速）。探索（plan.act）で動かし方を選ぶ。stay は動かさず起こしておく
  const hold=new Set();
  {const rushers=()=>p.field.filter(x=>x.fresh&&x.st==="a"&&x!==p.partner&&(canAct(x,p,"chara")||canAct(x,p,"case"))).sort((a,b)=>apOf(b)-apOf(a));
    const rs=rushers();
    if(rs.length&&G.sim)G.sim.rushSeen=true;
    if(plan.act==="stay")for(const x of rs)hold.add(x);
    else if(plan.act&&!resist&&!fin.on)for(const x of rs){
      for(const way of plan.act==="case"?["case","chara"]:["chara","case"]){
        if(G.over||!p.field.includes(x)||x.st!=="a")break;
        if(way==="chara"){const t=o.field.filter(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(x,p,"chara",y)&&apOf(x)>=apOf(y)).sort((a,b)=>lpOf(b)-lpOf(a)||(C(b).lv||0)-(C(a).lv||0))[0];
          if(t){await declareAction(p,x,t);await step();break}}
        else if(o.ev.length>0&&canAct(x,p,"case")){await declareAction(p,x,"case");await step();break}}}}
  if(G.over)return;
  // sit2: 相手にアクティブなミスリードが2体以上いるなら、先にパートナーで推理して使わせ、スリープしたところをアクションで倒す
  if(ai2(p,"sit2")&&!resist&&p.pLoc==="area"&&p.partner.st==="a"&&!p.solved&&canAct(p.partner,p,"reason")&&o.field.filter(y=>y.st==="a"&&(staticKw(y,o).misread||0)>0).length>=2){await reason(p,p.partner);await step();if(G.over)return}
  // def2: 抵抗モードでも、相手のスリープ中の推理源（LPのあるキャラ）は先に倒す。事件アクションで証拠を1枚削るより、相手の次の手番の獲得量を直接減らせる。
  // 倒せるもの（こちらのAPが対象以上）をLPの大きい順に、いちばん弱いキャラで倒す。倒せないときは従来どおり事件アクション
  if(resist&&ai2(p,"def2")){
    for(;;){
      if(G.over)return;
      const atks=p.field.filter(x=>!hold.has(x)&&canAct(x,p,"chara"));
      const tg=o.field.filter(y=>y.st!=="a"&&y.st!=="x"&&lpOf(y)>=1&&!FX.noTarget(p,y)).sort((a,b)=>lpOf(b)-lpOf(a)||(C(b).lv||0)-(C(a).lv||0));
      let done=false;
      for(const t of tg){const a=atks.filter(x=>apOf(x)>=apOf(t)&&canAct(x,p,"chara",t)).sort((a,b)=>apOf(a)-apOf(b))[0];
        if(a){await declareAction(p,a,t);await step();done=true;break}}
      if(!done)break}
  }
  // 3) キャラへのアクション（勝てる相手）
  for(;!resist&&!fin.on;){
    const atks=p.field.filter(x=>!hold.has(x)&&canAct(x,p,"chara")).sort((a,b)=>apOf(b)-apOf(a));
    // 「必ずガードする」相手のキャラがいれば、APで勝てるキャラでアクションしてガードさせる
    const fg=o.field.find(y=>staticKw(y,o).mustGuard&&canGuardNow(o,y));
    if(fg){const a=p.field.filter(x=>x.st==="a"&&!hold.has(x)&&!staticKw(x,p).bullet&&apOf(x)>=apOf(fg)).sort((a,b)=>apOf(a)-apOf(b))
        .find(x=>o.field.some(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(x,p,"chara",y))||canAct(x,p,"case")&&o.ev.length>0);
      if(a){await declareAction(p,a,o.field.find(y=>y.st!=="a"&&!FX.noTarget(p,y)&&canAct(a,p,"chara",y))||"case");await step();if(G.over)break;continue}}
    let tg=o.field.filter(y=>y.st!=="a"&&!FX.noTarget(p,y)).sort((a,b)=>(C(b).lv||0)-(C(a).lv||0));
    if(ai2(p,"act2"))tg=tg.filter(y=>lpOf(y)>=2||strongChar(y)||(C(y).lv||0)>=6).sort((a,b)=>lpOf(b)-lpOf(a)||(strongChar(b)-strongChar(a))||(C(b).lv||0)-(C(a).lv||0)); // SeEd: LP高い→効果→レベル。倒す価値のないキャラは狙わない
    let done=false;
    for(const t of tg){const a=atks.find(x=>apOf(x)>=apOf(t)&&canAct(x,p,"chara",t));if(a){await declareAction(p,a,t);await step();done=true;break}}
    if(!done||G.over)break;
  }
  if(G.over)return;
  // 4) 事件へのアクション / 推理
  const keep=resist||fin.on?0:p.field.length>=3?1:0;
  let actors=p.field.filter(x=>x.st==="a"&&!hold.has(x)).sort((a,b)=>lpOf(b)-lpOf(a));
  if(ai2(p,"rsnw"))actors.sort((a,b)=>(C(a).lv||0)-(C(b).lv||0)||lpOf(b)-lpOf(a)); // SeEd: 弱いキャラから動かし、強いキャラを起こして残す
  const oppNear=o.solved&&o.ev.length>=o.level-2; // 相手が次のターンに勝ちそう
  // wary（弱い警戒）: 解決編でなくても、迅速・突撃などで証拠を1つ余計に取られて、現場のLP+1で勝たれる形なら、自分の証拠を貯めるより相手の証拠を削る（事件アクション）。ネクストヒントを増やすなどはしない
  const wary=ai2(p,"wary")&&!resist&&o.ev.length>0&&(thr?o.ev.length+thr.gainMax>=o.level:o.ev.length+oppPot+1>=o.level);
  let left=actors.length;
  for(const x of actors){
    if(G.over)return;
    if(left<=keep)break;
    if(ai2(p,"reason")&&x!==p.partner){ // 寝かせると相手にアクションされる。強いキャラや序盤は慎重に
      const late=p.ev.length>=p.level-2;
      const threat=o.field.some(y=>y.st!=="x"&&apOf(y)>=apOf(x));
      if(!late&&threat&&(strongChar(x)||G.turnNo<=4)){continue}}
    if(!fin.on&&o.ev.length>0&&canAct(x,p,"case")&&(resist||wary||ai2(p,"end2")&&oppNear||ai2(p,"mid")&&p.ev.length<p.level-3||ai2(p,"case2")&&(o.ev.length>p.ev.length||G.turnNo<=4&&o.ev.length>=2))){await declareAction(p,x,"case");left--;await step();continue} // SeEd: 遅れていれば事件アクション、先行していれば推理
    if(lpOf(x)>=1&&canAct(x,p,"reason")){await reason(p,x);left--;await step();continue}
    if(!fin.on&&o.ev.length>0&&canAct(x,p,"case")){await declareAction(p,x,"case");left--;await step()}
  }
  if(G.over)return;
  // 5) パートナー
  if(p.pLoc==="area"&&p.partner.st==="a"){
    if(!p.solved&&p.file.length>=6&&!hold9())await assist(p);
    else if(p.solved&&p.ev.length>=p.level&&!FX.noSolve(p))solve(p);
    else if(p.solved&&canAs()&&!(p.ev.length>=p.level))await assist(p);
    else await reason(p,p.partner);
    await step();
  }
  if(G.over)return;
  log(`${p.name} はターン終了`,"n");await step(300);
  if(G.sim){await simTurnEnd();return}
  endTurn();
}


// ---- 対象選びの点数（2026-11-14 回答フォーム30問 → simulator/cpu-judgment-survey-2026-11-14.md）。tgt2（2026-11-15 から既定で有効。AI_OFF に "tgt2" を足すと旧の選び方） ----
// how: "rm"=リムーブ / "bt"=デッキの下 / "st"=スタン。場にいる間に効く強いカード・アクティブなミスリードを最優先で消す。登場時のみは使用済みで優先度が下がる
// スタンは宣言スリープ持ち・登場時のみ向き、デッキの下はカットイン／ヒラメキ／リムーブエリアから回収できるカードを避ける
function tgtInfo(x){const c=C(x),f=c.f||"",L=f.split("\n");
  const decl=L.filter(l=>/【宣言】/.test(l)),pers=L.filter(l=>/【(自分|相手)ターン中】/.test(l)&&!/【現場リムーブ時】/.test(l)),enter=L.some(l=>/【登場時】/.test(l));
  return {pers:pers.length>0,decl:decl.length>0,declSleep:decl.some(l=>/【スリープ】/.test(l)),enterOnly:enter&&!pers.length&&!decl.length,
    helper:[...decl,...pers].some(l=>/(他の|自分の)[^。]{0,14}キャラ/.test(l)),recur:/【カットイン】|【ヒラメキ】|リムーブエリア/.test(f)}}
function aiTgtScore(p,x,how){
  let v=lvOf(x)*10+apOf(x)/1000;if(!ai2(p,"tgt2")||!how)return v;
  const i=tgtInfo(x),mis=(staticKw(x,ownerOf(x))||{}).misread||0,hot=!!p.solved;
  if(how==="st"){if(x.st==="x")return -999;
    v=lvOf(x)*6+(C(x).lp||0)*4+apOf(x)/1000;
    if(i.declSleep)v+=30;else if(i.decl)v+=10;if(i.enterOnly)v+=12;if(i.pers)v-=25;if(i.helper)v-=20;if(mis&&x.st==="a")v+=10;return v}
  if(i.pers)v+=35;if(mis&&x.st==="a")v+=(hot?40:20)*mis;if(i.helper)v+=15;if(i.decl&&!i.declSleep)v+=6;
  if(i.enterOnly)v-=25;if(how==="bt"&&i.recur)v-=45;if(how==="rm"&&i.recur)v+=10;return v}
