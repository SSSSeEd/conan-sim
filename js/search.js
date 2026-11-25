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
  // eval3（段階④）: 証拠1つの価値を、事件レベルに近いほど高くする（あと3つ以内の証拠は +40）。序盤の証拠は安く、終盤の証拠は高い
  //   SeEd 11/25「証拠2つしかないならガードで守っても美味しくない」: 少ない証拠を守る価値を下げ、勝ちに近い証拠の取り合いを重く見る
  const ev=q=>q.ev.length*60+(ai2(G.P[me],"eval3")?40*Math.max(0,q.ev.length-(q.level-3)):0)+(q.solved?40:0)+(q.solved&&q.ev.length>=q.level?300:0);
  let v=ev(p)-ev(o)+side(p)-side(o)+(p.hand.length-o.hand.length)*12+(Math.min(p.file.length,9)-Math.min(o.file.length,9))*6;
  // eval2（段階④）: 試しの終わり（相手の手番の終わり＝次は自分の手番）で、次の自分の手番に勝てそうなら加点、その次の相手の手番に勝たれそうなら減点
  //   threatNext の見積り（現場のLP＋パートナー＋登場時の証拠、ガード役・ミスリードで減らした値 gainMin）を使う
  if(ai2(p,"eval2")){const mine=threatNext(o,p),theirs=threatNext(p,o);
    v+=(mine.lethalMin?200:mine.lethal?80:0)-(theirs.lethalMin?150:theirs.lethal?60:0)}
  return v;
}
// 試す組み合わせ: 今のCPUのまま / 出せるカードそれぞれ / 何も出さない × ネクストヒントあり・なし
// アシストしてから出せるカードも試す（plan.assist）。最初の手番は何も出さない組み合わせを試さない（SeEd: 1ターン目は使えるなら使う）
function turnPlans(p){
  const base=[{}],seen=new Set();const ok=x=>C(x).t==="キャラ"||FX.eventAi(p,x);
  for(const x of p.hand){
    if(seen.has(x.n)||playableReason(p,x,false)||!ok(x))continue;
    seen.add(x.n);base.push({play:x.n})}
  if((!p.solved||p.file.length<9)&&p.pLoc==="area"&&p.partner.st==="a"&&!p.usedHand){
    p.file.push(p.partner);
    for(const x of p.hand){if(seen.has(x.n)||playableReason(p,x,false)||!ok(x))continue;seen.add(x.n);base.push({play:x.n,assist:1})}
    p.file.pop()
    // fileplan: すでに出せるが、効果がFILE数を参照するカードは、アシストしてから出すほうが良いかもしれないので、その手も試す（SeEd）
    for(const x of p.hand){if(playableReason(p,x,false)||!ok(x)||!/FILE/.test(C(x).f||""))continue;
      if(!base.some(b=>b.play===x.n&&b.assist))base.push({play:x.n,assist:1})}
  }
  if(!(G.turnNo<=2&&base.length>1))base.push({play:"none"});
  // 事件・キャラの宣言能力が使えるなら、手札を使う前に能力を使う組み合わせも試す（事件の能力でリムーブエリアから手札に加えたカードを同じ手番で使うため）
  // ab2: 能力の使うかどうかも探索する。ab:"none"=能力を使わない、ab:"force"=CPUの目安（aiCan）が「使わない」でも使える能力は全部使う
  const abs=[...p.field,p.caseC,...p.hand,...areaCards(p)].flatMap(x=>FX.abilities(p,x).filter(ab=>ab.ok&&!ab.noAi).map(ab=>[x,ab]));
  const abNow=abs.some(([x,ab])=>!ab.aiCan||ab.aiCan(p,x));
  const abSkipped=abs.some(([x,ab])=>ab.aiCan&&!ab.aiCan(p,x));
  let all=abNow?base.flatMap(pl=>[pl,{...pl,abFirst:true}]):base;
  if(abs.length){
    all=[...all,...base.map(pl=>({...pl,ab:"none"}))];
    if(abSkipped)all=[...all,...base.flatMap(pl=>[{...pl,ab:"force"},{...pl,ab:"force",abFirst:true}])]}
  return all.flatMap(pl=>[pl,{...pl,hint:false}]);
}
// 盤面をコピーして1つの組み合わせを試す。終わったら元の盤面に戻す
async function rollout(p,plan,deal){
  const real=G;
  const g=structuredClone({...real,rec:null,dlog:null,undo:[],ui:{mode:null}});
  g.sim={plan,planFor:p.idx,next:null,stage:0};for(const q of g.P)q.cpu=true;
  // 相手の手札は見えないので、相手の手札とデッキを混ぜて配り直す（同じ枚数）
  const o=g.P[1-p.idx];
  if(deal){const r=stratDeal(o,deal);o.hand=r.hand;o.deck=r.deck} // strat: 場合分けした配り方
  else{const pool=shuffle([...o.hand,...o.deck]);o.hand=pool.slice(0,o.hand.length);o.deck=pool.slice(o.hand.length)}
  ROLL_DEALT_T=o.hand.some(x=>stratThr(o,x)); // strat2 用: この配り方に「出たターンに証拠を増やせるキャラ」が入ったか
  G=g;let v;
  try{await cpuTurn(g.P[p.idx]);if(g.sim.next)await g.sim.next;v=evalState(p.idx)}
  catch(e){console.warn("search",e);v=-1e9}
  finally{G=real}
  if(g.sim.rushSeen)ROLL_RUSH=true; // この手番に、起きたまま（突撃・迅速で）アクションできるキャラがいた → アクション先も試す
  return v;
}
// multi: 1つの案を、相手の手札の配り直しを変えて ROLL_K 回（既定3）試し、平均の点数で比べる（1回だと配り直しの運で点数が揺れ、良い案を選び損ねる）
// 2026-11-24 bench 4000戦（環境デッキ16）: 1回に対して 3回 54.1%（52.8〜55.4）、5回 54.3%（53.0〜55.7）→ 3回を既定に（5回は時間が1.5倍で差なし）
// strat（SeEd 11/25 の案）: 配り直しをランダムに3回ではなく、相手の手札を場合分けして試す。
//   ①出たターンに証拠を増やせるキャラ（突撃・迅速・登場時に証拠）がある ②①は無いがAP＋2000以上のカットインがある ③どちらも無い
//   それぞれの起こりやすさ（相手の見えないカード＝手札＋デッキの中の枚数から計算）で重みをつけて平均する
const stratThr=(o,x)=>{const c=C(x);return c.t==="キャラ"&&(c.lv||0)<=Math.min(9,o.file.length+3)&&(/〚突撃|〚迅速/.test(c.f||"")||/【登場時】[^\n]*証拠を/.test(c.f||""))};
const stratCut=(o,x)=>(cutinAp(x,o)||0)>=2000;
const pNone=(n,k,h)=>{let q=1;for(let i=0;i<h;i++)q*=Math.max(0,n-k-i)/(n-i);return q}; // n枚からh枚引いて、k枚の当たりが1枚も入らない確率
// 場合分けと重み（本番の盤面から計算）。配り方そのものは stratDeal で、試しの盤面（コピー）のカードを使って作る
//   （本番のカードを試しの盤面に入れると、試しの手番が本番のカードを書き換えてしまう）
function stratSplit(o){const pool=[...o.hand,...o.deck],h=o.hand.length;
  const T=pool.filter(x=>stratThr(o,x)),rest=pool.filter(x=>!stratThr(o,x)),Cu=rest.filter(x=>stratCut(o,x)),N=rest.filter(x=>!stratCut(o,x));
  return {pool,h,T,rest,Cu,N}}
function stratDeals(o){
  const {pool,h,T,rest,Cu,N}=stratSplit(o),n=pool.length;if(!h||!n)return null;
  const qT=1-pNone(n,T.length,h),qC=1-pNone(rest.length,Cu.length,h);
  const out=[];
  if(T.length)out.push({w:qT,kind:"T"});
  if(Cu.length)out.push({w:(1-qT)*qC,kind:"C"});
  if(N.length>=h)out.push({w:(1-qT)*(1-qC),kind:"N"});
  const sw=out.reduce((a,s)=>a+s.w,0);if(out.length<2||sw<=0)return null;
  for(const s of out)s.w/=sw;return out}
function stratDeal(o,kind){
  const {pool,h,T,rest,Cu,N}=stratSplit(o);let hand;
  if(kind==="N")hand=shuffle(N.slice()).slice(0,h);
  else{const must=kind==="T"?T:Cu,from=kind==="T"?pool:rest;const m=must[Math.floor(Math.random()*must.length)];
    hand=[m,...shuffle(from.filter(x=>x!==m)),...shuffle(pool.filter(x=>x!==m&&!from.includes(x)))].slice(0,h)}
  const hs=new Set(hand);return {hand,deck:shuffle(pool.filter(x=>!hs.has(x)))}}
async function rolloutN(p,plan){
  if(ai2(p,"strat")){const ss=stratDeals(G.P[1-p.idx]);
    if(ss){let v=0;for(const s of ss)v+=s.w*await rollout(p,plan,s.kind);return v}}
  if(!ai2(p,"multi"))return rollout(p,plan);
  const K=window.ROLL_K||3;let s=0,anyT=false;for(let k=0;k<K;k++){s+=await rollout(p,plan);anyT=anyT||ROLL_DEALT_T}
  // strat2（SeEd 11/25）: ランダムK回の中に「出たターンに証拠を増やせるキャラ（突撃・迅速・登場時に証拠）」を持つ配り方が1回も無く、
  //   相手がそれを持っている可能性があるなら、その場合を1回足す。点数は (持たない確率)×K回の平均 ＋ (持つ確率)×足した1回
  if(ai2(p,"strat2")&&!anyT){const o=G.P[1-p.idx],sp=stratSplit(o);
    if(sp.h&&sp.T.length){const qT=1-pNone(sp.pool.length,sp.T.length,sp.h);return (1-qT)*(s/K)+qT*await rollout(p,plan,"T")}}
  return s/K}
let ROLL_DEALT_T=false;
// 試しの手番の終わり: 1回目（自分の手番）は相手の手番へ進め、2回目（相手の手番）はそこで止める
async function simTurnEnd(){if(G.sim.stage)return;G.sim.stage=1;await endTurn()}
// 対戦記録（rec.search）に、探索が各組み合わせに付けた点数を残す。疑問のある行動を後から調べる用（node tools/scores.js 記録.json）
function recSearch(p,tried,best){
  if(!G.rec)return;
  const label=pl=>[pl.play==="none"?"何も出さない":pl.play?(C({n:pl.play}).nm||pl.play):"今のCPU",pl.assist&&"アシスト先",pl.abFirst&&"能力先",pl.ab&&"能力:"+({none:"使わない",force:"全部使う"})[pl.ab],pl.act&&"アクション:"+({chara:"キャラ優先",case:"事件優先",stay:"しない"})[pl.act],pl.order&&"アクション先",pl.stance&&"構え:"+({defend:"守り",attack:"攻め"})[pl.stance],pl.keep===0&&"ガード役なし",pl.hint===false&&"ヒントなし"].filter(Boolean).join("+");
  (G.rec.search=G.rec.search||[]).push({t:G.turnNo,who:p.idx,pick:label(best||{}),plans:tried.map(([pl,v])=>[label(pl),Math.round(v)])});
  dl("search",{who:p.idx,pick:label(best||{}),plans:tried.map(([pl,v])=>[label(pl),Math.round(v)])});
}
// アクションの出し方（plan.act）。突撃・迅速で出たばかりでもアクションできるキャラ（x.fresh）の動かし方を変えて試す
//   chara: キャラへのアクションを優先（倒せる相手なら価値を問わず）、無ければ事件 / case: 事件へのアクションを優先 / stay: アクションしない（起こしたまま）
// 突撃は手札を出したあとに付くことが多く、手番のはじめにはわからない。そこで、まず出し方の組み合わせを試し、
// 試しの中で「出たばかりでアクションできるキャラ」がいたときだけ、いちばん良かった組み合わせにアクションの出し方を足して試す
const ACT_MODES=["chara","case","stay"];
const STANCES=["defend","attack"]; // 構え（plan.stance）: defend=抵抗する / attack=抵抗も警戒もしない。無し=今の判定のまま
let ROLL_RUSH=false;
// rushb の加点（アクションの出し方で突撃・迅速のキャラを動かす案に+400）。いちばん良かった案に何かを足して試すときも、同じ加点で比べる
//   （11/25 まで: 足した案には加点が無く、元の案が加点ありで比べられていたため、order・stance・keep2 はほぼ選ばれなかった）
const rushB=(p,pl)=>ai2(p,"fair")&&pl.act&&pl.act!=="stay"?(window.RUSH_BONUS??400):0;
async function chooseTurnPlan(p){
  const plans=turnPlans(p);
  let best=null,bv=-Infinity;
  const tried=[];ROLL_RUSH=false;
  const thr=ai2(p,"stance")?threatNext(p,opp(p)):null,danger=!!thr&&thr.lethal; // stance: 相手が次の手番で勝てそうな見込み（最大値）なら、構えも試す
  if(plans.length<=2){ // 選択肢は無いが、突撃キャラがいるか（と構えを試すか）だけ見る
    const v=await (danger?rolloutN:rollout)(p,plans[0]);if(!ROLL_RUSH&&!danger)return null;best=plans[0];bv=v;tried.push([best,v])}
  else for(const pl of plans){const v=await rolloutN(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}} // 同点なら先に試した方（今のCPUのまま）
  if(ROLL_RUSH&&!(G.cfg.noAct&&G.cfg.noAct[p.idx])){const b0=best;
    for(const act of ACT_MODES){const pl={...b0,act},v=await rolloutN(p,pl);tried.push([pl,v]);
      // rushb: 突撃・迅速で出たばかりのキャラを動かす手に加点する（SeEd: 突撃を付けても動かさないのは「付けること」で満足している。付けたなら動かす）
      const vv=act!=="stay"?v+(window.RUSH_BONUS??400):v;if(vv>bv){bv=vv;best=pl}}}
  // order（実験）: いちばん良かった案に「アクションを先にする」行動順を足して試す（場にアクションできるキャラがいるときだけ）
  if(ai2(p,"order")&&best&&p.field.some(x=>x.st==="a"&&x!==p.partner&&(canAct(x,p,"chara")||canAct(x,p,"case")||canAct(x,p,"reason")))){
    const pl={...best,order:"act"},v=await rolloutN(p,pl)+rushB(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}}
  // stance（実験）: いちばん良かった案に「守り」（全員で相手の事件を削る）と「攻め」（守りに入らない）の構えを足して試す。
  // 守りの発動条件（resist / threat2 / wary）を手書きの閾値で決めるのではなく、試して良い方を選ぶ（設計: notes/cpu-architecture-plan-2026-11-24.md の段階4）
  if(danger){const b0=best;
    for(const stance of STANCES){const pl={...b0,stance},v=await rolloutN(p,pl)+rushB(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}}}
  // keep2（段階④、SeEd 11/25: ガード役は残したら偉いくらいで必須ではない。証拠が少ないなら守っても美味しくない）:
  //   現場3体以上（今のCPUはガード役を1体残す）なら、いちばん良かった案に「ガード役を残さない」を足して試す
  if(ai2(p,"keep2")&&best&&p.field.length>=3){const pl={...best,keep:0},v=await rolloutN(p,pl)+rushB(p,pl);tried.push([pl,v]);if(v>bv){bv=v;best=pl}}
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
  const base=structuredClone({...G,rec:null,dlog:null,undo:[],ui:{mode:null}});for(const q of base.P)q.cpu=true;
  const o=base.P[1-p.idx],pool=shuffle([...o.hand,...o.deck]);o.hand=pool.slice(0,o.hand.length);o.deck=pool.slice(o.hand.length);
  const d0=await simFrom(base,p,0);if(d0.v==null)return;
  const T=window.COMBOS=window.COMBOS||{};
  for(let i=0;i<M;i++){const r=await simFrom(base,p,0.35);if(r.v==null||r.devs.length!==1)continue;
    const k=r.devs[0],g=Math.max(-2000,Math.min(2000,r.v-d0.v)),t=T[k]=T[k]||{n:0,sum:0,up:0};t.n++;t.sum+=g;if(g>0)t.up++}
}
