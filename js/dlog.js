"use strict";
// ================= 詳しい対戦ログ（直近3戦だけ端末に残す） =================
// 目的: SeEd が CPU と対戦して 1ターンごとの考えをメモし、終わったあとにログを貼って人間との違いを分析する。
// 通常のログ（rec.log）に足りない材料（CPU/人の手札の中身・ドローで引いたカード・選択場面の候補と選んだ札・
// ガード/カットインの判断材料・探索の点数）を、イベントとして G.dlog に積む。圧縮コピー（CS1/CS2、feedback.js）とは別。
// ターン番号は通常ログの「— Nターン目 —」と同じ（G.turnNo）。li は「そのイベントの時点の通常ログの行数」で、テキスト化のときに通常ログの行の間へ差し込む。
// 探索の試しの手番（G.sim）・SIM_FAST の大量対戦では記録しない（window.SIM_SAVE があれば記録する＝テスト用）。
const DLOG_KEY="conan-sim-dlogs",DLOG_MAX=3;
const dlOn=()=>!!G&&!!G.dlog&&!G.sim&&!(window.SIM_FAST&&!window.SIM_SAVE);
function dlStart(){G.dlog=[]}
function dl(k,d){if(!dlOn())return;G.dlog.push({k,t:G.turnNo,li:G.rec?G.rec.log.length:0,...d})}
const dlCard=x=>{const c=C(x);return c?`${c.nm}${c.t==="キャラ"||c.t==="イベント"?`(Lv${c.lv||0})`:""}`:String(x&&x.n)};
const dlCards=a=>(a||[]).map(dlCard);
const dlFld=p=>p.field.map(x=>`${C(x).nm}${x.st==="a"?"":x.st==="s"?"(S)":"(X)"}AP${apOf(x)}`);
// 両者の盤面と手札（ターンの始め・終わりに残す）
function dlBoard(){return G.P.map(p=>({who:p.idx,name:p.name,cpu:!!p.cpu,hand:dlCards(p.hand),field:dlFld(p),file:p.file.length,ev:p.ev.length,level:p.level,solved:p.solved,deck:p.deck.length,rm:p.rm.length,partner:C(p.partner).nm+(p.pLoc==="area"&&p.partner.st==="a"?"":"(寝)")}))}
function dlTurnStart(){dl("turnStart",{b:dlBoard()})}
function dlTurnEnd(){dl("turnEnd",{b:dlBoard()})}

// ---- テキスト化: 通常ログの行の間に、詳しい記録を差し込む ----
function dlFmt(e,names){
  const w=i=>names[i]??i,L=[];
  const bs=b=>`${b.name}${b.cpu?"(CPU)":""}: 手札${b.hand.length}[${b.hand.join(", ")}] 現場[${b.field.join(", ")}] FILE${b.file} 証拠${b.ev}/${b.level}${b.solved?"(解決編)":""} デッキ${b.deck} リムーブ${b.rm} パートナー${b.partner}`;
  switch(e.k){
    case"turnStart":L.push("【手番開始・盤面】",...e.b.map(bs));break;
    case"turnEnd":L.push("【手番終了・盤面】",...e.b.map(bs));break;
    case"draw":L.push(`【ドロー】${w(e.who)}: ${e.cards.join(", ")}${e.tag?"（"+e.tag+"）":""}`);break;
    case"mull":L.push(`【マリガン】${w(e.who)}: 手札[${e.hand.join(", ")}] → 引き直し[${e.back.join(", ")||"なし"}]`);break;
    case"pick":L.push(`【選択${e.cpu?"(CPU)":""}】${w(e.who)}: ${e.title}（${e.min}〜${e.max}枚）\n　候補[${e.cands.join(", ")}]\n　→ 選んだ[${e.chose.join(", ")||"なし"}]`);break;
    case"yes":L.push(`【はい/いいえ${e.cpu?"(CPU)":""}】${w(e.who)}: ${e.title}${e.body?"／"+e.body:""} → ${e.v?"はい":"いいえ"}`);break;
    case"guard":L.push(`【ガード判断${e.cpu?"(CPU)":""}】${w(e.who)}: ${e.atk}(AP${e.apAtk})が${e.target}にアクション。ガード候補[${e.cands.join(", ")}] → ${e.chose||"ガードしない"}\n　手札${e.hand.length}[${e.hand.join(", ")}]／相手の手札${e.oHand}枚・相手の現場${e.oField}体・自分の証拠${e.ev}/相手の証拠${e.oEv}`);break;
    case"contact":L.push(`【コンタクト中の判断${e.cpu?"(CPU)":""}】${w(e.who)}: 自分 ${e.mine} / 相手 ${e.theirs}（${e.tp?"自分のターン":"相手のターン"}、勝つのに必要なAP差 ${e.need}）\n　カットイン候補[${e.cuts.join(", ")||"なし"}] 変装候補[${e.dis.join(", ")||"なし"}] → ${e.chose||"パス"}\n　手札${e.hand.length}[${e.hand.join(", ")}]／相手の手札${e.oHand}枚・相手のリムーブエリア${e.oRm}枚`);break;
    case"search":L.push(`【探索の点数】${w(e.who)}: 採用→${e.pick}\n${e.plans.map(([l,v])=>`　${v}　${l}`).join("\n")}`);break;
    case"combo":L.push(`【コンボ表】${w(e.who)}: ${e.how}`);break;
    default:L.push(`【${e.k}】${JSON.stringify(e)}`)}
  return L.join("\n").split("\n").map(s=>"　　"+s).join("\n")}
function dlText(r){
  const names=r.names,ev=r.ev||[],out=[];
  out.push(`# 詳しい対戦ログ ${r.start}`,`${names[0]}${r.cpu[0]?"(CPU)":""}（${r.decks[0]}） vs ${names[1]}${r.cpu[1]?"(CPU)":""}（${r.decks[1]}）／先攻: ${names[r.first]}／${r.turns}ターン／${r.winner==null?"未決着":names[r.winner]+" の勝利（"+(r.why||"")+"）"}`,
    "※「— Nターン目 —」は通常ログと同じ番号。【…】の行がこのログだけの詳細です。","");
  (r.deckLists||[]).forEach((t,i)=>out.push(`## ${names[i]}のデッキ`,t,""));
  out.push("## ログ");
  let j=0;
  r.log.forEach(([t,m],i)=>{while(j<ev.length&&ev[j].li<=i)out.push(dlFmt(ev[j++],names));out.push(m)});
  while(j<ev.length)out.push(dlFmt(ev[j++],names));
  return out.join("\n")}
// ---- 保存（3戦を超えたら古い順に消す） ----
function dlLoad(){try{const a=JSON.parse(localStorage.getItem(DLOG_KEY)||"[]");return Array.isArray(a)?a:[]}catch(e){return []}}
function dlSave(w,why){
  if(!G||!G.rec||!G.dlog||G.sim||window.SIM_FAST&&!window.SIM_SAVE)return;
  const g=G,r=g.rec;
  const rec={v:1,start:r.start,end:r.end||new Date().toISOString(),names:[...r.names],cpu:[...r.cpu],decks:[...r.decks],deckLists:r.deckLists||[],first:r.first,
    winner:w?w.idx:null,why:why||"",turns:g.turnNo,log:r.log.map(x=>[x[0],x[1]]),ev:g.dlog};
  const all=dlLoad().filter(x=>x.start!==rec.start);all.push(rec);while(all.length>DLOG_MAX)all.shift();
  for(;;){try{localStorage.setItem(DLOG_KEY,JSON.stringify(all));return}catch(e){if(all.length<=1)return;all.shift()}} // 容量が足りなければ古いものからさらに外す
}
