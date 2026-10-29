// ブラウザなしでゲームを動かす（Node だけ）。画面の部品はすべて「何もしないダミー」に置き換える
// const H=require("./headless");const w=H.load({seed:1});await H.play(w,{decks:[..],...}) → {winner:0/1/null,turns,over}
// const/let のグローバル（PRESETS, G など）は w.ev("PRESETS") で読む
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const FILES=["cards.js","effects.js","decks.js","data.js","state.js","engine.js","cpu.js","search.js","ui.js","setup.js"];
// どんなプロパティを読んでも書いても壊れない要素
function stubEl(){const kids=[];const el=new Proxy(function(){},{
  get(t,k){if(k in t)return t[k];
    if(k==="children"||k==="childNodes")return kids;
    if(k==="classList")return {add(){},remove(){},toggle(){},contains(){return false}};
    if(k==="style"||k==="dataset")return t[k]={};
    if(k==="appendChild")return c=>{kids.push(c);return c};
    if(k==="lastChild")return {remove(){kids.pop()}};
    if(k==="querySelector"||k==="closest")return ()=>stubEl();
    if(k==="querySelectorAll"||k==="getElementsByClassName")return ()=>[];
    if(k==="getBoundingClientRect")return ()=>({x:0,y:0,width:0,height:0,top:0,left:0,right:0,bottom:0});
    if(typeof k==="symbol")return undefined;
    if(k==="hidden"||k==="checked"||k==="disabled")return false;
    if(k==="value"||k==="innerHTML"||k==="textContent"||k==="id"||k==="className")return "";
    return ()=>stubEl()},
  set(t,k,v){t[k]=v;return true},apply(){return stubEl()}});return el}
function load({seed=1,files=FILES,init={}}={}){
  let x=seed>>>0;const rnd=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};
  const els={};const store={};const warns=[];
  const document={getElementById:id=>els[id]||(els[id]=stubEl()),createElement:()=>stubEl(),body:stubEl(),documentElement:stubEl(),
    querySelector:()=>stubEl(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
  const w={document,console:{...console,log(){},warn:(...a)=>warns.push(a.map(String).join(" "))},setTimeout:(f,ms,...a)=>setImmediate(f,...a),clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    location:{protocol:"file:",hostname:"",href:"file:///"},navigator:{userAgent:"node",clipboard:{writeText:async()=>{}}},
    addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
    requestAnimationFrame:f=>setImmediate(f),Image:function(){return stubEl()},structuredClone,innerWidth:1280,innerHeight:800,performance,
    SIM_TURBO:1,SIM_FAST:1,...init};
  w.window=w;w.self=w;w.globalThis=w;
  const ctx=vm.createContext(w);
  vm.runInContext("Math.random=__rnd",Object.assign(ctx,{__rnd:rnd}));
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),ctx,{filename:f});
  // let/const で宣言された G などはグローバルのプロパティにならないので、取り出し口を作る
  vm.runInContext("globalThis.__G=()=>G",ctx);
  ctx.rnd=rnd; // ゲーム内と同じ乱数（台本側で使う）
  ctx.warns=warns; // console.warn の中身（探索の失敗など）
  ctx.ev=code=>vm.runInContext(code,ctx);
  ctx.render=()=>{}; // 画面の描き直しは不要（いちばん重い処理）
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
