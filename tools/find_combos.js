// コンボ探し: 新しいデッキで CPU 同士の対戦を回し、試しの手番で判断を1か所だけ変えて、点数が上がった手を一覧にする
// usage: node tools/find_combos.js デッキ.txt [試合数=100] [seed=1]
//   デッキ.txt はアプリのデッキリストと同じ書き方（パートナー ○○ / 事件 ○○ / カード番号 xN）
//   相手は環境デッキからランダム。Playwright（Chromium）が必要
const {chromium}=require("playwright");const fs=require("fs"),path=require("path");
const [file,N=100,SEED=1]=process.argv.slice(2);
if(!file){console.log("usage: node tools/find_combos.js デッキ.txt [試合数] [seed]");process.exit(1)}
const deckText=fs.readFileSync(file,"utf8");
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(s=>{let x=s;Math.random=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};window.SIM_TURBO=1;window.SIM_FAST=1;window.FIND_COMBOS=1},+SEED);
  await p.goto("file://"+path.resolve(__dirname,"..","index.html"));await p.waitForTimeout(300);
  const T=await p.evaluate(async([N,txt])=>{const E=ENV_DECKS.decks;const me=parseDeckText(txt);
    for(let i=0;i<N;i++){const s=i%2,o=parseDeckText(E[Math.floor(Math.random()*E.length)].text);const decks=s?[o,me]:[me,o];
      startGame({decks,names:["A","B"],cpu:true,cpu0:true,first:"rand",search:[false,false],findFor:s});
      const g=G;let t=0;while(!g.over&&g.turnNo<40&&t<40000){await new Promise(r=>setTimeout(r,5));t++}}
    return window.COMBOS||{}},[+N,deckText]);
  const rows=Object.entries(T).filter(([,v])=>v.n>=8).map(([k,v])=>({k,n:v.n,up:v.up,mean:v.sum/v.n}))
    .filter(r=>r.mean>0&&r.up/r.n>=0.55).sort((a,b)=>b.up/b.n-a.up/a.n||b.mean-a.mean);
  console.log(`${N}戦、${Object.keys(T).length}通りの変え方を試した。今のCPUより良かったもの（8回以上、55%以上で改善）:`);
  for(const r of rows.slice(0,30))console.log(`${String(r.up).padStart(3)}/${String(r.n).padEnd(3)} 平均${r.mean>=0?"+":""}${Math.round(r.mean)}  ${r.k}`);
  if(errs.length)console.log("エラー:",errs.slice(0,3));
  await b.close()})();
