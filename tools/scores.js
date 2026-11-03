// 探索の点数を見る: node tools/scores.js 記録.json [試合番号(1始まり)] [ターン]
// 対戦記録（書き出したJSON）の rec.search から、そのターンにCPUが各組み合わせに付けた点数を出す。選ばれた組み合わせに * を付ける
const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const recs=Array.isArray(d)?d:[d];
const only=process.argv[3]?+process.argv[3]:null,turn=process.argv[4]?+process.argv[4]:null;
recs.forEach((r,i)=>{if(only&&i+1!==only)return;
  if(!r.search||!r.search.length){console.log(`試合${i+1}: 探索の記録なし（この変更より前の記録）`);return}
  console.log(`試合${i+1} ${r.decks.join(" vs ")}`);
  for(const s of r.search){if(turn&&s.t!==turn)continue;
    console.log(` ${s.t}ターン目 ${r.names[s.who]}`);
    for(const [l,v] of [...s.plans].sort((a,b)=>b[1]-a[1]))console.log(`   ${l===s.pick?"*":" "} ${String(v).padStart(6)}  ${l}`)}})
