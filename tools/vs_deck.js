// デッキ専用CPUの効果: node tools/vs_deck.js 1相手あたりの試合数 seed [off]
// 青少年探偵団(SeEd版)を、専用CPU あり/なし(aiOff に deck) で、大会環境の相手7種と回す。同じ席・同じ乱数のペア。
const H=require("./headless");
const N=+process.argv[2]||10,SEED=+process.argv[3]||1;
const MINE=`パートナー D08001
事件 D01016
B01016 x3
B03006 x3
B04005 x3
B04013 x3
B05005 x3
B05010 x3
B11003 x3
B11007 x3
B11009 x3
B11010 x3
B11017 x2
D08007 x1
D08010 x3
D08018 x1
PR295 x3`;
const OPP=["緑白平次キッド","黄単松田ミッドレンジ","黒単キャンティコルン","赤単FBI","スタンキッド11/20","青単少年探偵団","白単キッド","青単新一蘭"];
(async()=>{const w=H.load({seed:SEED,init:{AI_OFF:[]}});const D=[...w.ev("PRESETS"),...w.ENV_DECKS.decks],AI_OFF0=w.ev("AI_OFF0");
  const mine=w.parseDeckText(MINE);const out={};
  for(const name of OPP){const o=D.find(d=>d.name===name);if(!o){console.log("なし",name);continue}
    const r={on:0,off:0,errs:0};
    for(const mode of ["on","off"])for(let i=0;i<N;i++){
      const seat=i%2;const ds=[];ds[seat]=mine;ds[1-seat]=w.parseDeckText(o.text);
      const aiOff=[];aiOff[seat]=mode==="off"?[...AI_OFF0,"deck"]:AI_OFF0;aiOff[1-seat]=AI_OFF0;
      w.reseed(SEED*1000003+i*31+name.length);
      try{const {winner}=await H.play(w,{decks:ds.map(d=>structuredClone(d)),search:[true,true],aiOff});if(winner===seat)r[mode]++}catch(e){r.errs++}}
    out[name]=r;console.log(name,`専用あり ${r.on}/${N} 専用なし ${r.off}/${N}`+(r.errs?` エラー${r.errs}`:""))}
  const t=k=>Object.values(out).reduce((a,r)=>a+r[k],0),n=Object.keys(out).length*N;
  console.log(`合計 専用あり ${(100*t("on")/n).toFixed(1)}% 専用なし ${(100*t("off")/n).toFixed(1)}%（${n}戦ずつ）`)})();
