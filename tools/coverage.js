// 効果の自動化率: node tools/coverage.js [デッキ名の一部 | --top]
// デッキごとに、効果文のあるカード（枚数で数える。パートナー・事件も1枚）のうち自動で処理されるものの割合（js/data.js の autoRate）
// デッキ名を渡すとそのデッキの未自動化カード、--top で複数デッキに入っている未自動化カードを出す
const H=require("./headless");
const w=H.load({seed:1});
// 弾ごとの未自動化カード: node tools/coverage.js --set CT-P11（新弾の自動化を優先して進めるとき用）
if(process.argv[2]==="--set"){const pk=process.argv[3]||"CT-P11";const seen=new Set;let all=0,ok=0;
  for(const c of w.CARD_DB){if(c.pk!==pk||seen.has(c.i))continue;seen.add(c.i);if(!(c.f||c.hr||c.ci))continue;all++;
    if(w.FX.automated({n:c.n}))ok++;else console.log(c.n,c.i,c.t,c.c,c.nm)}
  console.log(`${pk}: 効果のあるカード ${all}種のうち自動化済み ${ok}（${all?Math.floor(ok/all*100):100}%）`);process.exit(0)}
const decks=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];const q=process.argv[2];
let sum=0,n=0,ready=0;const miss={};
for(const d of decks){const r=w.autoRate(w.parseDeckText(d.text));const ng=new Map;
  for(const c of r.ng){ng.set(c.i,c);const m=miss[c.i]=miss[c.i]||{c,k:0,d:new Set};m.k++;m.d.add(d.name)}
  sum+=r.pct;n++;if(r.ok===r.all)ready++;
  if(!q||q==="--top"||d.name.includes(q)){if(q!=="--top")console.log(`${String(r.pct).padStart(3)}% ${d.name}`);
    if(q&&q!=="--top")for(const c of ng.values())console.log("    ",c.i,c.n,c.t,c.nm)}}
console.log(`平均 ${Math.round(sum/n)}%（${n}デッキ）・CPUが使える100%のデッキ ${ready}個`);
if(q==="--top")for(const m of Object.values(miss).sort((a,b)=>b.k-a.k).slice(0,+(process.argv[3]||40)))console.log(m.d.size,m.k,m.c.i,m.c.n,m.c.t,m.c.nm);
