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
];
