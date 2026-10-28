"use strict";
// ================= 状態 =================
let G=null;let UID=1;
function inst(n){return {u:UID++,n,st:"a",fresh:false,apM:0,apT:0,apC:0,lpM:0,lpT:0,kw:[],set:[],used:{}}}
function C(x){return DB[x.n]}
function mkPlayer(idx,name,deck,cpu){
  const p={idx,name,cpu,deck:shuffle(deck.main.map(inst)),hand:[],field:[],partner:inst(deck.partner),pLoc:"area",
    caseC:inst(deck.caseN),solved:false,level:7,file:[],ev:[],rm:[],usedHand:false,hinted:false,refreshed:false,lost:false};
  return p;
}
const opp=p=>G.P[1-p.idx];
const cur=()=>G.P[G.turn];
function caseLevel(p,first){
  const t=C(p.caseC).df||"先攻7 後攻6";const m=t.match(/先攻\s*(\d+)\s*後攻\s*(\d+)/);
  if(!m)return 7;return first?+m[1]:+m[2];
}
function colorsOf(s){return [...(s||"")].filter(ch=>COLOR_VAR[ch])}
function apOf(x){const c=C(x);return (c.ap||0)+x.apM+x.apT+x.apC+(window.FX?FX.apBonus(x):0)}
function lpOf(x){const c=C(x);return (c.lp||0)+x.lpM+x.lpT}
function ownerOf(x){for(const p of G.P){if(p.field.includes(x)||p.partner===x||p.hand.includes(x)||p.caseC===x||p.file.includes(x)||p.ev.includes(x)||p.rm.includes(x)||p.deck.includes(x))return p}return null}
function zoneOf(x){const p=ownerOf(x);if(!p)return null;
  if(p.partner===x)return p.pLoc==="file"?"file":"partner";
  for(const z of ["field","hand","file","ev","rm","deck"])if(p[z].includes(x))return z;
  if(p.caseC===x)return "case";return null}
function detach(x){x._shown=null;const p=ownerOf(x);if(!p)return null;for(const z of ["field","hand","file","ev","rm","deck"]){const i=p[z].indexOf(x);if(i>=0){p[z].splice(i,1);return p}}return p}

// 条件タグの判定
function condOk(tag,p){
  let m;
  if((m=tag.match(/^パートナー(.+)$/)))return colorsOf(m[1]).every(ch=>(C(p.partner).c||"").includes(ch));
  if((m=tag.match(/^事件(.+)$/))){const want=m[1];const cc=C(p.caseC);const cols=colorsOf(want.replace(/＆/g,""));
    if(cols.length&&cols.length===want.replace(/＆/g,"").length)return cols.every(ch=>(cc.c||"").includes(ch));
    return (cc.ct||"").includes(want)||cc.nm.includes(want)}
  if(tag==="自分ターン中")return G.turn===p.idx;
  if(tag==="相手ターン中")return G.turn!==p.idx;
  if(tag==="解決編")return p.solved;
  if(tag==="事件編")return !p.solved;
  if((m=tag.match(/^絆(.+)$/)))return p.field.some(y=>C(y).nm.includes(m[1]));
  if((m=tag.match(/^FILE(\d+)$/)))return p.file.length>=+m[1];
  return null; // 判定対象外のタグ
}
// 常在キーワード（行頭の条件タグを満たした〚〛）
function staticKw(x,p){
  const out={rush:false,rushC:false,rushE:false,swift:false,bullet:false,misread:0,noGuard:false,guardSleep:false,mustGuard:false};
  const c=C(x);
  for(const line of (c.f||"").split("\n")){
    let s=line.trim(),ok=true,m;
    while((m=s.match(/^【([^】]+)】/))){const r=condOk(m[1],p);if(r===false){ok=false}else if(r===null){ok=false}s=s.slice(m[0].length)}
    if(!ok)continue;
    if((m=s.match(/^〚([^〛]+)〛/))){const k=m[1];
      if(k==="突撃")out.rush=true;else if(k==="突撃［キャラ］")out.rushC=true;else if(k==="突撃［事件］")out.rushE=true;
      else if(k==="迅速")out.swift=true;else if(k==="ブレット")out.bullet=true;
      else if((m=k.match(/^ミスリード(\d+)/)))out.misread+=+m[1];}
    if(/^このキャラは[^「」（]*ガードできない/.test(s))out.noGuard=true;
    if(/^このキャラはスリープ状態でもガードできる/.test(s))out.guardSleep=true;
  }
  for(const k of x.kw){if(k==="突撃")out.rush=true;if(k==="突撃［キャラ］")out.rushC=true;if(k==="突撃［事件］")out.rushE=true;if(k==="迅速")out.swift=true;if(k==="ブレット")out.bullet=true;if(k==="必ずガード")out.mustGuard=true}
  return out;
}
// カットインのAP。他のカードから与えられたカットイン（工藤新一 B07003 など）も含めて一番大きい値
function cutinAp(x,p){
  const own=ownCutinAp(x,p),g=window.FX?FX.grantedCutin(p,x):null;
  return g!=null&&(own==null||g>own)?g:own;
}
// 今使えるカットインか（行頭の条件タグを満たす行があるか）
function cutinUsable(x,p){
  if(window.FX&&FX.grantedCutin(p,x)!=null)return true;
  return ownCutinOk(x,p);
}
function ownCutinOk(x,p){
  const t=C(x).ci;if(!t)return false;
  return t.split("\n").some(line=>{if(!line.includes("【カットイン】"))return false;
    let s=line.replace("【カットイン】",""),m;while((m=s.match(/^【([^】]+)】/))){if(condOk(m[1],p)===false)return false;s=s.slice(m[0].length)}return true});
}
function ownCutinAp(x,p){
  const t=C(x).ci;if(!t)return null;
  let best=null;
  for(const line of t.split("\n")){
    let s=line.replace("【カットイン】",""),ok=true,m;
    while((m=s.match(/^【([^】]+)】/))){const r=condOk(m[1],p);if(r===false)ok=false;s=s.slice(m[0].length)}
    if(!ok)continue;
    const a=s.match(/^AP[＋+](\d+)/);if(a)best=Math.max(best||0,+a[1]);
  }
  return best;
}
function disguiseOk(x,p){
  const t=C(x).dg;if(!t)return false;
  const tags=[...t.matchAll(/【([^】]+)】/g)].map(m=>m[1]).filter(s=>s!=="変装");
  return tags.every(tg=>condOk(tg,p)!==false);
}
function canPlayColor(card,p){const cc=C(p.caseC).c||"";return colorsOf(card.c).every(ch=>cc.includes(ch))}

// ================= ログ・UI補助 =================
function log(msg,cls){if(G&&G.rec)G.rec.log.push([G.turnNo,msg]);const d=document.createElement("div");if(!cls&&G){const nm=msg.replace(/^\[手動\] /,"");if(nm.startsWith(G.P[0].name))cls="me";else if(nm.startsWith(G.P[1].name))cls="op"}if(cls)d.className=cls;d.textContent=msg;const L=document.getElementById("log");L.appendChild(d);L.scrollTop=L.scrollHeight}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2600)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function esc(s){return String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]))}
function hl(s){return esc(s).replace(/(【[^】]+】|〚[^〛]+〛)/g,'<span class="k">$1</span>')}

// モーダル（Promise）
function modal(build){
  return new Promise(res=>{
    const bg=document.getElementById("modal-bg"),m=document.getElementById("modal");
    m.innerHTML="";bg.hidden=false;document.documentElement.classList.add("modalopen");
    const done=v=>{bg.hidden=true;m.innerHTML="";document.documentElement.classList.remove("modalopen");res(v)};
    build(m,done);
    const f=m.querySelector("button");if(f)f.focus();
  });
}
function ask(title,body,options){ // options:[{label,value,primary}]
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(title)}</div>${body?`<div class="mb">${hl(body)}</div>`:""}<div class="opts"></div>`);
    const o=m.querySelector(".opts");
    for(const op of options){const b=document.createElement("button");b.textContent=op.label;if(op.primary)b.className="primary";b.onclick=()=>done(op.value);o.appendChild(b)}
  });
}
function chooseCards(title,body,cards,{min=0,max=1,okLabel="決定",faceUp=true,can=null,tag=null}={}){
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(title)}</div>${body?`<div class="mb">${hl(body)}</div>`:""}<div class="cards"></div><div class="opts"></div>`);
    const sel=new Set();const box=m.querySelector(".cards");
    const ok=document.createElement("button");ok.className="primary";ok.textContent=okLabel;
    const upd=()=>{ok.disabled=sel.size<min||sel.size>max;ok.textContent=`${okLabel}（${sel.size}）`};
    for(const x of cards){const el=cardEl(x,{faceUp});
      const ow=G&&ownerOf(x);if(ow&&ow.field.includes(x))el.insertAdjacentHTML("beforeend",`<span class="case-tag" style="background:${ow.idx===0?"#2f6fd6":"var(--alert)"}">${esc(ow.name)}</span>`);
      const tg=tag&&tag(x);if(tg)el.insertAdjacentHTML("beforeend",`<span class="case-tag" style="background:#2e7d4f;top:28px;bottom:auto">${esc(tg)}</span>`);
      if(can&&!can(x)){el.classList.add("ng");el.insertAdjacentHTML("beforeend",'<span class="ngtag">対象外</span>');el.onclick=()=>showDetail(x);box.appendChild(el);continue}
      el.onclick=()=>{
        if(sel.has(x)){sel.delete(x);el.classList.remove("sel")}else{if(max===1){sel.clear();box.querySelectorAll(".sel").forEach(e=>e.classList.remove("sel"))}if(sel.size<max){sel.add(x);el.classList.add("sel")}}upd()};
      box.appendChild(el)}
    ok.onclick=()=>done([...sel]);m.querySelector(".opts").appendChild(ok);upd();
    if(min===0){const n=document.createElement("button");n.textContent="選ばない";n.onclick=()=>done([]);m.querySelector(".opts").appendChild(n)}
  });
}

// 好きな順番でデッキの下へ: タップした順に 1,2,3… と番号を付ける（1 が上、最後が一番下）
function orderCards(title,cards){
  if(cards.length<2)return Promise.resolve(cards.slice());
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(title)}</div><div class="mb">デッキの下に戻す順番を、カードをタップして決めてください。①が上（先に引く側）、最後の番号がデッキの一番下になります。もう一度タップで取り消し。</div><div class="cards"></div><div class="opts"></div>`);
    const ord=[];const box=m.querySelector(".cards");const els=new Map();
    const ok=document.createElement("button");ok.className="primary";
    const upd=()=>{for(const [x,el] of els){const i=ord.indexOf(x);el.classList.toggle("sel",i>=0);const t=el.querySelector(".ordn");if(t)t.remove();if(i>=0)el.insertAdjacentHTML("beforeend",`<span class="ordn">${i+1}</span>`)}
      ok.disabled=ord.length!==cards.length;ok.textContent=ord.length===cards.length?"この順番で戻す":`あと${cards.length-ord.length}枚`};
    for(const x of cards){const el=cardEl(x);els.set(x,el);el.onclick=()=>{const i=ord.indexOf(x);if(i>=0)ord.splice(i,1);else ord.push(x);upd()};box.appendChild(el)}
    ok.onclick=()=>done(ord.slice());m.querySelector(".opts").appendChild(ok);
    const as=document.createElement("button");as.textContent="表示の順のまま";as.onclick=()=>done(cards.slice());m.querySelector(".opts").appendChild(as);upd();
  });
}

