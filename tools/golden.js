// 動きが変わっていないかの確認（整理・リファクタ用）: 同じ乱数でCPU同士を対戦させ、1戦ごとの全ログのハッシュを取る
// node tools/golden.js 試合数 save 出力.json   … 今のコードで記録
// node tools/golden.js 試合数 check 記録.json  … 記録と1戦ずつ比べ、違う試合を出す（全部一致なら「一致」）
// 探索あり・なしを交互に（3戦に1戦は探索なし）、プリセット＋環境デッキから選ぶ
"use strict";
const H=require("./headless"),fs=require("fs"),crypto=require("crypto");
const [N,MODE,FILE]=[+process.argv[2],process.argv[3],process.argv[4]];
(async()=>{
  const w=H.load({seed:1});if(process.env.OFF)w.AI_OFF=[...w.ev("AI_OFF0"),...process.env.OFF.split(",")]; // 環境変数 OFF=threat2,wary で既定オンのスイッチを切った動きも比べられる
  const D=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];
  let lines=[];const log0=w.log;w.log=(m,c)=>{lines.push(m);return log0(m,c)};
  const out=[];
  for(let i=0;i<N;i++){w.reseed(1000+i*7919);
    const a=D[Math.floor(w.rnd()*D.length)],b=D[Math.floor(w.rnd()*D.length)],s=i%3!==2;
    lines=[];let r;
    try{r=await H.play(w,{decks:[w.parseDeckText(a.text),w.parseDeckText(b.text)],search:[s,s]})}catch(e){r={err:String(e).slice(0,200)}}
    out.push({i,a:a.name,b:b.name,s,w:r.winner,t:r.turns,err:r.err,h:crypto.createHash("sha1").update(lines.join("\n")).digest("hex").slice(0,12)})}
  if(MODE==="save"){fs.writeFileSync(FILE,JSON.stringify(out));console.log(`記録 ${out.length}戦 → ${FILE}`);return}
  const ref=JSON.parse(fs.readFileSync(FILE,"utf8"));const diff=out.filter((g,i)=>!ref[i]||ref[i].h!==g.h);
  console.log(diff.length?`違う試合 ${diff.length}/${out.length}: `+diff.slice(0,10).map(g=>`#${g.i} ${g.a} vs ${g.b}`).join(" / "):`一致 ${out.length}/${out.length}`);
  if(diff.length)process.exit(1)})();
