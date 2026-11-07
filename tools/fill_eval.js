// デッキ補完の答え合わせ: node tools/fill_eval.js [試行回数=3] [--all]
// 環境デッキ1つから「入力」だけ残し、そのデッキを参考から外して(leave-one-out)補完し、元のデッキにどれだけ戻せるかを測る。
// 入力の取り方: key=レベルの高い順に5種×3枚（15枚）, rand=ランダムな5種×3枚。比較: 同じ色の人気順で埋めるだけ(pop)
// 既定は onlyAuto=false（自動化の進み具合に左右されない精度）。--auto で onlyAuto=true も測る
const H=require("./headless");
const w=H.load({seed:1});
const DBX=w.ev("DB");w.DB=DBX;
const N=+(process.argv[2]||3),AUTO=process.argv.includes("--auto");
const decks=[...w.ev("PRESETS"),...w.ENV_DECKS.decks].map(d=>({name:d.name,...w.parseDeckText(d.text)}));
const idc=d=>{const o={};for(const n of d.main){const i=w.DB[n].i;o[i]=(o[i]||0)+1}return o};
const overlap=(a,b)=>{let s=0;for(const k in a)if(b[k])s+=Math.min(a[k],b[k]);return s};
function pickSeed(d,mode){const by={};for(const n of d.main)(by[w.DB[n].i]=by[w.DB[n].i]||[]).push(n);
  let ids=Object.keys(by);
  if(mode==="key")ids.sort((a,b)=>(w.DB[by[b][0]].lv||0)-(w.DB[by[a][0]].lv||0));
  else for(let i=ids.length-1;i>0;i--){const j=Math.floor(w.rnd()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  const out=[];for(const i of ids){for(const n of by[i]){if(out.length<15)out.push(n)}if(out.length>=15)break}return out}
function pop(d,seed,refs){ // 比較用: 同じ色の参考デッキでの採用数が多い順に足すだけ
  const f={};for(const r of refs)for(const n of r.main){const i=w.DB[n].i;f[i]=(f[i]||0)+1}
  const cnt=idc({main:seed}),main=[...seed];
  const col=w.DB[d.partner].c;
  const ids=Object.keys(f).filter(i=>{const n=[...refs.flatMap(r=>r.main)].find(n=>w.DB[n].i===i);return w.DB[n].c===col}).sort((a,b)=>f[b]-f[a]);
  for(const i of ids){const n=refs.flatMap(r=>r.main).find(n=>w.DB[n].i===i);while(main.length<40&&(cnt[i]||0)<3){main.push(n);cnt[i]=(cnt[i]||0)+1}}
  return main}
const res={};const add=(k,v)=>{(res[k]=res[k]||[]).push(v)};
for(let t=0;t<N;t++)for(const mode of ["key","rand"]){if(mode==="key"&&t>0)continue;
  for(const d of decks){
    const refs=decks.filter(x=>x!==d&&!(x.partner===d.partner&&x.caseN===d.caseN&&x.main.join()===d.main.join()));
    const seed=pickSeed(d,mode);const orig=idc(d);
    const r=w.fillDeck({partner:d.partner,caseN:d.caseN,main:seed},{refs,onlyAuto:AUTO});
    const rest=40-seed.length;
    const got=overlap(idc({main:r.main}),orig)-overlap(idc({main:seed}),orig);
    add(mode+" 補完",got/rest);
    const pm=pop(d,seed,refs);add(mode+" 人気順",(overlap(idc({main:pm}),orig)-overlap(idc({main:seed}),orig))/rest);
    const col=w.DB[d.partner].c;add(mode+" 色一致",r.main.filter(n=>w.DB[n].c.includes(col)).length/40);
    const bad=w.validateDeck({partner:r.partner,caseN:r.caseN,main:r.main});add(mode+" 不正",bad.length?1:0)}}
for(const [k,v] of Object.entries(res))console.log(k.padEnd(10),(v.reduce((a,b)=>a+b,0)/v.length).toFixed(3),`(${v.length})`);
