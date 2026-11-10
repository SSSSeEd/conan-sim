// ループ検出の試作（議事録 2026-11-10 第4項）: node tools/loops.js デッキ名 試合数 [seed] [search]
// 盤面の状態を行動ごとに記録し、同じ状態が同じターンの中でもう一度出たら循環と判定する。ゲーム本体には触らず、行動の関数を包んで見ている。
//
// 状態の比べ方は2段階（ここを SeEd さんが決める。下の sigLoose / sigStrict が定義そのもの）
//   緩い比較(L): カードの位置と向き  … 各ゾーンのカード名の集まり、現場のカードの起きている/寝ている、FILE・証拠・デッキの枚数、パートナーの位置、事件解決、レベル
//   厳しい比較(S): L ＋ 残りのコスト … カードごとの「このターン何回使ったか」(used)、手札を使ったか、ヒント回数、AP/LPの増減、付与された能力
// 判定
//   S が一致   → 本物の循環（何も消費せず元に戻った。そのまま続くと永久に終わらない）
//   L だけ一致 → 「コストを使いながら同じ配置に戻った」。S の差（何が減ったか）を出す。コストが尽きるまで繰り返す型はこれ
const H=require("./headless");
const sortJ=a=>a.slice().sort().join(",");
const cardL=x=>x.n+(x.st||"");
function sigLoose(g){return JSON.stringify(g.P.map(q=>({
  hand:sortJ(q.hand.map(x=>x.n)),field:sortJ(q.field.map(cardL)),file:q.file.length,ev:q.ev.length,rm:sortJ(q.rm.map(x=>x.n)),
  pa:sortJ((q.pa||[]).map(x=>x.n)),deck:q.deck.length,partner:q.pLoc+q.partner.st,solved:q.solved,level:q.level})).concat([g.turn,g.turnNo]))}
function costOf(g){ // 残りコスト側の情報（S − L）。差分の表示にも使う
  const o={};g.P.forEach((q,i)=>{
    o[`席${i}.手札使用/ヒント`]=[q.usedHand,q.hinted,q.hintN||0].join("/");
    for(const x of [...q.field,q.partner,q.caseC,...q.hand,...q.rm]){
      const u=Object.entries(x.used||{}).filter(([,v])=>v&&v.t===g.turnNo).map(([k,v])=>k+"="+v.n).join(",");
      const m=[x.apM,x.apT,x.apC,x.apA||0,x.lpM,x.lpT,(x.kw||[]).join("+"),(x.set||[]).length].join("/");
      if(u||m!=="0/0/0/0/0/0//0")o[`席${i}.${x.n}#${x.u}`]=(u?`使用[${u}] `:"")+`補正[${m}]`}});
  return o}
function sigStrict(g){return sigLoose(g)+"|"+JSON.stringify(costOf(g))}
function diff(a,b){const out=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(a[k]!==b[k])out.push(`${k}: ${a[k]??"-"} → ${b[k]??"-"}`);return out}

// 1試合分の記録。w は H.load の戻り。返すのは {steps, found:[{kind,turn,first,again,cost:[差分]}]}
function attach(w){
  const log={steps:0,found:[],turns:{}};
  const hist=()=>{const g=w.__G();const t=g.turnNo;return log.turns[t]=log.turns[t]||[]};
  const sample=label=>{const g=w.__G();if(!g||g.sim||g.over)return;
    const L=sigLoose(g),S=sigStrict(g),h=hist();
    const last=h[h.length-1];if(last&&last.S===S)return; // 何も変わらなかった呼び出し（空のキューなど）は数えない。間に別の状態をはさんで戻ったものだけが循環
    log.steps++;const cost=costOf(g);
    for(const e of h){
      if(e.L!==L)continue;
      if(!h.slice(h.indexOf(e)+1).some(z=>z.label!=="runQueue"))continue; // 間にプレイヤーの行動（カードを出す・宣言など）が1つも無い戻りは、効果の途中経過なので除く
      if(e.S===S){log.found.push({kind:"本物の循環",turn:g.turnNo,first:e.label,again:label,cost:[]});break}
      log.found.push({kind:"コスト消費の繰り返し",turn:g.turnNo,first:e.label,again:label,cost:diff(e.cost,cost)});break}
    h.push({L,S,label,cost})};
  for(const fn of ["useFromHand","declareAction","nextHint","assist","reason","contact","runQueue"]){
    const orig=w.ev(fn);
    w[fn]=async function(...a){const r=await orig.apply(this,a);sample(fn);return r}}
  return log}
module.exports={sigLoose,sigStrict,costOf,diff,attach};

if(require.main===module&&process.argv[2]!=="--selftest")(async()=>{
  const [name,N=20,seed=1,sw]=process.argv.slice(2);const useSearch=sw==="search";
  const w0=H.load({seed:+seed}),decks=[...w0.ev("PRESETS"),...w0.ENV_DECKS.decks];
  const mine=decks.find(d=>d.name.includes(name));if(!mine)throw new Error("デッキが無い: "+name);
  const others=decks.filter(d=>d!==mine);const sum={games:0,withLoop:0,real:0,cost:0,steps:0,examples:[]};
  for(let i=0;i<N;i++){
    const w=H.load({seed:+seed*1000+i}),log=attach(w);const opp=others[i%others.length],sa=i%2;
    const ds=[];ds[sa]=w.parseDeckText(mine.text);ds[1-sa]=w.parseDeckText(opp.text);
    await H.play(w,{decks:ds,search:[useSearch,useSearch]});
    sum.games++;sum.steps+=log.steps;if(log.found.length)sum.withLoop++;
    for(const f of log.found){f.kind==="本物の循環"?sum.real++:sum.cost++;if(sum.examples.length<8)sum.examples.push({vs:opp.name,...f})}}
  console.log(JSON.stringify({deck:mine.name,search:useSearch,...sum},null,1))})();

// 自己テスト: node tools/loops.js --selftest  手札の1枚をリムーブエリアへ出し入れして、状態の一致・不一致を見る
if(require.main===module&&process.argv[2]==="--selftest")(async()=>{
  const assert=require("assert");const w=H.load({seed:3}),d=w.ev("PRESETS");
  await H.play(w,{decks:[w.parseDeckText(d[0].text),w.parseDeckText(d[1].text)]},{maxTurns:3});
  const g=w.__G(),p=g.P[g.turn],x=p.hand[0],S0=sigStrict(g),L0=sigLoose(g);
  p.hand.splice(p.hand.indexOf(x),1);p.rm.push(x);assert.notStrictEqual(sigLoose(g),L0,"位置が変わったのに同じ状態");
  p.rm.pop();p.hand.push(x);assert.strictEqual(sigStrict(g),S0,"元に戻したのに違う状態");
  x.used={shin:{t:g.turnNo,n:1}};assert.strictEqual(sigLoose(g),L0);assert.notStrictEqual(sigStrict(g),S0,"コスト消費が差に出ない");
  console.log("selftest ok")})();
