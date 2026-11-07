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
];
