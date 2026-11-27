// デッキ補完（js/deckfill.js）の単体テスト
const assert=require("assert");
const seedOf=(w,name,k)=>{const d=w.ENV_DECKS.decks.find(x=>x.name===name),r=w.parseDeckText(d.text);return {d,r,seed:r.main.slice(0,k)}};
module.exports=[
  ["入力15枚＋パートナー・事件から、40枚の正しいデッキ（validateDeck が空）になる。入力の15枚はそのまま残る",w=>{
    const {r,seed}=seedOf(w,"白単キッド",15);
    const o=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed});
    assert.strictEqual(w.validateDeck({partner:o.partner,caseN:o.caseN,main:o.main}).length,0);
    const have={};for(const n of o.main)have[n]=(have[n]||0)+1;for(const n of seed)assert.ok(have[n]>0,n+" が消えた");
    assert.strictEqual(o.partner,r.partner)}],
  ["補ったカードは、ほとんど入力と同じ色（色が違うカードを混ぜない）",w=>{
    const {r,seed}=seedOf(w,"黄単警視庁",15);const o=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed});const col=w.ev("DB")[r.partner].c;
    const bad=o.main.filter(n=>!w.ev("DB")[n].c.includes(col));assert.ok(bad.length<=2,"他の色 "+bad.length+"枚")}],
  ["onlyAuto（初期値）では、補ったカードがすべて自動化済み",w=>{
    const {r,seed}=seedOf(w,"赤単赤井家",15);const o=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed});
    for(const x of o.why)assert.ok(w.FX.automated({n:x.n}),x.n+" は未自動化")}],
  ["パートナー・事件を書かなくても、似た環境デッキから決まる",w=>{
    const {seed}=seedOf(w,"緑単警察",15);const o=w.fillDeck({main:seed});
    assert.ok(o.partner&&o.caseN);assert.strictEqual(w.validateDeck({partner:o.partner,caseN:o.caseN,main:o.main}).length,0)}],
  ["機能Aの補正: bias で除外・加点でき、exclude で外せる",w=>{
    const {r,seed}=seedOf(w,"白単キッド",15);const base=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed});
    const DB=w.ev("DB");const pick=base.why[0].n,id=DB[pick].i;
    const ex=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed},{exclude:[id]});
    assert.ok(!ex.main.some(n=>DB[n].i===id),"外したはずのカードが入っている");
    const up=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed},{bias:{[id]:-99}});
    assert.ok(!up.main.some(n=>DB[n].i===id),"大きく減点したカードが入っている")}],
  ["入力が空でも、候補がなくても止まらない（警告を返す）",w=>{
    const o=w.fillDeck({main:[]});assert.strictEqual(o.main.length,40);
    const o2=w.fillDeck({main:["B01001"]});assert.ok(o2.warns.length)}],
  ["主力カード候補: 事件の色に収まる、環境デッキに出てくるレベル6以上のキャラだけ（MRを含み、重複IDなし）",w=>{
    const DB=w.ev("DB");const kid=w.CARD_DB.find(c=>c.t==="事件"&&c.c==="青");const cs=w.fillCandidates(kid.n);
    assert.ok(cs.length>5);assert.ok(cs.some(c=>c.lv===9),"MRが入る");
    for(const c of cs){assert.strictEqual(c.t,"キャラ");assert.ok(c.lv>=6);assert.ok([...c.c].every(x=>"青".includes(x)),c.nm+" は青に収まらない")}
    assert.strictEqual(new Set(cs.map(c=>c.i)).size,cs.length);
    for(let k=1;k<cs.length;k++)assert.ok(cs[k-1].lv>=cs[k].lv,"レベルの高い順");
    const multi=w.CARD_DB.find(c=>c.t==="事件"&&c.c.length>=2);assert.ok(w.fillCandidates(multi.n).length>0)}],
  ["犯人（特徴［犯人］）のカードは、入力に犯人がいなければ補完にも主力候補にも出ない。入力に犯人がいる犯人デッキでは補える",w=>{
    const DB=w.ev("DB"),cul=n=>(DB[n].ct||"").split(",").includes("犯人");
    for(const name of ["黒試し（RVVutYH1）","白単キッド","黄単警視庁","赤単赤井家"]){
      const d=[...w.ev("PRESETS"),...w.ENV_DECKS.decks].find(x=>x.name===name);if(!d)continue;
      const r=w.parseDeckText(d.text),seed=r.main.filter(n=>!cul(n)).slice(0,15);
      const o=w.fillDeck({partner:r.partner,caseN:r.caseN,main:seed});assert.ok(!o.main.some(cul),name+" の補完に犯人が入った")}
    const k=w.CARD_DB.find(c=>c.t==="事件"&&c.c==="黒");assert.ok(!w.fillCandidates(k.n).some(c=>cul(c.n)));
    const cd=w.ENV_DECKS.decks.map(x=>w.parseDeckText(x.text)).find(r=>r.main.some(cul));
    if(cd){const o=w.fillDeck({partner:cd.partner,caseN:cd.caseN,main:cd.main.filter(cul).slice(0,3).concat(cd.main.filter(n=>!cul(n)).slice(0,12))});
      assert.strictEqual(w.validateDeck({partner:o.partner,caseN:o.caseN,main:o.main}).length,0)}}],
  ["デッキ選択: 「環境デッキ」分類は勝率上位15デッキ＋追加分（DECK_ENV_EXTRA）で、勝率の高い順に並び、CPUで使える",w=>{
    const v=w.ev("deckGroups()").find(x=>x[1]==="v")[2],N=w.ev("DECK_TOP_N"),wr=w.ev("DECK_WR"),ex=w.ev("DECK_ENV_EXTRA");
    assert.strictEqual(v.length,N+ex.length);ex.forEach((n,i)=>assert.strictEqual(v[N+i].name,n));
    for(let i=1;i<N;i++)assert.ok(wr[v[i-1].name]>=wr[v[i].name]);
    for(const d of v)assert.ok(w.parseDeckText(d.text).errors.length===0&&w.cpuReady(w.parseDeckText(d.text)),d.name)}],
  ["デッキ選択: 勝率表が全デッキ名と一致し、上位15デッキは勝率の高い順に並ぶ。表にないデッキ（マイデッキ）は順位なし",w=>{
    const wr=w.ev("DECK_WR"),ex=w.ev("DECK_ENV_EXTRA"),all=[...w.ev("PRESETS"),...w.ENV_DECKS.decks].filter(d=>!ex.includes(d.name)); // 追加分（DECK_ENV_EXTRA）は総当たり前なので勝率表にない
    for(const d of all)assert.ok(wr[d.name]>0,d.name+" の勝率がない");
    assert.strictEqual(Object.keys(wr).length,all.length);
    const top=all.filter(d=>w.deckRank(d)<w.ev("DECK_TOP_N"));assert.strictEqual(top.length,w.ev("DECK_TOP_N"));
    const min=Math.min(...top.map(d=>wr[d.name]));for(const d of all)if(!top.includes(d))assert.ok(wr[d.name]<=min);
    assert.strictEqual(w.deckRank({name:"自作デッキ"}),null)}],
  ["自動命名: 主力カード名（8文字まで）と日付が入り、既存の名前と被ったら連番になる",w=>{
    const r=w.parseDeckText(w.ev("PRESETS")[3].text),DB=w.ev("DB"),now=new Date(2026,10,23);
    const n1=w.autoDeckName(r,[],now);
    assert.ok(n1.endsWith(" 11/23")&&n1.length<=" 11/23".length+8,n1);
    const n2=w.autoDeckName(r,[n1],now);assert.strictEqual(n2,n1+" 2");
    assert.strictEqual(w.autoDeckName(r,[n1,n2],now),n1+" 3");
    assert.ok(w.autoDeckName({main:[]},[],now).endsWith(" 11/23"))}],
];
