// 調査: 各CPUの最初の手番に手札を使ったか・アシストしたか、FILEで強くなるイベントをアシスト前に使っていないか
// node tools/probe_assist.js 試合数 seed [search]
const H=require("./headless");
const [N,SEED]=[+process.argv[2],+process.argv[3]],S=process.argv[4]==="search";
(async()=>{const w=H.load({seed:SEED});const E=w.ev("PRESETS");
  const st={first:0,firstPlay:0,firstAssist:0,firstMissAssist:0,fev:0,fevCouldAssist:0};
  let cur=null;
  const bt=w.cpuTurn;w.cpuTurn=function(p,...a){const g=w.__G();if(!g.sim){cur={p,n:(p._tn=(p._tn||0)+1),play:0,asst:0,could:0};
      if(cur.n===1){st.first++;const can=x=>!w.playableReason(p,x,false);
        if(!p.hand.some(can)&&p.pLoc==="area"&&p.partner.st==="a"){p.file.push(p.partner);if(p.hand.some(can))cur.could=1;p.file.pop()}}}
    return bt.call(this,p,...a)};
  const uf=w.useFromHand;w.useFromHand=async function(p,x,...a){const g=w.__G();
    if(!g.sim&&cur&&cur.p===p&&g.turn===p.idx){if(cur.n===1&&!cur.play){cur.play=1;st.firstPlay++}
      if(/手札から自分のFILEエリアの枚数以下のレベル/.test(w.C(x).f||"")){st.fev++;if(p.pLoc==="area"&&p.partner.st==="a"&&!p.solved)st.fevCouldAssist++}}
    return uf.call(this,p,x,...a)};
  const as=w.assist;w.assist=async function(p,...a){const g=w.__G();if(!g.sim&&cur&&cur.p===p&&cur.n===1&&!cur.asst){cur.asst=1;st.firstAssist++}return as.call(this,p,...a)};
  const et=w.endTurn;w.endTurn=async function(...a){const g=w.__G();if(!g.sim&&cur&&cur.n===1&&cur.could&&!cur.play)st.firstMissAssist++;return et.apply(this,a)};
  for(let i=0;i<N;i++){const a=Math.floor(w.rnd()*E.length),b=Math.floor(w.rnd()*E.length);
    await H.play(w,{decks:[w.parseDeckText(E[a].text),w.parseDeckText(E[b].text)],search:[S,S]})}
  console.log(JSON.stringify(st))})();
