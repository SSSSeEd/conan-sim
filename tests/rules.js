// ルールの単体テスト: 決まった盤面を作り、推理・アクション・コンタクト・リフレッシュなどの結果を確かめる
// 使うカードは効果文の無いキャラだけ（効果の自動化に左右されないように）。両方の席を CPU にして、選択の画面を出さない
const assert=require("assert");
const K={ // 効果文なし（カットイン・ヒラメキだけ）の青のカード
  conan:"B01008",   // Lv5 AP6000 LP1、ヒラメキ（1枚引く）
  ran:"B01019",     // Lv2 AP1000 LP1、カットイン AP+2000
  conan3:"B02007",  // Lv3 AP2000 LP1、カットイン
  ayumi:"D01009",   // Lv4 AP4000 LP1、カットイン
  partner:"B01001", // パートナー 江戸川コナン
  case:"B01024",    // 事件 先攻7 後攻6
};
// 盤面を作る。spec: {p0:{field:[番号],hand,ev,file,deck,rm}, p1:{...}, turn}
function board(w,spec={}){
  const deck={partner:K.partner,caseN:K.case,main:[]};
  w.ev("UID=1");
  const P=[0,1].map(i=>{const p=w.mkPlayer(i,i?"B":"A",deck,true);const s=spec["p"+i]||{};
    for(const z of ["field","hand","ev","file","rm"])p[z]=(s[z]||[]).map(n=>w.inst(n));
    p.deck=(s.deck||[K.ran,K.ran,K.ran,K.ran,K.ran]).map(n=>w.inst(n));
    if(s.level)p.level=s.level;if(s.solved)p.solved=true;return p});
  const G={cfg:{names:["A","B"],cpu:true,cpu0:true},P,turn:spec.turn||0,turnNo:3,first:0,over:false,ui:{mode:null},queue:[],undo:[],busy:0,phase:"main",
    rec:{log:[],acts:[]}};
  w.__setG(G);return G}
const nm=(w,x)=>w.C(x).nm;

module.exports=[
  ["推理: LP1 のキャラで証拠が1つ増え、スリープする",async w=>{
    const G=board(w,{p0:{field:[K.conan]}});const [a]=G.P[0].field;
    await w.reason(G.P[0],a);
    assert.strictEqual(G.P[0].ev.length,1);assert.strictEqual(a.st,"s")}],
  ["推理: スリープ中のキャラは推理できない",async w=>{
    const G=board(w,{p0:{field:[K.conan]}});const [a]=G.P[0].field;a.st="s";
    await w.reason(G.P[0],a);
    assert.strictEqual(G.P[0].ev.length,0)}],
  ["登場したターンのキャラは推理・アクションできない（突撃などなし）",async w=>{
    const G=board(w,{p0:{field:[K.conan]}});const [a]=G.P[0].field;a.fresh=true;
    assert.strictEqual(w.canAct(a,G.P[0],"reason"),false);assert.strictEqual(w.canAct(a,G.P[0],"case"),false)}],
  ["事件へのアクション: 相手の証拠を1つリムーブし、自分の証拠が1つ増える",async w=>{
    const G=board(w,{p0:{field:[K.ayumi]},p1:{ev:[K.ran,K.ran]}});const [a]=G.P[0].field;
    await w.declareAction(G.P[0],a,"case");
    assert.strictEqual(G.P[1].ev.length,1);assert.strictEqual(G.P[1].rm.length,1);assert.strictEqual(G.P[0].ev.length,1);assert.strictEqual(a.st,"s")}],
  ["事件へのアクション: 相手の証拠が0ならできない",async w=>{
    const G=board(w,{p0:{field:[K.ayumi]}});const [a]=G.P[0].field;
    await w.declareAction(G.P[0],a,"case");
    assert.strictEqual(a.st,"a");assert.strictEqual(G.P[0].ev.length,0)}],
  ["ヒラメキ: リムーブされた証拠のヒラメキ（1枚引く）で手札が1枚増える",async w=>{
    const G=board(w,{p0:{field:[K.ayumi]},p1:{ev:[K.conan]}});const [a]=G.P[0].field;
    await w.declareAction(G.P[0],a,"case");
    assert.strictEqual(G.P[1].hand.length,1);assert.strictEqual(G.P[1].deck.length,4)}],
  ["キャラへのアクション: AP が高ければ、スリープの相手をリムーブ",async w=>{
    const G=board(w,{p0:{field:[K.conan]},p1:{field:[K.ran]}});const [a]=G.P[0].field,[d]=G.P[1].field;d.st="s";
    await w.declareAction(G.P[0],a,d);
    assert.ok(G.P[1].rm.includes(d),`${nm(w,d)} がリムーブされていない`);assert.strictEqual(G.P[1].field.length,0)}],
  ["キャラへのアクション: アクティブの相手は対象にできない",async w=>{
    const G=board(w,{p0:{field:[K.conan]},p1:{field:[K.ran]}});const [a]=G.P[0].field,[d]=G.P[1].field;
    await w.declareAction(G.P[0],a,d);
    assert.strictEqual(a.st,"a");assert.ok(G.P[1].field.includes(d))}],
  ["コンタクト: AP が同じならアクションした側が勝つ",async w=>{
    const G=board(w,{p0:{field:[K.ayumi]},p1:{field:[K.ayumi]}});const [a]=G.P[0].field,[d]=G.P[1].field;d.st="s";
    await w.declareAction(G.P[0],a,d);
    assert.ok(G.P[1].rm.includes(d))}],
  ["コンタクト: AP が低ければ何も起きない",async w=>{
    const G=board(w,{p0:{field:[K.ran]},p1:{field:[K.ayumi]}});const [a]=G.P[0].field,[d]=G.P[1].field;d.st="s";
    await w.declareAction(G.P[0],a,d);
    assert.ok(G.P[1].field.includes(d));assert.ok(G.P[0].field.includes(a));assert.strictEqual(a.st,"s")}],
  ["カットイン: 守る側が手札からカットインして AP+2000 で防ぐ",async w=>{
    const G=board(w,{p0:{field:[K.conan3]},p1:{field:[K.ran],hand:[K.ran]}});const [a]=G.P[0].field,[d]=G.P[1].field,[c]=G.P[1].hand;d.st="s";
    await w.declareAction(G.P[0],a,d);
    assert.ok(G.P[1].field.includes(d),"防げていない");assert.ok(G.P[1].rm.includes(c),"カットインのカードがリムーブされていない");
    assert.strictEqual(d.apC,0,"コンタクトのAP修正が残っている")}],
  ["リフレッシュ: デッキが0枚になったらリムーブエリアを戻し、相手が証拠を1つ得る",async w=>{
    const G=board(w,{p0:{deck:[K.ran],rm:[K.conan,K.ayumi]},p1:{deck:[K.ran,K.ran]}});
    w.draw(G.P[0],1);
    assert.strictEqual(G.P[0].deck.length,2);assert.strictEqual(G.P[0].rm.length,0);assert.strictEqual(G.P[0].refreshed,true);
    assert.strictEqual(G.P[1].ev.length,1)}],
  ["リフレッシュ: リムーブエリアも0枚なら負け",async w=>{
    const G=board(w,{p0:{deck:[K.ran]}});
    w.draw(G.P[0],1);
    assert.strictEqual(G.over,true);assert.strictEqual(G.rec.winner,1)}],
  ["事件解決: 解決編で証拠が事件レベル以上なら勝ち",async w=>{
    const G=board(w,{p0:{ev:Array(6).fill(K.ran),solved:true,level:6}});
    w.solve(G.P[0]);
    assert.strictEqual(G.over,true);assert.strictEqual(G.rec.winner,0)}],
  ["事件解決: 証拠が足りなければ続く",async w=>{
    const G=board(w,{p0:{ev:Array(5).fill(K.ran),solved:true,level:6}});
    w.solve(G.P[0]);
    assert.strictEqual(G.over,false);assert.strictEqual(G.P[0].partner.st,"s")}],
  ["アシスト: FILE が7枚になったら解決編",async w=>{
    const G=board(w,{p0:{file:Array(6).fill(K.ran)}});
    await w.assist(G.P[0]);
    assert.strictEqual(G.P[0].file.length,7);assert.strictEqual(G.P[0].solved,true);assert.strictEqual(G.P[0].pLoc,"file")}],
  ["手札の使用: レベルが FILE の枚数より高いと使えない",async w=>{
    const G=board(w,{p0:{hand:[K.conan],file:[K.ran,K.ran]}});
    assert.match(w.playableReason(G.P[0],G.P[0].hand[0],false),/レベル5 > FILE2枚/)}],
  ["手札の使用: 事件の色と合わないと使えない",async w=>{
    const G=board(w,{p0:{hand:["B01029"],file:Array(6).fill(K.ran)}}); // 服部平次（緑）
    assert.match(w.playableReason(G.P[0],G.P[0].hand[0],false),/事件の色/)}],
  ["手札の使用: キャラが現場に出て、そのターンは手札を使えなくなる",async w=>{
    const G=board(w,{p0:{hand:[K.conan,K.ran],file:Array(5).fill(K.ran)}});const [x]=G.P[0].hand;
    assert.strictEqual(await w.useFromHand(G.P[0],x),true);
    assert.ok(G.P[0].field.includes(x));assert.strictEqual(x.fresh,true);
    assert.match(w.playableReason(G.P[0],G.P[0].hand[0],false),/もう手札を使用した/)}],
];
