// 動作確認: node tools/test.js [試合数=60]
// 1) 環境デッキ・プリセットがすべて読めること 2) CPU同士で対戦して、エラー・警告なしで決着すること 3) ルールの単体テスト（tests/rules.js）
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
  await ok(`CPU同士 ${N}戦（探索あり・なし）`,async()=>{let draws=0;
    for(let i=0;i<N;i++){const a=decks[i%decks.length],b=decks[(i*7+3)%decks.length];
      const r=await H.play(w,{decks:[w.parseDeckText(a.text),w.parseDeckText(b.text)],search:[i%2===0,i%3===0]}).catch(e=>{throw new Error(`${i}戦目 ${a.name} vs ${b.name}: ${e.stack}`)});
      if(!r.over)draws++}
    assert.ok(!w.warns.length,"警告が出た: "+w.warns.slice(0,3).join(" / "));
    assert.ok(draws<=N*0.05,`決着しない試合が多い（${draws}/${N}）`)});
  await ok("中断した対戦を保存して、別の画面で続きから決着まで進められる",async()=>{
    const d=[w.parseDeckText(decks[0].text),w.parseDeckText(decks[1].text)];
    const a=H.load({seed:7,init:{SIM_SAVE:1}});
    await H.play(a,{decks:d},{maxTurns:5});
    const raw=a.localStorage.getItem("conan-sim-save");assert.ok(raw,"保存されていない");
    const s=JSON.parse(raw);assert.ok(s.meta.turnNo>=4,"ターンのはじめに保存されていない");
    const b=H.load({seed:8});b.localStorage.setItem("conan-sim-save",raw);b.resumeGame(b.loadSave());
    const g=b.__G(),cards=q=>[...q.deck,...q.hand,...q.field,...q.file,...q.ev,...q.rm,q.caseC,...(q.pLoc==="file"?[]:[q.partner])];
    for(const q of g.P)assert.strictEqual(new Set(cards(q)).size,cards(q).length,"同じカードが2か所にある");
    for(const i of g.queue)assert.ok(g.P.includes(i.p),"待ち行列のプレイヤーが盤面と別物になっている");
    for(let t=0;!g.over&&t<200000;t++)await new Promise(r=>setImmediate(r));
    assert.ok(g.over,"再開した対戦が決着しない")});
  for(const [name,f] of require("../tests/rules.js"))await ok("ルール: "+name,()=>f(H.load({seed:1})));
  if(fail){console.log(`${fail}件失敗`);process.exit(1)}
})();
