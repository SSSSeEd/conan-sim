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
function apOf(x){const c=C(x);return (c.ap||0)+x.apM+x.apT+x.apC+(x.apA||0)+(window.FX?FX.apBonus(x):0)}
function lpOf(x){const c=C(x);return (c.lp||0)+x.lpM+x.lpT+(window.FX&&FX.lpBonus?FX.lpBonus(x):0)}
function ownerOf(x){for(const p of G.P){if(p.field.includes(x)||p.partner===x||p.hand.includes(x)||p.caseC===x||p.file.includes(x)||p.ev.includes(x)||p.rm.includes(x)||p.deck.includes(x))return p}return null}
function zoneOf(x){const p=ownerOf(x);if(!p)return null;
  if(p.partner===x)return p.pLoc==="file"?"file":"partner";
  for(const z of ["field","hand","file","ev","rm","deck"])if(p[z].includes(x))return z;
  if(p.caseC===x)return "case";return null}
function detach(x){x._shown=null;const p=ownerOf(x);if(!p)return null;for(const z of ["field","hand","file","ev","rm","deck"]){const i=p[z].indexOf(x);if(i>=0){p[z].splice(i,1);
  if(z==="rm"&&G&&G.queue&&C(x).t==="キャラ")G.queue.push({rmLeft:true,x,p}); // リムーブエリアから離れたときの効果（effects.js の onLeave）
  return p}}return p}

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
  for(const k of [...x.kw,...(window.FX&&FX.kwExtra?FX.kwExtra(x,p):[])]){if(k==="突撃")out.rush=true;if(k==="突撃［キャラ］")out.rushC=true;if(k==="突撃［事件］")out.rushE=true;if(k==="迅速")out.swift=true;if(k==="ブレット")out.bullet=true;if(k==="必ずガード")out.mustGuard=true}
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
    // 世良真純 B10058: 自分の手札が2枚以下の場合、代わりにAP＋3000（このカードは手札に数えない）
    const h=s.match(/^AP[＋+]\d+、自分の手札が(\d)枚以下の場合、代わりにAP[＋+](\d+)/);
    if(h&&p.hand.filter(y=>y!==x).length<=+h[1])best=Math.max(best||0,+h[2]);
    // 犯人 PR158: リムーブエリアにある［犯人］1枚につきAP＋2000（このカードも含める）
    const b=s.match(/^自分のリムーブエリアにある〚カード名［([^］]+)］〛1枚につき、AP[＋+](\d+)（このカードも含める）/);
    if(b)best=Math.max(best||0,+b[2]*(p.rm.filter(y=>y!==x&&C(y).nm===b[1]).length+1));
    // 黒田兵衛 B05095: 自分の現場にいる［特徴］のキャラ1枚につき
    const t=s.match(/^自分の現場にいる〚特徴［([^］]+)］〛のキャラ1枚につき、AP[＋+](\d+)/);
    if(t)best=Math.max(best||0,+t[2]*p.field.filter(y=>(C(y).ct||"").split(",").includes(t[1])).length);
    // 〚カード名［A］〛か〚［B］〛／〚特徴［T］〛のキャラ に【カットイン】する場合（今コンタクトしている自分のキャラで判定）
    const mine=G&&G.contact&&(p.field.includes(G.contact.a)?G.contact.a:G.contact.d);
    const u=s.match(/^((?:〚(?:カード名)?［[^］]+］〛か?)+)に【カットイン】する場合、AP[＋+](\d+)/);
    if(u&&mine&&[...u[1].matchAll(/［([^］]+)］/g)].some(m=>C(mine).nm.includes(m[1])))best=Math.max(best||0,+u[2]);
    const v=s.match(/^〚特徴［([^］]+)］〛のキャラに【カットイン】する場合、AP[＋+](\d+)/);
    const w=s.match(/【(青|赤|黄|緑|白|黒)】のキャラに【カットイン】する場合、AP[＋+](\d+)/); // バーボン PR087（効果の後ろに続く）
    if(w&&mine&&(C(mine).c||"").includes(w[1]))best=Math.max(best||0,+w[2]);
    if(v&&mine&&(C(mine).ct||"").split(",").includes(v[1]))best=Math.max(best||0,+v[2]);
  }
  return best;
}
function disguiseOk(x,p){
  const t=C(x).dg;if(!t)return false;
  const tags=[...t.matchAll(/【([^】]+)】/g)].map(m=>m[1]).filter(s=>s!=="変装");
  return tags.every(tg=>condOk(tg,p)!==false);
}
function canPlayColor(card,p){const cc=C(p.caseC).c||"";return colorsOf(card.c).every(ch=>cc.includes(ch))}

// ================= ログ =================
// 記録に残してから画面に出す（画面への表示は ui.js の uiLog）
function log(msg,cls){if(G&&G.rec){G.rec.log.push([G.turnNo,msg]);(G.logC=G.logC||[]).push(cls||"")} // logC: 再開したときにログの色を戻す用
  if(G&&G.sim)return; // 探索中の試しの手番は画面に出さない
  uiLog(msg,cls)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
