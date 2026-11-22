// 詳しい対戦ログ（js/dlog.js）: 1戦ずつ保存し、3戦を超えたら古い順に消える。テキスト化が通常ログと同じターン番号で読める
const assert=require("assert");const H=require("../tools/headless");
module.exports=[
  ["4戦すると直近3戦だけ残り、手札・ドロー・選択・ガード/カットイン・探索の記録が入る",async()=>{
    const w=H.load({seed:3,init:{SIM_SAVE:1}});const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
    const starts=[];
    for(let i=0;i<4;i++){const r=await H.play(w,{decks:[ds[0],ds[1]],search:[true,true]});assert.ok(r.over,"決着");starts.push(w.__G().rec.start);await new Promise(r=>setTimeout(r,2))}
    const all=w.dlLoad();assert.strictEqual(all.length,3);
    assert.ok(!all.some(r=>r.start===starts[0])||new Set(starts).size<4,"最初の1戦が消えている");
    const r=all[2],kinds=new Set(r.ev.map(e=>e.k));
    for(const k of ["turnStart","turnEnd","draw","pick"])assert.ok(kinds.has(k),k+" の記録がない");
    const t=w.dlText(r);
    assert.ok(/— 1ターン目: /.test(t),"通常ログのターン番号");assert.ok(t.includes("【手番開始・盤面】")&&t.includes("【ドロー】")&&t.includes("【選択(CPU)】"));
    assert.ok(r.log.length>10&&r.winner!=null);
    // 手番開始の記録は通常ログの「— Nターン目 —」より後ろに入る
    assert.ok(t.indexOf("— 1ターン目")<t.indexOf("【手番開始・盤面】"));
    assert.ok(!w.warns.length,w.warns.slice(0,2).join("/"))}],
  ["探索の試しの手番や大量対戦（SIM_FAST）では記録しない",async()=>{
    const w=H.load({seed:4});const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
    await H.play(w,{decks:[ds[0],ds[1]],search:[true,true]});
    assert.strictEqual(w.dlLoad().length,0);assert.strictEqual(w.__G().dlog.length,0)}],
];
