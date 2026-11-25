// 人間らしさの物差し（段階⑤）: SeEd の対戦記録（アプリの「対戦記録」JSON）と、CPU の対戦データ（tools/deck_data.js の出力）を、
// 局面ごと（序盤・中盤・終盤、js/cpu.js の deckPhase と同じ区切り）の「使ったカードの分布」と「1手番あたりの行動の回数」で比べる
// 使い方: node tools/deck_human.js 記録.json [CPUのデータ.jsonl ...] [--deck B01042] [--pref]
//   --deck: 人の側のパートナーのカード番号でしぼる（既定 B01042＝怪盗キッド、白単スタンキッド）
//   --pref: 人が局面ごとに使ったカードの割合と、1手番あたりの行動の回数を出す
//   --write 名前: 1つ目のCPUのデータを「既定のCPU」として、人とCPUの割合の対数比の表を js/deckcpu/table_human_名前.js に書く
//   --half odd|even: 人の記録の奇数番目／偶数番目の試合だけを使う（表を作る試合と確かめる試合を分けて、作った試合に合わせただけになっていないかを見る）
// 差の物差し: 使ったカードの分布の違い（全変動距離 TV。0=同じ、1=まったく別）を局面ごとに出し、手番の数で重みをつけて平均する
"use strict";
const fs=require("fs");
const PH={early:"序盤",mid:"中盤",late:"終盤"};
const phaseOf=s=>s.solved&&s.ev>=s.level-3?"late":s.file<=4&&!s.solved?"early":"mid";
function parseArgs(argv){const o={rec:argv[0],data:[],deck:"B01042",pref:false,write:null,half:null};
  for(let i=1;i<argv.length;i++){const a=argv[i];if(a==="--deck")o.deck=argv[++i];else if(a==="--pref")o.pref=true;else if(a==="--write")o.write=argv[++i];
    else if(a==="--half")o.half=argv[++i];else o.data.push(a)}
  return o}
// 人の記録 → 手番ごと {ph, u:[使ったカード名], a:{as,hi,re,ca,ch}}、と好みの集計
// 局面（FILE・証拠・解決編）は記録の state が無い試合もあるので、ログの文から手番ごとに組み立てる
function phasesFromLog(r,me){
  const nm=r.names[me],st={file:0,ev:0,level:7,solved:false},ph={};let t=0;
  for(const [tn,s] of r.log){
    let m;
    if((m=s.match(/^(.+): パートナー .+（事件レベル(\d+)）/))&&m[1]===nm)st.level=+m[2];
    if(/^— \d+ターン目/.test(s))t=tn;
    if((m=s.match(/^オートフェイズ: .+（FILE (\d+)枚）/))&&s&&r.log.find(([x,y])=>x===tn&&y.includes("ターン目: "+nm))){st.file=+m[1];ph[tn]=phaseOf(st)}
    if((m=s.match(/^\s*(.+) は証拠を\d+つ得た（証拠(\d+)）/))&&m[1]===nm)st.ev=+m[2];
    if((m=s.match(/^(.+) の証拠を(\d+)つリムーブ/))&&m[1]===nm)st.ev=Math.max(0,st.ev-+m[2]);
    if((m=s.match(/^(.+) はアシスト（FILE (\d+)枚）/))&&m[1]===nm)st.file=+m[2];
    if((m=s.match(/^(.+) はネクストヒント.*（FILE (\d+)枚）/))&&m[1]===nm)st.file=+m[2];
    if(s===nm+" の事件が解決編になった！")st.solved=true}
  return ph}
// 人の記録 → 手番ごと {ph, u:[使ったカード名], a:{as,hi,re,ca,ch}, g:試合番号}
function human(recs,deck){
  const turns=[];
  recs.forEach((r,gi)=>{if(!r.deckLists||!r.deckLists[0].includes("パートナー "+deck))return;
    const me=r.cpu.findIndex(c=>!c);if(me<0)return;const PHs=phasesFromLog(r,me);let cur=null,lastT=-1;
    for(const x of r.acts){if(x.who!==me)continue;
      if(x.t!==lastT){lastT=x.t;cur={ph:PHs[x.t]||"mid",u:[],a:{},g:gi};turns.push(cur)}
      if(x.kind==="use"||x.kind==="hintUse")cur.u.push(x.card.nm);
      const k={assist:"as",hint:"hi",reason:"re"}[x.kind];if(k)cur.a[k]=(cur.a[k]||0)+1;
      if(x.kind==="action"){const k=x.target&&typeof x.target==="object"?"ch":"ca";cur.a[k]=(cur.a[k]||0)+1}}});
  return {turns}}
function cpuTurns(files){
  const H=require("./headless"),w=H.load();const nm=id=>(w.C({n:id})||{}).nm||id;
  return files.flatMap(f=>fs.readFileSync(f,"utf8").split("\n").filter(Boolean).map(l=>JSON.parse(l))).filter(g=>!g.err)
    .flatMap(g=>g.T.filter(t=>!t.x&&t.ph).map(t=>({ph:t.ph,u:t.u.map(nm),a:t.a||{}})))}
function dist(turns){const D={},N={},A={};
  for(const t of turns){N[t.ph]=(N[t.ph]||0)+1;const d=D[t.ph]=D[t.ph]||{};for(const x of t.u.length?t.u:["（使わない）"])d[x]=(d[x]||0)+1;
    const a=A[t.ph]=A[t.ph]||{};for(const [k,v] of Object.entries(t.a))a[k]=(a[k]||0)+v}
  for(const ph in D){const s=Object.values(D[ph]).reduce((x,y)=>x+y,0);for(const k in D[ph])D[ph][k]/=s;for(const k in A[ph])A[ph][k]/=N[ph]}
  return {D,N,A}}
const tv=(p,q)=>{const ks=new Set([...Object.keys(p||{}),...Object.keys(q||{})]);let s=0;for(const k of ks)s+=Math.abs((p&&p[k]||0)-(q&&q[k]||0));return s/2};
function compare(h,c){const out={},Hd=dist(h),Cd=dist(c);let tot=0,wsum=0;
  for(const ph of ["early","mid","late"]){if(!Hd.N[ph])continue;const d=tv(Hd.D[ph],Cd.D[ph]);out[ph]={tv:+d.toFixed(3),n:Hd.N[ph],hAct:Hd.A[ph],cAct:Cd.A[ph]};tot+=d*Hd.N[ph];wsum+=Hd.N[ph]}
  return {tv:+(tot/wsum).toFixed(3),byPhase:out,H:Hd,C:Cd}}
if(require.main===module){
  const o=parseArgs(process.argv.slice(2));const recs=JSON.parse(fs.readFileSync(o.rec,"utf8"));
  const h=human(recs,o.deck);if(o.half)h.turns=h.turns.filter(t=>(t.g%2===1)===(o.half==="odd"));console.log(`人の手番 ${h.turns.length}`);
  if(o.write){const Hd=dist(h.turns),Cd=dist(cpuTurns([o.data[0]])),T={},a=0.03;
    for(const ph of ["early","mid","late"]){const hp=Hd.D[ph]||{},cp=Cd.D[ph]||{};
      for(const nm of new Set([...Object.keys(hp),...Object.keys(cp)])){const v=Math.max(-1.5,Math.min(1.5,Math.log(((hp[nm]||0)+a)/((cp[nm]||0)+a))));if(Math.abs(v)>=0.1)(T[ph]=T[ph]||{})[nm]=+v.toFixed(2)}}
    const fn=require("path").join(__dirname,"..","js","deckcpu",`table_human_${o.write}.js`);
    fs.writeFileSync(fn,`"use strict";\n// 自動生成: node tools/deck_human.js 記録 ${require("path").basename(o.data[0])} --write ${o.write}${o.half?" --half "+o.half:""}（人の手番${h.turns.length}、${new Date().toISOString().slice(0,10)}）\n// 局面ごとに「SeEdが使ったカードの割合」と「既定のCPUが使ったカードの割合」の対数比（+ならSeEdの方がよく使う）。（使わない）=手札から何も使わない手番\nwindow.DECK_HUMAN=window.DECK_HUMAN||{};\nDECK_HUMAN.${o.write}=${JSON.stringify(T)};\n`);
    console.log("書き出し: "+fn);o.data=o.data.slice(1)}
  if(o.pref){const {D,N,A}=dist(h.turns);for(const ph of ["early","mid","late"]){console.log(`\n${PH[ph]}（人の手番${N[ph]||0}）使ったカードの割合`);
    for(const [nm,v] of Object.entries(D[ph]||{}).sort((a,b)=>b[1]-a[1]))console.log(`  ${nm} ${(v*100).toFixed(0)}%`);
    console.log("  1手番の行動: "+Object.entries(A[ph]||{}).map(([k,v])=>k+"="+v.toFixed(2)).join(" "))}}
  for(const f of o.data){const r=compare(h.turns,cpuTurns([f]));console.log(`\n${f}: 使ったカードの分布の差 TV=${r.tv}（0に近いほど人に近い）`);
    for(const [ph,v] of Object.entries(r.byPhase))console.log(`  ${PH[ph]} TV=${v.tv}（人の手番${v.n}）`)}}
module.exports={human,cpuTurns,compare,phaseOf};
