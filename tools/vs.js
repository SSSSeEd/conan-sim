// 対戦実験: node tools/vs.js 試合数 seed A B  席ごとのCPU: base / combo / search / search+combo（プリセット4デッキ、席入れ替え）。A の勝率を出す
// base は今のCPU（探索なし）。seed を変えて回し、合計する。判断は「同じCPU同士（base base）との差」で
// ブラウザは使わない（tools/headless.js）。100戦で数秒
const H=require("./headless");
const [N,SEED]=[+process.argv[2],+process.argv[3]],MA=process.argv[4],MB=process.argv[5];
(async()=>{const w=H.load({seed:SEED,init:{AI_OFF:[]}});const E=w.ev("PRESETS"),AI_OFF0=w.ev("AI_OFF0");
  const res={aW:0,bW:0,draw:0};const off=m=>m.includes("combo")?AI_OFF0.filter(f=>f!=="combo"):AI_OFF0;
  for(let i=0;i<N;i++){const a=Math.floor(w.rnd()*E.length),b=Math.floor(w.rnd()*E.length);const sa=i%2;
    const ms=[];ms[sa]=MA;ms[1-sa]=MB;
    const {winner}=await H.play(w,{decks:[w.parseDeckText(E[a].text),w.parseDeckText(E[b].text)],search:ms.map(m=>m.includes("search")),aiOff:ms.map(off)});
    if(winner===null)res.draw++;else if(winner===sa)res.aW++;else res.bW++}
  console.log(JSON.stringify({A:MA,B:MB,SEED,...res}),JSON.stringify(w.warns.slice(0,3)))})();
