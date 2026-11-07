"use strict";
// ================= 探索 =================
// CPUの手番のはじめに、盤面をコピーして「出すカード」と「ネクストヒントをするか」の組み合わせを試す。
// 試しの手番は相手の次のターンの終わりまで進めて点数をつけ、いちばん良かった組み合わせで本番の手番を行う。
// CPUの席では普段からオン（観戦モードの両方のCPUも）。cfg.search[席] で席ごとに切り替え、window.SEARCH=true なら全部の席でオン。
// 試しの手番では相手もCPUとして動く。相手の手札は見えないので、手札とデッキを混ぜて配り直してから試す
function searchOn(p){if(window.SEARCH)return true;const s=G.cfg.search;return s?!!s[p.idx]:!!p.cpu}

// 盤面の点数（me から見て）。勝ち負けが最優先、次に証拠、現場、手札、FILE
function evalState(me){
  const p=G.P[me],o=G.P[1-me];
  if(G.over)return G.winner===me?1e5:-1e5;
  // キーワードの価値: 突撃・迅速は出したばかりでも動ける、ブレットはガードされない、ミスリードは相手の推理を減らす
  const noAct=!!(G.cfg.noAct&&G.cfg.noAct[me]); // 比較実験用（tools/vs.js の search-noact）: 突撃などの価値とアクションの出し方を使わない旧探索
  const side=q=>{let v=0;for(const x of q.field){v+=(C(x).lv||0)*8+apOf(x)/250+lpOf(x)*25+(x.st==="a"?15:0);
    if(noAct)continue;const k=staticKw(x,q);v+=(k.rush?14:0)+(k.rushC||k.rushE?8:0)+(k.swift?14:0)+(k.bullet?10:0)+k.misread*6}return v};
  const ev=q=>q.ev.length*60+(q.solved?40:0)+(q.solved&&q.ev.length>=q.level?300:0);
  return ev(p)-ev(o)+side(p)-side(o)+(p.hand.length-o.hand.length)*12+(Math.min(p.file.length,9)-Math.min(o.file.length,9))*6;
}
// 試す組み合わせ: 今のCPUのまま / 出せるカードそれぞれ / 何も出さない × ネクストヒントあり・なし
// アシストしてから出せるカードも試す（plan.assist）。最初の手番は何も出さない組み合わせを試さない（SeEd: 1ターン目は使えるなら使う）
function turnPlans(p){
  const base=[{}],seen=new Set();const ok=x=>C(x).t==="キャラ"||FX.eventAi(p,x);
  for(const x of p.hand){
    if(seen.has(x.n)||playableReason(p,x,false)||!ok(x))continue;
    seen.add(x.n);base.push({play:x.n})}
  if(ai2(p,"assist2")&&!p.solved&&p.pLoc==="area"&&p.partner.st==="a"&&!p.usedHand){
    p.file.push(p.partner);
    for(const x of p.hand){if(seen.has(x.n)||playableReason(p,x,false)||!ok(x))continue;seen.add(x.n);base.push({play:x.n,assist:1})}
    p.file.pop()}
  if(!(ai2(p,"assist2")&&G.turnNo<=2&&base.length>1))base.push({play:"none"});
  // 事件・キャラの宣言能力が使えるなら、手札を使う前に能力を使う組み合わせも試す（事件の能力でリムーブエリアから手札に加えたカードを同じ手番で使うため）
  const abNow=[...p.field,p.caseC,...p.hand,...(p.pLoc==="area"?[p.partner]:[])].some(x=>FX.abilities(p,x).some(ab=>ab.ok&&!ab.noAi&&(!ab.aiCan||ab.aiCan(p,x))));
  const all=abNow?base.flatMap(pl=>[pl,{...pl,abFirst:true}]):base;
  return all.flatMap(pl=>[pl,{...pl,hint:false}]);
}
// 盤面をコピーして1つの組み合わせを試す。終わったら元の盤面に戻す
async function rollout(p,plan){
  const real=G;
  const g=structuredClone({...real,rec:null,undo:[],ui:{mode:null}});
  g.sim={plan,planFor:p.idx,next:null,stage:0};for(const q of g.P)q.cpu=true;
  // 相手の手札は見えないので、相手の手札とデッキを混ぜて配り直す（同じ枚数）
  const o=g.P[1-p.idx],pool=shuffle([...o.hand,...o.deck]);o.hand=pool.slice(0,o.hand.length);o.deck=pool.slice(o.hand.length);
  G=g;let v;
  try{await cpuTurn(g.P[p.idx]);if(g.sim.next)await g.sim.next;v=evalState(p.idx)}
  catch(e){console.warn("search",e);v=-1e9}
  finally{G=real}
  if(g.sim.rushSeen)ROLL_RUSH=true; // この手番に、起きたまま（突撃・迅速で）アクションできるキャラがいた → アクション先も試す
  return v;
}
// 試しの手番の終わり: 1回目（自分の手番）は相手の手番へ進め、2回目（相手の手番）はそこで止める
async function simTurnEnd(){if(G.sim.stage)return;G.sim.stage=1;await endTurn()}
// 対戦記録（rec.search）に、探索が各組み合わせに付けた点数を残す。疑問のある行動を後から調べる用（node tools/scores.js 記録.json）
function recSearch(p,tried,best){
  if(!G.rec)return;
  const label=pl=>[pl.play==="none"?"何も出さない":pl.play?(C({n:pl.play}).nm||pl.play):"今のCPU",pl.assist&&"アシスト先",pl.abFirst&&"能力先",pl.act&&"アクション:"+({chara:"キャラ優先",case:"事件優先",stay:"しない"})[pl.act],pl.hint===false&&"ヒントなし"].filter(Boolean).join("+");
  (G.rec.search=G.rec.search||[]).push({t:G.turnNo,who:p.idx,pick:label(best||{}),plans:tried.map(([pl,v])=>[label(pl),Math.round(v)])});
}
// アクションの出し方（plan.act）。突撃・迅速で出たばかりでもアクションできるキャラ（x.fresh）の動かし方を変えて試す
//   chara: キャラへのアクションを優先（倒せる相手なら価値を問わず）、無ければ事件 / case: 事件へのアクションを優先 / stay: アクションしない（起こしたまま）
// 突撃は手札を出したあとに付くことが多く、手番のはじめにはわからない。そこで、まず出し方の組み合わせを試し、
// 試しの中で「出たばかりでアクションできるキャラ」がいたときだけ、いちばん良かった組み合わせにアクションの出し方を足して試す
const ACT_MODES=["chara","case","stay"];
let ROLL_RUSH=false;
async function chooseTurnPlan(p){
  const plans=turnPlans(p);
  let best=null,bv=-Infinity;
  const tried=[];ROLL_RUSH=false;
  if(plans.length<=2){ // 選択肢は無いが、突撃キャラがいるかだけ見る
    const v=await rollout(p,plans[0]);if(!ROLL_RUSH)return null;best=plans[0];bv=v;tried.push([best,v])}
  else for(const pl of plans){const v=await rollout(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}} // 同点なら先に試した方（今のCPUのまま）
  if(ROLL_RUSH&&!(G.cfg.noAct&&G.cfg.noAct[p.idx])){const b0=best;
    for(const act of ACT_MODES){const pl={...b0,act},v=await rollout(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}}}
  recSearch(p,tried,best);
  G.searchN=(G.searchN||0)+1;if(best&&Object.keys(best).length)G.searchChanged=(G.searchChanged||0)+1;
  return best;
}

// ================= コンボ探し =================
// 試しの手番の中で、CPUの判断（カットイン・「はい／いいえ」・宣言能力）を1か所だけ変えてみる。
// 今のCPUのままの試しと点数を比べ、上がった変え方を集計する（window.COMBOS）
function explore(p,kind,opts,def,label){
  const s=G.sim;if(!s||!s.explore||p.idx!==s.planFor||G.turn!==p.idx&&kind!=="カットイン"||opts.length<2)return def;
  if(s.devs.length||Math.random()>s.explore)return def;
  const others=opts.map((_,i)=>i).filter(i=>i!==def);const i=others[Math.floor(Math.random()*others.length)];
  s.devs.push(`${kind}｜${label(opts[i])}`);return i;
}
async function simFrom(base,p,explore){
  const real=G;const g=structuredClone(base);g.sim={plan:{},planFor:p.idx,next:null,stage:0,explore,devs:[]};
  G=g;let v;
  try{await cpuTurn(g.P[p.idx]);if(g.sim.next)await g.sim.next;v=evalState(p.idx)}
  catch(e){console.warn("combo",e);v=null}
  finally{G=real}
  return {v,devs:g.sim.devs};
}
async function findCombos(p,M=12){
  const base=structuredClone({...G,rec:null,undo:[],ui:{mode:null}});for(const q of base.P)q.cpu=true;
  const o=base.P[1-p.idx],pool=shuffle([...o.hand,...o.deck]);o.hand=pool.slice(0,o.hand.length);o.deck=pool.slice(o.hand.length);
  const d0=await simFrom(base,p,0);if(d0.v==null)return;
  const T=window.COMBOS=window.COMBOS||{};
  for(let i=0;i<M;i++){const r=await simFrom(base,p,0.35);if(r.v==null||r.devs.length!==1)continue;
    const k=r.devs[0],g=Math.max(-2000,Math.min(2000,r.v-d0.v)),t=T[k]=T[k]||{n:0,sum:0,up:0};t.n++;t.sum+=g;if(g>0)t.up++}
}
