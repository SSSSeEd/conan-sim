// 対戦後の振り返り（js/review.js・tools/review.js）: 定型の判定が盤面から出ること、探索の点数の差が出ること、ログ全体が動くこと
const assert=require("assert");const {selfLog}=require("../tools/review");
const snapOf=(w,r,i)=>{const e=r.ev.filter(x=>x.k==="snap")[i];return e};
// 盤面を復元して f(G) を実行（js/review.js と同じ復元）
const withG=(w,e,f)=>{const real=w.__G();try{w.__setG({...w.unpackRefs(structuredClone(e.g)),over:false,ui:{mode:null},undo:[],busy:0,rec:null,dlog:null});return f(w.__G())}finally{w.__setG(real)}};
const none={used:[],assist:0,hint:0,reason:0,actChara:0,actCase:0,ability:0,solve:0,actors:[],caseBy:[]};
module.exports=[
  ["行為の読み取り: 登場・アシスト・推理・アクション先を数える",async w=>{
    const N="A";const L=["A は 中森青子（Lv2）を登場させた","A はアシスト","A の 中森青子 が推理（LP2）","A の 鈴木園子（AP3000）がアクション → 事件","A の 毛利蘭（AP2000）がアクション → 怪盗キッド","A はターン終了"];
    const f=w.rvFeats(L,N);assert.strictEqual(JSON.stringify(f.used),JSON.stringify(["中森青子"]));assert.strictEqual(f.assist,1);assert.strictEqual(f.reason,1);assert.strictEqual(f.actCase,1);assert.strictEqual(f.actChara,1);assert.strictEqual([...f.actors].sort().join(),["中森青子","毛利蘭","鈴木園子"].sort().join())}],
  ["相手があと2つで勝てるのに推理も事件アクションもしない手番を指摘する",async w=>{
    const w2=require("../tools/headless").load({seed:7,init:{SIM_SAVE:1}});const r=await selfLog(w2,0);
    let hit=0;
    for(const e of r.ev.filter(x=>x.k==="snap")){
      const rules=withG(w2,e,G=>{const p=G.P[0],o=G.P[1];o.level=7;o.ev=Array(5).fill(0).map((_,i)=>({n:"X"+i}));
        // 証拠が5/7（あと2つ）で、何もしなかった手番
        return w2.rvRules(p,o,none,e.t,null)});
      if(rules.some(x=>x.kind==="noEvidence"))hit++}
    assert.ok(hit>0,"noEvidence が1度も出ない")}],
  ["ガード役が足りず、相手の次手番で事件レベルに届く形を指摘し、足りているときは出さない",async w=>{
    const w2=require("../tools/headless").load({seed:7,init:{SIM_SAVE:1}});const r=await selfLog(w2,0);
    const e=r.ev.filter(x=>x.k==="snap")[3];
    const rules=g=>withG(w2,e,G=>{const p=G.P[0],o=G.P[1];o.level=7;o.solved=true;o.ev=Array(6).fill(0).map((_,i)=>({n:"X"+i}));
      return w2.rvRules(p,o,none,e.t,g)});
    assert.ok(rules(0).some(x=>x.kind==="guard"),"ガード0体で指摘が出ない");
    assert.ok(!rules(20).some(x=>x.kind==="guard"),"ガード十分なのに指摘が出る")}],
  ["探索の点数の差: 何も出さない手が最善と大きく離れるとき、差が出る",async w=>{
    const w2=require("../tools/headless").load({seed:7,init:{SIM_SAVE:1}});const r=await selfLog(w2,0);
    let found=0;
    for(const e of r.ev.filter(x=>x.k==="snap"&&x.t>2)){
      const s=await w2.rvSearch(r,e,none);if(s&&s.mine&&s.best&&s.best.v-s.mine.v>=150)found++}
    assert.ok(found>0,"点数の差が出る手番がない")}],
  ["reviewGame: CPU同士のログでも最後まで動き、勝負所の文が定型で出る（警告なし）",async w=>{
    const w2=require("../tools/headless").load({seed:9,init:{SIM_SAVE:1}});const r=await selfLog(w2,1);
    const res=await w2.reviewGame(r);assert.ok(res.lines.length>=3&&/^.+ vs .+／\d+ターン／/.test(res.lines[0]));
    assert.ok(res.lines[res.lines.length-1].startsWith("※"));assert.ok(!w2.warns.length,w2.warns.slice(0,2).join("/"));
    const none2=await w2.reviewGame({...r,cpu:[true,true]});assert.ok(/人の席がない/.test(none2.lines[0]))}],
];
