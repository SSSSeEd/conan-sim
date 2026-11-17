// 機能1つの対照実験（全45デッキ、探索あり）: node tools/vs_ab.js 試合数 seed 機能名 [キッド]
// A=機能あり B=機能なし。席は交互。同じ組み合わせ・同じ乱数で A/B を入れ替えて回す。A の勝率を出す
// 「キッド」を付けると、片方の席をキッドのデッキ（白・事件D03016）に固定し、もう片方を代表6デッキから選ぶ（キッド側の勝率も出す）
const H=require("./headless");
const [N,SEED,F]=[+process.argv[2],+process.argv[3],process.argv[4]],KID=process.argv[5]==="キッド";
const KIDTXT=`パートナー B01042
事件 D03016
B06066 x3
B03046 x3
PR149 x3
B02038 x3
B04038 x1
B04042 x2
B01047 x3
B06055 x2
D03006 x1
D03015 x2
D06012 x2
B01055 x3
B02049 x3
B10045 x3
D03005 x3
B04040 x3`;
const OPP=["青単新一蘭","黄単佐藤高木","黒単ジンウォッカ","赤黒赤井ジン","黄単松田ミッドレンジ","青単少年探偵団"];
(async()=>{const w=H.load({seed:SEED,init:{AI_OFF:[],...(process.env.RB?{RUSH_BONUS:+process.env.RB}:{})}});const D=[...w.ev("PRESETS"),...w.ENV_DECKS.decks],AI_OFF0=w.ev("AI_OFF0");
  const res={F,SEED,aW:0,bW:0,draw:0,kidA:0,kidB:0,kidGames:0,errs:0};
  const kid=w.parseDeckText(KIDTXT);
  for(let i=0;i<N;i++){
    let da,db;
    if(KID){const o=D.find(d=>d.name===OPP[i%OPP.length]);da=kid;db=w.parseDeckText(o.text)}
    else{da=w.parseDeckText(D[Math.floor(w.rnd()*D.length)].text);db=w.parseDeckText(D[Math.floor(w.rnd()*D.length)].text)}
    const sa=Math.floor(i/OPP.length)%2; // A（機能あり）の席
    for(const [tag,on] of [["x",true]]){
      // A=機能あり が席 sa に座る。デッキ da は席 ka に座る（キッドのときは A/B どちらにもキッドが座る2戦を回す）
      for(const kidIsA of KID?[true,false]:[true]){
        const ds=[],off=[];const seatA=sa,seatB=1-sa;
        ds[seatA]=kidIsA?da:db;ds[seatB]=kidIsA?db:da;
        off[seatA]=AI_OFF0;off[seatB]=[...AI_OFF0,F];
        w.reseed(SEED*1000003+i*31+(kidIsA?0:1));
        try{const {winner}=await H.play(w,{decks:ds.map(d=>structuredClone(d)),search:[true,true],aiOff:off});
          if(winner===null)res.draw++;else{if(winner===seatA)res.aW++;else res.bW++;
            if(KID){res.kidGames++;const kidSeat=kidIsA?seatA:seatB;if(winner===kidSeat){if(kidIsA)res.kidA++;else res.kidB++}}}
        }catch(e){res.errs++}}}}
  console.log(JSON.stringify(res),JSON.stringify(w.warns.slice(0,3)))})();
