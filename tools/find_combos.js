// コンボ探し: 新しいデッキで CPU 同士の対戦を回し、試しの手番で判断を1か所だけ変えて、点数が上がった手を一覧にする
// usage: node tools/find_combos.js デッキ.txt [試合数=100] [seed=1]
//   デッキ.txt はアプリのデッキリストと同じ書き方（パートナー ○○ / 事件 ○○ / カード番号 xN）
//   相手は環境デッキからランダム。ブラウザは使わない（tools/headless.js）
const H=require("./headless");const fs=require("fs");
const [file,N=100,SEED=1]=process.argv.slice(2);
if(!file){console.log("usage: node tools/find_combos.js デッキ.txt [試合数] [seed]");process.exit(1)}
const deckText=fs.readFileSync(file,"utf8");
(async()=>{const w=H.load({seed:+SEED,init:{FIND_COMBOS:1}});const E=w.ENV_DECKS.decks;const me=w.parseDeckText(deckText);
  for(let i=0;i<+N;i++){const s=i%2,o=w.parseDeckText(E[Math.floor(w.rnd()*E.length)].text);const decks=s?[o,me]:[me,o];
    await H.play(w,{decks,search:[false,false],findFor:s})}
  const T=w.COMBOS||{};
  const rows=Object.entries(T).filter(([,v])=>v.n>=8).map(([k,v])=>({k,n:v.n,up:v.up,mean:v.sum/v.n}))
    .filter(r=>r.mean>0&&r.up/r.n>=0.55).sort((a,b)=>b.up/b.n-a.up/a.n||b.mean-a.mean);
  console.log(`${N}戦、${Object.keys(T).length}通りの変え方を試した。今のCPUより良かったもの（8回以上、55%以上で改善）:`);
  for(const r of rows.slice(0,30))console.log(`${String(r.up).padStart(3)}/${String(r.n).padEnd(3)} 平均${r.mean>=0?"+":""}${Math.round(r.mean)}  ${r.k}`);
  if(w.warns.length)console.log("警告:",w.warns.slice(0,3))})();
