// デッキ別CPU（段階⑤）の単体テスト: js/deckcpu/*.js、js/cpu.js の deckCpu・deckHook、tools/deck_learn.js の効果の出し方
const assert=require("assert");
const {board}=require("./rules.js");
const H=require("../tools/headless");
const {learn}=require("../tools/deck_learn.js");
// 対戦を1手番だけ始めて、席0のデッキの判定を見る
const detectOf=async(w,name)=>{const all=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];
  await H.play(w,{decks:[w.parseDeckText(all.find(d=>d.name===name).text),w.parseDeckText(all[3].text)],search:[false,false]},{maxTurns:1});
  const p=w.__G().P[0];delete p.deckCpu;w.deckCpu(p);return p.deckCpu};
// 青のパートナーで、手札・FILEを置いた盤面
const blue=(w,spec)=>{const G=board(w,spec);for(const p of G.P){p.partner=w.inst("D08001");}return G};
module.exports=[
  ["デッキの判定: 青単探偵団（B2RISJY2P）は探偵団、白黄キッドは白黄キッド、白単キッド・スタンキッドは共通CPUのまま",async w=>{
    w.AI_OFF=[];
    assert.strictEqual(await detectOf(w,"青単探偵団"),"aoshonen");
    assert.strictEqual(await detectOf(w,"白黄キッド"),"shirokid");
    assert.strictEqual(await detectOf(w,"スタンキッド11/20"),"");
    assert.strictEqual(await detectOf(w,"白単キッド"),"");
    assert.strictEqual(await detectOf(w,"青単SOS"),"")}],
  ["デッキ別CPU（deck）: スイッチがオフ（既定）なら加点しない。オンなら、リムーブエリアに探偵団が無いときの結成（B03006）より、名前違いのレベル4（B11007）を先に出す",async w=>{
    const F=n=>Array(n).fill("B05010");
    const G=blue(w,{p0:{hand:["B03006","B11007"],file:F(8)}});const p=G.P[0];
    assert.strictEqual(w.bestHand(p,false).n,"B03006","オフ: レベルの高い結成を出す（共通CPUの点数）");
    w.AI_OFF=[];delete p.deckCpu;p.deckCpu="aoshonen";
    assert.strictEqual(w.bestHand(p,false).n,"B11007","オン: 結成はリムーブが貯まってから");
    // リムーブエリアに名前の違う探偵団が5種あれば、結成を出す
    p.rm=["B11007","B11008","B11009","B01016","D08018"].map(n=>w.inst(n));
    assert.strictEqual(w.bestHand(p,false).n,"B03006","リムーブ5種なら結成")}],
  ["学んだ表（deckL）: 局面とカードで、手札の優先度と探索の案の点数に加点する。deckL がオフの席では0",async w=>{
    const G=blue(w,{p0:{hand:["B11007","B11009"],file:Array(6).fill("B05010")}});const p=G.P[0];p.deckCpu="aoshonen";
    const keep=w.DECK_LEARNED.aoshonen;w.DECK_LEARNED.aoshonen={mid:{B11009:0.05,A:-0.02},early:{B11009:-0.05}};
    try{w.AI_OFF=["deck"];
      assert.strictEqual(w.ev("deckPhase")(p),"mid");
      assert.strictEqual(w.deckHook(p,"plan",{play:"B11009"}),w.ev("DECK_KS")*0.05);
      assert.strictEqual(w.deckHook(p,"plan",{play:"B11009",assist:1}),w.ev("DECK_KS")*(0.05-0.02));
      assert.strictEqual(w.bestHand(p,false).n,"B11009","中盤の表で B11009 が上");
      w.AI_OFF=["deck","deckL"];assert.strictEqual(w.deckHook(p,"plan",{play:"B11009"}),0)}
    finally{w.DECK_LEARNED.aoshonen=keep}}],
  ["分析（deck_learn）: 選ばれやすさが案の数で違っても、逆確率重みで手そのものの効果だけを出す（素の勝率の差では効果があるように見える）",async()=>{
    // 案が2つの手番（Xが選ばれる確率1/2）は勝率80%、案が4つの手番（1/4）は勝率20%。どの手を選んでも勝率は同じ＝Xの効果は0
    const games=[];let i=0;const T=(c,k)=>({ph:"mid",x:1,c,k,u:[]});
    for(let r=0;r<400;r++){const two=r%2===0,win=(two?(r%10<8):(r%10<2))?1:0;
      const c=two?["X","Y"]:["X","Y","Z","W"],k=c[(r>>1)%c.length];games.push({win,T:[T(c,k)]});i++}
    const L=learn(games,0.04);const naive=(()=>{let a=0,b=0,na=0,nb=0;for(const g of games){const t=g.T[0];if(t.k==="X"){a+=g.win;na++}else{b+=g.win;nb++}}return a/na-b/nb})();
    assert.ok(Math.abs(naive)>0.05,"素の差は0から離れる: "+naive);
    assert.ok(Math.abs(L.mid.X.e)<0.03,"重みつきの効果はほぼ0: "+L.mid.X.e)}],
  ["キャラへのアクション(ciAtk): APで負ける相手（スリープ中のAP8000）でも、手札の光彦 B11009 の除去カットインで取れるなら、推理できない元太 B11008 で仕掛けてリムーブする",async w=>{
    const run=async flags=>{const G=board(w,{p0:{field:["B11007","B11008"],hand:["B11009"]},p1:{field:["B01019"]},turn:0});const [p,o]=G.P;
      const y=o.field[0];y.st="s";y.apM=8000;w.AI_OFF=[...w.ev("AI_OFF0"),"ci2","ciAtk"].filter(f=>!flags.includes(f));
      await w.attackPhase({p,o,step:async()=>{},hold:new Set()});return {p,o,y}};
    let r=await run(["ci2"]);assert.ok(r.o.field.includes(r.y),"旧: APで勝てない相手にはアクションしない");assert.strictEqual(r.p.hand.length,1);
    r=await run(["ci2","ciAtk"]);assert.ok(!r.o.field.includes(r.y),"新: アクションしてカットインでリムーブ");
    assert.strictEqual(r.p.field.find(x=>x.n==="B11008").st,"s","LP0の元太がアクションした（LP1の歩美は推理用に残す）");
    assert.ok(!r.p.hand.some(x=>x.n==="B11009")&&r.p.hand.length===1,"光彦を使って1枚引いた")}],
  ["キャラへのアクション(ciAtk): 名前違いのレベル4が1種だけ（カットインの条件を満たさない）なら仕掛けない",async w=>{
    const G=board(w,{p0:{field:["B11008"],hand:["B11009"]},p1:{field:["B01019"]},turn:0});const [p,o]=G.P;
    const y=o.field[0];y.st="s";y.apM=8000;w.AI_OFF=w.ev("AI_OFF0");
    await w.attackPhase({p,o,step:async()=>{},hold:new Set()});assert.ok(o.field.includes(y));assert.strictEqual(p.field[0].st,"a")}],
  ["変装(dgKill): 自分のターン、Lv4の名前違いが歩美を入れて3種になるなら、勝っているコンタクトでも元太 B11008 を歩美 B11007 に変装し、相手のスリープ中のLv7以下をリムーブして1枚引く",async w=>{
    const mk=()=>{const G=board(w,{p0:{field:["B11008","B11009","B01016"],hand:["B11007"],file:Array(4).fill("B05010")},p1:{field:["B01019","B01019"]},turn:0});const [q,o]=G.P;
      q.caseC=w.inst("D01016");q.partner=w.inst("D08001"); // 歩美の変装の条件【事件青】【FILE4】
      const mine=q.field[0],theirs=o.field[0];theirs.apM=1000;o.field[1].st="s";const ct={a:mine,d:theirs};G.contact=ct;return {G,q,o,mine,theirs,ct,x:q.hand[0]}};
    let t=mk();w.AI_OFF=w.ev("AI_OFF0").concat(["dgKill"]);assert.strictEqual(w.cpuContact(t.q,t.mine,t.theirs,[],t.q,[t.x]),null,"旧: 勝っているので何もしない");
    t=mk();w.AI_OFF=w.ev("AI_OFF0");const d=w.cpuContact(t.q,t.mine,t.theirs,[],t.q,[t.x]);assert.ok(d&&d.how==="dis"&&d.x===t.x,"新: 変装する");
    t=mk();const y=t.o.field[1];assert.strictEqual(await w.contactRight(t.q,t.ct,t.q),true);
    assert.ok(!t.o.field.includes(y),"スリープ中の相手をリムーブ");assert.strictEqual(t.q.hand.length,1,"1枚引いた")}],
  ["変装(dgKill): 歩美を入れても名前違いのLv4が2種なら変装しない",async w=>{
    const G=board(w,{p0:{field:["B11008","B11009"],hand:["B11007"]},p1:{field:["B01019","B01019"]},turn:0});const [q,o]=G.P;
    const mine=q.field[0],theirs=o.field[0];theirs.apM=1000;o.field[1].st="s";G.contact={a:mine,d:theirs};
    w.AI_OFF=w.ev("AI_OFF0");assert.strictEqual(w.cpuContact(q,mine,theirs,[],q,[q.hand[0]]),null)}],
];
