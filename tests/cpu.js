// CPUの判断の単体テスト: 脅威の見積り（threatNext, フラグ threat2）。設計: notes/cpu-defense-design-2026-11-23.md
// 盤面は実況解説プレイ2戦目T8（CPU=探偵団、SeEd=青白キッド）の再現。SeEdの証拠4/8（解決編）で、次のT9に証拠4→8まで伸びた
const assert=require("assert");
const {board}=require("./rules.js");
const GINZO="B10045",AOKO="B11034",KID8="B03046",HAKUBA="B11035"; // 銀三Lv3 LP0 / 青子Lv5 LP0 / キッドLv8 LP2 / 白馬探Lv7 LP1
const setup=(w,{aoko="s",hakuba="s",meMiss=0,meEv=1}={})=>{
  const G=board(w,{p0:{field:["B01019"],ev:meEv?["B01019"]:[]},p1:{field:[GINZO,AOKO,KID8,HAKUBA],ev:["B01019","B01019","B01019","B01019"],solved:true,level:8}});
  const [me,o]=G.P;const f=o.field;f[1].st=aoko;f[3].st=hakuba;o.pLoc="file";
  return {G,me,o}};
module.exports=[
  ["脅威の見積り: スリープ中のキャラ・FILEのパートナー・事件アクションまで数え、証拠4/8でも次の手番に勝てると判定する（実況2戦目T8）",async w=>{
    const {me,o}=setup(w);const t=w.threatNext(me,o);
    // 銀三 事件アクション+1、青子 +1、キッドLv8 LP2、白馬探 LP1、パートナー LP1 = 6
    assert.strictEqual(t.gainMax,6);assert.strictEqual(t.need,4+6-8+1);assert.ok(t.lethal);
    // 従来の oppPot: アクティブなキャラのLPだけ（銀三0＋キッド2）で、4+2=6 < 8 だった
    const oldPot=o.field.reduce((a,y)=>a+(y.st==="a"?w.lpOf(y):0),0);assert.strictEqual(oldPot,2);assert.ok(o.ev.length+oldPot<o.level)}],
  ["脅威の見積り: スタン状態のキャラは起き上がらないので数えない",async w=>{
    const {me,o}=setup(w);o.field[3].st="x";const t=w.threatNext(me,o);
    assert.strictEqual(t.gainMax,5)}],
  ["脅威の見積り: 自分の証拠が0なら事件アクションの+1は数えない（推理のLPだけ）",async w=>{
    const {me,o}=setup(w,{meEv:0});const t=w.threatNext(me,o);
    assert.strictEqual(t.gainMax,4)}],
  ["脅威の見積り: 解決編でなく、次のオートフェイズでもFILEが7に届かないなら、勝てるとは判定しない",async w=>{
    const {me,o}=setup(w);o.solved=false;o.file=[];const t=w.threatNext(me,o);
    assert.strictEqual(t.lethal,false)}],
  ["脅威の見積り: こちらのアクティブなキャラ（ガード役）が多いほど、防御で減らした見積り gainMin が小さくなる",async w=>{
    const {me,o}=setup(w);me.field=["B01019","B01019","B01019"].map(n=>w.inst(n));const t=w.threatNext(me,o);
    assert.ok(t.gainMin<t.gainMax);assert.strictEqual(t.gainMin,Math.max(0,6-3-0))}],
  ["勝ち切り(fin2): 解決編で、推理だけで事件レベルに届くなら、事件アクションをせず推理して事件解決する",async w=>{
    const run=async()=>{const G=board(w,{p0:{field:["B01019","B01019","B01019"],solved:true,level:3},p1:{field:["B01019"],ev:["B01019","B01019"]}});
      G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};G.P[1].field[0].st="s"; // 相手のスリープ中のキャラを殴りたくなる盤面
      await w.cpuTurn(G.P[0]);return G};
    w.AI_OFF=w.ev("AI_OFF0");const G=await run();assert.ok(G.over&&G.winner===0,"勝った（3体の推理で証拠3、パートナーで事件解決）")}],
  ["勝ち切り(fin2): 推理で事件レベルに届くなら、Lv9を出すためのアシストでパートナーを使わず、事件解決する（SeEd 11/24 実況T13: FILE8でアシスト→松田陣平＆萩原研二を出し、証拠7/7になったのにパートナーが無く解決できず負け）",async w=>{
    const F=n=>Array(n).fill("B01019");
    const G=board(w,{p0:{field:["B10065","B10068","B10068"],hand:["B10065","B10066"],ev:F(3),file:F(8),deck:F(20),solved:true,level:7},p1:{field:["B01019"],ev:F(5)}});
    G.P[0].caseC=w.inst("B10082P");G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};
    w.AI_OFF=w.ev("AI_OFF0");await w.cpuTurn(G.P[0]);
    assert.ok(G.over&&G.winner===0,"勝った（推理3体で証拠7、パートナーで事件解決）。アシスト: "+G.rec.log.filter(m=>/アシスト/.test(m[1]||m)).length)}],
  ["勝ち切り(fin2): 迅速のキャラを出せば推理で届くなら、先に迅速のキャラを出して推理し、事件解決する",async w=>{
    w.AI_OFF=w.ev("AI_OFF0");
    const G=board(w,{p0:{field:["B01019","B01019"],hand:["D01002"],file:["B01019","B01019","B01019","B01019","B01019","B01019","B01019"],solved:true,level:3},p1:{field:["B01019"],ev:["B01019","B01019"]}});
    G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};G.P[1].field[0].st="s";
    await w.cpuTurn(G.P[0]);assert.ok(G.over&&G.winner===0,"迅速で出したコナンも推理して勝った")}],
  ["探索の場合分け(strat): 試しの手番が本番の盤面（相手の手札・デッキのカード）を書き換えない。場合ごとの重みの合計は1",async w=>{
    const G=board(w,{p0:{field:["B01019"],hand:["B01008","B01019"],deck:Array(10).fill("B01019")},p1:{field:["B01019"],hand:["D01002","B01019","B02007"],deck:["B01008","B01019","D01009","B01019","B01019","B01019"]}});
    w.AI_OFF=w.ev("AI_OFF0").filter(x=>x!=="strat");const snap=JSON.stringify(G.P);
    const ss=w.stratDeals(G.P[1]);assert.ok(ss&&Math.abs(ss.reduce((a,s)=>a+s.w,0)-1)<1e-9,"重みの合計が1");
    await w.rolloutN(G.P[0],{});assert.strictEqual(JSON.stringify(G.P),snap,"本番の盤面が変わっていない");w.AI_OFF=w.ev("AI_OFF0")}],
  ["序盤のアシスト(asst3): 1ターン目に、アシストしても出せるカードが無いなら、アシストせずパートナーで推理する（SeEd 11/24）",async w=>{
    w.AI_OFF=w.ev("AI_OFF0");
    const G=board(w,{p0:{hand:["B01008","B01008","B02007","D01009","D01002","B01008"],file:["B01019"]}}); // 手札6枚すべてLv3以上、FILE1
    G.turnNo=1;G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};
    const p=G.P[0];await w.cpuTurn(p);
    assert.strictEqual(p.file.length,1,"アシストしていない（FILE1のまま）");assert.strictEqual(p.ev.length,1,"パートナーで推理して証拠1")}],
  ["アシスト(asst4): 手札が7枚あっても、アシストして出せるカードが増えないならアシストせず推理する（SeEd 11/24 実況T3: 手札7枚・FILE3で出せるカードが無いのにアシスト）",async w=>{
    w.AI_OFF=w.ev("AI_OFF0");
    const G=board(w,{p0:{hand:["B01008","B01008","D01002","B01008","D01002","B01008","D01002"],file:["B01019","B01019","B01019"]}}); // 手札7枚、FILE3。アシストしてFILE4でも出せるカードは無い前提を下で確かめる
    const p=G.P[0];p.file.push(p.partner);const can4=p.hand.filter(x=>!w.playableReason(p,x,false));p.file.pop();assert.strictEqual(can4.length,0,"前提: FILE4でも出せるカードが無い");
    G.turnNo=3;G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};
    await w.cpuTurn(p);
    assert.strictEqual(p.file.length,3,"アシストしていない（FILE3のまま）");assert.strictEqual(p.ev.length,1,"パートナーで推理して証拠1")}],
  ["序盤のアシスト(asst3): 手札5〜6枚で、アシストしなくてもLv2を出せるなら、アシストせずに出す（SeEd: Lv2を出すのにアシストしてFILE3にしている）",async w=>{
    w.AI_OFF=w.ev("AI_OFF0");
    const G=board(w,{p0:{hand:["B01019","B01008","B01008","D01002","D01002"],file:["B01019","B01019"]}}); // FILE2、Lv2が出せる。Lv3を出すにはアシストが要るが手札に無い
    G.turnNo=2;G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};
    const p=G.P[0];await w.cpuTurn(p);
    assert.strictEqual(p.file.length,2,"アシストしていない（FILE2のまま）");assert.ok(p.field.some(x=>w.C(x).lv===2),"Lv2を出した")}],
];
