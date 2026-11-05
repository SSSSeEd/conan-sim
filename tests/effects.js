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
  ["萩原千速 B10070: リムーブエリアに【疾風】が3枚以上あると突撃を持つ",async w=>{
    const G=board(w,{p0:{field:["B10070"],rm:["B09074","B09074"]}});const p=G.P[0],[x]=p.field;
    assert.ok(!w.FX.kwExtra(x,p).includes("突撃"));p.rm.push(p.rm[0]);assert.ok(w.FX.kwExtra(x,p).includes("突撃"))}],
  ["萩原千速&萩原研二 B09070: ターン終了時、このターンに疾風を発動したスリープ状態のキャラをアクティブにする",async w=>{
    const G=board(w,{p0:{field:["B09070",R]}});const p=G.P[0],[x,y]=p.field;
    x.st="s";y.st="s";x.galeDone=G.turnNo;await w.FX.endTurn(p);
    assert.strictEqual(x.st,"a");assert.strictEqual(y.st,"s")}],
  ["上原由衣 B08066: スリープして、リムーブエリアの［長野県警］をデッキの下へ移し、［長野県警］のキャラに突撃",async w=>{
    const G=board(w,{p0:{field:["B08066","B08065"],rm:["B08065"]}});const p=G.P[0],[x,y]=p.field,a=w.ev("DEF")["0903"].abilities[0];
    assert.ok(a.can(p,x));x.st="s";assert.ok(!a.can(p,x),"スリープ状態では宣言できない");x.st="a";
    await a.run(p,x);assert.strictEqual(x.st,"s");assert.strictEqual(p.rm.length,0);assert.strictEqual(p.deck.length,6);
    assert.ok(w.FX.kwExtra(y,p).includes("突撃")||y.kw.includes("突撃")||x.kw.includes("突撃"))}],
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
  ["厄介な難事件 B06013: 証拠2つを表にして、デッキの上3枚から［工藤新一］か［毛利蘭］を手札に（現場にいないと宣言できない）",async w=>{
    const G=board(w,{p0:{deck:["B01019","B01019","B05009"],field:["B05009"]},p1:{}});const p=G.P[0];
    const d=w.ev("DEF")["0638"];assert.ok(d&&d.abilities.length===1);const a=d.abilities[0];
    p.solved=true;p.ev=[{up:false},{up:false}];
    assert.ok(a.can(p,p.caseC)===true);p.field.length=0;assert.ok(!a.can(p,p.caseC))}],
  ["そーいう事かいな… B04028: 使うと表向きのまま証拠になる（リムーブエリアに残らない）",async w=>{
    const G=board(w,{p0:{hand:["B04028"]}});const p=G.P[0];const x=p.hand[0];p.hand.length=0;p.rm.push(x);
    await w.FX.event(p,x);assert.strictEqual(p.ev.length,1);assert.strictEqual(p.ev[0].up,true);assert.ok(!p.rm.includes(x))}],
  ["服部平次 B01032: ターン1、キャラへのアクションのときだけAP＋1000（事件へのアクションでは上がらない）",async w=>{
    const G=board(w,{p0:{field:["B01032"]},p1:{field:[R]}});const [a]=G.P[0].field,[t]=G.P[1].field;
    await w.FX.onAction(G.P[0],a,null);assert.strictEqual(w.apOf(a),w.ev("C")(a).ap);
    await w.FX.onAction(G.P[0],a,t);assert.strictEqual(w.apOf(a),w.ev("C")(a).ap+1000);
    await w.FX.onAction(G.P[0],a,t);assert.strictEqual(w.apOf(a),w.ev("C")(a).ap+1000,"2回目は上がらない")}],
  ["江戸川コナン PR199: FILE5・スリープ。CPUは手札1枚リムーブで相手のレベル4以下をリムーブ",async w=>{
    const G=board(w,{p0:{field:["PR199"],hand:[R,R],file:[R,R,R,R,R]},p1:{field:[R]}});const p=G.P[0];p.cpu=true;G.turn=0;
    const a=w.ev("DEF")["0833"].abilities[0],x=p.field[0];assert.ok(a.can(p,x));
    await a.run(p,x);assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(p.hand.length,1);assert.strictEqual(x.st,"s")}],
  ["円谷光彦 PR295: 宣言で他の［少年探偵団］を下に重ねて1枚引く。FILE7ならアクション終了時に手札1枚でアクティブ",async w=>{
    const G=board(w,{p0:{field:["PR295","B01006"],hand:[R,R],deck:[R,R,R],file:[R,R,R,R,R,R,R]}});const p=G.P[0];p.cpu=true;G.turn=0;
    const [x,y]=p.field,a=w.ev("DEF")["1060"].abilities[0];assert.ok(a.can(p,x));
    await a.run(p,x);assert.strictEqual(p.field.length,1);assert.strictEqual(p.hand.length,3);
    x.st="s";await w.FX.actionEnd(p,x);assert.strictEqual(x.st,"a");assert.strictEqual(p.hand.length,2)}],
  ["毛利蘭 B05009: 能力で登場したときだけ突撃。絆工藤新一でコンタクトに勝つと1枚引く",async w=>{
    const G=board(w,{p0:{hand:["B05009"],field:["B01019"],deck:[R,R]}});const p=G.P[0];G.turn=0;
    const x=p.hand[0];await w.ev("enterByEffect")(p,x);assert.ok(x.kw.includes("突撃"));
    const h=p.hand.length;await w.FX.contactWin(p,x,null);assert.strictEqual(p.hand.length,h,"絆なし")}],
  ["松田陣平 D11008: レベル7以上のアクティブ状態を指定できる。APの高い相手とのコンタクトで手札1枚→AP＋3000",async w=>{
    const G=board(w,{p0:{field:["D11008"],hand:[R,R]},p1:{field:[R]}});const p=G.P[0];p.cpu=true;G.turn=0;const [x]=p.field,[t]=G.P[1].field;
    assert.ok(!w.hitsActive(x,p,t),"Lv2は指定できない");t.lvT=6;assert.ok(w.hitsActive(x,p,t));
    t.apT=9000;await w.FX.onContact(p,{a:x,d:t});assert.strictEqual(w.apOf(x),w.ev("C")(x).ap+3000);assert.strictEqual(p.hand.length,1)}],
  ["遠山和葉 B08020: 自分ターン中に【緑】のイベントを使うとAP8000以下をリムーブ（ターン1）",async w=>{
    const g=w.CARD_DB.find(c=>c.t==="イベント"&&c.c==="緑");const e=board(w,{p0:{field:["B08020"],hand:[g.n]},p1:{field:[R,R]}});
    const q=e.P[0];q.cpu=true;e.turn=0;await w.FX.event(q,q.hand[0]);assert.strictEqual(e.P[1].field.length,1);
    await w.FX.event(q,q.hand[0]||q.rm[q.rm.length-1]);assert.strictEqual(e.P[1].field.length,1,"ターン1")}],
  ["千速と重悟の婚活パーティー D11021: 表向きにした証拠1つにつきAP－1000（神奈川県警がいて解決編のとき）",async w=>{
    const G=board(w,{p0:{ev:[R,R,R],solved:true,field:["D11004"]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;q.caseC=w.inst("D11021");
    q.ev.forEach(e=>e.up=false);const a=w.FX.abilities(q,q.caseC)[0];assert.ok(a.ok);await a.run(q,q.caseC);
    assert.strictEqual(q.ev.filter(e=>e.up).length,3);assert.strictEqual(G.P[1].field[0].apT,-3000)}],
  ["バーボン＆ライ B07093: 相手のキャラをレベル－1",async w=>{
    const G=board(w,{p0:{field:["B07093"]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;const x=q.field[0];
    const a=w.FX.abilities(q,x)[1];await a.run(q,x);assert.strictEqual(w.ev("lvOf")(G.P[1].field[0]),1)}],
  ["ミステリーコースター B07104: 現場のキャラ1枚につき2枚リムーブ（パートナー黒）",async w=>{
    const G=board(w,{p0:{hand:["B07104"],field:[R]},p1:{field:[R,R]},});const q=G.P[0];q.cpu=true;q.partner=w.inst("B07093");
    const n0=q.rm.length;await w.FX.event(q,q.hand[0]);assert.strictEqual(G.P[1].field.length,1);assert.strictEqual(q.rm.length-n0,2*(G.P[0].field.length+G.P[1].field.length),"残り2体×2枚をミル")}],
  ["黒田兵衛 B03089: リムーブエリアの警察をAP＋2000・突撃で登場し、ターン終了時にリムーブ",async w=>{
    const k=w.CARD_DB.find(c=>c.t==="キャラ"&&c.lv<=5&&(c.ct||"").includes("警察"));
    const G=board(w,{p0:{field:["B03089"],rm:[k.n]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];assert.ok(q.rm.length,"rm準備");
    await w.FX.enter(q,x);const y=q.field.find(z=>z!==x);assert.ok(y,"登場");assert.ok(y.kw.includes("突撃"));assert.strictEqual(y.apT,2000);
    await w.FX.endTurn(q);assert.ok(!q.field.includes(y),"終了時リムーブ")}],
  ["白鳥任三郎 B08064: 登場時スリープ、警視庁を公開でレベル7以下をリムーブ／宣言で引く",async w=>{
    const k=w.CARD_DB.find(c=>c.t==="キャラ"&&(c.ct||"").includes("警視庁"));
    const G=board(w,{p0:{field:["B08064"],hand:[k.n]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];
    await w.FX.enter(q,x);assert.strictEqual(x.st,"s");assert.strictEqual(G.P[1].field.length,0);
    x.st="a";const h=q.hand.length;const a=w.FX.abilities(q,x)[0];assert.ok(a.ok);await a.run(q,x);assert.strictEqual(q.hand.length,h+1)}],
  ["閉ざされた秘密 B07091P: 表向きにした証拠1つにつき警視庁AP＋1000",async w=>{
    const k=w.CARD_DB.find(c=>c.t==="キャラ"&&(c.ct||"").includes("警視庁"));
    const G=board(w,{p0:{ev:[R,R],solved:true,field:[k.n]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;q.caseC=w.inst("B07091P");
    q.ev.forEach(e=>e.up=false);const a=w.FX.abilities(q,q.caseC)[0];assert.ok(a.ok);await a.run(q,q.caseC);
    assert.strictEqual(q.field[0].apT,q.ev.filter(e=>e.up).length*1000);assert.ok(q.ev.filter(e=>e.up).length>=1)}],
  ["メアリー D04007: 事件アクションで証拠を得たとき、手札1枚リムーブで証拠をもう1つ（ターン1）",async w=>{
    const G=board(w,{p0:{field:["D04007"],hand:[R,R]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];
    const e0=q.ev.length;await w.FX.onCaseGain(q,x);assert.strictEqual(q.ev.length,e0+1);assert.strictEqual(q.hand.length,1);
    await w.FX.onCaseGain(q,x);assert.strictEqual(q.ev.length,e0+1,"ターン1")}],
  ["BANG B03080: 赤のキャラにセットし、事件アクションでアクティブに（ターン1）",async w=>{
    const red=w.CARD_DB.find(c=>c.t==="キャラ"&&c.c==="赤"&&c.lv<=4);
    const G=board(w,{p0:{field:[red.n],hand:["B03080"]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const h=q.field[0];
    await w.FX.event(q,q.hand[0]);assert.strictEqual(h.set.length,1,"セット");
    h.st="s";await w.FX.onAction(q,h,null);assert.strictEqual(h.st,"a");
    h.st="s";await w.FX.onAction(q,h,null);assert.strictEqual(h.st,"s","ターン1")}],
  ["ジェイムズ・ブラック B07073: 手札1枚リムーブで上4枚から赤を手札に、加えたら1枚リムーブ",async w=>{
    const red=w.CARD_DB.find(c=>c.t==="キャラ"&&c.c==="赤");
    const G=board(w,{p0:{field:["B07073"],hand:[R,R],deck:[red.n,R,R,R,R,R]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;
    await w.FX.enter(q,q.field[0]);assert.strictEqual(q.hand.length,1,"-1+1-1");assert.ok(q.rm.length>=2)}],
  ["毛利小五郎 D10011: FILE6で自身をデッキの下へ、リムーブエリアのレベル7以下の毛利蘭を登場",async w=>{
    const G=board(w,{p0:{field:["D10011"],rm:["B01007"]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];
    q.file=Array.from({length:6},()=>w.inst(R));const a=w.FX.abilities(q,x)[0];assert.ok(a.ok);await a.run(q,x);
    assert.ok(!q.field.includes(x));assert.ok(q.field.some(y=>w.ev("C")(y).nm==="毛利蘭"))}],
  ["ベルモット B10095: 事件編の登場時（青黒事件・新一蘭がいる）にキャラをスリープ",async w=>{
    const G=board(w,{p0:{field:["B01007","B10095"]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;q.caseC=w.inst("B10100P");q.solved=false;
    await w.FX.enter(q,q.field[1]);assert.ok(G.P[1].field[0].st!=="a"||q.field[0].st!=="a")}],
  ["工藤新一NYの事件 B10100P: 新一・蘭にアクティブ指定Lv6とコンタクト勝利ドローを与える",async w=>{
    const G=board(w,{p0:{ev:[R],solved:true,field:["B01007"],hand:[R]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;q.caseC=w.inst("B10100P");
    q.ev.forEach(e=>e.up=false);const a=w.FX.abilities(q,q.caseC)[0];assert.ok(a.ok);await a.run(q,q.caseC);
    const x=q.field[0];assert.ok(x.kw.includes("アクティブ指定Lv6"));const h=q.hand.length;await w.FX.contactWin(q,x,G.P[1].field[0]);assert.strictEqual(q.hand.length,h+1)}],
];
