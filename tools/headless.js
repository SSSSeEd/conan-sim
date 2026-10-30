// ブラウザなしでゲームを動かす（Node だけ）。読み込むのはゲーム処理のファイルだけで、画面の関数は何もしない版に置き換える
// const H=require("./headless");const w=H.load({seed:1});await H.play(w,{decks:[..],...}) → {winner:0/1/null,turns,over}
// const/let のグローバル（PRESETS, G など）は w.ev("PRESETS") で読む
// ゲーム処理のファイルが画面（document）に触ると、ここで document が無いのでエラーになる（分け方が崩れていないかの確認を兼ねる）
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
// 読み込むファイルは index.html の並びのまま（画面側の4つだけ除く）。ファイルを足したら index.html と sw.js に書けばよい
const UI_FILES=["js/ui.js","js/dialogs.js","js/show.js","js/setup.js"];
const FILES=[...fs.readFileSync(path.join(ROOT,"index.html"),"utf8").matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>!UI_FILES.includes(f));
// 画面側（ui.js / dialogs.js / show.js）の関数のうち、ゲーム処理から呼ばれるもの
const UI_STUB=`
function render(){}function uiLog(){}function logCount(){return 0}function uiNewGame(){}function uiUndo(){}function showEndMenu(){}
function toast(){}function cutin(){return Promise.resolve()}function revealCard(){return Promise.resolve()}
async function showFx(){}async function showCpu(){}function clearAct(){if(G&&G.ui)G.ui.act=null}function pace(){return 0}
// 人の操作を待つ画面。CPU同士なら呼ばれないはず
function needHuman(n){return ()=>{throw new Error(n+": 人の操作が必要な画面が呼ばれた")}}
const ask=needHuman("ask"),chooseCards=needHuman("chooseCards"),orderCards=needHuman("orderCards");`;
function load({seed=1,files=FILES,init={}}={}){
  let x=seed>>>0;const rnd=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};
  const store={};const warns=[];
  const w={console:{...console,log(){},warn:(...a)=>warns.push(a.map(String).join(" "))},setTimeout:(f,ms,...a)=>setImmediate(f,...a),clearTimeout(){},
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    location:{protocol:"file:",hostname:"",href:"file:///"},structuredClone,
    SIM_TURBO:1,SIM_FAST:1,...init};
  w.window=w;w.self=w;w.globalThis=w;
  const ctx=vm.createContext(w);
  vm.runInContext("Math.random=__rnd",Object.assign(ctx,{__rnd:rnd}));
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),ctx,{filename:f});
  vm.runInContext(UI_STUB,ctx,{filename:"headless-ui"});
  // let/const で宣言された G などはグローバルのプロパティにならないので、取り出し口を作る
  vm.runInContext("globalThis.__G=()=>G;globalThis.__setG=v=>{G=v}",ctx);
  ctx.rnd=rnd; // ゲーム内と同じ乱数（台本側で使う）
  ctx.warns=warns; // console.warn の中身（探索の失敗など）
  ctx.ev=code=>vm.runInContext(code,ctx);
  return ctx}
// 1試合。cfg は startGame と同じ（cpu/cpu0 は自動で true）。勝者の席か、決着しなければ null
async function play(w,cfg,{maxTurns=40}={}){
  let winner=null;const w0=w.win;w.win=(pl,why)=>{const g=w.__G();if(!g.sim&&!g.over)winner=pl.idx;return w0(pl,why)};
  let err=null;
  try{const st=w.startGame({names:["A","B"],cpu:true,cpu0:true,first:"rand",...cfg});if(st&&st.catch)st.catch(e=>{err=e});const g=w.__G();
    for(let t=0;!err&&!g.over&&g.turnNo<maxTurns&&t<200000;t++)await new Promise(r=>setImmediate(r));
    if(err)throw err;
    return {winner,turns:g.turnNo,over:g.over}}
  finally{w.win=w0}}
module.exports={load,play,ROOT};
