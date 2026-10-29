// 対戦実験: node tools/vs.js 試合数 seed A B  席ごとのCPU: base / combo / search / search+combo（プリセット4デッキ、席入れ替え）。A の勝率を出す
// base は今のCPU（探索なし）。4並列で seed を変えて回し、合計する。判断は「同じCPU同士（base base）との差」で
const {chromium}=require('playwright');const [N,SEED]=[+process.argv[2],+process.argv[3]],MA=process.argv[4],MB=process.argv[5];
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==="warning")errs.push(m.text())});
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(s=>{let x=s;Math.random=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};window.SIM_TURBO=1;window.SIM_FAST=1;window.AI_OFF=[];},SEED);
await p.goto('file://'+require('path').resolve(__dirname,'..','index.html'));await p.waitForTimeout(300);
const r=await p.evaluate(async([N,MA,MB])=>{const E=PRESETS;let res={aW:0,bW:0,draw:0};let winner=null;
  const w0=window.win;window.win=(pl,why)=>{if(!G.sim&&!G.over)winner=pl.idx;return w0(pl,why)};
  const off=m=>m.includes("combo")?AI_OFF0.filter(f=>f!=="combo"):AI_OFF0;
  for(let i=0;i<N;i++){winner=null;const a=Math.floor(Math.random()*E.length),bb=Math.floor(Math.random()*E.length);const sa=i%2;
    const ms=[];ms[sa]=MA;ms[1-sa]=MB;
    startGame({decks:[parseDeckText(E[a].text),parseDeckText(E[bb].text)],names:["A","B"],cpu:true,cpu0:true,first:"rand",search:ms.map(m=>m.includes("search")),aiOff:ms.map(off)});
    const g=G;let t=0;while(!g.over&&g.turnNo<40&&t<20000){await new Promise(r=>setTimeout(r,5));t++}
    if(winner===null)res.draw++;else if(winner===sa)res.aW++;else res.bW++}
  return res},[N,MA,MB]);
console.log(JSON.stringify({A:MA,B:MB,SEED,...r}),JSON.stringify(errs.slice(0,3)));await b.close()})()
