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
    case"threat":L.push(`【脅威の見積り】${w(e.who)}: 相手の次手番の最大獲得${e.gainMax}（防御で減らして${e.gainMin}）／必要な削減${e.need}／${e.lethal?"相手が勝てる":"勝てない"}［${(e.parts||[]).join(", ")}］`);break;
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

// ================= 短縮版（分析用）=================
// SeEd は読まず、Claude が読む前提。情報は削らず長さだけ短くする（tests/dlog.js が短縮版を読み戻して元のイベントと一致することを確認する）。
// (1) カード名を「#番号」の辞書にまとめる (2) 盤面（手札・現場・枚数）は前回の同プレイヤーの記録からの差分だけ
// (3) 同じカードは「#3x2」と枚数でまとめる (4) キーを短くし、凡例を先頭に1回だけ書く。通常ログの行はそのまま残す。
const DLS=" ¦ ";
function dlCompact(r){
  const names=r.names,ev=r.ev||[],dict=new Map();
  const reg=s=>{if(!dict.has(s))dict.set(s,dict.size+1);return "#"+dict.get(s)};
  const cnt=a=>(a&&a.length)?(()=>{const m=new Map();for(const s of a)m.set(s,(m.get(s)||0)+1);return [...m].map(([s,n])=>reg(s)+(n>1?"x"+n:"")).join(" ")})():"-";
  const tail=s=>{const m=/^(.*?)(\(AP[^()]*\))$/.exec(s)||/^(.*\(Lv\d+\))(.*)$/.exec(s);return m?reg(m[1])+m[2]:reg(s)}; // 名(AP1000,S) / 名(Lv4)AP+2000 の後ろ側はそのまま
  const fld=s=>{const m=/^(.*?)(\([SX]\))?AP(\d+)$/.exec(s);return m?reg(m[1])+(m[2]||"")+":"+m[3]:reg(s)};
  const diff=(cur,prev,f)=>{const m=new Map();for(const s of prev)m.set(s,(m.get(s)||0)-1);for(const s of cur)m.set(s,(m.get(s)||0)+1);
    const add=[],del=[];for(const [s,n] of m){for(let i=0;i<n;i++)add.push(s);for(let i=0;i<-n;i++)del.push(s)}
    return [...add.map(x=>"+"+f(x)),...del.map(x=>"-"+f(x))].join(" ")};
  const last={};
  const snap=b=>{const o=last[b.who];last[b.who]=b;const L=[];
    if(!o){L.push("手 "+cnt(b.hand),"場 "+(b.field.length?b.field.map(fld).join(" "):"-"))}
    else{const h=diff(b.hand,o.hand,reg),f=diff(b.field,o.field,fld);if(h)L.push("手 "+h);if(f)L.push("場 "+f)}
    const sc=(k,pr,v)=>{if(!o||o[pr]!==b[pr])L.push(k+" "+v)};
    sc("file","file",b.file);sc("ev","ev",b.ev);sc("lv","level",b.level);sc("solved","solved",b.solved?1:0);sc("rm","rm",b.rm);sc("deck","deck",b.deck);sc("pt","partner",b.partner);
    return L.length?"P"+b.who+" "+L.join(DLS):""};
  const body=[];const out=l=>{if(l)body.push(l)};
  const P=i=>"P"+i,star=e=>e.cpu?"*":"";
  const fmt=e=>{switch(e.k){
    case"turnStart":case"turnEnd":{const s=e.b.map(snap).filter(Boolean);return (e.k==="turnStart"?"[始]":"[終]")+(s.length?"\n"+s.join("\n"):"")}
    case"draw":return `引 ${P(e.who)} ${cnt(e.cards)}${e.tag?DLS+e.tag:""}`;
    case"mull":return `マリガン ${P(e.who)} 手 ${cnt(e.hand)} 戻 ${cnt(e.back)}`;
    case"pick":return `選 ${P(e.who)}${star(e)}${DLS}${e.title}${DLS}${e.min}-${e.max}${DLS}${cnt(e.cands)}${DLS}${cnt(e.chose)}`;
    case"yes":return `諾否 ${P(e.who)}${star(e)}${DLS}${e.title}${DLS}${e.body||""}${DLS}${e.v?1:0}`;
    case"guard":return `ガード ${P(e.who)}${star(e)}${DLS}${reg(e.atk)}${DLS}${e.apAtk}${DLS}${e.target==="事件"?"事件":tail(e.target)}${DLS}${e.cands.map(tail).join(" ")||"-"}${DLS}${e.chose?tail(e.chose):"-"}${DLS}${cnt(e.hand)}${DLS}${e.oHand} ${e.oField} ${e.ev} ${e.oEv}`;
    case"contact":return `接触 ${P(e.who)}${star(e)}${DLS}${e.tp?1:0}${DLS}${tail(e.mine)}${DLS}${tail(e.theirs)}${DLS}${e.need}${DLS}${e.cuts.map(tail).join(" ")||"-"}${DLS}${e.dis.map(reg).join(" ")||"-"}${DLS}${e.chose?tail(e.chose.replace(/\((カットイン|変装)\)$/,""))+(/変装\)$/.test(e.chose)?"(変装)":"(カ)"):"-"}${DLS}${cnt(e.hand)}${DLS}${e.oHand} ${e.oRm}`;
    case"search":return `探索 ${P(e.who)}${DLS}${e.pick}${DLS}${e.plans.map(x=>x[1]+" "+x[0]).join(DLS)}`;
    case"combo":return `コンボ表 ${P(e.who)}${DLS}${e.how}`;
    default:return "? "+JSON.stringify(e)}};
  let j=0;
  r.log.forEach(([t,m],i)=>{while(j<ev.length&&ev[j].li<=i)out(fmt(ev[j++]));out(m)});
  while(j<ev.length)out(fmt(ev[j++]));
  const head=[`# 詳しい対戦ログ(短縮) ${r.start} ～ ${r.end||""}`,
    `P0=${names[0]}${r.cpu[0]?"(CPU)":""}（${r.decks[0]}） P1=${names[1]}${r.cpu[1]?"(CPU)":""}（${r.decks[1]}）／先攻 P${r.first}／${r.turns}ターン／${r.winner==null?"未決着":"P"+r.winner+" 勝利（"+(r.why||"")+"）"}`,
    "凡例: #n=カード辞書（下）。詳細行は通常ログの間に差し込み、区切りは「 ¦ 」。*=CPUの判断。xN=同名N枚。(S)=スリープ (X)=スタン。",
    "[始][終]=手番の始め/終わりの盤面。前回の同プレイヤーの記録からの差分だけ（+増 -減、手=手札 場=現場 #n:AP、file=FILE枚数 ev=証拠 lv=事件レベル solved=解決編 rm=リムーブエリア deck=デッキ枚数 pt=パートナー）。最初だけ全部。",
    "引 P=ドロー ¦ マリガン=手札→戻した札 ¦ 選=選択: 題¦最小-最大枚¦候補¦選んだ札 ¦ 諾否=題¦本文¦1はい0いいえ",
    "ガード=P¦攻撃キャラ¦攻撃AP¦対象¦ガード候補¦選んだ1体¦手札¦相手の手札枚数 相手の現場数 自証拠 相手証拠 ¦ 接触=P¦自分の番か¦自分のキャラ¦相手のキャラ¦勝つのに要るAP差¦カットイン候補(AP+)¦変装候補¦選んだ札(カ=カットイン)¦手札¦相手の手札枚数 相手のリムーブエリア枚数",
    "探索=P¦採用案¦全案の「点数 案」 ¦ コンボ表=P¦内容",
    ...(r.deckLists||[]).map((t,i)=>`P${i}デッキ: ${t.replace(/\n/g," / ")}`),"カード辞書:"];
  const d=[...dict].map(([s,i])=>`#${i}=${s}`);
  return [...head,...d,"## ログ",...body].join("\n")}
