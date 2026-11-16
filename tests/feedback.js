// 対戦記録からのフィードバック（tools/feedback.js）の単体テスト
const assert=require("assert");
const F=require("../tools/feedback.js");
const D="パートナー B01042\n事件 B05024\nB06066 x3\nB03046 x3";
const rec=(win,usedB)=>({decks:["テスト"],cpu:[false,true],deckLists:[D,D],winner:win?0:1,
  acts:[{who:0,kind:"use",card:{n:"B06066",nm:"A"}},...(usedB?[{who:0,kind:"use",card:{n:"B03046",nm:"B"}}]:[])],
  miss:[{t:2,stuck:["B"],hint:true,hand:["A","B"],fld:["A"],ofld:["B"],doubt:true},{t:4,stuck:["B"]}]});
module.exports=[
  ["フィードバック: 一度も使わなかったカードと、手札で腐るカードを提案する",async w=>{
    const recs=[1,1,1,0].map(x=>rec(x));
    const [d]=F.analyze(recs,{parse:t=>w.parseDeckText(t),nameOf:n=>n==="B06066"?"A":"B"});
    assert.strictEqual(d.games,4);assert.strictEqual(d.wins,3);
    assert.ok(d.tips.some(t=>t.kind==="unused"&&t.text.includes("B×3")),"未使用");
    assert.ok(d.tips.some(t=>t.kind==="stuck"&&t.text.includes("B（")),"腐り");
    assert.ok(F.toMarkdown([d]).includes("| A | 3 | 100%"))}],
  ["フィードバック: 試合数が少ないうちは提案を出さない",async w=>{
    const [d]=F.analyze([rec(1,0)],{parse:t=>w.parseDeckText(t),nameOf:n=>n});
    assert.ok(!d.tips.some(t=>t.kind==="unused"));assert.ok(d.tips.some(t=>t.kind==="none"||t.kind==="stuck"))}],
  ["フィードバック: アプリ側（js/feedback.js）の window.Feedback が tools と同じ結果を返す",async w=>{
    assert.ok(w.Feedback&&typeof w.Feedback.analyze==="function","Feedback が読み込まれていない");
    const recs=[1,1,1,0].map(x=>rec(x));
    const a=w.Feedback.analyze(recs,{parse:t=>w.parseDeckText(t),nameOf:n=>n});
    assert.strictEqual(a[0].games,4);assert.strictEqual(a[0].tips.length,F.analyze(recs,{parse:t=>w.parseDeckText(t),nameOf:n=>n})[0].tips.length)}],
  ["圧縮コピー: pack→unpack で分析に使う中身（デッキ・行動・できたのにしなかったこと・結果・ログ）が戻り、元より小さい",async w=>{
    const deps={parse:t=>w.parseDeckText(t),nameOf:n=>n};
    const log=[[1,"ターン開始"],[1,"　B06066 を登場"],[2,"　　B03046 をスリープ"]];
    const recs=[1,1,1,0].map(x=>({...rec(x),log,names:["あ","い"],first:0,turns:5,why:"x",start:"2026-11-15T00:00:00Z"}));
    const txt=F.pack(recs,deps);assert.ok(txt.startsWith("CS1"));
    const back=F.unpack(txt,{nameOf:n=>n});assert.strictEqual(back.length,4);
    assert.deepStrictEqual(back[0].log,log);assert.strictEqual(back[0].acts[0].card.n,"B06066");assert.deepStrictEqual(back[0].miss[0].stuck,["B"]);
    assert.deepStrictEqual(back[0].miss[0].hand,["A","B"]);assert.deepStrictEqual(back[0].miss[0].fld,["A"]);assert.strictEqual(back[0].miss[0].doubt,true);assert.deepStrictEqual(back[0].miss[0].ofld,["B"]);
    assert.strictEqual(back[0].deckLists[0].split("\n").length,4);
    const t1=F.analyze(recs,deps),t2=F.analyze(back,deps);assert.deepStrictEqual(t2.map(d=>d.tips.map(t=>t.kind)),t1.map(d=>d.tips.map(t=>t.kind)));
    const noLog=F.pack(recs,{...deps,log:0});assert.ok(noLog.length<txt.length&&F.unpack(noLog,{})[0].log.length===0);
    assert.ok(txt.length<JSON.stringify(recs).length,"圧縮のほうが短い")}],
  ["フィードバック: 相手デッキ別の戦績と、苦手・得意な相手の提案を出す",async w=>{
    const mk=(opp,win,gap)=>({...rec(win),decks:["テスト",opp],miss:[{t:2,s:{ev:0,oEv:0}},{t:4,s:{ev:0,oEv:0}},{t:6,s:{ev:0,oEv:gap}}],turns:win?10:12});
    const recs=[mk("速攻",0,3),mk("速攻",0,2),mk("速攻",1,2),mk("遅い",1,0),mk("遅い",1,0)];
    const [d]=F.analyze(recs,{parse:t=>w.parseDeckText(t),nameOf:n=>n});
    const o=d.opps.find(x=>x.label==="速攻");
    assert.strictEqual(o.games,3);assert.strictEqual(o.wins,1);assert.strictEqual(o.gap,2.3);assert.strictEqual(o.avgWin,10);assert.strictEqual(o.avgLose,12);
    assert.ok(d.tips.some(t=>t.kind==="oppWeak"&&t.text.includes("速攻")),"苦手");
    assert.ok(d.tips.some(t=>t.kind==="oppStrong"&&t.text.includes("遅い")),"得意");
    assert.ok(F.toMarkdown([d]).includes("| 速攻 | 3 |"))}],
];
