// 対戦記録からのフィードバック（tools/feedback.js）の単体テスト
const assert=require("assert");
const F=require("../tools/feedback.js");
const D="パートナー B01042\n事件 B05024\nB06066 x3\nB03046 x3";
const rec=(win,usedB)=>({decks:["テスト"],cpu:[false,true],deckLists:[D,D],winner:win?0:1,
  acts:[{who:0,kind:"use",card:{n:"B06066",nm:"A"}},...(usedB?[{who:0,kind:"use",card:{n:"B03046",nm:"B"}}]:[])],
  miss:[{t:2,stuck:["B"],hint:true},{t:4,stuck:["B"]}]});
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
];
