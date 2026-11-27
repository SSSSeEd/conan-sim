// 対戦後の振り返り（定型文レビュー）: node tools/review.js ログ.json [--nosearch] [--self]
//   ログ.json: アプリの記録タブ「詳しい対戦ログ」→ JSON保存 のファイル（1戦でも、複数戦の配列でも可）
//   --nosearch: CPUの探索の点数との比較を省く（盤面から機械で判定できる型の指摘だけ。速い）
//   --self: ログを使わず、CPU同士の対戦を1戦作り、0席を人とみなして振り返る（動作確認用）
// 分析ロジックは js/review.js（アプリの「振り返り」と共通）
"use strict";
const H=require("./headless"),fs=require("fs");
const args=process.argv.slice(2);const opt={search:true,self:false,file:null};
for(const a of args){if(a==="--nosearch")opt.search=false;else if(a==="--self")opt.self=true;else opt.file=a}
// CPU同士の1戦を、0席の盤面（snap）つきで残す。dlSnap は CPU の席では何もしないので、0席だけ残すよう差し替える
async function selfLog(w,i){
  const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
  w.ev("dlSnap=function(p){if(!dlOn()||p.idx!==0)return;dl('snap',{who:p.idx,g:packRefs({cfg:G.cfg,P:G.P,turn:G.turn,turnNo:G.turnNo,first:G.first,queue:G.queue,phase:G.phase,showOppHand:G.showOppHand})})}");
  await H.play(w,{decks:[ds[i%ds.length],ds[(i+1)%ds.length]],search:[true,true]});
  const all=w.dlLoad(),r=JSON.parse(JSON.stringify(all[all.length-1]));r.cpu=[false,true];return r}
module.exports={selfLog};
if(require.main===module)(async()=>{
  let games;
  const w=H.load({seed:7,init:{SIM_SAVE:1}});
  if(opt.self)games=[await selfLog(w,0)];
  else{if(!opt.file){console.error("使い方: node tools/review.js ログ.json [--nosearch]\n         node tools/review.js --self");process.exit(1)}
    games=JSON.parse(fs.readFileSync(opt.file,"utf8"));if(!Array.isArray(games))games=[games]}
  for(const r of games){const t0=Date.now();const res=await w.reviewGame(r,{search:opt.search});console.log(res.lines.join("\n"));console.log(`（${((Date.now()-t0)/1000).toFixed(1)}秒）\n`)}
})();
