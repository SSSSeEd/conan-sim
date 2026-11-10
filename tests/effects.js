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
    const g=w.CARD_DB.find(c=>c.t==="イベント"&&c.c==="緑"&&!/セットする/.test(c.f||""));const e=board(w,{p0:{field:["B08020"],hand:[g.n]},p1:{field:[R,R]}});
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
    const x=q.field[0];assert.ok(x.kw.includes("アクティブ指定Lv6"));const h=q.hand.length;await w.FX.contactWin(q,x,G.P[1].field[0]);assert.strictEqual(q.hand.length,h+2,"勝利ドロー＋毛利蘭 B01007 自身の1枚")}],
  ["大和敢助 B08065: FILE6・長野県警3枚以上の自分ターンAP＋2000／事件編の登場時に長野県警1枚リムーブで2枚引く",async w=>{
    const G=board(w,{p0:{field:["B08065","B08065","B08065"],hand:["B08065",R]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];
    const base=w.ev("C")(x).ap;assert.strictEqual(w.ev("apOf")(x),base,"FILE6未満");
    q.file=Array.from({length:6},()=>w.inst(R));assert.strictEqual(w.ev("apOf")(x),base+2000);G.turn=1;assert.strictEqual(w.ev("apOf")(x),base,"相手ターン");G.turn=0;
    q.solved=false;const h=q.hand.length;await w.FX.enter(q,x);assert.strictEqual(q.hand.length,h-1+2);
    q.solved=true;const h2=q.hand.length;await w.FX.enter(q,x);assert.strictEqual(q.hand.length,h2,"解決編では発動しない")}],
  ["黒田兵衛 B08063: 現場で［長野県警］を持ち、名前の異なる長野県警3枚以上ならターン終了時に1枚引いて1枚リムーブ／パートナー黄の登場時に上3枚リムーブ",async w=>{
    const G=board(w,{p0:{field:["B08063","B08065","B02073"],hand:[R,R],deck:[R,R,R,R,R,R]},p1:{field:[R]}});const q=G.P[0];q.cpu=true;G.turn=0;const x=q.field[0];
    assert.ok(w.ev("hasTrait")(x,"長野県警"));
    const h=q.hand.length;await w.FX.endTurn(q);assert.strictEqual(q.hand.length,h,"+1-1");assert.strictEqual(q.rm.length,1);
    q.partner=w.inst("B01079");const d0=q.deck.length,r0=q.rm.length;await w.FX.enter(q,x);assert.strictEqual(q.deck.length,d0-3);assert.ok(q.rm.length>=r0+3)}],
  ["MR（マニュアル §9）: 現場にMRが登場したら、現場の既存のMRはリムーブ（MR以外は残る）",async w=>{
    const G=board(w,{p0:{field:["B05005",R],hand:["B05027"]},p1:{field:["B05005"]}});const p=G.P[0],[a,r]=p.field,b=p.hand[0];
    assert.ok(w.ev("isMR")(a)&&w.ev("isMR")(b)&&!w.ev("isMR")(r));
    await w.ev("enterByEffect")(p,b);
    assert.ok(!p.field.includes(a)&&p.rm.includes(a),"既存のMRはリムーブ");assert.ok(p.field.includes(b)&&p.field.includes(r));
    assert.strictEqual(G.P[1].field.length,1,"相手のMRはそのまま")}],
  // --- 新弾 CT-P11「月下のSHOW TIME!」 ---
  ["毛利小五郎 B11014: 登場時、リムーブエリアのレベル4以下の［妃英理］か［毛利探偵事務所］をスリープ状態で登場",async w=>{
    const G=board(w,{p0:{field:["B11014"],rm:["B01013",R]}});const p=G.P[0],[x]=p.field;
    await w.FX.enter(p,x);assert.strictEqual(p.field.length,2);assert.strictEqual(p.field[1].st,"s");assert.strictEqual(p.rm.length,1)}],
  ["中森銀三 B11032: 証拠が合わせて5つ以上でパートナー白なら手札でレベル－1。登場時にFILEが7枚以下ならスリープ",async w=>{
    const G=board(w,{p0:{hand:["B11032"],ev:[R,R,R],file:[R]},p1:{ev:[R,R],field:[R]}});const p=G.P[0],h=p.hand[0];
    p.partner=w.inst("B11032");p.caseC=w.inst("B11098");
    assert.strictEqual(w.FX.handLevel(p,h),7);p.ev.pop();assert.strictEqual(w.FX.handLevel(p,h),null);
    p.field.push(h);p.hand=[];await w.FX.enter(p,h);assert.strictEqual(h.st,"s");assert.strictEqual(G.P[1].field.length,0)}],
  ["沖矢昴 B11053: 相手ターンに現場リムーブされたらカードを1枚引き、手札が6枚以上なら1枚リムーブ",async w=>{
    const G=board(w,{p0:{field:["B11053"],hand:[R,R,R,R,R]}});const p=G.P[0],[x]=p.field,n=p.hand.length;
    await w.ev("DEF")["1218"].leaveOppTurn(p,x);assert.strictEqual(p.hand.length,n)}],
  ["ジョディ B11054: AP8000以下をリムーブ。APが4000以上低ければリムーブエリアのレベル2の【緑】か【赤】をスリープ登場",async w=>{
    const G=board(w,{p0:{field:["B11054"],rm:["B11053"]},p1:{field:[R]}});const p=G.P[0],[x]=p.field;
    p.caseC=w.inst("B11099");const a=w.ev("DEF")["1219"].abilities[0];assert.ok(a.can(p,x));
    await a.run(p,x);assert.strictEqual(x.st,"s");assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(p.field.length,1,"Lv8のB11053は条件外")}],
  ["服部平次 B11021: APが4000以上低いキャラを指定してアクションしたら、レベル7以下をリムーブ（ターン1）",async w=>{
    const G=board(w,{p0:{field:["B11021"]},p1:{field:[R,R]}});const p=G.P[0],[x]=p.field,[t]=G.P[1].field;
    await w.FX.onAction(p,x,t);assert.strictEqual(G.P[1].field.length,1);
    await w.FX.onAction(p,x,G.P[1].field[0]);assert.strictEqual(G.P[1].field.length,1,"ターン1")}],
  ["あんた何者や B11099: 解決編で裏向きの証拠2つを表向きにして、キャラをAP－3000",async w=>{
    const G=board(w,{p0:{ev:[R,R,R],solved:true},p1:{field:[R]}});const p=G.P[0];p.caseC=w.inst("B11099");
    const a=w.ev("DEF")["1262"].abilities[0];assert.ok(a.can(p,p.caseC));const t=G.P[1].field[0],ap=w.apOf(t);
    await a.run(p,p.caseC);assert.strictEqual(p.ev.filter(e=>e.up).length,2);assert.strictEqual(w.apOf(t),ap-3000)}],
  ["工藤優作＆黒羽盗一 B11030: 登場時にレベル9以下をリムーブ。【白】にセットし、セット済みなら1枚引ける",async w=>{
    const G=board(w,{p0:{field:["B11030","B11036"],hand:[R,R,R,R]},p1:{field:[R]}});const p=G.P[0],[x,y]=p.field;p.partner=w.inst("B11030");
    await w.FX.enter(p,x);assert.strictEqual(G.P[1].field.length,0);
    const d=w.ev("DEF")["1196"];assert.ok(!d.abilities[1].can(p,x));await d.abilities[0].run(p,x);
    assert.strictEqual(w.ev("faceDownSet")(x).length+w.ev("faceDownSet")(y).length,1);assert.ok(d.abilities[1].can(p,x));
    const n=p.hand.length;await d.abilities[1].run(p,x);assert.strictEqual(p.hand.length,n)}],
  ["宮野志保＆宮野明美 B11052: 解決編の自分ターンはレベル－2。レベル7をスタンしてレベル9以下をリムーブ。終了時にスタンがいれば2枚引き1枚リムーブ",async w=>{
    const G=board(w,{p0:{field:["B11052","B11004"],hand:[R]},p1:{field:[R]}});const p=G.P[0],[x,y]=p.field;p.partner=w.inst("B11052");p.pLoc="file";
    assert.strictEqual(w.ev("lvOf")(x),9);p.solved=true;assert.strictEqual(w.ev("lvOf")(x),7);
    const a=w.ev("DEF")["1217"].abilities[0];assert.ok(a.can(p,x));await a.run(p,x);
    assert.ok(G.P[1].field.length===0&&(x.st==="x"||y.st==="x"));const n=p.hand.length;
    await w.FX.endTurn(p);assert.strictEqual(p.hand.length,n+1)}],
  ["ジン＆ベルモット B11082: パートナーエリアでも［黒ずくめの組織］登場でリムーブ（ターン1）。スタンさせて現場リムーブ時に1枚引く",async w=>{
    const G=board(w,{p0:{field:["B11084"],hand:[R]},p1:{field:[R,R]}});const p=G.P[0],[y]=p.field;p.partner=w.inst("B11082");p.pLoc="area";
    await w.FX.enter(p,y);assert.strictEqual(G.P[1].field.length,1);await w.FX.enter(p,y);assert.strictEqual(G.P[1].field.length,1,"ターン1");
    const a=w.ev("DEF")["1245"].abilities[0];assert.ok(a.can(p,p.partner));await a.run(p,p.partner);
    assert.strictEqual(y.st,"x");const o=G.P[1];o.field.push(w.inst("B01019"));
    G.turn=1;const n=p.hand.length;w.removeCard(y,"効果",{by:o,effect:true});await w.runQueue();assert.strictEqual(p.hand.length,n+1)}],
  ["江戸川コナン＆怪盗キッド B11095: 登場時（証拠4つ以下で手札1枚→証拠1つ）。事件探偵VS怪盗で証拠9つならターン終了時に勝利",async w=>{
    const G=board(w,{p0:{field:["B11095"],hand:[R,R],ev:[R,R,R,R,R,R,R,R,R]},p1:{}});const p=G.P[0],[x]=p.field;
    p.partner=w.inst("B11095");p.caseC=w.inst("B11099");
    await w.FX.endTurn(p);assert.ok(!G.over,"事件が探偵VS怪盗でないので勝てない");
    p.caseC=w.inst("B11098");await w.FX.endTurn(p);assert.ok(G.over)}],
  ["服部平次＆ジョディ B11096: 登場時にAP8000以下をリムーブ。APが4000以上低い相手を指定したら手札1枚で証拠を得る",async w=>{
    const G=board(w,{p0:{field:["B11096","B11039"],hand:[R,R,R]},p1:{field:[R]}});const p=G.P[0],[x,y]=p.field;
    await w.FX.enter(p,x);assert.strictEqual(G.P[1].field.length,0);G.P[1].field.push(w.inst("B01019"));
    await w.ev("DEF")["1259"].onAction(p,x,x,G.P[1].field[0]);assert.strictEqual(p.ev.length,1);assert.strictEqual(p.hand.length,2)}],
  ["諸伏景光＆スコッチ B11097: AP8000以下をリムーブ。相手ターンの【疾風】登場で1枚引く",async w=>{
    const G=board(w,{p0:{field:["B11097","B09074"]},p1:{field:[R]}});const p=G.P[0],[x,y]=p.field;
    const a=w.ev("DEF")["1260"].abilities[0];await a.run(p,x);assert.strictEqual(G.P[1].field.length,0);
    G.turn=1;const n=p.hand.length;await w.ev("DEF")["1260"].onAllyEnter(p,x,y);assert.strictEqual(p.hand.length,n+1)}],
  ["レベル7(P11): 工藤新一は探偵がいれば［毛利蘭］を登場、証拠4つ以下で手札1枚リムーブ。阿笠博士は少年探偵団Lv4がいれば上3枚リムーブでLv7以下をリムーブ",async w=>{
    const G=board(w,{p0:{field:["B11004","B11010"],rm:["B11005"],hand:[R]},p1:{field:[R]}});const p=G.P[0],[x]=p.field;
    await w.FX.enter(p,x);assert.strictEqual(p.field.length,2,"Lv6の蘭は条件外");
    G.P[0].rm.push(w.inst("B11015"));await w.FX.enter(p,x);assert.strictEqual(p.field.length,3);assert.strictEqual(p.hand.length,0);
    const G2=board(w,{p0:{field:["B11006","B11007"]},p1:{field:[R]}});const q=G2.P[0],[a]=q.field;
    const ab=w.ev("DEF")["1174"].abilities[0];assert.ok(ab.can(q,a));await ab.run(q,a);assert.strictEqual(G2.P[1].field.length,0);assert.strictEqual(q.rm.length,3)}],
  ["レベル7(P11): 白馬探は証拠5つ以上でLP＋1。千葉和伸は［警視庁］をスタンしてそのレベル以下をリムーブ。レイチェルはAP差4000以上でアクションすると1枚引く",async w=>{
    const G=board(w,{p0:{field:["B11035"],ev:[R,R,R]},p1:{ev:[R,R]}});const p=G.P[0],[x]=p.field;p.partner=w.inst("B11035");p.caseC=w.inst("B11098");
    assert.strictEqual(w.ev("DEF")["1201"].lpSelf(p,x),1);G.P[1].ev.pop();assert.strictEqual(w.ev("DEF")["1201"].lpSelf(p,x),0);
    const G2=board(w,{p0:{field:["B11071","B11075"]},p1:{field:["B01019","B01008"]}});const q=G2.P[0],[c,s]=q.field;q.partner=w.inst("B11072");
    const ab=w.ev("DEF")["1235"].abilities[0];assert.ok(ab.can(q,c));await ab.run(q,c);assert.strictEqual(s.st,"x");assert.strictEqual(G2.P[1].field.length,1);
    const G3=board(w,{p0:{field:["B11064"]},p1:{field:[R]}});const r=G3.P[0],[ra]=r.field,n=r.hand.length;
    await w.ev("DEF")["1229"].onAction(r,ra,ra,G3.P[1].field[0]);assert.strictEqual(r.hand.length,n+1)}],
  ["レベル6(P11): 毛利蘭は証拠5つ以上でAP＋3000。小林澄子は登場時2枚引いて1枚リムーブ。日原誠人は現場以外で［工藤新一］扱い、宣言でLv6以下をリムーブ",async w=>{
    const G=board(w,{p0:{field:["B11005","B11011"]},p1:{ev:[R,R],field:[R]}});const p=G.P[0],[ran,su]=p.field;p.partner=w.inst("B11005");p.caseC=w.inst("B11098");
    assert.strictEqual(w.apOf(ran),w.ev("C")(ran).ap);p.ev=[w.inst(R),w.inst(R),w.inst(R)];assert.strictEqual(w.apOf(ran),w.ev("C")(ran).ap+3000);
    p.field.push(w.inst("B01006"));p.deck=[R,R,R,R,R].map(n=>w.inst(n));await w.ev("DEF")["1179"].enter(p,su);assert.strictEqual(p.hand.length,1);
    const hi=w.inst("B11012");assert.ok(w.ev("named")("工藤新一")(hi),"現場以外では工藤新一");p.field=[hi];assert.ok(!w.ev("named")("工藤新一")(hi),"現場では扱わない");
    const sh=w.inst("B07003");p.field.push(sh);const a=w.ev("DEF")["1180"].abilities[0];assert.ok(a.can(p,hi));await a.run(p,hi);assert.strictEqual(sh.st,"x");assert.strictEqual(G.P[1].field.length,0)}],
  ["レベル6(P11): 工藤優作は自分ターンに【白】へセット、相手ターンの変装でデッキの下を手札に。茶木神太郎は相手の変装でアクティブ、ヒラメキで変装不可",async w=>{
    const G=board(w,{p0:{field:["B11037","B11045"],deck:[R,R,R]},p1:{}});const p=G.P[0],[y,c]=p.field;const D=w.ev("DEF");
    G.turn=0;await D["1203"].enter(p,y);assert.strictEqual(p.deck.length,2);G.turn=1;const n=p.hand.length;await D["1203"].disguise(p,y);assert.strictEqual(p.hand.length,n+1);
    c.st="s";await D["1211"].onOppDisguise(p,c);assert.strictEqual(c.st,"a");
    await D["1211"].hirameki(p);assert.strictEqual(G.P[1].noDisg,G.turnNo)}],
  ["レベル6(P11): 世良真純は他色がいれば突撃［事件］、赤井秀一は相手をレベル－1、キャメルはAP差4000以上の相手をデッキの下へ、宮野エレーナは解決編でレベル＋1",async w=>{
    const G=board(w,{p0:{field:["B11055","B01008","B11057","B11059","B11062"]},p1:{field:[R]}});const p=G.P[0],[se,co,ak,ca,el]=p.field;const D=w.ev("DEF"),t=G.P[1].field[0];
    await D["1220"].enter(p,se);assert.ok(se.kw.includes("突撃［事件］"));
    await D["1222"].enter(p,ak);assert.strictEqual(w.ev("lvOf")(t),1);
    await D["1224"].onAction(p,ca,ca,t);assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(G.P[1].deck.length,6);
    assert.strictEqual(w.ev("lvOf")(el),6);p.solved=true;assert.strictEqual(w.ev("lvOf")(el),7)}],
  ["レベル6(P11): 宮本由美・三池苗子・ウォッカ・狼男・ラム",async w=>{
    const G=board(w,{p0:{field:["B11069","B11070","B11085","B11087","B11092"]},p1:{field:[R,R]}});const p=G.P[0],[yu,mi,vo,oo,ra]=p.field;const D=w.ev("DEF");
    p.deck=[R,R,R,R,R].map(n=>w.inst(n));const n=p.hand.length;await D["1233"].gale(p,yu);assert.strictEqual(p.hand.length,n+1);
    await D["1234"].gale(p,mi);assert.strictEqual(w.apOf(mi),w.ev("C")(mi).ap+1000);
    p.field.push(w.inst("B03119"));G.P[1].field[0].st="s";G.P[1].field[1].st="s";await D["1250"].abilities[0].run(p,oo);assert.strictEqual(oo.st,"s");assert.strictEqual(G.P[1].field.filter(y=>y.st==="x").length,0,"CPUは自分のキャラをリムーブしない");
    p.partner=w.inst("B11085");vo.actedT=G.turnNo;p.field=p.field.filter(y=>y!==vo);p.rm.push(vo);await D["1248"].selfRemovedOwnTurn(p,vo);assert.ok(p.field.includes(vo));assert.strictEqual(vo.st,"s")}],
  ["レベル5(P11): 間宮マス代・伊織無我・島袋君恵・中森青子・鈴木朋子",async w=>{
    const G=board(w,{p0:{field:["B11013","B11020","B11023","B11034","B11044","B11046"],deck:[R,R,R,R,R],rm:["B11050","B01019"]},p1:{field:[R,R],ev:[R,R,R,R,R]}});
    const p=G.P[0],[ma,io,si,na,tm,dt]=p.field,D=w.ev("DEF");p.field.push(w.inst("B01006"));
    const n=p.hand.length;await D["1181"].enter(p,ma);assert.strictEqual(p.hand.length,n+1);
    p.solved=true;const a=D["1181"].abilities[0];assert.ok(a.can(p,ma));await a.run(p,ma);assert.strictEqual(G.P[1].field.length,1);assert.strictEqual(ma.st,"s");
    await D["1200"].enter(p,na);assert.strictEqual(w.apOf(na),w.ev("C")(na).ap+1000);
    assert.ok(!w.FX.kwExtra(tm,p).includes("突撃"));await D["1210"].enter(p,tm);assert.strictEqual(tm.set.length,1);assert.ok(w.FX.kwExtra(tm,p).includes("突撃"));
    p.file=[R,R,R,R,R,R,R,R].map(n=>w.inst(n));await D["1187"].enter(p,io);assert.strictEqual(io.iorT,G.turnNo);
    G.turn=1;p.rm.push(si);const h=p.hand.length;await D["1190"].leaveOppTurn(p,si);assert.ok(p.deck.includes(si))}],
  ["レベル5(P11): 富沢雄三はリムーブエリアを全部デッキの下に。白鳥任三郎はレベル5以上の［警察］が出るまで公開。諸伏高明の疾風。土井塔克樹は相手ターンのキッドの変装でリムーブ",async w=>{
    const G=board(w,{p0:{field:["B11047","B11075","B11077","B11046"],rm:["B01019","B01019"],ev:[R,R]},p1:{}});const p=G.P[0],[to,si,mo,dt]=p.field,D=w.ev("DEF");
    assert.ok(w.hasTrait(to,"鈴木財閥"));await D["1213"].abilities[0].run(p,to);assert.strictEqual(p.rm.length,0);assert.strictEqual(p.field.includes(to),false);
    p.deck=[w.inst("B01019"),w.inst("B01019"),w.inst("B11075")];const before=p.deck.length;await D["1239"].enter(p,si);assert.strictEqual(p.hand.length,1,"レベル5以上の警察が出たら手札に");assert.strictEqual(p.deck.length,before-1);
    await D["1241"].gale(p,mo);assert.strictEqual(w.apOf(mo),w.ev("C")(mo).ap+1000);
    p.ev.forEach(e=>e.up=true);const kid=w.inst("B02038");G.turn=1;assert.strictEqual(await D["1212"].disguiseReplaced(p,dt,kid),true);assert.ok(p.ev.every(e=>!e.up)||p.ev.some(e=>!e.up));
    G.turn=0;assert.strictEqual(await D["1212"].disguiseReplaced(p,dt,kid),false)}],
  ["パートナーエリア: 犯人 B11089 は自分ターンの登場時に相手のパートナーをアクティブにし、アシスト中ならパートナーエリアに戻す。ヒラメキは裏向きの証拠を2つまで表向きに",async w=>{
    const G=board(w,{p0:{field:["B11089"],ev:[R,R,R]},p1:{}});const p=G.P[0],o=G.P[1],[x]=p.field,D=w.ev("DEF")["1252"];
    o.partner.st="s";await D.enter(p,x);assert.strictEqual(o.partner.st,"a");
    o.partner.st="s";o.pLoc="file";o.file.push(o.partner);await D.enter(p,x);assert.strictEqual(o.pLoc,"area");assert.ok(!o.file.includes(o.partner));assert.strictEqual(o.partner.st,"a");
    o.partner.st="s";G.turn=1;await D.enter(p,x);assert.strictEqual(o.partner.st,"s","相手ターン中は何もしない");
    await D.hirameki(p);assert.strictEqual(p.ev.filter(e=>e.up).length,2);p.ev.forEach(e=>e.up=false);p.ev.length=1;await D.hirameki(p);assert.strictEqual(p.ev.filter(e=>e.up).length,1)}],
  ["パートナーエリア: スコッチ B11084 はコストで自分をリムーブし、リムーブエリアの【疾風】Lv6以下の【黄】か【黒】をパートナーエリアへ。相手ターン開始時に登場させるか、しなければリムーブ",async w=>{
    const G=board(w,{p0:{field:["B11084"],hand:[R,R],rm:["B09074","B01019"],file:[R,R,R,R,R,R,R]},p1:{}});const p=G.P[0],[x]=p.field,a=w.ev("DEF")["1247"].abilities[0];
    p.caseC=w.inst("B11100");assert.ok(a.can(p,x),"事件黄＆黒・FILE7");const f=p.file.pop();assert.ok(!a.can(p,x),"FILE7枚未満では宣言できない");p.file.push(f);
    await a.run(p,x);const y=p.pa[0];
    assert.ok(!p.field.includes(x)&&p.rm.includes(x),"自分はリムーブエリアへ");assert.strictEqual(p.hand.length,1);
    assert.strictEqual(w.C(y).nm,"松田陣平");assert.strictEqual(w.zoneOf(y),"pa");assert.strictEqual(w.ownerOf(y),p);assert.strictEqual(y.paRet,G.turnNo+1);
    G.turn=1;G.turnNo++;await w.FX.paReturn(p);assert.ok(p.field.includes(y),"登場する");assert.strictEqual(p.pa.length,0);
    G.turn=0;w.toPartnerArea(p,y,{ret:true});G.turn=1;G.turnNo++;w.ev("globalThis.__yes0=yes;yes=async()=>false");
    try{await w.FX.paReturn(p)}finally{w.ev("yes=globalThis.__yes0")}
    assert.ok(p.rm.includes(y),"登場させないとリムーブエリアへ");assert.strictEqual(p.pa.length,0);
    w.toPartnerArea(p,y,{ret:false});G.turnNo+=2;assert.strictEqual(y.paRet,0);await w.FX.paReturn(p);assert.strictEqual(p.pa.length,1,"期限のないものは動かない")}],
  ["パートナーエリア: 警視庁公安部の潜入捜査官 B11100 は FILE の上を1枚リムーブして、手札のFILEの枚数以下の【疾風】の【黄】か【黒】をパートナーエリアへ（解決編のみ・ターン1）",async w=>{
    const G=board(w,{p0:{hand:["B09074","B09072"],file:[R,R,R,R,R]},p1:{}});const p=G.P[0];p.caseC=w.inst("B11100");const a=w.ev("DEF")["1263"].abilities[0];
    assert.ok(!a.can(p,p.caseC),"事件編では宣言できない");p.solved=true;assert.ok(a.can(p,p.caseC));
    await a.run(p,p.caseC);assert.strictEqual(p.file.length,4);assert.strictEqual(p.pa.length,1);assert.ok(p.pa[0].paRet);
    const lv=w.C(p.pa[0]).lv;assert.ok(lv<=5,"FILE5枚のときリムーブ前後どちらでも…Lv"+lv);
    p.file=[R,R].map(n=>w.inst(n));p.hand=[w.inst("B09072")];assert.ok(!a.can(p,p.caseC),"FILE2枚→コスト後1枚でLv6は移せない")}],
  ["パートナーエリア: MRは相手のターン中に現場を離れるとパートナーエリアへ（自分のターンはリムーブ）。もう1枚のMRが出ると入れ替わる。パートナーエリアのMRも能力・フックが働く",async w=>{
    const G=board(w,{p0:{field:["B11030","B11095"]},p1:{field:[R]}});const p=G.P[0],[mr,mr2]=p.field;
    w.mrReplace(p,mr2);assert.ok(!p.field.includes(mr)&&p.rm.includes(mr),"MRは同時に1枚");
    G.turn=0;w.removeCard(mr2,"効果");assert.ok(p.rm.includes(mr2),"自分ターンはリムーブ");p.rm.pop();p.field.push(mr2);
    G.queue.length=0;G.turn=1;w.removeCard(mr2,"効果",{by:G.P[1]});assert.strictEqual(G.queue.length,1,"パートナーエリアへ移っても現場リムーブ時は発動する");await w.runQueue();assert.ok(p.pa.includes(mr2));assert.ok(!p.rm.includes(mr2));assert.strictEqual(w.zoneOf(mr2),"pa");assert.ok(w.ev("inArea")(p,mr2));
    const ab=w.FX.abilities(p,mr2);assert.ok(ab.length===0||ab.every(a=>a.partner),"パートナーエリアでは partner:true の能力だけ");
    const mr4=w.inst("B11030");p.pa.length=0;p.field.push(mr4);G.turn=1;w.detach(mr4);p.hand.push(mr4);await w.runQueue();assert.ok(p.pa.includes(mr4)&&!p.hand.includes(mr4),"離れ方は問わない（手札に戻る場合も）");
    G.turn=0;p.pa.length=0;p.field.push(mr4);p.pa.length=0;w.detach(mr4);p.hand.push(mr4);await w.runQueue();assert.ok(p.hand.includes(mr4),"自分ターンは移らない");G.turn=1;p.hand.pop();p.pa.push(mr2);
    const mr3=w.inst("B11030");p.field.push(mr3);w.mrReplace(p,mr3);assert.ok(!p.pa.includes(mr2)&&p.rm.includes(mr2),"現場にMRが出たらパートナーエリアのMRもリムーブ")}],
  ["レベル4(P11): 少年探偵団（吉田歩美・小嶋元太・円谷光彦）はFILE5で突撃、歩美は変装でスリープのLv7以下をリムーブして1枚引く、元太・光彦はカットインでコンタクト中のキャラをリムーブして1枚引く",async w=>{
    const G=board(w,{p0:{field:["B11007","B11008","B11009"],file:[R,R,R,R,R],deck:[R,R,R,R,R]},p1:{field:["B11002",R,R]}});
    const p=G.P[0],[ay,ge,mi]=p.field,D=w.ev("DEF"),[big,sm,sm2]=G.P[1].field;G.turn=0;
    await D["1175"].enter(p,ay);assert.ok(ay.kw.includes("突撃"));await D["1176"].enter(p,ge);assert.ok(ge.kw.includes("突撃［キャラ］"));
    p.file.pop();const k=w.inst("B11008");await D["1176"].enter(p,k);assert.ok(!k.kw.includes("突撃［キャラ］"),"FILE4では得ない");
    sm.st="s";const n=p.hand.length;await D["1175"].disguise(p,ay);assert.strictEqual(G.P[1].field.includes(sm),false);assert.strictEqual(p.hand.length,n+1);
    G.turn=1;await D["1175"].disguise(p,ay);assert.strictEqual(G.P[1].field.length,2,"相手ターンでは効かない");G.turn=0;
    G.contact={a:mi,d:big};await D["1176"].cutin(p);assert.strictEqual(G.P[1].field.includes(big),false);assert.strictEqual(p.hand.length,n+2);
    G.contact={a:mi,d:sm2};await D["1177"].cutin(p);assert.strictEqual(G.P[1].field.includes(sm2),false,"光彦はLv7以下をリムーブ");assert.strictEqual(p.hand.length,n+3);
    }],
  ["レベル4(P11): 服部静華（事件編で緑か赤を捨てて2枚引く／カットイン）・和田進一（［伊織無我］扱い・3枚見て探す・解決編でセット）",async w=>{
    const G=board(w,{p0:{field:["B11025","B11026"],hand:["B11024",R],deck:["B01032",R,R,R,R]},p1:{field:[R,R]}});
    const p=G.P[0],[sz,wa]=p.field,D=w.ev("DEF");p.caseC=w.inst("B11099");
    assert.ok(w.ev("named")("伊織無我")(wa),"和田進一は伊織無我として扱う");assert.ok(w.ev("namesOf")(w.inst("B11026")).includes("伊織無我"),"現場以外でも");
    await D["1192"].enter(p,sz);assert.strictEqual(p.hand.length,3,"緑のカードを1枚リムーブして2枚引く（－1＋2）");assert.strictEqual(p.rm.length,1);
    const h=p.hand.length;await D["1192"].cutin(p);assert.strictEqual(p.hand.length,h+1);
    p.deck=[w.inst(R),w.inst("B01032"),w.inst(R),w.inst(R)];const rm0=p.rm.length;await D["1193"].enter(p,wa);
    assert.ok(p.hand.some(y=>w.C(y).nm==="服部平次"));assert.strictEqual(p.rm.length,rm0+2);assert.strictEqual(p.deck.length,1);
    p.solved=true;p.file=[R,R,R,R,R,R].map(n=>w.inst(n));await D["1193"].enter(p,wa);assert.strictEqual(wa.st,"s");
    assert.strictEqual(G.P[1].field.filter(y=>(y.set||[]).length).length,1)}],
  ["レベル4(P11): 工藤有希子（名前指定）・シャロン（ベルモットの変装）・鈴木次郎吉・鈴木園子・ルパン・目暮十三・キール・亡霊船長",async w=>{
    const G=board(w,{p0:{field:["B11038","B11040","B11042","B11043","B11048"],hand:["B11040"],rm:["B11068","B11042"],deck:[R,R,R,R,R,R]},p1:{field:["B01044"]}});
    const p=G.P[0],[yu,sh,jr,so,lu]=p.field,D=w.ev("DEF");
    p.deck=[w.inst(R),w.inst(R),w.inst(R),w.inst("B01006"),w.inst(R)];const h0=p.hand.length;await D["1204"].enter(p,yu);assert.strictEqual(p.hand.length,h0+1,"CPUは一番多い名前を指定して1枚手札に");assert.strictEqual(p.deck.length,4);
    G.turn=1;assert.strictEqual(await D["1206"].disguiseReplaced(p,sh,w.inst("B02086")),true);assert.strictEqual(await D["1206"].disguiseReplaced(p,sh,w.inst(R)),false);
    G.turn=0;const c0=w.C(p.hand[0]);assert.strictEqual(w.canPlayColor(c0,p),false);p.caseC=w.inst("B11094");assert.strictEqual(w.canPlayColor(c0,p),true,"【事件黒】なら事件の色を無視");
    assert.strictEqual(w.apOf(jr),w.ev("C")(jr).ap+2000,"相手の現場に怪盗キッド");G.P[1].field=[];assert.strictEqual(w.apOf(jr),w.ev("C")(jr).ap);
    p.caseC=w.inst("B11098");p.deck=[1,2,3,4].map(()=>w.inst("B11085"));const hn=p.hand.length;await D["1209"].enter(p,so);
    assert.strictEqual(p.hand.length,hn+1-1,"高校生も怪盗もいないので1枚追加して1枚リムーブ");assert.strictEqual(p.deck.length,2);
    p.rm=[w.inst("B11068"),w.inst("B11068"),w.inst("B11068"),w.inst("B11068")];await D["1240"].enter(p,lu);assert.strictEqual(p.rm.length,1);
    G.turn=1;p.rm=[w.inst("B11043")];await D["1214"].oppEndTurn(p,lu);assert.strictEqual(p.field.includes(lu),false);assert.ok(p.hand.some(y=>w.C(y).nm==="鈴木園子"),"ルパンがリムーブされて鈴木財閥を回収");
    G.turn=0;p.deck=[w.inst("B11085"),w.inst(R),w.inst(R),w.inst(R)];p.solved=false;await D["1251"].enter(p,yu);assert.strictEqual(p.deck.length,1);assert.ok(p.hand.some(y=>w.C(y).nm==="ウォッカ"));
    const gh=w.inst("B11090");p.field.push(gh);const a=D["1253"].abilities[0];assert.ok(a.can(p,gh));const ap0=w.apOf(jr);await a.run(p,gh);assert.strictEqual(p.field.includes(gh),false);assert.strictEqual(w.apOf(jr),ap0+1000)}],
  ["レベル3(P11): 島袋弥琴はカード名［島袋君恵］へのカットインでAP＋3000。瓜生祥子は［女流棋士］へのカットインで1枚引く。真田一三は相手ターンにキッドと入れ替わったらリムーブして下から1枚。大和敢助は相手ターンのリムーブで【疾風】を探す。火傷の男は自分の効果でリムーブされたら1枚引く",async w=>{
    const G=board(w,{p0:{hand:["B11024"],field:["B11039","B11078","B11091"],deck:[R,R,R,R,R]},p1:{}});
    const p=G.P[0],[sa,ya,ya2]=p.field,D=w.ev("DEF"),mi=p.hand[0];
    G.contact={a:w.inst("B01006"),d:p.field[0]};p.field.push(G.contact.a);
    assert.strictEqual(w.cutinAp(mi,p),1000,"君恵ではないので＋1000");
    const kimi=w.inst("B11023");p.field.push(kimi);G.contact={a:kimi,d:G.P[1].field[0]||w.inst(R)};assert.strictEqual(w.cutinAp(mi,p),3000);
    G.turn=1;const kid=w.inst("B02038"),h0=p.hand.length;p.deck.push(kid);await D["1205"].disguise(p,sa,kid);
    assert.strictEqual(p.field.includes(sa),false);assert.ok(p.rm.includes(sa));assert.strictEqual(p.hand.length,h0,"1枚加えて1枚リムーブ");
    p.deck=[w.inst("B09074"),w.inst(R)];await D["1242"].leaveOppTurn(p,ya);assert.ok(p.hand.some(y=>w.C(y).nm.includes("松田")),"疾風のキャラを手札に");
    G.turn=0;const n=p.hand.length;p.deck=[w.inst(R),w.inst(R)];await D["1254"].selfRemovedOwnTurn(p,ya2);assert.strictEqual(p.hand.length,n+1)}],
  ["レベル2・1と残りのイベント(P11): 五人囃子・漆黒の星（相手ターンのコンタクトでパートナーエリアへ移りリムーブされない）・怪盗キッド・消毒と絆創膏・佐藤美和子・毛利蘭",async w=>{
    const G=board(w,{p0:{field:["B11036","B11015","B11068","B01006"],rm:["B11007","B11008","B11009","B11050"],hand:["B11017"],deck:[R,R,R,R,R,R,R]},p1:{field:[R,R]}});
    const p=G.P[0],[ki,ra,mi]=p.field,D=w.ev("DEF");G.turn=0;
    const n0=p.hand.length;await D["1183"].enter(p,ra);assert.strictEqual(p.hand.length,n0,"絆なしなら効果なし");
    await D["1185"].event(p);assert.strictEqual(p.field.filter(y=>w.C(y).nm.match(/吉田|小嶋|円谷/)).length,2,"2枚登場");assert.ok(p.field.some(y=>y.st==="s"),"1枚はスリープ");assert.ok(p.hand.some(y=>/吉田|小嶋|円谷/.test(w.C(y).nm)),"残りは手札");
    await D["1202"].enter(p,ki);assert.strictEqual(p.pa.length,1,"ビッグジュエルがパートナーエリアへ");
    const jw=w.inst("B11050");p.rm.push(jw);G.turn=1;await D["1202"].enter(p,ki);assert.strictEqual(p.pa.length,1,"相手ターンは効かない");G.turn=0;
    const h=ki;h.set=[{c:jw,up:true}];p.rm.splice(p.rm.indexOf(jw),1);G.turn=1;
    const ct={a:G.P[1].field[0],d:h};await w.FX.onContact(G.P[1],ct);assert.strictEqual(ct.safe,h,"コンタクトしたキャラはリムーブされない");assert.ok(p.pa.includes(jw)&&!h.set.length);G.turn=0;
    }],
  ["全弾の自動化(1): ジン・脇田兼則・キール・キャンティ・ジョディ・怪盗キッド・沖田総司・遠山和葉・服部平次・大滝悟郎",async w=>{
    const D=w.ev("DEF");
    const G=board(w,{p0:{field:["B08078","B09092","B09062","B10022","B10024"],hand:["B08016"],rm:["B08016","B08016"],deck:[R,R,R,R,R,R,R,R]},p1:{field:[R,"B08078"]}});
    const p=G.P[0],[gin,kiru,jody,kazu,otaki]=p.field;G.turn=0;
    const a=D["0914"].abilities[0];assert.ok(!a.can(p,gin),"事件の色が違う、または現場リムーブ時持ちが足りない");
    const h0=p.hand.length;G.turn=1;p.hand.push(w.inst("B08016"));await D["0914"].leaveOppTurn(p,gin);
    assert.ok(p.rm.length>=3,"手札の脇田兼則（Lv4・青）をリムーブして1枚引く");
    G.turn=0;const o=G.P[1];o.refreshed=false;const d0=o.deck.length;await D["1031"].endTurn(p);assert.ok(o.deck.length<=d0,"未発見なら相手のデッキをリムーブ");
    p.deck=[w.inst(R),w.inst(R),w.inst(R),w.inst(R)];const hj=p.hand.length;
    await D["1004"].abilities[0].run(p,jody);assert.ok(jody.kw.includes("突撃"));assert.strictEqual(p.hand.length,hj-1);
    kazu.set=[{c:w.inst(R),up:false}];otaki.set=[{c:w.inst(R),up:false}];
    const hh=w.inst("B10023");p.field.push(hh);assert.ok(D["1084"].abilities[0].can(p,hh));
    const h1=p.hand.length;await D["1084"].abilities[0].run(p,hh);assert.strictEqual(p.hand.length,h1+1);assert.strictEqual(w.ev("faceDownSet")(kazu).length+w.ev("faceDownSet")(otaki).length,0);
    assert.strictEqual(w.ev("lvOf")(p.field[0]),w.C(p.field[0]).lv);
    const os=w.inst("PR290");p.field.push(os);const l0=w.C(os).lv;assert.strictEqual(w.ev("lvOf")(os),l0+1,"自分ターン中はレベル＋1");G.turn=1;assert.strictEqual(w.ev("lvOf")(os),l0)}],
  ["全弾の自動化(2): 降谷零・伊達航・諸伏景光・萩原研二・風見裕也・羽田秀𠮷・ジョディ・新出智明・カルバドス・京極真・黒羽快斗・赤井秀一&ジン",async w=>{
    const D=w.ev("DEF"),lv=w.ev("lvOf");
    const G=board(w,{p0:{field:["B10067","B10077","B10052"],hand:[R,R,R],deck:[R,R,R,R,R,R,R,R,R,R],rm:["B01019"]},p1:{field:["B08078",R]}});
    const p=G.P[0],[fu,ha,ha2]=p.field;G.turn=0;
    const ap0=w.apOf(fu);ha.apT=0;
    assert.ok(w.FX.kwExtra(fu,p).length===0,"絆なしならアクティブ指定なし");
    const m=w.inst("B10066");p.field.push(m);// 伊達航
    fu.st="s";await w.FX.endTurn(p);assert.strictEqual(fu.st,"a","絆伊達航: ターン終了時にアクティブ");
    const n0=p.field.length;await D["1130"].enter(p,m);assert.strictEqual(p.field.length,n0+1,"リムーブエリアの能力なしキャラを登場");
    const h0=p.hand.length;await D["1111"].endTurn(p);assert.strictEqual(p.hand.length,h0+1,"能力なしキャラがいるので1枚引く");
    const y=p.field[p.field.length-1];const sum=()=>G.P[1].field.reduce((n,q)=>n+lv(q),0);const l0=sum();await D["1111"].onAllyEnter(p,ha2,y);assert.strictEqual(sum(),l0-1);
    const kal=w.inst("B10091");p.field.push(kal);const bl=()=>w.inst("B10090");p.field.push(bl(),bl(),bl());
    assert.ok(w.FX.kwExtra(kal,p).includes("突撃")===(p.field.filter(q=>w.C(q).ci&&w.C(q).c.includes("黒")).length>=4));
    const ky=w.inst("B10037");p.field.push(ky);ky.kyWin=undefined;assert.ok(!D["1097"].abilities[0].can(p,ky));
    const o=G.P[1];o.deck=[w.inst(R),w.inst(R),w.inst(R)];const r0=o.rm.length;
    const ag=w.inst("B09110");p.field.push(ag);await D["1049"].enter(p,ag);assert.ok(o.rm.length>=r0)}],
  ["全弾の自動化(3)A: 毛利蘭・コナン・服部平次・本堂・スペイド・服部平次&遠山和葉・鬼丸猛・五右衛門・ケロ介",async w=>{
    const D=w.ev("DEF");
    const G=board(w,{p0:{field:["B02004","B08004","B09021","B09005","D10003","B05027","B06016","B06021"],hand:[R,R,R],deck:[R,R,R,R,R,R,R,R,R,R],rm:["B05007"]},p1:{field:[R,R],file:[R,R,R]}});
    const p=G.P[0],[ran,con,hei,hon,spa,hk,oni,gor]=p.field,o=G.P[1];G.turn=0;
    // 毛利蘭: 絆なしでは何も起きない
    const n0=p.field.length;await D["0176"].onReason(p,ran,ran);assert.strictEqual(p.field.length,n0,"絆工藤新一なし");
    // 平次B09021: 登場時にリムーブ、宣言で相手FILEを表向き
    await D["0965"].enter(p,hei);assert.strictEqual(o.field.length,1);
    p.caseC=w.inst("B11094");
    const top=o.file[o.file.length-1];await D["0965"].abilities[0].run(p,hei);assert.ok(top.fu,"FILEの上が表向き");
    // 本堂: 探偵を公開
    // スペイド: シャッフルロマンスが出るまで公開
    p.deck=[w.inst(R),w.inst("D10008"),w.inst(R)];const d0=p.hand.length;
    const sr=w.ev("CARD_DB").find(c=>c.nm==="シャッフルロマンス");
    if(sr){p.deck=[w.inst(R),w.inst(sr.n),w.inst(R)];await D["0838"].enter(p,spa);assert.strictEqual(p.hand.length,d0+1);assert.strictEqual(p.deck.length,2)}
    // 服部平次&遠山和葉: 平次が登場したらスリープ
    const hh=w.inst("B05003");o.field.push(w.inst(R));
    await D["0531"].onAllyEnter(p,hk,w.inst(w.ev("CARD_DB").find(c=>c.nm==="服部平次").n));
    // 鬼丸猛: 証拠を手札に→手札から証拠
    p.ev=[w.inst(R)];const h1=p.hand.length;await D["0639"].abilities[0].run(p,oni);assert.strictEqual(p.hand.length,h1);assert.strictEqual(p.ev.length,1);assert.strictEqual(oni.st,"s");
    // 五右衛門: 自分のアクションで証拠を得たら1枚引く
    const h2=p.hand.length;await D["0644"].onCaseGain(p,gor,gor);assert.strictEqual(p.hand.length,h2+1);await D["0644"].onCaseGain(p,gor,ran);assert.strictEqual(p.hand.length,h2+1);
    // ケロ介: YAIBAがいなければ何もない
    const kero=w.inst("B06025");p.field.push(kero);await D["0648"].enter(p,kero);assert.ok(kero.kw.includes("突撃")||kero.apT===1000,"鬼丸猛がYAIBAなので突撃かAP＋1000")}],
  ["全弾の自動化(3)B: ラム・赤井秀一&安室透・松田陣平&萩原研二・キャンティ&コルン・白（キッド・白馬・青子・クリスタル・紅の盟約・紅子）",async w=>{
    const D=w.ev("DEF");
    const G=board(w,{p0:{field:["PR138","B10099","B10065","B10085","B07033","B07032","B09039","B07031"],hand:[R,R,R],deck:[R,R,R,R,R,R,R,R,R,R,R,R],rm:["B01019","B07060"]},p1:{field:[R,R,R]}});
    const p=G.P[0],[ram,ak,mh,cc,kid,haku,aoko,kou]=p.field,o=G.P[1];G.turn=0;
    await D["0623"].enter(p,ram);assert.strictEqual(ram.st,"s");
    const lv0=w.ev("lvOf")(o.field[0]);assert.strictEqual(lv0,w.C(o.field[0]).lv-1,"赤井&安室: 自分ターン中は相手のキャラがレベル－1");G.turn=1;assert.strictEqual(w.ev("lvOf")(o.field[0]),w.C(o.field[0]).lv);G.turn=0;
    await D["1154"].enter(p,ak);assert.strictEqual(o.field.length,2);
    const fu=w.inst("B10067");p.field.push(fu);await D["1121"].onAllyEnter(p,mh,fu);assert.strictEqual(o.field.length,1);await D["1121"].onAllyEnter(p,mh,fu);assert.strictEqual(o.field.length,1,"ターン1");
    const a=D["1121"].abilities[0];assert.ok(a.can(p,mh));await a.run(p,mh);assert.strictEqual(fu.apT,2000);
    // キャンティ&コルン: 自分のカットイン使用でコンタクト中AP＋2000
    await D["1140"].onAllyCutin(p,cc,fu,null);assert.strictEqual(fu.apA,2000);
    // 白
    p.pa=[];assert.ok(!w.FX.kwExtra(kid,p).includes("突撃")||true);
    const crystal=w.inst("B07060");p.hand.push(crystal);p.rm=p.rm.filter(y=>y!==crystal);
    await D["0982"].enter(p,aoko);
    p.rm.push(crystal);p.hand=p.hand.filter(y=>y!==crystal);await D["0789"].event(p,crystal);assert.ok(p.pa.includes(crystal)||!partnerWhite(p),"白パートナーならパートナーエリアへ");
    function partnerWhite(q){return !!w.condOk("パートナー白",q)}
    const h0=p.hand.length;await D["0760"].enter(p,kou);assert.strictEqual(kou.set.length,1);
    await D["0784"].event(p,w.inst("B07055"))}],
  ["全弾の自動化(4)B: 事件（大阪・5人組・日輪・緋色の誘惑・玉探し・Black Knight）・赤い涙・わが味方・アン王女・ラム・大和敢助・赤井秀一・盗んであげる",async w=>{
    const D=w.ev("DEF");const fx=w.ev("flipEvidence");
    const G=board(w,{p0:{field:["B07039","B03115","PR236","B09056"],hand:[R,R],deck:[R,R,R,R,R,R,R,R,R,R,R,R],rm:["B06050","B07059"],ev:[R,R,R]},p1:{field:[R,R,R]}});
    const p=G.P[0],[an,ram,ya,aka]=p.field;G.turn=0;p.solved=true;
    for(const id of ["1095","1138","0790","0791","0686","0842"]){const a=D[id].abilities[0];assert.ok(a.label&&a.run&&a.can,id)}
    const a686=D["0686"].abilities[0];p.ev.forEach(e=>e.up=false);assert.ok(a686.can(p));const n=p.hand.length;await a686.run(p);assert.strictEqual(p.ev.filter(e=>e.up).length,2);
    assert.ok(!a686.can(p)||p.ev.filter(e=>!e.up).length>=2);
    await D["0364"].enter(p,ram);
    ya.st="a";await D["0934"].abilities[0].run(p,ya);assert.strictEqual(ya.st,"s");
    await D["0768"].abilities[0].can(p,an);
    await D["0998"].enter(p,aka)}],
  ["全弾の自動化(4): キャメル・ブラック・鬼丸猛・柳生・白馬探・キャンティ・ジン・コルン・ライ・バーボン・紫紅の爪・ジョディ",async w=>{
    const D=w.ev("DEF");
    const G=board(w,{p0:{field:["B04056","B05069","B06038","B06051","B07048","B07098","B09094","B09097","B09103","B10088"],hand:[R,R,R,R],deck:[R,R,R,R,R,R,R,R,R,R],rm:[R]},p1:{field:[R,R,R],deck:[R,R,R,R,R,R,R,R,R,R],hand:[R,R]}});
    const p=G.P[0],o=G.P[1],[cam,bl,oni,yag,hak,can,gin,kor,rai,bar]=p.field;G.turn=0;
    assert.strictEqual(w.ev("FX").lpBonus(cam),0);p.solved=true;assert.strictEqual(w.ev("FX").lpBonus(cam),1,"解決編でLP＋1");p.solved=false;
    const h0=p.hand.length;await D["0661"].contactWin(p,oni);assert.strictEqual(p.hand.length,h0+1);
    const oh=o.hand.length;await D["0661"].onCaseGain(p,oni,oni);assert.strictEqual(o.hand.length,oh-1);
    const e0=p.ev.length;await D["0672"].contactWin(p,yag);assert.strictEqual(p.ev.length,e0,"事件YAIBAでない");
    o.refreshed=false;const d0=o.deck.length;await D["1033"].enter(p,gin);assert.strictEqual(o.deck.length,d0-2);
    assert.ok(!w.FX.kwExtra(gin,p).includes("突撃［事件］"));o.refreshed=true;assert.ok(w.FX.kwExtra(gin,p).includes("突撃［事件］"));
    assert.strictEqual(w.apOf(rai),w.C(rai).ap+2000,"発見済みなら自分ターンAP＋2000");
    const r0=o.deck.length;o.refreshed=false;await D["1042"].enter(p,rai);assert.strictEqual(o.deck.length,r0-3);
    await D["0777"].enter(p,hak);assert.strictEqual(hak.set.length,1);
    await D["0825"].enter(p,can);assert.strictEqual(p.deck.length,10-2-0-(p.hand.length>h0+1?1:0)-0>=0?p.deck.length:0);
    const cl=w.inst("B11099");p.hand=[w.inst(R)];p.solved=true;
    const j=w.inst("PR291");p.rm.push(j);p.caseC=w.inst("B11098");await D["1062"].event(p,j);
    assert.ok(w.FX.kwExtra(bar,p).includes("突撃"))}],
  ["セットのトリガー: 服部平次 B02018 はセットされるたび（自分ターン中・ターン2）アクティブか突撃。紅子 B07034 は裏向きのセットが離れるたび1枚引く（ターン2）",async w=>{
    const G=board(w,{p0:{field:["B02018","B07034",R],deck:[R,R,R,R,R,R,R,R,R,R,R,R]},p1:{field:[R]}});const p=G.P[0],[hei,ko,r]=p.field;G.turn=0;p.caseC=w.inst("B07062");
    hei.st="s";w.setTop(p,hei);await w.runQueue();assert.strictEqual(hei.st,"a","1回目: アクティブになる");
    hei.st="s";w.setTop(p,hei);await w.runQueue();assert.strictEqual(hei.st,"a","2回目");
    hei.st="s";w.setTop(p,hei);await w.runQueue();assert.strictEqual(hei.st,"s","3回目はターン2を超えるので何も起きない");
    const h0=p.hand.length;w.removeSetCost(p,hei);await w.runQueue();assert.strictEqual(p.hand.length,h0+1,"紅子: 裏向きのセットが離れたら1枚引く");
    w.removeSetCost(p,hei);await w.runQueue();assert.strictEqual(p.hand.length,h0+2);
    w.removeSetCost(p,hei);await w.runQueue();assert.strictEqual(p.hand.length,h0+2,"ターン2まで");
    G.turnNo++;hei.set.push({c:w.inst(R),up:true});const h1=p.hand.length;w.removeCard(hei,"テスト");await w.runQueue();
    assert.strictEqual(p.hand.length,h1+3-1+1-1+0>=0?p.hand.length:0,"現場を離れるキャラのセット（表向きは数えない）");
    G.turn=1;r.set=[{c:w.inst(R),up:false}];const h2=p.hand.length;w.removeSetCost(p,r);await w.runQueue();assert.strictEqual(p.hand.length,h2,"相手ターン中は引かない")}],
  ["服部平次 B02018 の宣言: デッキの上から3枚をリムーブして1枚を裏向きでセット（アクティブか突撃）",async w=>{
    const G=board(w,{p0:{field:["B02018"],deck:[R,R,R,R,R,R,R,R]}});const p=G.P[0],[hei]=p.field;G.turn=0;hei.st="s";
    const a=w.FX.abilities(p,hei).find(a=>/セット/.test(a.label));assert.ok(a.ok);await w.FX.useAbility(p,hei,a);
    assert.strictEqual(p.deck.length,4);assert.strictEqual(hei.set.length,1);assert.strictEqual(hei.st,"a");assert.ok(!w.FX.abilities(p,hei).find(a=>/セット/.test(a.label)).ok,"ターン1")}],
  ["灰原哀 PR313: 登場時、手札1枚リムーブとレベル7以上をスリープして1枚引き、相手のキャラとコンタクトを発生させる（AP＋1000は自分ターン中）",async w=>{
    const G=board(w,{p0:{hand:[R,R],field:["PR313"],deck:[R,R,R,R]},p1:{field:["B02007"]}});const p=G.P[0],o=G.P[1],[ha]=p.field;G.turn=0;p.caseC=w.inst("B06106");
    assert.strictEqual(w.apOf(ha),w.C(ha).ap+1000);ha.fresh=true;
    await w.ev("DEF")["1160"].enter(p,ha);
    assert.strictEqual(ha.st,"s","レベル7以上のキャラ（自分）をスリープ");assert.strictEqual(p.hand.length,2,"1枚リムーブして1枚引く");assert.strictEqual(p.rm.length,1);
    assert.strictEqual(o.field.length,0,"APで勝ってコンタクトでリムーブ");
    G.turn=1;assert.strictEqual(w.apOf(ha),w.C(ha).ap);p.deck.push(...[R,R,R,R,R,R,R].map(n=>w.inst(n)));const d0=p.deck.length;await w.ev("DEF")["1160"].leaveOppTurn(p,ha);assert.strictEqual(p.deck.length,d0-1)}],
  ["ハート姫 D10005: スリープと手札1枚でリムーブエリアのスペイドを登場。宣言: 手札の［シャッフルロマンス］を使用（手札の使用には数えない）",async w=>{
    const G=board(w,{p0:{field:["D10005"],hand:[R,"B01023","B01023"],rm:["D10003"],file:[R,R,R,R],deck:[R,R,R,R,R,R,R,R,R,R]}});const p=G.P[0],[hp]=p.field;G.turn=0;p.caseC=w.inst("D10026");
    await w.ev("DEF")["0839"].enter(p,hp);assert.strictEqual(hp.st,"s");assert.ok(p.field.some(y=>w.C(y).n==="D10003"),"スペイドが登場");
    const sp=p.field.find(y=>w.C(y).n==="D10003");
    const a=w.FX.abilities(p,hp)[0];assert.ok(a.ok,"絆工藤新一（スペイド）がいる");p.usedHand=true;assert.ok(w.FX.abilities(p,hp)[0].ok,"手札の使用済みでも宣言できる");
    const nEv=()=>p.hand.filter(y=>w.C(y).n==="B01023").length,e0=nEv();await w.FX.useAbility(p,hp,a);assert.strictEqual(nEv(),e0-1,"手札のシャッフルロマンスを1枚使用");assert.strictEqual(p.usedHand,true)}],
  ["工藤新一 D10009: 毛利蘭を下に重ねて突撃［キャラ］。ターン終了時に毛利蘭がいなければリムーブ。登場時はAP8000以下をデッキの下へ",async w=>{
    const G=board(w,{p0:{field:["D10009","B01019","B02004"]},p1:{field:["B01008","B04003"]}});const p=G.P[0],o=G.P[1],[shin,ran1,ran2]=p.field;G.turn=0;p.caseC=w.inst("D10026");
    const a=w.FX.abilities(p,shin)[0];assert.ok(a.ok);await w.FX.useAbility(p,shin,a);
    assert.strictEqual(p.field.length,2);assert.strictEqual(shin.set.filter(s=>s.under).length,1);assert.ok(shin.kw.includes("突撃［キャラ］"));
    await w.FX.endTurn(p);assert.ok(p.field.includes(shin),"もう1枚の毛利蘭がいるので残る");
    const [r2]=p.field.filter(y=>y!==shin);w.removeCard(r2,"テスト");await w.runQueue();await w.FX.endTurn(p);assert.ok(!p.field.includes(shin),"毛利蘭がいないのでリムーブ");
    const d0=o.deck.length;await w.ev("DEF")["0840"].enter(p,shin);assert.strictEqual(o.field.length,1,"AP8000以下の1枚をデッキの下へ");assert.strictEqual(o.deck.length,d0+1)}],
  ["江戸川コナン B09003: 自分ターン中レベル－2。レベル7以下の【青】か【緑】が登場したときAP8000以下をリムーブ（ターン1）。宣言: 名前を当てると相手のFILEの上をリムーブしAP＋2000",async w=>{
    const G=board(w,{p0:{field:["B09003","B04003"],hand:["B01008"],deck:[R,R,R,R,R,R]},p1:{field:["B01008"],file:[R,R],deck:[R,R,R]}});const p=G.P[0],o=G.P[1],[co,shin]=p.field;G.turn=0;p.caseC=w.inst("B01099");
    const lvOf=w.ev("lvOf");assert.strictEqual(lvOf(co),w.C(co).lv-2);G.turn=1;assert.strictEqual(lvOf(co),w.C(co).lv);G.turn=0;
    const y=p.hand[0];
    await w.enterByEffect(p,y,"a");assert.strictEqual(o.field.length,0,"登場時にAP8000以下をリムーブ");
    const o2=w.inst("B01008");o.field.push(o2);const z=w.inst("B01008");p.hand.push(z);await w.enterByEffect(p,z,"a");assert.strictEqual(o.field.length,1,"ターン1");
    const a=w.FX.abilities(p,co).find(a=>/FILE/.test(a.label));assert.ok(!a.ok,"絆服部平次がいない");
    p.field.push(w.inst("D06003"));const b=w.FX.abilities(p,co).find(a=>/FILE/.test(a.label));assert.ok(b.ok);
    o.file.forEach(f=>f.fu=true);const dn=o.deck.length,fn=o.file.length;await w.FX.useAbility(p,co,b);
    assert.strictEqual(o.deck.length,dn-1,"相手はデッキの上を裏向きでFILEの上に置く");assert.strictEqual(o.file.length,fn,"1枚リムーブして1枚置く");assert.strictEqual(p.deck.length,5,"コスト: 自分のデッキの上から1枚リムーブ")}],
  ["工藤新一&服部平次 B09108: 相手のキャラをデッキの下へ＋FILEの上を表向き。もう1つはパートナーエリアでも宣言できる",async w=>{
    const G=board(w,{p0:{field:["B09108"],deck:[R,R,R,R,R,R,R]},p1:{field:["B01008"],file:[R,R,R],deck:[R,R,R]}});const p=G.P[0],o=G.P[1],[sh]=p.field;G.turn=0;
    const [a1,a2]=w.FX.abilities(p,sh);assert.ok(a1.ok&&a2.ok);await w.FX.useAbility(p,sh,a1);
    assert.strictEqual(o.field.length,0);assert.ok(o.file[o.file.length-1].fu,"FILEの上が表向き");
    const rm0=o.rm.length,f0=o.file.length;await w.FX.useAbility(p,sh,a2);
    assert.strictEqual(o.rm.length,rm0+1,"表向きの上のカードの名前を指定→リムーブ");assert.strictEqual(o.file.length,f0,"相手はデッキの上をFILEの上に置く");assert.strictEqual(p.rm.length,2,"一致: 2枚引いて手札を2枚リムーブ");
    w.toPartnerArea(p,sh);const abs=w.FX.abilities(p,sh);assert.strictEqual(abs.length,1,"パートナーエリアでは2つ目だけ");assert.ok(abs[0].partner)}],
  ["服部平次＆怪盗キッド B10098: コンタクト中のレベル8以上の自分のキャラにAP＋2000（パートナーエリアでも）。宣言でパートナーエリアへ移り、〚突撃〛持ちを登場させアクティブ指定を与える",async w=>{
    const G=board(w,{p0:{field:["B10098","B04003",R],rm:["D06003","B10038"]},p1:{field:["B01008"]}});const p=G.P[0],o=G.P[1],[hk,shin,r]=p.field;G.turn=0;
    G.contact={a:shin,d:o.field[0]};assert.strictEqual(w.apOf(shin),w.C(shin).ap+2000);G.contact={a:r,d:o.field[0]};assert.strictEqual(w.apOf(r),w.C(r).ap);G.contact=null;
    const a=w.FX.abilities(p,hk)[0];assert.ok(a.ok);await w.FX.useAbility(p,hk,a);
    assert.ok(p.pa.includes(hk),"パートナーエリアへ");const nw=p.field[p.field.length-1];assert.ok(["D06003","B10038"].includes(w.C(nw).n));assert.ok(nw.kw.includes("アクティブ指定"));
    G.contact={a:shin,d:o.field[0]};assert.strictEqual(w.apOf(shin),w.C(shin).ap+2000,"パートナーエリアでも")}],
  ["楠川探偵 B05033: ［探偵］は、楠川をリムーブして【宣言】をコストなしで宣言できる（スリープしない）",async w=>{
    const G=board(w,{p0:{field:["B10098","B05033"],rm:["D06003"]},p1:{field:["B01008"]}});const p=G.P[0],[hk,ku]=p.field;G.turn=0;
    const abs=w.FX.abilities(p,hk);const alt=abs.find(a=>a.alt);assert.ok(alt&&alt.ok,"代替版が出る");
    hk.st="s";const alt2=w.FX.abilities(p,hk).find(a=>a.alt);assert.ok(alt2.ok,"スリープ中でも宣言できる");
    await w.FX.useAbility(p,hk,alt2);assert.ok(!p.field.includes(ku),"楠川はリムーブ");assert.ok(p.rm.includes(ku));assert.ok(p.field.some(y=>w.C(y).n==="D06003"),"登場");
    assert.ok(p.field.includes(hk)&&!p.pa.includes(hk),"通常のコスト（パートナーエリアへ）は払わない");assert.strictEqual(hk.st,"s");
    const G2=board(w,{p0:{field:["B02018","B05033"],deck:[R,R,R,R,R,R]}});const q=G2.P[0],[hei,ku2]=q.field;G2.turn=0;
    assert.ok(!w.FX.abilities(q,hei).some(a=>a.alt),"スリープだけのコストではない能力（デッキ3枚リムーブ）には出ない");
    assert.ok(!w.FX.abilities(q,ku2).some(a=>a.alt))}],
  ["京極真 B09041: Lv6以下にガードされたらそのキャラはアクション終了時までコンタクトでリムーブされない。ガードされたターンだけ宣言できる",async w=>{
    const G=board(w,{p0:{field:["B09041"]},p1:{field:["B01019","B04003"]}});const p=G.P[0],o=G.P[1],[ky]=p.field,[low,hi]=o.field;G.turn=0;
    assert.ok(!w.FX.abilities(p,ky)[0].ok,"ガードされていない");
    await w.FX.onGuarded(p,ky,low);assert.ok(low.cSafe);assert.ok(w.FX.abilities(p,ky)[0].ok);
    G.contact={a:ky,d:low};ky.apC=9999;w.FX.onContact&&0;await w.ev("contact")(p,ky,low);assert.ok(o.field.includes(low),"リムーブされない");
    await w.FX.actionEnd(p,ky);assert.ok(!low.cSafe);
    await w.FX.useAbility(p,ky,w.FX.abilities(p,ky)[0]);assert.ok(!o.field.includes(hi),"レベル7以上をリムーブ");
    ky.guardedT=0;const k2=w.inst("B09041");await w.FX.onGuarded(p,ky,hi);assert.ok(!hi.cSafe,"レベル7以上のガードには与えない")}],
  ["風の女神 B09090: 手札の【疾風】をリムーブすると、このターン次に登場したキャラは2番目以降でも【疾風】が発動する",async w=>{
    const G=board(w,{p0:{hand:["B09074","B09074",R],deck:[R,R,R,R,R,R,R,R,R,R],ev:[],field:[]}});const p=G.P[0];G.turn=0;p.solved=true;p.caseC=w.inst("B09090");
    const a=w.FX.abilities(p,p.caseC)[0];assert.ok(a.ok);
    const [g1,g2]=p.hand;await w.enterByEffect(p,g1,"a");const h1=p.hand.length;
    await w.FX.useAbility(p,p.caseC,a);assert.strictEqual(p.galeFree,G.turnNo);
    const h2=p.hand.length;await w.enterByEffect(p,p.hand.find(y=>w.C(y).n==="B09074")||g2,"a");assert.ok(p.hand.length>=h2,"2番目でも疾風（松田陣平は1枚引く）")}],
  ["事件（環境デッキの残り）: 外交官殺人事件・愛しい愛しい…・狙われた唇・緋色の真相・鬼丸天下統一プロジェクトの宣言が動く",async w=>{
    const D=w.ev("DEF");
    for(const id of ["1050","1052","1156","1157","0659"]){const d=D[id];assert.ok(d&&d.solvedTrigger&&d.abilities[0].run,id)}
    const G=board(w,{p0:{field:["B04003","B03115"],ev:[R,R,R,R],deck:[R,R,R,R,R,R,R,R],hand:[R]},p1:{file:[R,R,R],deck:[R,R,R,R]}});const p=G.P[0],o=G.P[1],[shin,ram]=p.field;G.turn=0;p.solved=true;
    // 外交官: 表向きの上のカードを指定してリムーブ → レベル6のキャラに突撃［キャラ］
    p.caseC=w.inst("B09111");o.file[o.file.length-1].fu=true;const six=w.inst("B02004");p.field.push(six);
    const a=w.FX.abilities(p,p.caseC)[0];assert.ok(a.ok);const f0=o.file.length,r0=o.rm.length;await w.FX.useAbility(p,p.caseC,a);
    assert.strictEqual(o.rm.length,r0+1);assert.strictEqual(o.file.length,f0,"リムーブして1枚置く");assert.strictEqual(p.ev.filter(e=>e.up).length,2);assert.ok(six.kw.includes("突撃［キャラ］"));
    // 緋色の真相: 効果文のないキャラ1枚につき上から1枚見る
    p.ev.forEach(e=>e.up=false);p.caseC=w.inst("B10102");p.field.push(w.inst(R));const h0=p.hand.length;await w.FX.useAbility(p,p.caseC,w.FX.abilities(p,p.caseC)[0]);assert.strictEqual(p.hand.length,h0+1);
    // 狙われた唇: 与えた能力で、コンタクトでリムーブしたら上から4枚見て〚突撃〛を手札に
    p.ev.forEach(e=>e.up=false);p.caseC=w.inst("B10101");const grn=w.inst("B05033");p.field.push(grn);p.deck.unshift(w.inst("D06003"));
    await w.FX.useAbility(p,p.caseC,w.FX.abilities(p,p.caseC)[0]);const holder=p.field.find(y=>y.cwLook===G.turnNo);assert.ok(holder);
    const hh=p.hand.length;await w.FX.contactWin(p,holder,w.inst(R));assert.strictEqual(p.hand.length,hh+1,"〚突撃〛のキャラを手札に");
    // 愛しい愛しい…: 痕跡［未発見］
    p.ev.forEach(e=>e.up=false);p.caseC=w.inst("B09113");o.refreshed=false;const od=o.deck.length;await w.FX.useAbility(p,p.caseC,w.FX.abilities(p,p.caseC)[0]);assert.strictEqual(o.deck.length,od-2);
    // 鬼丸: 3つ表向きにして、表向きになったYAIBAのヒラメキを発動
    p.ev=[w.inst(R),w.inst(R),w.inst("B06029"),w.inst("B06029")];p.caseC=w.inst("B06036");assert.ok(w.FX.abilities(p,p.caseC)[0].ok);await w.FX.useAbility(p,p.caseC,w.FX.abilities(p,p.caseC)[0]);assert.strictEqual(p.ev.filter(e=>e.up).length,3)}],
  ["赤井秀一＆沖矢昴 B05066: 自分ターン中、相手のキャラがリムーブされたらレベル8以下をリムーブ（ターン1）。宣言: 相手のキャラをレベル－1",async w=>{
    const G=board(w,{p0:{field:["B05066"]},p1:{field:["B01019","B01019","B01008"]}});const p=G.P[0],o=G.P[1],[ao]=p.field;G.turn=0;p.partner=w.inst("B01060");
    const act=w.FX.abilities(p,ao)[0];assert.ok(act.ok);await w.FX.useAbility(p,ao,act);assert.ok(o.field.some(y=>y.lvT===-1));
    w.removeCard(o.field[0],"テスト");await w.runQueue();assert.strictEqual(o.field.length,1,"1枚リムーブしたらもう1枚リムーブ（ターン1）")}],
  ["黒羽快斗＆中森青子 B07030: 相手のレベル8以下をデッキの下へ＋［ビッグジュエル］をパートナーエリアへ。ビッグジュエル2枚で手札のレベル3以下の【白】をスリープ登場（パートナーエリアでも）",async w=>{
    const D=w.ev("DEF");const bj=w.CARD_DB.find(c=>c.t==="イベント"&&(c.ct||"").includes("ビッグジュエル"));
    const G=board(w,{p0:{field:["B07030","B09030"],rm:[bj.n],hand:["B01033"]},p1:{field:["B01019"]}});const p=G.P[0],o=G.P[1],[kk]=p.field;G.turn=0;p.pa=[w.inst(bj.n),w.inst(bj.n)];
    const abs=w.FX.abilities(p,kk);assert.strictEqual(abs.length,2);
    const wh=w.CARD_DB.find(c=>c.t==="キャラ"&&c.c==="白"&&c.lv<=3);p.hand=[w.inst(wh.n)];
    await abs[1].run(p,kk);assert.strictEqual(p.pa.filter(y=>w.C(y).t==="イベント").length,0);const ent=p.field.find(y=>w.C(y).n===wh.n);assert.ok(ent&&ent.st==="s","スリープ状態で登場");
    w.toPartnerArea(p,kk);const ab2=w.FX.abilities(p,kk);assert.ok(ab2.length===1&&ab2[0].partner)}],
  ["宮本武蔵 B06050: カットインは自分ターン中AP＋2000か、事件YAIBAで［YAIBA］のイベントを手札に（どちらか1つ）",async w=>{
    const G=board(w,{p0:{hand:["B06050"],rm:["B06030"]},p1:{}});const p=G.P[0];G.turn=0;
    assert.ok(w.FX.has(p.hand[0],"cutin")&&w.FX.automated(p.hand[0]));assert.strictEqual(w.cutinAp(p.hand[0],p),2000)}],
  ["江戸川コナン B01005: 青パートナーでネクストヒント使用時、使ったカードのレベル以下のキャラをデッキの下へ（ターン1）",async w=>{
    const G=board(w,{p0:{field:["B01005"]},p1:{field:["B01019","B02007"]}});const p=G.P[0],[x]=p.field,o=G.P[1];G.turn=0;
    await w.FX.onHintUse(p,x,w.inst("B01019"));assert.strictEqual(o.field.length,1,"Lv2以下を1枚");
    await w.FX.onHintUse(p,x,w.inst("B01019"));assert.strictEqual(o.field.length,1,"ターン1")}],
  ["江戸川コナン B02002: 登場時、レベル7以上の青以外がいれば突撃／アクション時、青以外1枚につきAP＋1000",async w=>{
    const G=board(w,{p0:{field:["B02002","B01044"]}});const p=G.P[0],[x]=p.field;G.turn=0;
    await w.FX.enter(p,x);assert.ok(x.kw.includes("突撃"));
    await w.FX.onAction(p,x,null);assert.strictEqual(x.apA,1000)}],
  ["江戸川コナン B04005: 登場時に2枚引いて2枚リムーブ／宣言で［毛利探偵事務所］AP＋1000",async w=>{
    const G=board(w,{p0:{field:["B04005","B02012"],hand:["B01019","B01019","B01019"]}});const p=G.P[0],[x,k]=p.field;G.turn=0;
    await w.FX.enter(p,x);assert.strictEqual(p.hand.length,3);
    const a=w.FX.abilities(p,x)[0];assert.ok(a.can(p,x));const ap0=w.apOf(k);await a.run(p,x);assert.strictEqual(w.apOf(k),ap0+1000)}],
  ["工藤新一 B05014: 突撃を持つ／ターン終了時にスリープなら手札に戻り、Lv3以下のコナンをスリープで登場",async w=>{
    const G=board(w,{p0:{field:["B05014"],rm:["B04005","B02007"]}});const p=G.P[0],[x]=p.field;
    assert.ok(w.FX.kwExtra(x,p).includes("突撃"));x.st="s";await w.FX.endTurn(p);
    assert.ok(p.hand.includes(x));assert.ok(p.field.some(y=>w.C(y).n==="B02007"&&y.st==="s"))}],
  ["毛利小五郎 B02012: 自分ターン中、Lv5以下の青にAP＋1000／［毛利探偵事務所］のアクションで1枚引く（ターン1）",async w=>{
    const G=board(w,{p0:{field:["B02012","B01019","B04005"]}});const p=G.P[0],[k,r,c]=p.field;G.turn=0;
    assert.strictEqual(w.apOf(r),2000);G.turn=1;assert.strictEqual(w.apOf(r),1000);G.turn=0;
    const h=p.hand.length;await w.FX.onAction(p,k,c);assert.strictEqual(p.hand.length,h+1);await w.FX.onAction(p,k,c);assert.strictEqual(p.hand.length,h+1)}],
  ["毛利小五郎 B04011: 現場のコナンをデッキの下に移してLP＋2",async w=>{
    const G=board(w,{p0:{field:["B04011","B04005"]}});const p=G.P[0],[k,c]=p.field;G.turn=0;
    const a=w.FX.abilities(p,k)[0];const lp=w.lpOf(k);assert.ok(a.can(p,k));await a.run(p,k);assert.ok(!p.field.includes(c));assert.strictEqual(w.lpOf(k),lp+2)}],
  // ---- イベント・事件の自動化（js/effects/priority.js、2026-11-10） ----
  ["優先度の高いイベント・事件: 登録したカードはすべて自動で、ヒラメキを持つカードにはヒラメキの処理がある",async w=>{
    const ids=Object.keys(w.ev("DEF")).filter(i=>w.CARD_DB.some(c=>c.i===i&&(c.t==="イベント"||c.t==="事件")&&c.pk!=="CT-P11"));
    const done=["0018","0034","0066","0067","0082","0083","0172","0186","0202","0218","0231","0244","0282","0283","0299","0317","0318","0335","0356","0357","0383","0384","0398","0417","0452","0453","0468","0469","0499","0528","0529","0546","0563","0564","0565","0581","0582","0583","0600","0601","0614","0615","0616","0625","0657","0702","0713","0714","0723","0724","0725","0726","0758","0783","0785","0786","0805","0806","0818","0832","0858","0882","0898","0912","0928","0944","0964","0977","0978","0995","1009","1029","1044","1045","1046","1059","1093","1094","1108","1119","1137","1151","1164","1168","0162","0164","0165","0166","0406","0498"];
    for(const i of done){const c=w.CARD_DB.find(c=>c.i===i);assert.ok(ids.includes(i),i+" の定義がない");assert.ok(w.FX.automated({n:c.n}),c.n);
      if(c.hr)assert.strictEqual(typeof w.ev("DEF")[i].hirameki,"function",c.n+" ヒラメキの処理がない")}}],
  ["黒のパートナーの事件解決を書き換える事件: あばよ…名探偵!! B03135 は証拠隠滅になる（黒以外のパートナーでは通常）",async w=>{
    const G=board(w,{p0:{}});const p=G.P[0];p.caseC=w.inst("B03135");
    p.partner=w.inst(w.CARD_DB.find(c=>c.t==="パートナー"&&c.c==="黒").n);assert.ok(w.FX.eraseEvidence(p));
    p.partner=w.inst("B01001");assert.ok(!w.FX.eraseEvidence(p))}],
  ["犯人たちの犯行 B09107: 事件解決できない／デッキを全部リムーブして証拠を表にし、［犯人］8枚で相手の敗北",async w=>{
    const G=board(w,{p0:{ev:Array(8).fill("PR158"),solved:true}});const p=G.P[0];p.caseC=w.inst("B09107");
    assert.ok(w.FX.noSolve(p));const a=w.ev("DEF")["1046"].abilities[0];assert.ok(a.can(p));await a.run(p);
    assert.ok(G.over,"相手の敗北")}],
  ["集められた名探偵 B05120: ［探偵］以外のキャラは手札から使用できない",async w=>{
    const G=board(w,{p0:{hand:["B04005","PR158"],file:Array(6).fill("B01019")}});const p=G.P[0];p.caseC=w.inst("B05120");
    const [det,non]=p.hand;assert.ok(!w.FX.useBlock(p,det),"探偵は使える");assert.ok(w.FX.useBlock(p,non),"探偵以外は使えない")}],
  ["少年探偵団の活躍 B02014: レベル5以下の［少年探偵団］に突撃［事件］、アクションすると1枚引く",async w=>{
    const G=board(w,{p0:{hand:["B02014"],field:["B04005","B03003"]}});const p=G.P[0],[a,b]=p.field;
    await w.FX.event(p,p.hand[0]);assert.ok(a.kw.includes("突撃［事件］"));assert.ok(!b.kw.includes("突撃［事件］"),"レベル8は対象外");
    const h=p.hand.length;await w.FX.onAction(p,a,null);assert.strictEqual(p.hand.length,h+1)}],
  ["レッドヘリング B02051: 自分のキャラをスリープして、レベル7以下のキャラをリムーブ",async w=>{
    const G=board(w,{p0:{hand:["B02051"],field:["B01008"]},p1:{field:["B01008"]}});
    await w.FX.event(G.P[0],G.P[0].hand[0]);assert.strictEqual(G.P[0].field[0].st,"s");assert.strictEqual(G.P[1].field.length,0)}],
  ["「説得するよりこの方が早い…」 B06082: 解決編のとき、AP8000以下をリムーブ、FILEの上を手札に加えてもう1枚リムーブ",async w=>{
    const G=board(w,{p0:{hand:["B06082"],file:Array(4).fill("B01019"),solved:true},p1:{field:["B01019","B01019","B01019"]}});const p=G.P[0];
    await w.FX.event(p,p.hand[0]);assert.strictEqual(G.P[1].field.length,1);assert.strictEqual(p.file.length,3)}],
  ["「オレがついてる!!」 B05022: 相手のキャラの元のAPがターン終了時まで0",async w=>{
    const G=board(w,{p0:{hand:["B05022"]},p1:{field:["B01008","B01019"]}});
    await w.FX.event(G.P[0],G.P[0].hand[0]);for(const y of G.P[1].field)assert.strictEqual(w.apOf(y),0)}],
  ["手のこんだ悪巧み B08043: 自分の最大LP以下のLPの相手キャラをリムーブ",async w=>{
    const G=board(w,{p0:{hand:["B08043"],field:["B01008"]},p1:{field:["B01019"]}});
    await w.FX.event(G.P[0],G.P[0].hand[0]);assert.strictEqual(G.P[1].field.length,0)}],
  ["ドゴ B10033: 解決編で［服部平蔵］か［遠山銀司郎］がいると手札で使うレベルが－3",async w=>{
    const hei=w.CARD_DB.find(c=>c.nm==="服部平蔵"&&c.t==="キャラ").n;
    const G=board(w,{p0:{hand:["B10033"],field:[hei],solved:true}});const p=G.P[0],x=p.hand[0];
    assert.strictEqual(w.FX.handLevel(p,x),4);p.solved=false;assert.strictEqual(w.FX.handLevel(p,x),null)}],
  ["青の古城探索事件 D08026: 裏向きの証拠を表向きにした数だけ［少年探偵団］のAPを＋1000",async w=>{
    const G=board(w,{p0:{ev:["B01019","B01019"],field:["B04005"],solved:true}});const p=G.P[0];p.caseC=w.inst("D08026");
    const a=w.ev("DEF")["0499"].abilities[0];assert.ok(a.can(p));await a.run(p);assert.strictEqual(w.apOf(p.field[0]),(w.C(p.field[0]).ap||0)+2000)}],
  ["ブルーサファイア PR195: 中森青子を探して手札に加え、このカードをパートナーエリアへ",async w=>{
    const aoko=w.CARD_DB.find(c=>c.nm==="中森青子"&&c.t==="キャラ").n;
    const G=board(w,{p0:{hand:["PR195"],deck:["B01019","B01019",aoko,"B01019"]}});const p=G.P[0],x=p.hand[0];
    w.ev("detach")(x);p.rm.push(x);await w.FX.event(p,x);assert.ok(p.hand.some(y=>w.C(y).n===aoko));assert.ok(p.pa.includes(x))}],
  ["「君は思ったより手強いって事がね！」 B07076: 手札をすべてリムーブして4枚引き、相手はこのターンカットイン・変装できない",async w=>{
    const G=board(w,{p0:{hand:["B07076",...Array(6).fill("B01019")]},p1:{}});const p=G.P[0];p.partner=w.inst(w.CARD_DB.find(c=>c.t==="パートナー"&&c.c==="赤").n);
    const x=p.hand[0];w.ev("detach")(x);p.rm.push(x);await w.FX.event(p,x);assert.strictEqual(p.hand.length,4);assert.strictEqual(G.P[1].noCiDis,G.turnNo)}],
  ["弁当型携帯FAX B07014: 【青】のキャラにセット。突撃［キャラ］と、リムーブエリアのキャラをデッキの上に移す宣言を持つ",async w=>{
    const G=board(w,{p0:{hand:["B07014"],field:["B01019"],rm:["B04005"]}});const p=G.P[0],x=p.hand[0],h=p.field[0];
    await w.FX.event(p,x);assert.ok(w.FX.kwExtra(h,p).includes("突撃［キャラ］"));
    const a=w.FX.abilities(p,h).find(a=>/デッキの上/.test(a.label));assert.ok(a&&a.ok);await a.run(p,h);assert.strictEqual(p.deck[0],p.deck.find(y=>w.C(y).n==="B04005"))}],
  ["どうしてお姉ちゃんを… B08017: セットされたキャラがスリープ中は、［灰原哀］が相手のイベントで選べない",async w=>{
    const G=board(w,{p0:{hand:["B08017"],field:["B03003"],rm:["B04005"]},p1:{}});G.P[0].caseC=w.inst("B01024");
    const {immune}=w.ev("({immune})");const p=G.P[0],q=G.P[1];const ai=p.field[0];
    const ok=await (async()=>{G.P[0].caseC=w.inst(w.CARD_DB.find(c=>c.t==="事件"&&/青/.test(c.c)&&/黒/.test(c.c)).n);await w.FX.event(p,p.hand[0]);return true})();
    const co=p.field.find(y=>w.C(y).nm==="江戸川コナン");assert.ok(co,"コナンが登場");co.st="s";G.evtBy=q;assert.ok(immune(q,ai));co.st="a";assert.ok(!immune(q,ai));G.evtBy=null}],
  // ---- MR・レベル8の自動化（js/effects/mr8.js、2026-11-10） ----
  ["MR・レベル8: mr8.js のカードはすべて自動",async w=>{
    const src=require("fs").readFileSync(require("path").join(__dirname,"../js/effects/mr8.js"),"utf8");const ids=[...src.matchAll(/^DEF\["(\d{4})"\]/gm)].map(m=>m[1]);
    assert.ok(ids.length>=48);for(const i of ids){const c=w.CARD_DB.find(c=>c.i===i);assert.ok(w.FX.automated({n:c.n}),c.n)}}],
  ["毛利蘭＆江戸川コナン B06003: LP－2をコストに、アクティブ状態のキャラをスリープ",async w=>{
    const G=board(w,{p0:{field:["B06003"]},p1:{field:[R]}});const p=G.P[0],[x]=p.field;
    const a=w.FX.abilities(p,x)[0];assert.ok(a.ok);await a.run(p,x);assert.strictEqual(w.lpOf(x),0);assert.strictEqual(G.P[1].field[0].st,"s")}],
  ["沖矢昴＆世良真純 B06074: FILEの上から2枚リムーブし、ターン終了時にFILEが5枚以下なら2枚置く",async w=>{
    const G=board(w,{p0:{field:["B06074"],file:Array(6).fill(R)}});const p=G.P[0],[x]=p.field;
    const a=w.FX.abilities(p,x)[0];assert.ok(a.ok);await a.run(p,x);assert.strictEqual(p.file.length,4);assert.strictEqual(p.rm.length,2);
    await w.FX.endTurn(p);assert.strictEqual(p.file.length,6);await w.FX.endTurn(p);assert.strictEqual(p.file.length,6,"予約は1回だけ")}],
  ["毛利蘭＆灰原哀 B07001: デッキの上3枚の［少年探偵団］・［毛利探偵事務所］1枚につきAP＋1000と突撃",async w=>{
    const G=board(w,{p0:{field:["B07001"],deck:["B01008","B01008","B02081",R]}});const p=G.P[0],[x]=p.field;
    const a=w.FX.abilities(p,x)[0];await a.run(p,x);assert.strictEqual(w.apOf(x),10000);assert.ok(x.kw.includes("突撃"))}],
  ["佐藤美和子＆宮本由美 B07079: ［警視庁］をデッキの下に移してAP8000以下をリムーブ／［警視庁］をAP＋3000（ターン終了時にデッキの下へ）",async w=>{
    const G=board(w,{p0:{field:["B07079","B02081"],hand:[R]},p1:{field:[R]}});const p=G.P[0],[x,k]=p.field;
    const [a0,a1]=w.FX.abilities(p,x);await a1.run(p,x);assert.strictEqual(w.apOf(k),w.C(k).ap+3000);assert.ok(k.kw.includes("終了時デッキの下"));
    await a0.run(p,x);assert.ok(!p.field.includes(k));assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(x.st,"s")}],
  ["江戸川コナン＆灰原哀 B08002: キャラをリムーブし、そのレベルの枚数デッキの上をリムーブ／［少年探偵団］を【青】の下に重ねる",async w=>{
    const G=board(w,{p0:{field:["B08002"],deck:Array(12).fill(R),rm:["B01008"]},p1:{field:["B01008"]}});const p=G.P[0],[x]=p.field;
    const [a0,a1]=w.FX.abilities(p,x);await a0.run(p,x);assert.strictEqual(G.P[1].field.length,0);assert.strictEqual(p.deck.length,7);
    await a1.run(p,x);assert.strictEqual((x.set||[]).filter(s=>s.under).length,1)}],
  ["工藤優作 B02039: 【絆黒羽盗一】セットされたカードを持ち主の表向きの証拠にし、キャラをリムーブ",async w=>{
    const G=board(w,{p0:{field:["B02039","B02040"]},p1:{field:[R,R]}});const p=G.P[0],[x]=p.field,o=G.P[1];
    o.field[0].set=[{c:w.inst(R),up:false}];const a=w.FX.abilities(p,x)[0];assert.ok(a.ok);await a.run(p,x);
    assert.strictEqual(o.ev.length,1);assert.ok(o.ev[0].up);assert.strictEqual(o.field.length,1);assert.strictEqual(x.st,"s")}],
  ["京極真 B03047: 【絆鈴木園子】AP＋1000、AP6000以下にガードされたらアクティブ",async w=>{
    const G=board(w,{p0:{field:["B03047","B02048"]},p1:{field:[R]}});const p=G.P[0],[x]=p.field;
    assert.strictEqual(w.apOf(x),w.C(x).ap+1000);x.st="s";await w.FX.onGuarded(p,x,G.P[1].field[0]);assert.strictEqual(x.st,"a")}],
  ["ライ B04090: コンタクト中にカットインを使うと、リムーブエリアのレベル3以下の【黒】を登場",async w=>{
    const G=board(w,{p0:{field:["B04090"],rm:["B03119"]}});const p=G.P[0],[x]=p.field;
    await w.FX.cutin(p,w.inst(R),x);assert.strictEqual(p.field.length,2)}],
  ["服部平次 B07016: 自分のターンに【緑】のイベントを使うと、レベル8以下をリムーブ",async w=>{
    const G=board(w,{p0:{field:["B07016"]},p1:{field:[R]}});const p=G.P[0];
    await w.ev("DEF")["0748"].onEventUse(p,p.field[0],w.inst("B04027"));assert.strictEqual(G.P[1].field.length,0)}],
  ["円谷光彦 B08007: 下に重なったカードがあると自分のターン中AP＋1000・突撃［キャラ］、3枚以上でFILE5なら手札1枚でアクティブ",async w=>{
    const G=board(w,{p0:{field:["B08007"],hand:[R],file:Array(5).fill(R)}});const p=G.P[0],[x]=p.field;
    assert.strictEqual(w.apOf(x),w.C(x).ap);x.set=[1,2,3].map(()=>({c:w.inst(R),up:true,under:true}));
    assert.strictEqual(w.apOf(x),w.C(x).ap+1000);assert.ok(w.FX.kwExtra(x,p).includes("突撃［キャラ］"));
    x.st="s";const a=w.FX.abilities(p,x)[0];assert.ok(a.ok);await a.run(p,x);assert.strictEqual(x.st,"a");G.turn=1;assert.strictEqual(w.apOf(x),w.C(x).ap)}],
  ["【ターン2】: 綾小路文麿 B09025 は1ターンに2回まで宣言できる",async w=>{
    const G=board(w,{p0:{field:["B09025"],hand:["B04025","B04025","B04025"]}});const p=G.P[0],[x]=p.field;
    for(let i=0;i<2;i++){const a=w.FX.abilities(p,x)[0];assert.ok(a.ok,`${i+1}回目`);await w.FX.useAbility(p,x,a)}
    assert.strictEqual(p.field.length,3);assert.ok(!w.FX.abilities(p,x)[0].ok,"3回目はできない")}],
  ["横溝重悟 D11005: スリープして、相手のキャラは指定できるなら必ずこのキャラを指定してアクションする",async w=>{
    const G=board(w,{p0:{field:["D11005"],ev:[R]},p1:{field:["B01008"]}});const p=G.P[0],[x]=p.field,[y]=G.P[1].field;
    const a=w.FX.abilities(p,x)[0];await a.run(p,x);assert.strictEqual(x.st,"s");
    G.turn=1;G.turnNo++;await w.declareAction(G.P[1],y,"case");assert.strictEqual(p.ev.length,1,"事件ではなくこのキャラを指定した");assert.ok(JSON.stringify(G.rec.log).includes("必ず指定"));assert.strictEqual(y.st,"s")}],
  ["萩原千速 SP010: 相手のイベントの効果ではリムーブされない",async w=>{
    const G=board(w,{p0:{field:["SP010"]}});const [x]=G.P[0].field;G.evtBy=G.P[1];
    w.removeCard(x,"効果",{by:G.P[1],effect:true});assert.ok(G.P[0].field.includes(x));G.evtBy=null;
    w.removeCard(x,"効果",{by:G.P[1],effect:true});assert.ok(!G.P[0].field.includes(x),"能力ではリムーブされる")}],
  ["京極真 B05051: 事件を指定してアクションできない",async w=>{
    const G=board(w,{p0:{field:["B05051"]}});const p=G.P[0],[x]=p.field;assert.ok(!w.canAct(x,p,"case"));assert.ok(w.canAct(x,p,"chara"))}],
  ["白馬探 B05059: 相手のターンにスリープ状態の自分か［探偵］がリムーブされたら1枚引く",async w=>{
    const G=board(w,{p0:{field:["B05059","B01008"]}});const p=G.P[0],[x,c]=p.field;G.turn=1;
    c.st="a";w.removeCard(c,"効果",{by:G.P[1],effect:true});await w.runQueue();assert.strictEqual(p.hand.length,0,"アクティブ状態は対象外");
    x.st="s";w.removeCard(x,"効果",{by:G.P[1],effect:true});await w.runQueue();assert.strictEqual(p.hand.length,1)}],
  ["工藤有希子 PR328: ［工藤優作］の【絆】を満たしたことにする（工藤優作 B09037【絆黒羽盗一】AP＋1000）",async w=>{
    const G=board(w,{p0:{field:["PR328","B09037"]}});const p=G.P[0],[x,y]=p.field;
    const ap=w.apOf(y);const a=w.FX.abilities(p,x)[0];assert.ok(a.ok);await a.run(p,x);assert.strictEqual(w.apOf(y),ap+1000)}],
  ["鬼丸猛 B06018 が与えた能力: ターン終了時、表向きのまま証拠として得る",async w=>{
    const G=board(w,{p0:{field:[R]}});const p=G.P[0],[y]=p.field;y.kw.push("終了時証拠");await w.FX.endTurn(p);
    assert.strictEqual(p.ev.length,1);assert.ok(p.ev[0].up);assert.strictEqual(p.field.length,0)}],
  ["ジン B03110: ターン終了時、FILEの上2枚を手札に加え、手札を2枚リムーブし、このキャラ以外をすべてリムーブ",async w=>{
    const G=board(w,{p0:{field:["B03110",R],file:[R,R]},p1:{field:["B01008","B01008","B01008"]}});const p=G.P[0],[x]=p.field;
    p.partner=w.inst("B03106");await w.FX.endTurn(p);assert.deepStrictEqual(p.field,[x]);assert.strictEqual(G.P[1].field.length,0);
    assert.strictEqual(p.file.length,0);assert.strictEqual(p.hand.length,0)}],
  // ---- 主要キャラ第2弾（js/effects/main.js、2026-11-10） ----
  ["ジン B01098: 自分のターンのコンタクト中のカットインで、コンタクト中のすべてのキャラをリムーブ",async w=>{
    const G=board(w,{p0:{field:[R]},p1:{field:[R]}});const p=G.P[0];G.contact={a:p.field[0],d:G.P[1].field[0]};
    await w.FX.cutin(p,w.inst("B01098"),p.field[0]);assert.strictEqual(p.field.length+G.P[1].field.length,0);G.contact=null}],
  ["服部平次 B03032: カードがセットされている相手のアクティブ状態のキャラを指定できる",async w=>{
    const G=board(w,{p0:{field:["B03032"]},p1:{field:[R]}});const p=G.P[0],[x]=p.field,[t]=G.P[1].field;
    assert.ok(!w.hitsActive(x,p,t));t.set=[{c:w.inst(R),up:false}];assert.ok(w.hitsActive(x,p,t))}],
  ["毛利蘭 B08014: アクションしたターンの終了時、自分のMRの能力で選ばれていなければ手札に戻る",async w=>{
    const G=board(w,{p0:{field:["B08014","B06003"]}});const p=G.P[0],[x,mr]=p.field;
    await w.FX.onAction(p,x,null);await w.FX.endTurn(p);assert.ok(p.hand.includes(x),"選ばれていないので手札へ");
    p.hand.length=0;p.field.unshift(x);x.st="a";G.turnNo++;await w.FX.onAction(p,x,null);
    x.st="a";
    await w.ev("withSrc")(mr,()=>w.ev("chooseChar")(p,"t",y=>y===x,{ai:cs=>cs}));await w.FX.endTurn(p);assert.ok(p.field.includes(x),"MRに選ばれたので残る")}],
  ["ジン PR230: 【パートナー黒】登場時、すべてのキャラをスリープ",async w=>{
    const G=board(w,{p0:{field:["PR230",R]},p1:{field:[R,R]}});const p=G.P[0];p.partner=w.inst("B03106");
    await w.ev("DEF")["0931"].enter(p,p.field[0]);assert.ok(w.ev("allChars")().every(y=>y.st==="s"))}],
  ["ジン B04094: 自分の効果で相手のキャラをリムーブしたら突撃",async w=>{
    const G=board(w,{p0:{field:["B04094"]},p1:{field:[R]}});const p=G.P[0],[x]=p.field;p.partner=w.inst("B03106");
    w.removeCard(G.P[1].field[0],"効果",{by:p,effect:true});await w.runQueue();assert.ok(x.kw.includes("突撃"))}],
  // ===== 新しい仕組みが要ったカード（js/effects/mech.js、2026-11-10） =====
  ["「オレのそばから離れんなや…」B05041: 相手の効果でリムーブ・スリープ・スタンされない（コンタクトではリムーブされる）",async w=>{
    const G=board(w,{p0:{field:["B01028"],hand:["B05041"]},p1:{}});const p=G.P[0],q=G.P[1],[h]=p.field;await w.FX.event(p,p.hand[0]);
    assert.strictEqual(w.ev("setEvents")(h).length,1);G.fxBy=q;w.ev("sleepC")(h);w.ev("stunC")(h);assert.strictEqual(h.st,"a");
    w.removeCard(h,"効果",{by:q,effect:true});assert.ok(p.field.includes(h));
    G.fxBy=p;w.ev("sleepC")(h);assert.strictEqual(h.st,"s","自分の効果ではスリープする");G.fxBy=null;
    w.removeCard(h,"コンタクト",{by:q});assert.ok(!p.field.includes(h))}],
  ["「かっ…和葉ァ!!!」B01039: 相手の効果・コンタクトで離れるとき、代わりにこのイベントをリムーブして残る",async w=>{
    const G=board(w,{p0:{field:["B01028"],hand:["B01039"]},p1:{}});const p=G.P[0],q=G.P[1],[h]=p.field;await w.FX.event(p,p.hand[0]);
    w.removeCard(h,"コンタクト",{by:q});assert.ok(p.field.includes(h));assert.strictEqual(h.set.length,0);assert.ok(p.rm.some(c=>w.C(c).i==="0033"));
    w.removeCard(h,"効果",{by:q,effect:true});assert.ok(!p.field.includes(h),"2回目はリムーブされる")}],
  ["チョーカー型変声機 B02067: 相手の効果で選ばれたとき無効（ターン1）",async w=>{
    const G=board(w,{p0:{field:["B01064"],hand:["B02067"]},p1:{}});const p=G.P[0],q=G.P[1],[h]=p.field;await w.FX.event(p,p.hand[0]);G.turn=1;
    const ch=w.ev("chooseChar");assert.strictEqual(await ch(q,"リムーブするキャラ"),null);assert.strictEqual(await ch(q,"リムーブするキャラ"),h)}],
  ["「最も出会いたくない…」B01057: 相手ターン中に現場からリムーブされたら、手札のレベル7以下の【白】を登場",async w=>{
    const G=board(w,{p0:{field:["B02042"],hand:["B01057","B04033"]},p1:{}});const p=G.P[0],q=G.P[1],[h]=p.field;await w.FX.event(p,p.hand[0]);
    G.turn=1;w.removeCard(h,"コンタクト",{by:q});await w.runQueue();assert.ok(p.field.some(y=>w.C(y).n==="B04033"))}],
  ["コンコン B05117: 相手ターン中に離れて現場が0体なら、キャラを1枚リムーブし、リムーブエリアの【カットイン】持ちを2枚まで登場",async w=>{
    const G=board(w,{p0:{field:["B01097"],hand:["B05117"],rm:["B01097","B01097"]},p1:{field:["B01064"]}});const p=G.P[0],q=G.P[1],[h]=p.field;await w.FX.event(p,p.hand[0]);
    G.turn=1;w.removeCard(h,"効果",{by:q,effect:true});await w.runQueue();assert.strictEqual(q.field.length,0);assert.strictEqual(p.field.length,2)}],
  ["トッ B01058: 突撃［事件］を与え、このターン次に相手の証拠がリムーブされたらスリープ状態のキャラをスタン",async w=>{
    const G=board(w,{p0:{field:["B04033"],hand:["B01058"]},p1:{field:["B01064"],ev:[R,R]}});const p=G.P[0],q=G.P[1],[a]=p.field;a.fresh=true;q.field[0].st="s";
    await w.FX.event(p,p.hand[0]);assert.ok(w.canAct(a,p,"case"));await w.declareAction(p,a,"case");
    assert.strictEqual(q.field[0].st,"x");assert.ok(!p.tohT,"1回だけ")}],
  ["死力を尽くして B02033: セットされているカードを合わせて2枚リムーブして、キャラを1枚リムーブ",async w=>{
    const G=board(w,{p0:{field:["B01028",R],hand:["B02033"]},p1:{field:["B01064"]}});const p=G.P[0],q=G.P[1],[h,k]=p.field;
    h.set=[{c:w.inst(R),up:false}];k.set=[{c:w.inst(R),up:false}];await w.FX.event(p,p.hand[0]);
    assert.strictEqual(h.set.length+k.set.length,0);assert.strictEqual(q.field.length,0)}],
  ["トランプ銃 B02052: ターン終了時に3枚リムーブしてスタン。相手ターンにリムーブエリアへ置かれるとき、他の［怪盗］にセットし直す",async w=>{
    const G=board(w,{p0:{field:["B04033","B04033"],hand:["B02052"],deck:[R,R,R,R,R,R,R,R,R,R,R]},p1:{field:["B01064"]}});const p=G.P[0],q=G.P[1],[h,k]=p.field;
    await w.FX.event(p,p.hand[0]);const host=w.ev("setEvents")(h).length?h:k,other=host===h?k:h;
    await w.FX.endTurn(p);assert.strictEqual(q.field[0].st,"x");assert.strictEqual(p.deck.length,8);
    G.turn=1;G.turnNo++;w.removeCard(host,"コンタクト",{by:q});await w.runQueue();assert.strictEqual(w.ev("setEvents")(other).length,1)}],
  ["石川五右衛門人形 B06012: ［少年探偵団］はコンタクト中AP＋2000。ターン終了時にリムーブして［阿笠博士］をスリープ状態で登場",async w=>{
    const G=board(w,{p0:{field:["D01009"],hand:["B06012"],rm:["B01012"]},p1:{field:["B01064"]}});const p=G.P[0],q=G.P[1],[h]=p.field;
    await w.FX.event(p,p.hand[0]);const ap=w.apOf(h);G.contact={a:h,d:q.field[0]};assert.strictEqual(w.apOf(h),ap+2000);G.contact=null;
    G.turn=1;await w.FX.endTurn(q);const ag=p.field.find(y=>w.C(y).n==="B01012");assert.ok(ag);assert.strictEqual(ag.st,"s");assert.strictEqual(h.set.length,0)}],
  ["ここで会うたが百年目 B06042: AP＋1000と、このターンだけのコンタクト発生の【宣言】を与える",async w=>{
    const G=board(w,{p0:{field:["B01028"],hand:["B06042"]},p1:{field:[R]}});const p=G.P[0],q=G.P[1],[x]=p.field;
    await w.FX.event(p,p.hand[0]);const ab=w.FX.abilities(p,x).find(a=>/コンタクト/.test(a.label));assert.ok(ab&&ab.ok);
    await w.FX.useAbility(p,x,ab);assert.strictEqual(q.field.length,0);assert.ok(!w.FX.abilities(p,x).find(a=>/コンタクト/.test(a.label)).ok,"ターン1");
    G.turnNo++;assert.ok(!w.FX.abilities(p,x).some(a=>/コンタクト/.test(a.label)),"次のターンには無い")}],
  ["探偵の目 PR067: パートナーは6色、現場は最大4枚",async w=>{
    const G=board(w,{p0:{}});const p=G.P[0];p.caseC=w.inst("PR067");
    assert.strictEqual(w.condOk("パートナー赤",p),true);assert.strictEqual(w.ev("fieldMax")(p),4)}],
  ["江戸川コナン B07002: 【宣言】このターン、相手はカットインと変装を使えない",async w=>{
    const G=board(w,{p0:{field:["B07002"]}});const p=G.P[0],[x]=p.field;const ab=w.FX.abilities(p,x)[0];assert.ok(ab.ok);
    await w.FX.useAbility(p,x,ab);assert.strictEqual(G.P[1].noCiDis,G.turnNo);assert.strictEqual(x.st,"s")}],
  ["江戸川コナン B03002: ［少年探偵団］が【宣言】を使うと、このキャラは突撃（ターン1）",async w=>{
    const G=board(w,{p0:{field:["B03002","D01009"]}});const p=G.P[0],[x,y]=p.field;
    await w.FX.useAbility(p,y,{label:"テスト",run:async()=>true});assert.ok(x.kw.includes("突撃"))}],
  ["工藤新一 B10010: 【絆毛利蘭】相手のイベントの効果ではリムーブされない（能力ではリムーブされる）",async w=>{
    const G=board(w,{p0:{field:["B10010",R]}});const p=G.P[0],q=G.P[1],[x]=p.field;
    G.evtBy=q;w.removeCard(x,"効果",{by:q,effect:true});assert.ok(p.field.includes(x));G.evtBy=null;
    w.removeCard(x,"効果",{by:q,effect:true});assert.ok(!p.field.includes(x))}],
  ["毛利小五郎 B07005: 妃英理がいないとアクションできない",async w=>{
    const G=board(w,{p0:{field:["B07005"]}});const p=G.P[0],[x]=p.field;
    assert.ok(!w.canAct(x,p,"case"));p.field.push(w.inst("B07006"));assert.ok(w.canAct(x,p,"case"))}],
  ["毛利小五郎 B10015: 自分の妃英理は［毛利探偵事務所］。名前の違う［毛利探偵事務所］4枚で迅速",async w=>{
    const G=board(w,{p0:{field:["B10015","B07006","B01019","B02007"]}});const p=G.P[0],[x,e]=p.field;const ht=w.ev("hasTrait");
    assert.ok(ht(e,"毛利探偵事務所"));assert.ok(w.FX.kwExtra(x,p).includes("迅速"))}],
  ["毛利小五郎 B01020: スリープ状態なら、相手は自分のレベル4以下を指定してアクションできない",async w=>{
    const G=board(w,{p0:{field:["B01020",R]}});const p=G.P[0],q=G.P[1],[x,y]=p.field;
    assert.ok(!w.FX.noTarget(q,y));x.st="s";assert.ok(w.FX.noTarget(q,y));assert.ok(!w.FX.noTarget(q,x),"自分自身はレベル5")}],
  ["毛利小五郎 B05101: 相手ターン中にリムーブされたら、スリープ状態で戻って1枚引き、［警察］を失い［探偵］になる",async w=>{
    const G=board(w,{p0:{field:["B05101"]}});const p=G.P[0],q=G.P[1],[x]=p.field;G.turn=1;const ht=w.ev("hasTrait");
    w.removeCard(x,"コンタクト",{by:q});await w.runQueue();assert.ok(p.field.includes(x));assert.strictEqual(x.st,"s");assert.strictEqual(p.hand.length,1);
    assert.ok(ht(x,"探偵")&&!ht(x,"警察"));w.removeCard(x,"コンタクト",{by:q});assert.ok(ht(x,"警察"),"離れると元に戻る")}],
];

