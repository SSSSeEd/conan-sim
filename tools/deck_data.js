// デッキ別CPUのための対戦データ集め（段階⑤）。設計: notes/cpu-architecture-plan-2026-11-24.md（プロジェクト共有フォルダ）
// 使い方: node tools/deck_data.js デッキ名 [試合数=2000] [--eps 0.3] [--seed N] [--jobs N] [--ai +deck,+deckL] > 出力.jsonl 2> 進捗.txt
//   デッキ名: 環境デッキかプリセットの名前（例: 青単少年探偵団 / スタンキッド11/20）。相手は bench と同じ環境デッキ16種からくじ
// 仕組み（ランダム化比較）: 対象デッキの手番のうち eps の割合で、探索をせずに「出すカード（＋先にアシストするか）」をくじで選ぶ。
//   くじで選んだので、「その手番にカードXを選んだ試合」と「別の手を選んだ試合」の勝率の差は、Xを選んだこと自体の効果と見なせる
//   （普通の対戦の記録から数えると、勝っているときほど重いカードを出せるので、原因と結果が逆に見える）。分析は tools/deck_learn.js
// 出力: 1行1試合 {i,seat,opp,win,turns,T:[手番ごと]}。手番: t=ターン, ph=局面(early/mid/late), f=FILE, sv=解決編, ev/oev=証拠, lv=事件レベル,
//   rm=リムーブの枚数, fd=現場の数, h=手札の数, c=選べた案（"カード番号" か "A:カード番号"=アシストしてから。none=出さない）,
//   x=1 ならくじの手番, k=選んだ案（くじの手番だけ）, u=実際に手札から使ったカード（ヒント後も含む）, a=行動の回数
"use strict";
const os=require("os"),{fork}=require("child_process");
const {offFor,deckPool}=require("./bench");

function parseArgs(argv){
  const o={deck:argv[0],games:2000,eps:0.3,seed:1,jobs:os.cpus().length,ai:"none"};
  for(let i=1;i<argv.length;i++){const a=argv[i];
    if(a==="--eps")o.eps=+argv[++i];else if(a==="--seed")o.seed=+argv[++i];else if(a==="--jobs")o.jobs=+argv[++i];
    else if(a==="--ai")o.ai=argv[++i];else if(/^\d+$/.test(a))o.games=+a;else throw new Error("不明な引数: "+a)}
  if(!o.deck)throw new Error("デッキ名を指定してください");
  return o}
const ACT_RE=[["as",/^. はアシスト/],["hi",/^. はネクストヒント/],["re",/^. の .+ が推理（LP/],["ca",/^. の .+がアクション → 事件$/],["ch",/^. の .+がアクション → (?!事件$)/]];
const planKey=pl=>(pl.assist?"A:":"")+(pl.play||"auto");

async function worker({deck,from,to,seed,eps,ai}){
  const H=require("./headless");
  const w=H.load({seed,init:{AI_OFF:[]}});
  const AI_OFF0=w.ev("AI_OFF0"),offT=offFor(ai,AI_OFF0),pool=deckPool(w,"env");
  const all=[...w.ev("PRESETS"),...w.ENV_DECKS.decks],me=all.find(d=>d.name===deck);
  if(!me)throw new Error("デッキが見つからない: "+deck);
  let seat=-1,T=null,cur=null;const R=Math.random,DP=w.ev("deckPhase"); // くじは試合の乱数と別（試合の乱数の並びを変えない）
  const real=()=>{const g=w.__G();return g&&!g.sim};
  // 手番のはじめ（探索の前）に、局面と選べる案を記録し、eps の割合でくじを引く
  const ctp=w.chooseTurnPlan;
  w.chooseTurnPlan=async function(p){
    if(!real()||p.idx!==seat)return ctp.apply(this,arguments);
    const o=w.__G().P[1-p.idx];
    const cands=w.turnPlans(p).filter(pl=>Object.keys(pl).every(k=>k==="play"||k==="assist")&&pl.play);
    cur.c=cands.map(planKey);
    if(cands.length>1&&R()<eps){const pl=cands[Math.floor(R()*cands.length)];cur.x=1;cur.k=planKey(pl);return {...pl}}
    return ctp.apply(this,arguments)};
  const uh=w.useFromHand;w.useFromHand=async function(p,x){if(real()&&p.idx===seat&&cur)cur.u.push(x.n);return uh.apply(this,arguments)};
  const log0=w.log;w.log=(m,c)=>{if(real()&&cur&&typeof m==="string"&&m[0]===(seat?"B":"A")){for(const [n,re] of ACT_RE)if(re.test(m))cur.a[n]=(cur.a[n]||0)+1}
    // 手番の切れ目: 「— Nターン目: 名前 —」
    const g=w.__G();if(real()&&typeof m==="string"&&/^— \d+ターン目/.test(m)&&g){const p=g.P[g.turn];
      if(p.idx===seat){cur={t:g.turnNo,u:[],a:{}};T.push(cur)}else cur=null}
    return log0(m,c)};
  // 局面は手番のはじめ（ドローとFILEのあと）で取りたいので、探索の直前に上書きする
  const cp=w.choosePlan;w.choosePlan=async function(p){
    if(real()&&p.idx===seat&&cur){const o=w.__G().P[1-p.idx];
      Object.assign(cur,{ph:DP(p),f:p.file.length,sv:p.solved?1:0,ev:p.ev.length,oev:o.ev.length,lv:p.level,rm:p.rm.length,fd:p.field.length,h:p.hand.length})}
    return cp.apply(this,arguments)};
  for(let i=from;i<to;i++){
    const s=(seed*1000003+i*7919)>>>0;w.reseed(s);
    const b=Math.floor(w.rnd()*pool.length);seat=i%2;T=[];cur=null;
    const ds=[];ds[seat]=w.parseDeckText(me.text);ds[1-seat]=w.parseDeckText(pool[b].text);
    const off=[];off[seat]=offT;off[1-seat]=[...AI_OFF0];
    let r;
    try{const {winner,turns}=await H.play(w,{decks:ds,search:[true,true],aiOff:off});r={i,seat,opp:pool[b].name,win:winner===null?0.5:winner===seat?1:0,turns,T}}
    catch(e){r={i,seat,opp:pool[b].name,err:String(e).slice(0,160)}}
    process.send({row:r})}
  process.send({done:1})}

async function main(){
  const o=parseArgs(process.argv.slice(2));const t0=Date.now();
  const J=Math.max(1,Math.min(o.jobs,o.games)),per=Math.ceil(o.games/J);let n=0,next=0,wins=0;
  await Promise.all(Array.from({length:J},(_,j)=>new Promise((res,rej)=>{
    const from=j*per,to=Math.min(o.games,from+per);if(from>=to)return res();
    const c=fork(__filename,["--worker"],{stdio:["ignore","ignore","inherit","ipc"]});
    c.on("message",m=>{if(m.row){process.stdout.write(JSON.stringify(m.row)+"\n");n++;wins+=m.row.win||0;
        if(n>=next){next+=Math.max(1,Math.round(o.games/10));const sec=(Date.now()-t0)/1000;
          console.error(`進捗 ${n}/${o.games}戦 経過${Math.round(sec/60)}分 残り約${Math.round(sec/n*(o.games-n)/60)}分 勝率${(wins/n*100).toFixed(1)}%`)}}
      else if(m.done){res();c.kill()}});
    c.on("error",rej);c.on("exit",code=>{if(!code)res();else rej(new Error("worker exit "+code))});
    c.send({deck:o.deck,from,to,seed:o.seed,eps:o.eps,ai:o.ai})})));
  console.error(`完了 ${n}戦 ${Math.round((Date.now()-t0)/1000)}秒`)}
if(process.argv[2]==="--worker")process.on("message",m=>{worker(m).catch(e=>{console.error(e.stack);process.exit(1)})});
else main().catch(e=>{console.error(e.message);process.exit(1)});
module.exports={planKey};
