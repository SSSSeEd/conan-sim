// CPUの改良を測る道具（ペア比較・並列・誤差幅つき）。設計: notes/cpu-architecture-plan-2026-11-24.md（プロジェクト共有フォルダ）
// 使い方: node tools/bench.js 機能 [組数] [オプション]
//   機能: +x=既定オフの x をオンにしたCPU / -x=既定オンの x をオフにしたCPU / カンマで複数（+threat2,-fin2） / none=同じCPU同士（自己点検）
//   組数: 既定 2000（1組=2戦なので4000戦）
//   --decks env|all|preset  デッキ群（既定 env: 環境デッキ分類＝勝率上位15＋DECK_ENV_EXTRA）
//   --seed N  --jobs N（並列数、既定はCPUコア数）  --nosearch（探索なし。速いが本番と違う）  --early（結論が出たら途中で打ち切る。既定は最後まで回す）
// 仕組み: 1組ごとに、デッキ2つ・乱数を決め、新CPU(A)が席0の試合と席1の試合を同じ乱数で1回ずつ行う（デッキと先攻後攻の運が打ち消し合う）。
//   A と B（既定のCPU）が同じなら、2戦は同じ試合になり、必ず1勝1敗になる（none で確かめられる）。
// 途中経過: 約10%ごとに標準エラーへ（戦数・経過・残りの目安・暫定勝率）。例: node tools/bench.js +x 2000 >結果.json 2>進捗.txt
// 出力: Aの勝率と95%の幅、判定（採用候補 / 悪化 / 判定できず）。幅は組ごとの点（2勝=1、1勝1敗=0.5、2敗=0）のばらつきから出す
"use strict";
const os=require("os"),path=require("path"),{fork}=require("child_process");

function parseArgs(argv){
  const o={flag:argv[0],pairs:2000,decks:"env",seed:1,jobs:os.cpus().length,search:true,early:false};
  for(let i=1;i<argv.length;i++){const a=argv[i];
    if(a==="--decks")o.decks=argv[++i];else if(a==="--seed")o.seed=+argv[++i];else if(a==="--jobs")o.jobs=+argv[++i];
    else if(a==="--nosearch")o.search=false;else if(a==="--early")o.early=true;else if(/^\d+$/.test(a))o.pairs=+a;else throw new Error("不明な引数: "+a)}
  if(!o.flag)throw new Error("機能を指定してください（例: +threat2 / -fin2 / none）");
  return o}
// 機能の指定 → A の席の AI_OFF（既定 AI_OFF0 から足し引き）
function offFor(spec,AI_OFF0){
  if(spec==="none")return [...AI_OFF0];
  let off=[...AI_OFF0];
  for(const s of spec.split(",")){const f=s.slice(1);
    if(s[0]==="+")off=off.filter(x=>x!==f);else if(s[0]==="-"){if(!off.includes(f))off.push(f)}else throw new Error("機能は + か - を付ける: "+s)}
  return off}
function deckPool(w,kind){
  const pre=w.ev("PRESETS"),env=w.ENV_DECKS.decks,all=[...pre,...env];
  if(kind==="preset")return pre;if(kind==="all")return all;
  if(kind==="env"){const wr=w.ev("DECK_WR"),extra=w.ev("DECK_ENV_EXTRA");
    const top=Object.keys(wr).sort((a,b)=>wr[b]-wr[a]).slice(0,15);
    return [...top,...extra].map(n=>all.find(d=>d.name===n)).filter(Boolean)}
  throw new Error("--decks は env / all / preset")}

// ---- 子プロセス: 組 [from,to) を回し、1組ごとに結果を親へ送る ----
// 行動の回数（席ごと、ログの行から数える）と、探索が選んだ案に入っていた項目（ガード役なし・構え・アクションの出し方など）も数える
const ACT_RE=[["assist",/^. はアシスト/],["hint",/^. はネクストヒント/],["reason",/^. の .+ が推理（LP/],["caseAct",/^. の .+がアクション → 事件$/],["charaAct",/^. の .+がアクション → (?!事件$)/],["play",/^. は .+を登場させた|^. はイベント/]];
async function worker({flag,from,to,decks,seed,search}){
  const H=require("./headless");
  const w=H.load({seed,init:{AI_OFF:[],...(process.env.ROLL_K?{ROLL_K:+process.env.ROLL_K}:{})}}); // ROLL_K=5 などで探索の試行回数（multi）を変えて測れる
  const AI_OFF0=w.ev("AI_OFF0"),offA=offFor(flag,AI_OFF0),pool=deckPool(w,decks);
  let st=null; // 今の試合の席ごとの数
  const log0=w.log;w.log=(m,c)=>{const g=w.__G();if(st&&g&&!g.sim&&typeof m==="string"){const k=m[0]==="A"?0:m[0]==="B"?1:-1;if(k>=0)for(const [n,re] of ACT_RE)if(re.test(m))st[k][n]=(st[k][n]||0)+1}return log0(m,c)};
  const ctp=w.chooseTurnPlan;w.chooseTurnPlan=async function(p){const pl=await ctp.apply(this,arguments);const g=w.__G();
    if(st&&g&&!g.sim){const t=st[p.idx];t.turns=(t.turns||0)+1;if(pl)for(const [k,v] of Object.entries(pl))if(v!=null&&k!=="combo"){const key="plan_"+k+(typeof v==="string"?(k==="play"&&v!=="none"?"":":"+v):v===false?":off":v===0?":0":"");t[key]=(t[key]||0)+1}}return pl};
  for(let i=from;i<to;i++){
    const s=(seed*1000003+i*7919)>>>0;
    w.reseed(s);const a=Math.floor(w.rnd()*pool.length),b=Math.floor(w.rnd()*pool.length);
    const da=w.parseDeckText(pool[a].text),db=w.parseDeckText(pool[b].text);
    const r={i,da:pool[a].name,db:pool[b].name,g:[]};
    for(const seatA of [0,1]){
      const off=[];off[seatA]=offA;off[1-seatA]=[...AI_OFF0];
      w.reseed(s+1);st=[{},{}];
      try{const {winner,turns}=await H.play(w,{decks:[structuredClone(da),structuredClone(db)],search:[search,search],aiOff:off});
        r.g.push({a:winner===null?0.5:winner===seatA?1:0,turns,sa:st[seatA],sb:st[1-seatA]})}
      catch(e){r.g.push({a:0.5,err:String(e).slice(0,120)})}}
    st=null;process.send({row:r})}
  process.send({done:1})}

// 1戦あたりの行動回数と、探索が選んだ案の項目の回数（A=新CPU、B=既定のCPU）。plan_keep: ガード役なし、plan_stance:defend など
function perGame(rows){const A={},B={};let n=0;
  for(const r of rows)for(const g of r.g){if(g.err||!g.sa)continue;n++;for(const [t,s] of [[A,g.sa],[B,g.sb]])for(const [k,v] of Object.entries(s))t[k]=(t[k]||0)+v}
  const keys=[...new Set([...Object.keys(A),...Object.keys(B)])].sort();
  return Object.fromEntries(keys.map(k=>[k,{A:+((A[k]||0)/Math.max(1,n)).toFixed(2),B:+((B[k]||0)/Math.max(1,n)).toFixed(2)}]))}
function summarize(o,rows,ms){
  const n=rows.length,sc=rows.map(r=>(r.g[0].a+r.g[1].a)/2);
  const mean=sc.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(sc.reduce((x,y)=>x+(y-mean)**2,0)/Math.max(1,n-1)),half=1.96*sd/Math.sqrt(n);
  const split=sc.filter(v=>v===0.5).length,errs=rows.reduce((x,r)=>x+r.g.filter(g=>g.err).length,0);
  const lo=(mean-half)*100,hi=(mean+half)*100;
  const verdict=lo>50?"採用候補（50%より上）":hi<50?"悪化（50%より下）":"判定できず（差は誤差の範囲）";
  const byDeck={};for(const r of rows){const v=(r.g[0].a+r.g[1].a)/2;for(const d of [r.da]){const t=byDeck[d]=byDeck[d]||{n:0,s:0};t.n++;t.s+=v}}
  return {flag:o.flag,decks:o.decks,seed:o.seed,search:o.search,pairs:n,games:n*2,winA:+(mean*100).toFixed(1),ci95:[+lo.toFixed(1),+hi.toFixed(1)],
    verdict,splitPairs:split,errors:errs,sec:Math.round(ms/1000),
    avgTurns:+(rows.reduce((x,r)=>x+r.g.reduce((y,g)=>y+(g.turns||0),0),0)/(n*2)).toFixed(1),
    perGame:perGame(rows),
    byDeckA:Object.fromEntries(Object.entries(byDeck).sort((a,b)=>b[1].n-a[1].n).map(([k,t])=>[k,+(t.s/t.n*100).toFixed(0)+"%/"+t.n]))}}

async function main(){
  const o=parseArgs(process.argv.slice(2));const t0=Date.now();
  const J=Math.max(1,Math.min(o.jobs,o.pairs)),per=Math.ceil(o.pairs/J);
  const rows=[],kids=[];let next=0,stop=null;const step=Math.max(1,Math.round(o.pairs/10));
  const stat=()=>{const n=rows.length,sc=rows.map(r=>(r.g[0].a+r.g[1].a)/2),m=sc.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(sc.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,n-1));return {n,m,sd}};
  // 途中経過（標準エラーに約10%ごと。結果のJSONは標準出力なので混ざらない）と、途中打ち切り（--early のときだけ）:
  //   20%以上終わった時点で、99%の幅でも50%をまたがない → 結論が出たので止める
  //   40%以上終わった時点で、最後まで回したときの95%の幅（今の幅×√(今の組数/全組数)）の3割より、50%からの差が小さい → 差が出そうにないので止める
  const check=()=>{const {n,m,sd}=stat();if(n<next&&n<o.pairs)return;next=n+step;const sec=(Date.now()-t0)/1000,left=sec/n*(o.pairs-n);
    console.error(`進捗 ${n*2}/${o.pairs*2}戦（${Math.round(n/o.pairs*100)}%） 経過${Math.round(sec/60)}分 残り約${Math.round(left/60)}分 暫定A勝率${(m*100).toFixed(1)}%`);
    if(!o.early||n>=o.pairs||stop)return;const se=sd/Math.sqrt(n),d=Math.abs(m-0.5);
    if(n>=o.pairs*0.2&&d>2.58*se)stop=`結論が出たので打ち切り（${n}組の時点で99%の幅が50%をまたがない）`;
    else if(n>=o.pairs*0.4&&d<0.3*1.96*sd/Math.sqrt(o.pairs))stop=`差が出そうにないので打ち切り（${n}組の時点で、最後まで回しても誤差の範囲に収まる見込み）`;
    if(stop){console.error(stop);for(const c of kids)c.kill()}};
  await Promise.all(Array.from({length:J},(_,j)=>new Promise((res,rej)=>{
    const from=j*per,to=Math.min(o.pairs,from+per);if(from>=to)return res();
    const c=fork(__filename,["--worker"],{stdio:["ignore","ignore","inherit","ipc"]});kids.push(c);
    c.on("message",m=>{if(m.row){if(!stop){rows.push(m.row);check()}}else if(m.done){res();c.kill()}});
    c.on("error",rej);c.on("exit",code=>{if(stop||!code)res();else rej(new Error("worker exit "+code))});
    c.send({flag:o.flag,from,to,decks:o.decks,seed:o.seed,search:o.search})})));
  rows.sort((a,b)=>a.i-b.i);
  const s=summarize(o,rows,Date.now()-t0);if(stop)s.stopped=stop;
  console.log(JSON.stringify(s,null,1));
  if(o.flag==="none"&&s.splitPairs!==s.pairs)console.log("注意: 同じCPU同士なのに1勝1敗でない組がある（乱数がずれている）");
}
if(process.argv[2]==="--worker")process.on("message",m=>{worker(m)});
else main().catch(e=>{console.error(e.message);process.exit(1)});
module.exports={offFor,parseArgs};
