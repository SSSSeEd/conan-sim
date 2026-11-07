// 対戦記録からのフィードバック: node tools/feedback.js 記録.json [--md]
// アプリの「記録を書き出す」JSON（配列、または1試合分）から、人の席のデッキごとに
//  ① 使われなかったカード ② 手札で腐りがちなカード ③ 出せたのに出さなかったカード
//  ④ 使うと勝ちやすい／負けやすいカード ⑤ 使い残し（ヒント・アシスト・アクション）を出す。
// データは rec.acts（やった行動）・rec.miss（ターンごとの出せたのにやらなかったこと・出せず手札に残ったカード）・deckLists・winner を使う。
// 試合数が少ないうちは断定せず「傾向」として出す（MIN_GAMES 未満のカードは勝率の比較をしない）。
const fs=require("fs");
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
module.exports={analyze,toMarkdown};
if(require.main===module){
  const f=process.argv[2];if(!f){console.log("使い方: node tools/feedback.js 記録.json");process.exit(1)}
  const H=require("./headless");const w=H.load({seed:1});
  const res=analyze(JSON.parse(fs.readFileSync(f,"utf8")),{parse:t=>w.parseDeckText(t),nameOf:n=>w.ev("(DB[\""+n+"\"]||{}).nm")||n});
  console.log(toMarkdown(res));
}
