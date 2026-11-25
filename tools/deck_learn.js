// デッキ別CPUのための分析（段階⑤）。tools/deck_data.js の出力から「局面ごとに勝率を上げる手」と「勝ちパターン（参考）」を出す
// 使い方: node tools/deck_learn.js d.jsonl [d2.jsonl ...] [--name aoshonen] [--write] [--tau 0.04] [--md 出力.md]
//   --write: 学んだ表を js/deckcpu/table_名前.js に書き出す（index.html・sw.js に読み込みを足すのは手で）
// 1) 手の効果（因果）: くじの手番（x=1）だけを使う。局面ph・カードXごとに、Xを選べた手番のうち
//      「Xを選んだ手番の勝率」−「別の手を選んだ手番の勝率」。選ばれる確率（案の数で変わる）で重みをつける（逆確率重み）
//    誤差: 95%の幅を出す。表には、誤差の大きいものほど0に寄せた値（縮小推定、事前の幅 tau=±4ポイント）を書く
// 2) 勝ちパターン（相関、参考）: すべての手番で、同じ手番に一緒に使ったカードの組・局面ごとの使用と、その試合の勝率
//    普通の対戦の記録なので、勝っているから使えた（原因と結果が逆）ものも混ざる。くじの結果と食い違うときはくじを信じる
"use strict";
const fs=require("fs"),path=require("path");
function parseArgs(argv){const o={files:[],name:null,write:false,tau:0.04,md:null};
  for(let i=0;i<argv.length;i++){const a=argv[i];
    if(a==="--name")o.name=argv[++i];else if(a==="--write")o.write=true;else if(a==="--tau")o.tau=+argv[++i];else if(a==="--md")o.md=argv[++i];else o.files.push(a)}
  return o}
const card=k=>k.replace(/^A:/,"");
const load=files=>files.flatMap(f=>fs.readFileSync(f,"utf8").split("\n").filter(Boolean).map(l=>JSON.parse(l))).filter(g=>!g.err&&g.win!==0.5);

// 逆確率重み（Hajek）で E[勝ち|Xを選ぶ] − E[勝ち|X以外を選ぶ]
function effect(rows){
  let s1=0,w1=0,q1=0,s0=0,w0=0,q0=0,n1=0,n0=0;
  for(const r of rows){if(r.pick){const w=1/r.pi;s1+=w*r.win;w1+=w;q1+=w*w;n1++}else{const w=1/(1-r.pi);s0+=w*r.win;w0+=w;q0+=w*w;n0++}}
  if(!n1||!n0)return null;
  const m1=s1/w1,m0=s0/w0,ne1=w1*w1/q1,ne0=w0*w0/q0;
  const se=Math.sqrt(Math.max(m1*(1-m1),0.05)/ne1+Math.max(m0*(1-m0),0.05)/ne0);
  return {e:m1-m0,se,m1,m0,n1,n0}}
function learn(games,tau){
  const by={};const add=(ph,X,row)=>{((by[ph]=by[ph]||{})[X]=by[ph][X]||[]).push(row)};
  for(const g of games)for(const t of g.T){if(!t.x||!t.c||!t.k)continue;
    const ks=t.c,n=ks.length,pk=card(t.k);
    const cards=[...new Set(ks.map(card))];
    for(const X of cards){const pi=ks.filter(k=>card(k)===X).length/n;if(pi<1)add(t.ph,X,{pick:pk===X,pi,win:g.win})} // 案がXだけの手番は比べようがないので除く
    const na=ks.filter(k=>k.startsWith("A:")).length;if(na&&na<n)add(t.ph,"A",{pick:t.k.startsWith("A:"),pi:na/n,win:g.win})}
  const out={};
  for(const [ph,m] of Object.entries(by))for(const [X,rows] of Object.entries(m)){const r=effect(rows);if(!r)continue;
    const shrink=tau*tau/(tau*tau+r.se*r.se);(out[ph]=out[ph]||{})[X]={...r,es:r.e*shrink}}
  return out}
// 勝ちパターン（相関）: 同じ手番に使ったカードの組（順不同）と、局面ごとの使用
function patterns(games){
  const base=games.reduce((a,g)=>a+g.win,0)/games.length;const P={};
  for(const g of games){const seen=new Set();
    for(const t of g.T){const u=[...new Set(t.u)].sort();
      for(const x of u)seen.add(`${t.ph}|${x}`);
      for(let i=0;i<u.length;i++)for(let j=i+1;j<u.length;j++)seen.add(`同じ手番|${u[i]}+${u[j]}`)}
    for(const k of seen){const p=P[k]=P[k]||{n:0,w:0};p.n++;p.w+=g.win}}
  return {base,list:Object.entries(P).filter(([,p])=>p.n>=40).map(([k,p])=>{const m=p.w/p.n;return {k,n:p.n,wr:m,lift:m-base,se:Math.sqrt(m*(1-m)/p.n)}})}}

function cardName(id){try{const H=require("./headless");if(!cardName.w)cardName.w=H.load();return id==="none"?"出さない":id==="A"?"先にアシスト":(cardName.w.C({n:id})||{}).nm||id}catch(e){return id}}
const pct=v=>(v>=0?"+":"")+(v*100).toFixed(1);
function report(games,L,pat,o){
  const lines=[];const W=games.reduce((a,g)=>a+g.win,0)/games.length;
  const xs=games.reduce((a,g)=>a+g.T.filter(t=>t.x).length,0);
  lines.push(`# デッキ別CPUの分析 ${o.name||""}`,"",`- 試合 ${games.length}（勝率 ${(W*100).toFixed(1)}%）、くじの手番 ${xs}`,"");
  lines.push("## 1) 手の効果（くじの手番。勝率の差、ポイント）","","| 局面 | カード | 効果 | 95%の幅 | 表に書く値 | 選んだ/選ばなかった手番 |","|---|---|---|---|---|---|");
  for(const ph of ["early","mid","late"])for(const [X,r] of Object.entries(L[ph]||{}).sort((a,b)=>b[1].es-a[1].es))
    lines.push(`| ${({early:"序盤",mid:"中盤",late:"終盤"})[ph]} | ${cardName(X)}(${X}) | ${pct(r.e)} | ${pct(r.e-1.96*r.se)}〜${pct(r.e+1.96*r.se)} | ${pct(r.es)} | ${r.n1}/${r.n0} |`);
  lines.push("","## 2) 勝ちパターン（相関、参考。勝っているから使えたものも混ざる）","",`全体の勝率 ${(pat.base*100).toFixed(1)}%。40試合以上で出たものの、勝率の差（上位12・下位8）`,"","| パターン | 試合 | 勝率 | 差 |","|---|---|---|---|");
  const fmt=p=>{const [a,b]=p.k.split("|");const nm=b.split("+").map(id=>`${cardName(id)}(${id})`).join("＋");return `| ${({early:"序盤",mid:"中盤",late:"終盤"})[a]||a}: ${nm} | ${p.n} | ${(p.wr*100).toFixed(1)}% | ${pct(p.lift)} |`};
  const s=pat.list.sort((a,b)=>b.lift-a.lift);for(const p of s.slice(0,12))lines.push(fmt(p));lines.push("| … | | | |");for(const p of s.slice(-8))lines.push(fmt(p));
  return lines.join("\n")}

if(require.main===module){
  const o=parseArgs(process.argv.slice(2));const games=load(o.files);
  const L=learn(games,o.tau),pat=patterns(games);
  const md=report(games,L,pat,o);if(o.md)fs.writeFileSync(o.md,md);console.log(md);
  if(o.write){if(!o.name)throw new Error("--write には --name が要る");
    const T={};for(const [ph,m] of Object.entries(L))for(const [X,r] of Object.entries(m))if(Math.abs(r.es)>=0.002)(T[ph]=T[ph]||{})[X]=+r.es.toFixed(3);
    const f=path.join(__dirname,"..","js","deckcpu",`table_${o.name}.js`);
    fs.writeFileSync(f,`"use strict";\n// 自動生成: node tools/deck_learn.js ${o.files.map(f=>path.basename(f)).join(" ")} --name ${o.name} --write（${games.length}試合、${new Date().toISOString().slice(0,10)}）\n// 局面ごとの「そのカードを出すと勝率が何ポイント上がるか」（縮小推定、0.01=1ポイント）。A=先にアシスト、none=出さない\nwindow.DECK_LEARNED=window.DECK_LEARNED||{};\nDECK_LEARNED.${o.name}=${JSON.stringify(T)};\n`);
    console.error("書き出し: "+f)}}
module.exports={learn,patterns,effect};
