// 効果の自動化率: node tools/coverage.js [デッキ名の一部 | --top]
// デッキごとに、効果文のあるカード（枚数で数える。パートナー・事件も1枚）のうち自動で処理されるものの割合
// デッキ名を渡すとそのデッキの未自動化カード、--top で複数デッキに入っている未自動化カードを出す
const H=require("./headless");
const w=H.load({seed:1});
const decks=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];const q=process.argv[2];
const DB=w.ev("DB");let sum=0,n=0;const miss={};
for(const d of decks){const r=w.parseDeckText(d.text);let all=0,ok=0;const ng=new Map;
  for(const id of [...r.main,r.partner,r.caseN]){const c=DB[id];if(!c||!(c.f||c.hr||c.ci))continue;
    all++;if(w.FX.automated({n:id}))ok++;else{ng.set(c.i,c);const m=miss[c.i]=miss[c.i]||{c,k:0,d:new Set};m.k++;m.d.add(d.name)}}
  const pct=all?Math.round(ok/all*100):100;sum+=pct;n++;
  if(!q||q==="--top"||d.name.includes(q)){if(q!=="--top")console.log(`${String(pct).padStart(3)}% ${d.name}`);
    if(q&&q!=="--top")for(const c of ng.values())console.log("    ",c.i,c.n,c.t,c.nm)}}
console.log(`平均 ${Math.round(sum/n)}%（${n}デッキ）`);
if(q==="--top")for(const m of Object.values(miss).sort((a,b)=>b.k-a.k).slice(0,+(process.argv[3]||40)))console.log(m.d.size,m.k,m.c.i,m.c.n,m.c.t,m.c.nm);
