"use strict";
// ================= 対戦後の振り返り（定型文レビュー） =================
// 「詳しい対戦ログ」（js/dlog.js。人の手番の始めの盤面 snap を持つ）から、自分（人）の手番ごとに
//  ① 盤面から機械で判定できる型の指摘（証拠が危ないのに事件アクションをしない／アクティブなキャラを使わず残した／ガード役が足りない）
//  ② CPUの探索（chooseTurnPlan）の点数で、人の手に近い案とCPUの最善案を比べた差
// を出し、差の大きい手番を「勝負所」として定型文で並べる。AI（外部API）は使わない。文章はこのファイルのテンプレートだけで組み立てる。
// 設計と、定型文で再現できる範囲・できない範囲: HANDOFF.md の「2026-11-27 追記: 対戦後の振り返り」
// 使い方: node tools/review.js ログ.json（アプリは 記録タブ → 詳しい対戦ログ → 振り返り）
const RV_GAP=150;       // 探索の点数の差がこれ以上なら勝負所（証拠1つ≒60点、勝ち負けは±1e5）
const RV_MAXN=5;        // 勝負所として出す手番の数
const rvLab=l=>l.replace(/\+ヒントなし/,"（ヒントなし）").replace(/\+/g," ＋ ");
const rvSev=w=>w>=300?"大":w>=150?"中":"小";
const RV_ESC=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

// 人の1手番の行為を、通常ログの行から数える（tools/agree.js の feats と同じ読み方。名前つき）
function rvFeats(lines,N){
  const n=RV_ESC(N),f={used:[],assist:0,hint:0,reason:0,actChara:0,actCase:0,ability:0,solve:0,actors:[],caseBy:[]};
  for(const m of lines){let r;
    if(r=new RegExp(`^${n} は (.+?)（Lv\\d+）を登場させた`).exec(m))f.used.push(r[1]);
    else if(r=new RegExp(`^${n} はイベント (.+?) を使用した`).exec(m))f.used.push(r[1]);
    else if(new RegExp(`^${n} はアシスト`).test(m))f.assist++;
    else if(new RegExp(`^${n} はネクストヒント`).test(m))f.hint++;
    else if(r=new RegExp(`^${n} の (.+?) が推理（LP`).exec(m)){f.reason++;f.actors.push(r[1])}
    else if(r=new RegExp(`^${n} の (.+?)（AP\\d+）がアクション → (.+)$`).exec(m)){f.actors.push(r[1]);if(r[2]==="事件"){f.actCase++;f.caseBy.push(r[1])}else f.actChara++}
    else if(new RegExp(`^${n} の .+ の能力:「`).test(m))f.ability++;
    else if(/事件解決（証拠|証拠隠滅（/.test(m))f.solve=1}
  return f}
function rvHumanLines(r,e){
  const N=r.names[e.who],out=[];for(let i=e.li;i<r.log.length;i++){const [t,m]=r.log[i];if(t!==e.t||/^— \d+ターン目/.test(m))break;out.push(m);if(m===`${N} はターン終了`)break}
  return out}
// 手番の終わりの盤面（dlog の turnEnd）から、その席のアクティブ（スリープでもスタンでもない）キャラの数
function rvEndGuards(r,e){
  const ev=r.ev||[];const i0=ev.indexOf(e);
  for(let i=i0+1;i<ev.length;i++){const x=ev[i];if(x.k==="turnEnd"&&x.t===e.t){const b=(x.b||[]).find(q=>q.who===e.who);
    if(b)return b.field.filter(s=>!/\((S|X)\)AP/.test(s)).length;break}}
  return null}

// 盤面（人の席 p）から、機械で判定できる型の指摘を作る。h=人のその手番の行為、guardsEnd=手番終了時のアクティブ数（無ければ null）
function rvRules(p,o,h,t,guardsEnd){
  const out=[],nm=x=>C(x).nm;
  const lvO=o.level,close=lvO-o.ev.length; // 相手があと何個で事件レベルか
  const act=p.field.filter(x=>x.st==="a"&&x!==p.partner);
  const caseCan=o.ev.length?act.filter(x=>canAct(x,p,"case")):[];
  const done=h.reason+h.actChara+h.actCase;
  // ① 相手があと2つ以下なのに、証拠を増やす・削る行動が1回もない
  if(close<=2&&close>0&&(h.reason+h.actCase)===0){
    const k=Math.min(o.ev.length,Math.max(1,caseCan.length));
    out.push({kind:"noEvidence",w:300+60*(3-close),head:`証拠を動かしていない（相手はあと${close}つ）`,
      detail:`相手の証拠${o.ev.length}/${lvO}。推理も事件アクションも0回で、自分は${p.ev.length}のまま。`
        +(caseCan.length?`${caseCan.slice(0,2).map(nm).join("・")}で事件アクション→相手${o.ev.length}→${o.ev.length-k}・自分+${k}。`:"")});
  }
  // ② アクティブなキャラが、何もせずに残っている（ガード役として残した場合もあるので、相手が次に勝てないときだけ強めに言う）
  const idle=act.filter(x=>(canAct(x,p,"reason")||canAct(x,p,"case")||canAct(x,p,"chara"))&&!h.actors.includes(nm(x)));
  if(idle.length&&done<act.length){
    const noThreat=!(close<=3);
    out.push({kind:"idle",w:noThreat?160:60,head:`${idle.slice(0,3).map(nm).join("・")}が何もしていない`,
      detail:`アクティブ${act.length}体のうち行動は${done}回。`
        +(p.ev.length||o.ev.length?`推理なら証拠+${lpOf(idle[0])}、事件アクションなら相手${o.ev.length}→${Math.max(0,o.ev.length-1)}・自分+1。`:"")
        +(noThreat?"":"ガード役として残したなら問題なし。")});
  }
  // ③ ガード役の不足: 相手の次の手番の最大獲得 gainMax に対し、手番終了時のアクティブ数で防げるか
  if(guardsEnd!=null){const th=threatNext(p,o),mis=p.field.reduce((a,y)=>a+(y.st==="a"?(staticKw(y,p).misread||0):0),0);
    const after=Math.max(0,th.gainMax-guardsEnd-mis),reach=o.ev.length+after;
    if(th.gainMax>0&&(o.solved||o.file.length+2>=7)&&reach>=lvO){
      out.push({kind:"guard",w:400,head:"ガード役が足りない",
        detail:`相手の証拠${o.ev.length}/${lvO}。次の手番で最大+${th.gainMax}（${th.parts.slice(0,3).join("、")}）。アクティブ${guardsEnd}体では+${after}残り、証拠${reach}で届く。あと${Math.max(1,reach-lvO+1)}体残すか、先に証拠を削る。`})}
    else if(th.gainMax>0&&o.ev.length+th.gainMax>=lvO&&(o.solved||o.file.length+2>=7)&&reach<lvO){
      out.push({kind:"guardOk",w:0,head:"ガードは足りていた",detail:`アクティブ${guardsEnd}体で相手の獲得を+${after}に抑えられた。`})}}
  return out}

// 探索の点数: 盤面を復元し、人の席をCPUとして chooseTurnPlan を回して、各案の点数を出す。人の手に近い案の点数と最善の案の点数を返す
async function rvSearch(r,e,h){
  const real=G,keep={};
  try{
    const g={...unpackRefs(structuredClone(e.g)),over:false,ui:{mode:null},undo:[],busy:0,rec:{log:[],search:[],acts:[]},dlog:null};
    G=g;const p=G.P[e.who];for(const q of G.P){keep[q.idx]=q.cpu;q.cpu=true;q.pa=q.pa||[]}
    G.cfg.search=[true,true];G.cfg.aiOff=null;
    await chooseTurnPlan(p);
    const s=(G.rec.search||[])[0];if(!s)return null;
    // 案のラベルを (出すカード, アシストの有無, ヒントの有無) に分ける。アクションの出し方・構え・能力・ガード役の案は人の動きと対応づけられないので比べない
    const parse=l=>{if(/(アクション:|構え:|ガード役なし|能力)/.test(l))return null;
      const hint=!/ヒントなし/.test(l),assist=/アシスト先/.test(l),card=l.replace(/\+ヒントなし/,"").replace(/\+アシスト先/,"");
      return {card,assist,hint}};
    const plans=s.plans.map(([l,v])=>({l,v,k:parse(l)})).filter(x=>x.k);
    const used=h.used[0]||null,wantCard=used||"何も出さない";
    // 人の手に近い案: 1枚目に出したカード（無ければ「何も出さない」）・アシストの有無・ヒントの有無が同じ案
    const mine=plans.find(x=>x.k.card===wantCard&&x.k.assist===(h.assist>0)&&x.k.hint===(h.hint>0))||null;
    // 最善: 同じ組み合わせ（カード・アシスト）はヒントの有無の良い方を取って、いちばん高い案
    const best=plans.slice().sort((a,b)=>b.v-a.v)[0];
    return {best,mine,n:plans.length}
  }finally{G=real;for(const q of (real&&real.P)||[])if(keep[q.idx]!==undefined)q.cpu=keep[q.idx]}}

// ログ r（詳しい対戦ログ1戦）→ {items:[{t,w,kind,text}], lines:[…]}。人の席は r.cpu が false の席。opt.search=false で探索を省く
async function reviewGame(r,opt={}){
  const seat=(r.cpu||[]).findIndex(c=>!c);if(seat<0)return {items:[],lines:["人の席がないログです（CPU同士）"]};
  const N=r.names[seat],snaps=(r.ev||[]).filter(x=>x.k==="snap"&&x.who===seat);
  const items=[];let done=0;
  for(const e of snaps){
    const h=rvFeats(rvHumanLines(r,e),N),guardsEnd=rvEndGuards(r,e);
    const real=G;let rules=[],srch=null;
    try{
      const g={...unpackRefs(structuredClone(e.g)),over:false,ui:{mode:null},undo:[],busy:0,rec:null,dlog:null};
      G=g;rules=rvRules(G.P[seat],G.P[1-seat],h,e.t,guardsEnd);
    }finally{G=real}
    if(opt.search!==false){try{srch=await rvSearch(r,e,h)}catch(err){console.warn("review",err)}}
    for(const x of rules)if(x.w>0)items.push({t:e.t,...x});
    if(srch&&srch.mine&&srch.best){const gap=Math.round(srch.best.v-srch.mine.v);
      if(gap>=RV_GAP&&srch.best.l!==srch.mine.l)
        items.push({t:e.t,kind:"search",w:Math.min(500,gap/2),gap,head:`CPUなら「${rvLab(srch.best.l)}」`,
          detail:`探索の点数 ${Math.round(srch.best.v)} 対 ${Math.round(srch.mine.v)}（差${gap}。証拠1つ≒60点）。あなたに近い手は「${rvLab(srch.mine.l)}」。`})}
    done++;if(opt.onProgress)opt.onProgress(done,snaps.length)}
  // 勝負所: 手番ごとに重みを足して、上位 RV_MAXN 手番
  const byT=new Map();for(const it of items){const a=byT.get(it.t)||{t:it.t,w:0,items:[]};a.w+=it.w;a.items.push(it);byT.set(it.t,a)}
  const top=[...byT.values()].sort((a,b)=>b.w-a.w).slice(0,RV_MAXN).sort((a,b)=>a.t-b.t);
  const result=r.winner==null?"未決着":r.winner===seat?"あなたの勝ち":"あなたの負け";
  const head=`${r.decks[seat]} vs ${r.decks[1-seat]}／${r.turns}ターン／${result}`;
  const cards=top.map(a=>({t:a.t,items:a.items.sort((x,y)=>y.w-x.w).map(it=>({kind:it.kind,sev:rvSev(it.w),head:it.head,detail:it.detail}))}));
  const note=!snaps.length?"人の手番の盤面（snap）が入っていないログです。新しい版で対戦したログで試してください。"
    :!top.length?"機械で判定できる大きな取りこぼしは見つかりませんでした（定型の判定に引っかからない差は拾えません）。":"";
  const lines=[head,...(note?[note]:[]),...cards.flatMap(c=>c.items.map(i=>`T${c.t}［${i.sev}］${i.head} — ${i.detail}`)),
    "※盤面の定型判定とCPUの探索の点数だけの参考です。"];
  return {items,top,cards,head,note,lines}}

