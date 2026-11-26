// 動作確認: node tools/test.js [試合数=60]
// 1) 環境デッキ・プリセットがすべて読めること 2) CPU同士で対戦して、エラー・警告なしで決着すること 3) ルールとカード効果の単体テスト（tests/rules.js, tests/effects.js）
const H=require("./headless");const assert=require("assert");
const N=+(process.argv[2]||60);let fail=0;
const ok=(name,f)=>Promise.resolve().then(f).then(()=>console.log("ok  ",name),e=>{fail++;console.log("FAIL",name,"\n    ",e&&e.message||e)});
process.on("unhandledRejection",e=>{console.log("FAIL 対戦中のエラー\n    ",e&&e.stack||e);process.exit(1)});
(async()=>{
  const w=H.load({seed:1});
  const decks=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];
  await ok("index.html が読むファイルがすべてオフライン用（sw.js の CORE）に入っている",()=>{
    const fs=require("fs"),path=require("path");const html=fs.readFileSync(path.join(H.ROOT,"index.html"),"utf8");
    const core=require("vm").runInNewContext(fs.readFileSync(path.join(H.ROOT,"sw.js"),"utf8")+";CORE",{self:{addEventListener(){}}});
    const used=[...html.matchAll(/(?:src|href)="([^":]+)"/g)].map(m=>m[1]);
    for(const f of used)assert.ok(core.includes(f),`${f} が CORE にない`)});
  await ok(`デッキ ${decks.length}個が読める`,()=>{for(const d of decks){const r=w.parseDeckText(d.text);
    assert.ok(!r.errors.length,`${d.name}: ${r.errors.join(" / ")}`);assert.ok(r.partner&&r.caseN,`${d.name}: パートナーか事件がない`)}});
  await ok("相手（CPU）の最初のデッキが、CPUの使える自動化100%のデッキ",()=>{
    assert.ok(w.cpuReady(w.parseDeckText(w.ev("PRESETS")[1].text)),w.ev("PRESETS")[1].name)});
  await ok(`CPU同士 ${N}戦（探索あり・なし）`,async()=>{let draws=0;
    for(let i=0;i<N;i++){const a=decks[i%decks.length],b=decks[(i*7+3)%decks.length];
      const r=await H.play(w,{decks:[w.parseDeckText(a.text),w.parseDeckText(b.text)],search:[i%2===0,i%3===0]}).catch(e=>{throw new Error(`${i}戦目 ${a.name} vs ${b.name}: ${e.stack}`)});
      if(!r.over)draws++}
    assert.ok(!w.warns.length,"警告が出た: "+w.warns.slice(0,3).join(" / "));
    assert.ok(draws<=N*0.05,`決着しない試合が多い（${draws}/${N}）`)});
  for(const [name,f] of require("../tests/rules.js"))await ok("ルール: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/effects.js"))await ok("効果: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/deckfill.js"))await ok("補完: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/mechanics.js"))await ok("仕組み: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/dlog.js"))await ok("詳しいログ: "+name,()=>f());
  for(const [name,f] of require("../tests/cpu.js"))await ok("CPU: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/deckcpu.js"))await ok("デッキ別CPU: "+name,()=>f(H.load({seed:1})));
  for(const [name,f] of require("../tests/feedback.js"))await ok("フィードバック: "+name.replace(/^フィードバック: /,""),()=>f(H.load({seed:1})));
  if(fail){console.log(`${fail}件失敗`);process.exit(1)}
})();
