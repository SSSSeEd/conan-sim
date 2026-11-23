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
  ["防衛(def2): 相手が次の手番に勝てる見込みなら、事件アクションより先にスリープ中の推理源（LP1以上）を倒す",async w=>{
    const off=w.ev("AI_OFF0");
    const run=async on=>{w.AI_OFF=off.filter(x=>x!=="threat2"&&(!on||x!=="def2")); // threat2は常にオン、def2はon のときだけオン
      const G=board(w,{p0:{field:["B01008"],ev:["B01019"]},p1:{field:["B11035","B03046"],ev:["B01019","B01019","B01019","B01019"],solved:true,level:8}});
      G.cfg.search=[false,false];G.sim={plan:{},planFor:0,stage:1};
      const o=G.P[1];o.field[0].st="s";o.field[1].st="s"; // 白馬探(LP1, AP5000)とキッドLv8(LP2, AP7000)はスリープ中
      await w.cpuTurn(G.P[0]);return G};
    const G1=await run(true);assert.ok(!G1.P[1].field.some(x=>w.C(x).nm==="白馬探"),"def2: 倒せる推理源（白馬探）を倒した");
    const G0=await run(false);assert.ok(G0.P[1].field.some(x=>w.C(x).nm==="白馬探"),"def2なし: 倒していない")}],
];
