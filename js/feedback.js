// 対戦記録からのフィードバック: node tools/feedback.js 記録.json [--md]（アプリの「記録からフィードバック」も同じロジック: js/feedback.js）
// アプリの「記録を書き出す」JSON（配列、または1試合分）から、人の席のデッキごとに
//  ① 使われなかったカード ② 手札で腐りがちなカード ③ 出せたのに出さなかったカード
//  ④ 使うと勝ちやすい／負けやすいカード ⑤ 使い残し（ヒント・アシスト・アクション）を出す。
// データは rec.acts（やった行動）・rec.miss（ターンごとの出せたのにやらなかったこと・出せず手札に残ったカード）・deckLists・winner を使う。
// 試合数が少ないうちは断定せず「傾向」として出す（MIN_GAMES 未満のカードは勝率の比較をしない）。
// ブラウザでは window.Feedback、Node では module.exports で使う
(function(){
const MIN_GAMES=4;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const inc=(m,k,n=1)=>m.set(k,(m.get(k)||0)+n);

// parse: デッキ文字列 → [カードNo...]（枚数ぶん）。parseDeckText を渡す。nameOf: No → カード名
function analyze(records,{parse,nameOf}){
  const recs=(Array.isArray(records)?records:[records]).filter(r=>r&&r.deckLists&&r.acts);
  const decks=new Map();
  for(const r of recs){
    const seat=r.cpu?r.cpu.findIndex(c=>!c):0; if(seat<0)continue;
    const d=parse(r.deckLists[seat]);const key=[d.partner,d.caseN,...[...d.main].sort()].join(",");
    let g=decks.get(key);
    if(!g){g={label:r.decks&&r.decks[seat]||"",copies:new Map(),games:0,wins:0,cards:new Map(),stuck:new Map(),skipped:new Map(),
      turns:0,hintMiss:0,assistMiss:0,actCharaMiss:0,actCaseMiss:0,ownTurns:0,fb:[]};
      for(const n of d.main)inc(g.copies,n);decks.set(key,g)}
    const won=r.winner===seat;g.games++;if(won)g.wins++;
    const played=new Set();
    for(const a of r.acts){if(a.who!==seat)continue;
      if((a.kind==="use"||a.kind==="hintUse")&&a.card)played.add(a.card.n)}
    for(const n of g.copies.keys()){const c=g.cards.get(n)||{games:0,playedG:0,playedW:0,notPlayedW:0,notPlayedG:0};
      c.games++;if(played.has(n)){c.playedG++;if(won)c.playedW++}else{c.notPlayedG++;if(won)c.notPlayedW++}
      g.cards.set(n,c)}
    for(const m of r.miss||[]){g.ownTurns++;
      for(const nm of new Set(m.stuck||[]))inc(g.stuck,nm);
      for(const nm of new Set(m.play||[]))inc(g.skipped,nm);
      if(m.hint)g.hintMiss++;if(m.assist)g.assistMiss++;
      if(m.actChara&&m.actChara.length)g.actCharaMiss++;if(m.actCase&&m.actCase.length)g.actCaseMiss++}
    if(r.feedback&&r.feedback.app)g.fb.push(r.feedback.app);
  }
  const out=[];
  for(const g of decks.values()){
    const tips=[];const rows=[];
    // 同じ名前で別のカードNo（Lvや効果が違う）は、見分けるために [No] を付ける
    const cnt=new Map();for(const n of g.cards.keys())inc(cnt,nameOf(n));
    for(const [n,c] of g.cards){const nm=cnt.get(nameOf(n))>1?`${nameOf(n)}[${n}]`:nameOf(n),k=g.copies.get(n);
      rows.push({n,nm,copies:k,...c,rate:pct(c.playedG,c.games),
        wPlayed:pct(c.playedW,c.playedG),wNot:pct(c.notPlayedW,c.notPlayedG)})}
    if(g.games>=MIN_GAMES){
      const unused=rows.filter(r=>r.playedG===0);
      if(unused.length)tips.push({kind:"unused",text:`${g.games}戦で一度も使わなかった: ${unused.map(r=>`${r.nm}×${r.copies}`).join("、")}。入れ替え候補か、出し方（引けていない／出せていない）の見直し対象`});
      const low=rows.filter(r=>r.playedG>0&&r.rate<=25&&r.copies>=2);
      if(low.length)tips.push({kind:"rare",text:`ほとんど使っていない（4戦に1回以下）: ${low.map(r=>`${r.nm}（${r.rate}%）`).join("、")}`});
    }
    const stuckTop=[...g.stuck].filter(([,v])=>g.ownTurns&&v/g.ownTurns>=0.4).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(stuckTop.length)tips.push({kind:"stuck",text:`手札で出せずに残りがち: ${stuckTop.map(([nm,v])=>`${nm}（${pct(v,g.ownTurns)}%のターン）`).join("、")}。レベル・条件に合うカードを先に出す／ヒントやアシストでFILEを増やす順番を見直す`});
    const skipTop=[...g.skipped].filter(([,v])=>g.ownTurns&&v/g.ownTurns>=0.3).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(skipTop.length)tips.push({kind:"skipped",text:`出せたのに出さなかったターンが多い: ${skipTop.map(([nm,v])=>`${nm}（${v}ターン）`).join("、")}`});
    const mv=rows.filter(r=>r.playedG>=MIN_GAMES&&r.notPlayedG>=MIN_GAMES).map(r=>({...r,d:r.wPlayed-r.wNot}));
    const good=mv.filter(r=>r.d>=20).sort((a,b)=>b.d-a.d).slice(0,3),bad=mv.filter(r=>r.d<=-20).sort((a,b)=>a.d-b.d).slice(0,3);
    if(good.length)tips.push({kind:"good",text:`使った試合のほうが勝率が高い: ${good.map(r=>`${r.nm}（使った${r.wPlayed}% / 使わず${r.wNot}%）`).join("、")}。早く出す工夫の価値あり`});
    if(bad.length)tips.push({kind:"bad",text:`使った試合のほうが勝率が低い: ${bad.map(r=>`${r.nm}（使った${r.wPlayed}% / 使わず${r.wNot}%）`).join("、")}。出すタイミング・枚数を見直す（因果とは限らない）`});
    const T=g.ownTurns;
    if(T){
      if(g.hintMiss/T>=0.3)tips.push({kind:"hint",text:`ネクストヒントを使える状態で使わなかったターンが ${pct(g.hintMiss,T)}%。連続使用のコンボがないなら問題なし、あるなら使い忘れ`});
      if(g.assistMiss/T>=0.2)tips.push({kind:"assist",text:`アシストできたのにしなかったターンが ${pct(g.assistMiss,T)}%`});
      if(g.actCaseMiss/T>=0.3)tips.push({kind:"actCase",text:`事件アクションできたのにしなかったターンが ${pct(g.actCaseMiss,T)}%。相手の証拠が多いときは優先して減らす`});
      if(g.actCharaMiss/T>=0.4)tips.push({kind:"actChara",text:`キャラでアクションできたのにしなかったターンが ${pct(g.actCharaMiss,T)}%（スリープさせたくない場面を除く）`});
    }
    if(!tips.length)tips.push({kind:"none",text:g.games<MIN_GAMES?`試合数が少ない（${g.games}戦）。${MIN_GAMES}戦以上で提案が出ます`:"目立った傾向なし"});
    out.push({label:g.label,games:g.games,wins:g.wins,turns:T,rows:rows.sort((a,b)=>a.rate-b.rate),tips,memo:g.fb});
  }
  return out.sort((a,b)=>b.games-a.games);
}
function toMarkdown(res){
  const L=[];
  for(const d of res){
    L.push(`## ${d.label}（${d.games}戦 ${d.wins}勝 ${pct(d.wins,d.games)}%）`,"");
    L.push("### 提案",...d.tips.map(t=>`- ${t.text}`),"");
    L.push("### カード別 使用率（試合のうち一度でも出した割合）","","| カード | 枚数 | 使用率 | 使った時の勝率 | 使わない時の勝率 |","|---|---|---|---|---|");
    for(const r of d.rows)L.push(`| ${r.nm} | ${r.copies} | ${r.rate}% | ${r.playedG?r.wPlayed+"%":"-"} | ${r.notPlayedG?r.wNot+"%":"-"} |`);
    L.push("");
  }
  return L.join("\n");
}
// ===== 記録の圧縮（コピー用） =====
// 長いログをコピーしやすくするため、人が読めない短い形にする。分析に使う acts・miss・デッキ・結果・メモはそのまま戻せる（unpack）。
// deps.log を 0 にするとログなし（分析に要るものだけ。いちばん小さい）、数を渡すと最後のN行だけ。
// 形式: 先頭行 "CS1"、2行目以降は JSON 1つ（配列）。カード名は辞書(N)の番号、acts は [ターン,席,種類番号,カードNo,対象No]、
// ログはターンごとにまとめ、行頭の字下げは ^、辞書にあるカード名は §番号; に置き換える。
const KINDS_OF=(K,k)=>{let i=K.indexOf(k);if(i<0){i=K.length;K.push(k)}return i};
function packOne(r,{parse,nameOf,log}){
  const N=[],ix=new Map(),id=t=>{if(!ix.has(t)){ix.set(t,N.length);N.push(t)}return ix.get(t)},K=[];
  const decks=(r.deckLists||[]).map(t=>{const d=parse(t),c={};for(const n of d.main)c[n]=(c[n]||0)+1;
    return [d.partner,d.caseN,...Object.entries(c).map(([n,k])=>k>1?n+"x"+k:n)].join(",")});
  // ログに出てくるカード名: 両方のデッキのカード（長い名前から置き換える）
  const cardNames=[...new Set((r.deckLists||[]).flatMap(t=>{const d=parse(t);return [d.partner,d.caseN,...d.main].map(nameOf)}).filter(x=>x&&x.length>=2))].sort((a,b)=>b.length-a.length);
  const nameIx=new Map();cardNames.forEach((nm,i)=>nameIx.set(nm,i));
  const esc=cardNames.length?new RegExp(cardNames.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g"):null;
  const logs=[];let lastT=null;
  const src=log===0?[]:typeof log==="number"?(r.log||[]).slice(-log):(r.log||[]); // log: 省略(0)・最後のN行(数)・全部(未指定)
  for(const [t,msg] of src){let m=String(msg).replace(/^　+/,x=>"^".repeat(x.length));
    if(esc)m=m.replace(esc,x=>"§"+nameIx.get(x)+";");
    if(t!==lastT){logs.push([t]);lastT=t}logs[logs.length-1].push(m)}
  const o={v:"cs1",s:r.start,n:r.names,c:(r.cpu||[]).map(x=>x?1:0),d:r.decks,f:r.first,w:r.winner,y:r.why,t:r.turns,
    k:decks,
    a:(r.acts||[]).map(a=>[a.t,a.who,KINDS_OF(K,a.kind),a.card?a.card.n:0,a.target?(a.target==="事件"?"事件":a.target.n):0]),
    m:(r.miss||[]).map(m=>{const x={t:m.t,s:m.s?[m.s.file,m.s.ev,m.s.oEv,m.s.hand,m.s.field,m.s.oField]:0};
      for(const key of ["play","stuck","reason","actChara","actCase"])if(m[key]&&m[key].length)x[key]=m[key].map(id);
      if(m.hint)x.hint=1;if(m.assist)x.assist=1;return x}),
    z:(r.final||[]).map(f=>[f.ev,f.file,f.field,f.hand,f.deck,f.solved?1:0]),
    N,K,C:cardNames,l:logs};
  if(r.feedback)o.b=r.feedback;
  return o}
function pack(records,deps){const a=(Array.isArray(records)?records:[records]).filter(r=>r&&r.deckLists);
  return "CS1\n"+JSON.stringify(a.map(r=>packOne(r,deps)))}
function unpackOne(o,{nameOf}={}){
  const nm=n=>nameOf?nameOf(n):"";const card=n=>n?{n,nm:nm(n)}:null;
  const deck=t=>{const [p,c,...rest]=t.split(",");return `パートナー ${p}\n事件 ${c}\n`+rest.map(x=>{const [n,k]=x.split("x");return `${n} x${k||1}`}).join("\n")};
  const r={v:2,start:o.s,names:o.n,cpu:(o.c||[]).map(x=>!!x),decks:o.d,deckLists:(o.k||[]).map(deck),first:o.f,winner:o.w,why:o.y,turns:o.t,
    acts:(o.a||[]).map(([t,who,k,c,tg])=>({t,who,kind:o.K[k],card:card(c),target:tg==="事件"?"事件":card(tg)})),
    miss:(o.m||[]).map(m=>{const x={t:m.t};if(m.s)x.s={file:m.s[0],ev:m.s[1],oEv:m.s[2],hand:m.s[3],field:m.s[4],oField:m.s[5]};
      for(const key of ["play","stuck","reason","actChara","actCase"])if(m[key])x[key]=m[key].map(i=>o.N[i]);
      if(m.hint)x.hint=true;if(m.assist)x.assist=true;return x}),
    final:(o.z||[]).map(f=>({ev:f[0],file:f[1],field:f[2],hand:f[3],deck:f[4],solved:!!f[5]})),
    log:[]};
  for(const g of o.l||[]){const t=g[0];for(const m of g.slice(1))r.log.push([t,m.replace(/^\^+/,x=>"　".repeat(x.length)).replace(/§(\d+);/g,(_,i)=>o.C[+i])])}
  if(o.b)r.feedback=o.b;
  return r}
function unpack(text,deps){const t=String(text).trim();if(!t.startsWith("CS1"))throw new Error("圧縮形式ではありません");
  return JSON.parse(t.slice(3)).map(o=>unpackOne(o,deps))}
const API={analyze,toMarkdown,pack,unpack,MIN_GAMES};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else globalThis.Feedback=API;
})();
