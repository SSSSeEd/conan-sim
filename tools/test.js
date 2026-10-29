// 動作確認: node tools/test.js [試合数=60]
// 1) 環境デッキ・プリセットがすべて読めること 2) CPU同士で対戦して、エラー・警告なしで決着すること
const H=require("./headless");const assert=require("assert");
const N=+(process.argv[2]||60);let fail=0;
const ok=(name,f)=>Promise.resolve().then(f).then(()=>console.log("ok  ",name),e=>{fail++;console.log("FAIL",name,"\n    ",e&&e.message||e)});
process.on("unhandledRejection",e=>{console.log("FAIL 対戦中のエラー\n    ",e&&e.stack||e);process.exit(1)});
(async()=>{
  const w=H.load({seed:1});
  const decks=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];
  await ok(`デッキ ${decks.length}個が読める`,()=>{for(const d of decks){const r=w.parseDeckText(d.text);
    assert.ok(!r.errors.length,`${d.name}: ${r.errors.join(" / ")}`);assert.ok(r.partner&&r.caseN,`${d.name}: パートナーか事件がない`)}});
  await ok(`CPU同士 ${N}戦（探索あり・なし）`,async()=>{let draws=0;
    for(let i=0;i<N;i++){const a=decks[i%decks.length],b=decks[(i*7+3)%decks.length];
      const r=await H.play(w,{decks:[w.parseDeckText(a.text),w.parseDeckText(b.text)],search:[i%2===0,i%3===0]}).catch(e=>{throw new Error(`${i}戦目 ${a.name} vs ${b.name}: ${e.stack}`)});
      if(!r.over)draws++}
    assert.ok(!w.warns.length,"警告が出た: "+w.warns.slice(0,3).join(" / "));
    assert.ok(draws<=N*0.05,`決着しない試合が多い（${draws}/${N}）`)});
  if(fail){console.log(`${fail}件失敗`);process.exit(1)}
})();
