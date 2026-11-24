// 人間との一致度: 詳しい対戦ログ（JSON保存）に入っている「人の手番の始めの盤面」（snap）から、CPUに同じ手番を指させ、人の実際の手と1手番ずつ照合する
// node tools/agree.js ログ.json [--runs 3] [--off a,b] [--on x,y] [--nosearch] [--show]
//   ログ.json: アプリの記録タブ「詳しい対戦ログ」→ JSON保存 のファイル（1戦でも、複数戦の配列でも可）
//   --runs: CPUは探索に乱数を使うので、同じ盤面を何回か指させて平均する（既定3）
//   --off / --on: 既定オンのスイッチを切る / 既定オフの実験をオンにする（tools/bench.js の -x / +x と同じ）
//   --show: 一致しなかった手番を、人とCPUの手を並べて出す
// 照合する項目（その手番の自分の行動だけ。相手のガードなどは数えない）:
//   使ったカード（名前の組）、アシストの回数、ネクストヒントの回数、推理の回数、キャラへのアクションの回数、事件へのアクションの回数、宣言能力の回数、事件解決
"use strict";
const H=require("./headless"),fs=require("fs");
const args=process.argv.slice(2);const opt={runs:3,off:[],on:[],search:true,show:false,file:null};
for(let i=0;i<args.length;i++){const a=args[i];
  if(a==="--runs")opt.runs=+args[++i];else if(a==="--off")opt.off=args[++i].split(",");else if(a==="--on")opt.on=args[++i].split(",");
  else if(a==="--nosearch")opt.search=false;else if(a==="--show")opt.show=true;else opt.file=a}

// ログの行から、名前 N のプレイヤーの行動を数える
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function feats(lines,N){
  const n=esc(N),f={used:[],assist:0,hint:0,reason:0,actChara:0,actCase:0,ability:0,solve:0};
  for(const m of lines){let r;
    if(r=new RegExp(`^${n} は (.+?)（Lv\\d+）を登場させた`).exec(m))f.used.push(r[1]);
    else if(r=new RegExp(`^${n} はイベント (.+?) を使用した`).exec(m))f.used.push(r[1]);
    else if(new RegExp(`^${n} はアシスト`).test(m))f.assist++;
    else if(new RegExp(`^${n} はネクストヒント`).test(m))f.hint++;
    else if(new RegExp(`^${n} の .+ が推理（LP`).test(m))f.reason++;
    else if(r=new RegExp(`^${n} の .+（AP\\d+）がアクション → (.+)$`).exec(m)){if(r[1]==="事件")f.actCase++;else f.actChara++}
    else if(new RegExp(`^${n} の .+ の能力:「`).test(m))f.ability++;
    else if(/事件解決（証拠|証拠隠滅（/.test(m))f.solve=1}
  f.used.sort();return f}
const KEYS=[["used","使ったカード"],["assist","アシスト"],["hint","ネクストヒント"],["reason","推理"],["actChara","キャラへのアクション"],["actCase","事件アクション"],["ability","宣言能力"],["solve","事件解決"]];
const same=(a,b,k)=>k==="used"?a.used.join("|")===b.used.join("|"):a[k]===b[k];
const brief=f=>[f.used.length?"使用["+f.used.join(",")+"]":"",f.assist?"アシスト"+f.assist:"",f.hint?"ヒント"+f.hint:"",f.reason?"推理"+f.reason:"",f.actChara?"キャラアクション"+f.actChara:"",f.actCase?"事件アクション"+f.actCase:"",f.ability?"能力"+f.ability:"",f.solve?"事件解決":""].filter(Boolean).join(" ")||"なにもしない";

// 人の手番の行: snap の時点（li）から、その手番の「ターン終了」または次の手番の見出しまで
function humanLines(r,e){
  const N=r.names[e.who],out=[];for(let i=e.li;i<r.log.length;i++){const [t,m]=r.log[i];if(t!==e.t||/^— \d+ターン目/.test(m))break;out.push(m);if(m===`${N} はターン終了`)break}
  return out}
// 同じ盤面でCPUに1手番指させ、その間のログの行を返す
async function cpuLines(w,e){
  const lines=[];
  w.__setG({...w.unpackRefs(structuredClone(e.g)),over:false,ui:{mode:null},undo:[],busy:0,rec:null,dlog:null});
  const G=w.__G();for(const q of G.P){q.cpu=true;q.pa=q.pa||[]}G.cfg.search=[opt.search,opt.search];G.cfg.aiOff=null;
  const log0=w.log,end0=w.endTurn;
  w.log=(m,c)=>{if(!w.__G().sim)lines.push(m);return log0(m,c)};
  w.endTurn=function(){if(w.__G().sim)return end0.apply(this,arguments)}; // 本番の手番の終わりで止める（探索の試しの手番は普段どおり進める）
  try{await w.cpuTurn(G.P[e.who])}finally{w.log=log0;w.endTurn=end0}
  return lines}

(async()=>{
  if(!opt.file){console.error("使い方: node tools/agree.js ログ.json [--runs 3] [--off a,b] [--on x] [--nosearch] [--show]");process.exit(1)}
  let games=JSON.parse(fs.readFileSync(opt.file,"utf8"));if(!Array.isArray(games))games=[games];
  const w=H.load({seed:1});
  w.AI_OFF=[...w.ev("AI_OFF0").filter(x=>!opt.on.includes(x)),...opt.off];
  const tot=Object.fromEntries(KEYS.map(([k])=>[k,0]));let all=0,n=0;const miss=[];
  for(const r of games){
    for(const e of (r.ev||[]).filter(x=>x.k==="snap")){
      const N=r.names[e.who],hf=feats(humanLines(r,e),N);
      for(let k=0;k<opt.runs;k++){w.reseed(1000+n*31+k);
        let cf;try{cf=feats(await cpuLines(w,e),N)}catch(err){console.warn(`${r.start} ${e.t}ターン目: CPUの再現でエラー ${String(err).slice(0,120)}`);continue}
        n++;let ok=true;for(const [key] of KEYS){if(same(hf,cf,key))tot[key]++;else ok=false}
        if(ok)all++;else if(k===0)miss.push({start:r.start,t:e.t,human:brief(hf),cpu:brief(cf)})}}}
  if(!n){console.log("照合できる手番がありません（人の手番の盤面 snap が入ったログが要ります）");return}
  const pct=x=>(x/n*100).toFixed(1)+"%";
  console.log(JSON.stringify({file:opt.file,runs:opt.runs,off:opt.off,on:opt.on,search:opt.search,turns:n/opt.runs,compared:n,
    全項目一致:pct(all),...Object.fromEntries(KEYS.map(([k,l])=>[l,pct(tot[k])]))},null,1));
  if(opt.show)for(const m of miss)console.log(`${m.t}ターン目\n  人 : ${m.human}\n  CPU: ${m.cpu}`)})();
