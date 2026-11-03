// カード効果の単体テスト: tests/rules.js の盤面づくりを借りて、個別のカード効果の結果を確かめる
const assert=require("assert");
const {board}=require("./rules.js");
const R="B01019"; // 効果文なし（カットインだけ）のキャラ Lv2
module.exports=[
  ["赤井秀一 B04046: 自分のターン中は相手のキャラがレベル－1",async w=>{
    const G=board(w,{p0:{field:["B04046"]},p1:{field:[R]}});const [y]=G.P[1].field;
    assert.strictEqual(w.ev("lvOf")(y),1);G.turn=1;assert.strictEqual(w.ev("lvOf")(y),2)}],
  ["犯人 PR158: リムーブエリアの犯人1枚につきカットインAP＋2000（このカードも含める）",async w=>{
    const G=board(w,{p0:{hand:["PR158"],rm:["PR158","PR158"]}});
    assert.strictEqual(w.cutinAp(G.P[0].hand[0],G.P[0]),6000)}],
  ["アンドレ・キャメル B08048: アクションした相手のキャラをレベル－1、レベル6以下ならアクション終了時までAP＋3000",async w=>{
    const G=board(w,{p0:{field:["B08048"]},p1:{field:[R]}});const [a]=G.P[0].field,[t]=G.P[1].field;
    await w.FX.onAction(G.P[0],a,t);assert.strictEqual(w.ev("lvOf")(t),1);assert.strictEqual(w.apOf(a),8000);
    await w.FX.actionEnd(G.P[0],a);assert.strictEqual(w.apOf(a),5000)}],
  ["疾風: このターンで1番に登場したときだけ発動（松田陣平 B09074 は1枚引く）",async w=>{
    const G=board(w,{p0:{hand:["B09074","B09074"],deck:[R,R,R,R,R,R,R,R,R,R]}});const p=G.P[0];const [a,b]=p.hand;
    const enter=w.ev("enterByEffect");await enter(p,a);const h1=p.hand.length;await enter(p,b);
    assert.strictEqual(h1,2,"1枚目: 手札から出して（－1）疾風で1枚引く（＋1）");assert.strictEqual(p.hand.length,1,"2枚目: 疾風は発動しない")}],
  ["「閃光弾!?」: 両方の現場のスリープ状態のキャラをスタン",async w=>{
    const G=board(w,{p0:{hand:["B06071"],field:[R]},p1:{field:[R,R]}});G.P[0].field[0].st="s";G.P[1].field[0].st="s";
    await w.FX.event(G.P[0],G.P[0].hand[0]);
    assert.deepStrictEqual([...G.P[0].field,...G.P[1].field].map(x=>x.st),["x","x","a"])}],
  ["「後ろの女に一言遺したろ思てなァ…」: FILEが6枚以上だと使えない",async w=>{
    const G=board(w,{p0:{hand:["B04027"],file:[R,R,R,R,R,R]}});
    assert.ok(w.FX.useBlock(G.P[0],G.P[0].hand[0]));G.P[0].file.pop();assert.ok(!w.FX.useBlock(G.P[0],G.P[0].hand[0]))}],
  ["突撃だけのキャラ・カットインのAPだけのキャラは「自動」",async w=>{
    for(const n of ["D01005","B01019","B09059"])assert.ok(w.FX.automated({n}),n)}],
  ["【事件編】【解決編】の条件: 事件編は解決編でないときだけ真",async w=>{
    const G=board(w,{p0:{}});const p=G.P[0],c=w.ev("condOk");p.solved=false;assert.strictEqual(c("事件編",p),true);assert.strictEqual(c("解決編",p),false);
    p.solved=true;assert.strictEqual(c("事件編",p),false);assert.strictEqual(c("解決編",p),true)}],
  ["工藤有希子 B06070: 絆工藤優作と解決編のときだけ登場時に1枚引く",async w=>{
    const G=board(w,{p0:{hand:["B06070"],deck:[R,R,R,R,R,R]}});const p=G.P[0];const x=p.hand[0];p.solved=false;
    const enter=w.ev("enterByEffect");await enter(p,x);assert.strictEqual(p.hand.length,0,"解決編でないので引かない")}],
  ["現場リムーブ時の検索・登場とヒラメキ（アクティブ・リムーブエリアから手札）は自動",async w=>{
    for(const n of ["PR090","B04022","B08005"])assert.ok(w.FX.automated({n}),n)}],
  ["CPUの探索: 事件の能力（リムーブエリアから手札に加える）を手札を使う前に使う組み合わせも試す",async w=>{
    const G=board(w,{p0:{hand:["B10005"],field:["B10003"],rm:["B10008"],ev:[R,R,R],file:[R,R,R,R,R,R,R],solved:true}});const p=G.P[0];p.caseC=w.inst("B10019");
    const plans=w.ev("turnPlans")(p);
    assert.ok(plans.some(pl=>pl.abFirst),"abFirst の組み合わせがない");
    p.caseC=w.inst("B01024");assert.ok(!w.ev("turnPlans")(p).some(pl=>pl.abFirst),"能力が使えないのに abFirst を試している")}],
  ["CPUの抵抗: 相手が解決編で次に解決しそうなら、全員で相手の事件にアクションする",async w=>{
    const G=board(w,{p0:{field:[R,R]},p1:{ev:[R,R,R,R,R],solved:true}});G.P[1].level=6;G.turn=0;
    const before=G.P[1].ev.length;w.__setG(Object.assign(G,{cfg:{...G.cfg,search:[false,false]}}));
    await w.ev("cpuTurn")(G.P[0]).catch(()=>{});
    assert.ok(G.P[1].ev.length<before,"証拠を減らしていない")}],
  ["18の想起 D11020: スリープのLv7以下をリムーブ。リムーブエリアに［神奈川県警］が3枚以上ならAP8000以下ももう1枚",async w=>{
    const G=board(w,{p0:{hand:["D11020"]},p1:{field:[R,R]}});const [a]=G.P[1].field;a.st="s";
    await w.FX.event(G.P[0],G.P[0].hand[0]);assert.strictEqual(G.P[1].field.length,1)}],
];
