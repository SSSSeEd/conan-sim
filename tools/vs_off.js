// 機能1つの対照実験: node tools/vs_off.js 試合数 seed 機能名 [search]  A=機能あり B=機能なし。A の勝率
const H=require("./headless");
const [N,SEED,F]=[+process.argv[2],+process.argv[3],process.argv[4]],S=process.argv[5]==="search";
(async()=>{const w=H.load({seed:SEED,init:{AI_OFF:[]}});const E=w.ev("PRESETS"),AI_OFF0=w.ev("AI_OFF0");
  const res={aW:0,bW:0,draw:0};
  for(let i=0;i<N;i++){const a=Math.floor(w.rnd()*E.length),b=Math.floor(w.rnd()*E.length);const sa=i%2;
    const off=[];off[sa]=AI_OFF0;off[1-sa]=F==="none"?AI_OFF0:[...AI_OFF0,F];
    const {winner}=await H.play(w,{decks:[w.parseDeckText(E[a].text),w.parseDeckText(E[b].text)],search:[S,S],aiOff:off});
    if(winner===null)res.draw++;else if(winner===sa)res.aW++;else res.bW++}
  console.log(JSON.stringify({F,S,SEED,...res}))})();
