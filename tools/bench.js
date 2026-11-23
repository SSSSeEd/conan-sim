// CPUの改良を測る道具（ペア比較・並列・誤差幅つき）。設計: notes/cpu-architecture-plan-2026-11-24.md（プロジェクト共有フォルダ）
// 使い方: node tools/bench.js 機能 [組数] [オプション]
//   機能: +x=既定オフの x をオンにしたCPU / -x=既定オンの x をオフにしたCPU / カンマで複数（+threat2,-fin2） / none=同じCPU同士（自己点検）
//   組数: 既定 2000（1組=2戦なので4000戦）
//   --decks env|all|preset  デッキ群（既定 env: 環境デッキ分類＝勝率上位15＋DECK_ENV_EXTRA）
//   --seed N  --jobs N（並列数、既定はCPUコア数）  --nosearch（探索なし。速いが本番と違う）
// 仕組み: 1組ごとに、デッキ2つ・乱数を決め、新CPU(A)が席0の試合と席1の試合を同じ乱数で1回ずつ行う（デッキと先攻後攻の運が打ち消し合う）。
//   A と B（既定のCPU）が同じなら、2戦は同じ試合になり、必ず1勝1敗になる（none で確かめられる）。
// 出力: Aの勝率と95%の幅、判定（採用候補 / 悪化 / 判定できず）。幅は組ごとの点（2勝=1、1勝1敗=0.5、2敗=0）のばらつきから出す
"use strict";
const os=require("os"),path=require("path"),{fork}=require("child_process");

function parseArgs(argv){
  const o={flag:argv[0],pairs:2000,decks:"env",seed:1,jobs:os.cpus().length,search:true};
  for(let i=1;i<argv.length;i++){const a=argv[i];
    if(a==="--decks")o.decks=argv[++i];else if(a==="--seed")o.seed=+argv[++i];else if(a==="--jobs")o.jobs=+argv[++i];
    else if(a==="--nosearch")o.search=false;else if(/^\d+$/.test(a))o.pairs=+a;else throw new Error("不明な引数: "+a)}
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

// ---- 子プロセス: 組 [from,to) を回して結果を返す ----
async function worker({flag,from,to,decks,seed,search}){
  const H=require("./headless");
  const w=H.load({seed,init:{AI_OFF:[]}});
  const AI_OFF0=w.ev("AI_OFF0"),offA=offFor(flag,AI_OFF0),pool=deckPool(w,decks);
  const out=[];
  for(let i=from;i<to;i++){
    const s=(seed*1000003+i*7919)>>>0;
    w.reseed(s);const a=Math.floor(w.rnd()*pool.length),b=Math.floor(w.rnd()*pool.length);
    const da=w.parseDeckText(pool[a].text),db=w.parseDeckText(pool[b].text);
    const r={i,da:pool[a].name,db:pool[b].name,g:[]};
    for(const seatA of [0,1]){
      const off=[];off[seatA]=offA;off[1-seatA]=[...AI_OFF0];
      w.reseed(s+1);
      try{const {winner,turns}=await H.play(w,{decks:[structuredClone(da),structuredClone(db)],search:[search,search],aiOff:off});
        r.g.push({a:winner===null?0.5:winner===seatA?1:0,turns})}
      catch(e){r.g.push({a:0.5,err:String(e).slice(0,120)})}}
    out.push(r)}
  return out}

function summarize(o,rows,ms){
  const n=rows.length,sc=rows.map(r=>(r.g[0].a+r.g[1].a)/2);
  const mean=sc.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(sc.reduce((x,y)=>x+(y-mean)**2,0)/Math.max(1,n-1)),half=1.96*sd/Math.sqrt(n);
  const split=sc.filter(v=>v===0.5).length,errs=rows.reduce((x,r)=>x+r.g.filter(g=>g.err).length,0);
  const lo=(mean-half)*100,hi=(mean+half)*100;
  const verdict=lo>50?"採用候補（50%より上）":hi<50?"悪化（50%より下）":"判定できず（差は誤差の範囲）";
  const byDeck={};for(const r of rows){const v=(r.g[0].a+r.g[1].a)/2;for(const d of [r.da]){const t=byDeck[d]=byDeck[d]||{n:0,s:0};t.n++;t.s+=v}}
  return {flag:o.flag,decks:o.decks,seed:o.seed,search:o.search,pairs:n,games:n*2,winA:+(mean*100).toFixed(1),ci95:[+lo.toFixed(1),+hi.toFixed(1)],
    verdict,splitPairs:split,errors:errs,sec:Math.round(ms/1000),
    byDeckA:Object.fromEntries(Object.entries(byDeck).sort((a,b)=>b[1].n-a[1].n).map(([k,t])=>[k,+(t.s/t.n*100).toFixed(0)+"%/"+t.n]))}}

async function main(){
  const o=parseArgs(process.argv.slice(2));const t0=Date.now();
  const J=Math.max(1,Math.min(o.jobs,o.pairs)),per=Math.ceil(o.pairs/J);
  const parts=await Promise.all(Array.from({length:J},(_,j)=>new Promise((res,rej)=>{
    const from=j*per,to=Math.min(o.pairs,from+per);if(from>=to)return res([]);
    const c=fork(__filename,["--worker"],{stdio:["ignore","ignore","inherit","ipc"]});
    c.on("message",m=>{res(m);c.kill()});c.on("error",rej);c.on("exit",code=>{if(code)rej(new Error("worker exit "+code))});
    c.send({flag:o.flag,from,to,decks:o.decks,seed:o.seed,search:o.search})})));
  const rows=parts.flat().sort((a,b)=>a.i-b.i);
  const s=summarize(o,rows,Date.now()-t0);
  console.log(JSON.stringify(s,null,1));
  if(o.flag==="none"&&s.splitPairs!==s.pairs)console.log("注意: 同じCPU同士なのに1勝1敗でない組がある（乱数がずれている）");
}
if(process.argv[2]==="--worker")process.on("message",async m=>{process.send(await worker(m))});
else main().catch(e=>{console.error(e.message);process.exit(1)});
module.exports={offFor,parseArgs};
