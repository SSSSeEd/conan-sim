// 効果の仕組みの単体テスト: イベントをキャラにセットする仕組み（set-events.js）と「手札から公開したとき」（reveal.js）
const assert=require("assert");
const {board}=require("./rules.js");
const R="B01019"; // 効果文なしのキャラ Lv2
const D=[R,R,R,R,R,R,R,R]; // デッキ
module.exports=[
  ["かみなり斬り: AP8000以下をリムーブし、レベル8以上の［YAIBA］にセット、デッキの上3枚をリムーブ。鉄刃 B06046 はセットされてアクティブに",async w=>{
    const G=board(w,{p0:{field:["B06046"],hand:["B06062"],deck:D},p1:{field:[R]}});const p=G.P[0],[h]=p.field,[ev]=p.hand;h.st="s";
    await w.FX.event(p,ev);
    assert.strictEqual(G.P[1].field.length,0);assert.ok(h.set.some(s=>s.c===ev&&s.up),"セットされている");
    assert.strictEqual(p.deck.length,D.length-3);assert.strictEqual(h.st,"a")}],
  ["せんぷう剣: 相手のレベル7以下を手札に移し、セットされたキャラは自分のターン中AP＋2000",async w=>{
    const G=board(w,{p0:{field:["B06046"],hand:["B06063"]},p1:{field:[R]}});const p=G.P[0],[h]=p.field;
    await w.FX.event(p,p.hand[0]);
    assert.strictEqual(G.P[1].hand.length,1);assert.strictEqual(w.apOf(h),10000);G.turn=1;assert.strictEqual(w.apOf(h),8000)}],
  ["刃新陰流風車: アクティブ状態のキャラを指定してアクションでき、相手ターンにリムーブされると［YAIBA］がスリープで登場",async w=>{
    const G=board(w,{p0:{field:["B06046"],hand:["B06064"],rm:["B06055"]}});const p=G.P[0],[h]=p.field,ev=p.hand[0];
    assert.strictEqual(w.hitsActive(h,p),false);await w.FX.event(p,ev);assert.strictEqual(w.hitsActive(h,p),true);
    G.turn=1;w.removeCard(h,"テスト");await w.runQueue();
    assert.ok(p.rm.includes(ev),"イベントはリムーブエリアへ");
    assert.deepStrictEqual(p.field.map(x=>[w.C(x).nm,x.st]),[["カゲトラ","s"]])}],
  ["刃新陰流風車: 自分のターンにリムーブされたときは登場しない",async w=>{
    const G=board(w,{p0:{field:["B06046"],hand:["B06064"],rm:["B06055"]}});const p=G.P[0],[h]=p.field;
    await w.FX.event(p,p.hand[0]);w.removeCard(h,"テスト");await w.runQueue();assert.strictEqual(p.field.length,0)}],
  ["鉄刃 B06047: 手札の【白】の［YAIBA］イベントをレベル－1",async w=>{
    const G=board(w,{p0:{field:["B06047"],hand:["B06062",R]}});const p=G.P[0];
    assert.strictEqual(w.FX.handLevel(p,p.hand[0]),6);assert.strictEqual(w.FX.handLevel(p,p.hand[1]),null)}],
  ["公開したとき: 宣言の効果を解決してから発動する（工藤新一 B06004 の公開 → 毛利蘭 B09004 はその後）",async w=>{
    const G=board(w,{p0:{field:["B06004","B09004"],hand:["B09004",R,R]},p1:{field:[R]}});const p=G.P[0],[s]=p.field;const o=G.P[1];
    const a=w.FX.abilities(p,s).find(a=>a.ok);await w.FX.useAbility(p,s,a);
    assert.strictEqual(o.deck.length,6,"相手のキャラはデッキの下へ（毛利蘭の効果が先に割り込んでいない）");
    assert.strictEqual(p.hand.length,3,"対象がもういないので毛利蘭の効果は使わない")}],
  ["毛利蘭 B10006: ［毛利蘭］を公開したらアクティブになりAP＋1000（事件青＆黒・FILE5）。オートフェイズにはアクティブにならない",async w=>{
    const G=board(w,{p0:{field:["B10097","B10006","B06004"],hand:["B09004"],file:[R,R,R,R,R]},p1:{field:[R]}});const p=G.P[0],[rb,ran]=p.field;
    p.caseC=w.inst("B08094");ran.st="s";
    const a=w.FX.abilities(p,rb).find(a=>a.ok);assert.ok(a,"毛利蘭＆ベルモットの宣言が使える");await w.FX.useAbility(p,rb,a);
    assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(ran.st,"a");assert.strictEqual(w.apOf(ran),w.C(ran).ap+1000);
    assert.ok(w.FX.noAutoWake(ran))}],
  ["ターン終了時の効果が2つ以上なら、人は順番を選ぶ（1つならそのまま、CPUは選ばない）",async w=>{
    const G=board(w,{p0:{field:["B06046","B06046"]}});const p=G.P[0];
    await w.FX.endTurn(p);p.cpu=false;
    await assert.rejects(()=>w.FX.endTurn(p),/orderCards/);
    p.field.pop();await w.FX.endTurn(p)}],
];
