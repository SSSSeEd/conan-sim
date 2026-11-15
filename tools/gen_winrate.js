// 総当たり結果（rr.js が出す jsonl。1行 = 1組み合わせ {a,b,aW,bW,...}）から、デッキごとの勝率表（js/data.js の DECK_WR）を作る
// 使い方: node tools/gen_winrate.js roundrobin-45x30.jsonl   → DECK_WR の行を表示（data.js に貼る）
const fs=require("fs");
const f=process.argv[2];if(!f){console.log("使い方: node tools/gen_winrate.js 総当たり結果.jsonl");process.exit(1)}
const W={},G={};
for(const l of fs.readFileSync(f,"utf8").trim().split("\n")){const r=JSON.parse(l);
  for(const [d,w,x] of [[r.a,r.aW,r.bW],[r.b,r.bW,r.aW]]){W[d]=(W[d]||0)+w;G[d]=(G[d]||0)+w+x}}
const t=Object.keys(W).map(d=>[d,Math.round(W[d]/G[d]*1000)/10]).sort((a,b)=>b[1]-a[1]);
console.log("const DECK_WR={"+t.map(([d,p])=>`${JSON.stringify(d)}:${p}`).join(",")+"};");
