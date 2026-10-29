"use strict";
// ================= 探索（試作） =================
// CPUの手番のはじめに、盤面をコピーして「出すカード」と「ネクストヒントをするか」の組み合わせを試す。
// 試しの手番は相手の次のターンの終わりまで進めて点数をつけ、いちばん良かった組み合わせで本番の手番を行う。
// 動くのは window.SEARCH が true か、cfg.search[席] が true のときだけ（普段はオフ）。
// 注意: 試しの手番では相手もCPUとして動き、相手の手札（カットイン）も見えている
function searchOn(p){return !!(window.SEARCH||G.cfg.search&&G.cfg.search[p.idx])}

// 盤面の点数（me から見て）。勝ち負けが最優先、次に証拠、現場、手札、FILE
function evalState(me){
  const p=G.P[me],o=G.P[1-me];
  if(G.over)return G.winner===me?1e5:-1e5;
  const side=q=>{let v=0;for(const x of q.field)v+=(C(x).lv||0)*8+apOf(x)/250+lpOf(x)*25+(x.st==="a"?15:0);return v};
  const ev=q=>q.ev.length*60+(q.solved?40:0)+(q.solved&&q.ev.length>=q.level?300:0);
  return ev(p)-ev(o)+side(p)-side(o)+(p.hand.length-o.hand.length)*12+(Math.min(p.file.length,9)-Math.min(o.file.length,9))*6;
}
// 試す組み合わせ: 今のCPUのまま / 出せるカードそれぞれ / 何も出さない × ネクストヒントあり・なし
function turnPlans(p){
  const base=[{}],seen=new Set();
  for(const x of p.hand){
    if(seen.has(x.n)||playableReason(p,x,false)||!(C(x).t==="キャラ"||FX.eventAi(p,x)))continue;
    seen.add(x.n);base.push({play:x.n})}
  base.push({play:"none"});
  return base.flatMap(pl=>[pl,{...pl,hint:false}]);
}
// 盤面をコピーして1つの組み合わせを試す。終わったら元の盤面に戻す
async function rollout(p,plan){
  const real=G;
  const g=structuredClone({...real,rec:null,undo:[],ui:{mode:null}});
  g.sim={plan,planFor:p.idx,next:null,stage:0};for(const q of g.P)q.cpu=true;
  G=g;let v;
  try{await cpuTurn(g.P[p.idx]);if(g.sim.next)await g.sim.next;v=evalState(p.idx)}
  catch(e){console.warn("search",e);v=-1e9}
  finally{G=real}
  return v;
}
// 試しの手番の終わり: 1回目（自分の手番）は相手の手番へ進め、2回目（相手の手番）はそこで止める
async function simTurnEnd(){if(G.sim.stage)return;G.sim.stage=1;await endTurn()}
async function chooseTurnPlan(p){
  const plans=turnPlans(p);if(plans.length<=2)return null;
  let best=null,bv=-Infinity;
  for(const pl of plans){const v=await rollout(p,pl);if(v>bv){bv=v;best=pl}} // 同点なら先に試した方（今のCPUのまま）
  G.searchN=(G.searchN||0)+1;if(best&&Object.keys(best).length)G.searchChanged=(G.searchChanged||0)+1;
  return best;
}
