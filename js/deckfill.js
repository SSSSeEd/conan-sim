"use strict";
// ================= デッキ補完 =================
// 主要カード（15枚ほど）から、残りを環境デッキの実績・色・パートナー条件・特徴・レベル配分で選んで40枚にする。
// 画面（document）には触らない。AIの通信も使わない（決まった計算だけ。同じ入力なら同じ結果）。
// 使い方: fillDeck({partner,caseN,main:[カードNo...]},{...opts}) → {partner,caseN,main,why:[{n,why}],warns:[]}
// opts.onlyAuto   true（初期値）: 効果が自動で処理されるカードだけで補う。自動化が進めば自然に選べるカードが増える
// opts.exclude    補わないカードのID一覧（フィードバックで「使わない」と決めたカード）
// opts.bias       {カードID: 加点}（機能A: 対戦記録から出した「このカードは勝ちに効いた/効かなかった」の補正。正で入りやすく、負で入りにくい）
// opts.pairBias   {"IDa|IDb": 加点}（機能A: 組み合わせの補正。片方がデッキにあるとき、もう片方に加点）
// opts.refs       参考にするデッキ（初期値は ENV_DECKS と PRESETS）。leave-one-out の評価ではここから対象を除く
const FILL_COLORS=["青","赤","黄","緑","白","黒"];
function fillRefs(opts){
  const src=(opts&&opts.refs)||[...(typeof PRESETS!=="undefined"?PRESETS:[]),...((window.ENV_DECKS&&ENV_DECKS.decks)||[])];
  const seen=new Set(),out=[];
  for(const d of src){const r=d.main?d:parseDeckText(d.text);if(r.errors&&r.errors.length)continue;
    const k=[r.partner,r.caseN,...r.main].join();if(seen.has(k))continue;seen.add(k);
    const cnt={};for(const n of r.main){const i=DB[n].i;cnt[i]=(cnt[i]||0)+1}
    out.push({name:d.name,partner:r.partner,caseN:r.caseN,cnt,rep:Object.fromEntries(r.main.map(n=>[DB[n].i,n]))})}
  return out}
// ID ごとの代表カード（参考デッキで使われている版を優先。なければ番号のいちばん小さい通常版）
function fillPool(refs){
  const rep={};for(const d of refs)for(const [i,n] of Object.entries(d.rep))rep[i]=rep[i]||n;
  const best={};
  for(const c of window.CARD_DB){if(c.t!=="キャラ"&&c.t!=="イベント")continue;
    if(BANNED.includes(c.i))continue;
    const cur=best[c.i];if(!cur||(!rep[c.i]&&/P$/.test(cur.n)&&!/P$/.test(c.n)))best[c.i]=c}
  for(const [i,n] of Object.entries(rep))best[i]=DB[n];
  return best}
function fillTraits(c){return c.ct?c.ct.split(","):[]}
// 効果文の条件: 【パートナー白】 【事件青】 など。条件の色が今のパートナー/事件と合わないと、その効果は使えない
function fillConds(c){const t=[c.f,c.hr,c.ci].filter(Boolean).join("\n");const o={p:[],k:[],bond:[]};let m;
  const re=/【(パートナー|事件|絆)([^】]+)】/g;
  while((m=re.exec(t))){if(m[1]==="パートナー")o.p.push(m[2]);else if(m[1]==="事件"){if(m[2]!=="編")o.k.push(m[2])}else o.bond.push(m[2])}
  return o}
function fillSim(a,b){ // 2つの {ID:枚数} の似かた（共通の枚数 / 小さいほうの合計）
  let s=0,ta=0,tb=0;for(const k in a){ta+=a[k];if(b[k])s+=Math.min(a[k],b[k])}for(const k in b)tb+=b[k];
  return s/Math.max(1,Math.min(ta,tb))}
function fillDeck(seed,opts={}){
  const refs=fillRefs(opts),pool=fillPool(refs),onlyAuto=opts.onlyAuto!==false;
  const exclude=new Set(opts.exclude||[]),bias=opts.bias||{},pairBias=opts.pairBias||{};
  const warns=[],why=[];
  const auto=c=>!window.FX||!FX.automated||FX.automated({n:c.n});
  // --- 入力 ---
  const cnt={},rep={};
  for(const n of seed.main||[]){const c=DB[n];if(!c){warns.push(`不明なカードNo: ${n}`);continue}
    if(c.t!=="キャラ"&&c.t!=="イベント"){warns.push(`${c.nm}（${c.t}）は本体に入れられません`);continue}
    cnt[c.i]=(cnt[c.i]||0)+1;rep[c.i]=rep[c.i]||n}
  for(const i in cnt){const c=DB[rep[i]];const any=(c.f||"").includes("何枚でも");
    if(cnt[i]>3&&!any){warns.push(`${c.nm}が${cnt[i]}枚あったので3枚にしました`);cnt[i]=3}
    if(LIMIT1.includes(i)&&cnt[i]>1){cnt[i]=1}}
  let size=Object.values(cnt).reduce((a,b)=>a+b,0);
  if(size>40){warns.push(`入力が${size}枚あります。40枚を超える分は補えません`)}
  // --- 参考デッキとの似かた（入力に近い環境デッキほど重く見る） ---
  const sims=refs.map(d=>{let s=fillSim(cnt,d.cnt);
    if(seed.partner&&d.partner===seed.partner)s+=.3;else if(seed.partner&&DB[d.partner].c===DB[seed.partner].c)s+=.1;
    if(seed.caseN&&d.caseN===seed.caseN)s+=.1;return s});
  // --- 色 ---
  const colW={};const addCol=(c,w)=>{for(const x of c.c||"")if(FILL_COLORS.includes(x))colW[x]=(colW[x]||0)+w/(c.c.length)};
  for(const i in cnt)addCol(DB[rep[i]],cnt[i]);
  if(seed.partner)addCol(DB[seed.partner],3);
  if(seed.caseN)addCol(DB[seed.caseN],1);
  if(!Object.keys(colW).length){ // 入力が空なら全部の色で参考デッキを均等に見る
    for(const c of FILL_COLORS)colW[c]=1}
  const totCol=Object.values(colW).reduce((a,b)=>a+b,0);
  const mainCols=Object.keys(colW).filter(c=>colW[c]/totCol>=.2);
  // --- パートナー・事件（未指定なら、似ている参考デッキから決める） ---
  const vote=(key,ok)=>{const v={};refs.forEach((d,k)=>{if(ok(d[key]))v[d[key]]=(v[d[key]]||0)+sims[k]**2});
    return Object.entries(v).sort((a,b)=>b[1]-a[1])[0]};
  let partner=seed.partner,caseN=seed.caseN;
  if(!partner){const v=vote("partner",n=>DB[n].c&&mainCols.includes(DB[n].c)||!mainCols.length);
    if(v){partner=v[0];warns.push(`パートナーは「${DB[partner].nm}」にしました（似ている環境デッキに多いため）`)}}
  if(!caseN){const v=vote("caseN",n=>(DB[n].c||"").split("").some(x=>mainCols.includes(x)));
    if(v){caseN=v[0];warns.push(`事件は「${DB[caseN].nm}」にしました`)}}
  const pcol=partner?DB[partner].c:null,kcol=caseN?DB[caseN].c:null;
  // --- 参考デッキから: 採用の重み・平均枚数・レベル配分・イベント枚数 ---
  const W=Math.max(1e-9,sims.reduce((a,s)=>a+s*s,0));
  const prior={},avgN={};
  refs.forEach((d,k)=>{const w=sims[k]**2;for(const i in d.cnt){prior[i]=(prior[i]||0)+w*d.cnt[i]/3;avgN[i]=(avgN[i]||0)+w*d.cnt[i]}});
  for(const i in avgN)avgN[i]=Math.round(avgN[i]/Math.max(1e-9,prior[i]*3)*3)||1;
  // 色が同じ参考デッキだけで見た「採用されている割合」（似かたが低い入力でも基礎点になる）
  const colRefs=refs.filter(d=>mainCols.some(c=>DB[d.partner].c===c));
  const base={};for(const d of colRefs)for(const i in d.cnt)base[i]=(base[i]||0)+d.cnt[i]/3/Math.max(1,colRefs.length);
  const curve=Array(12).fill(0);let evAvg=0;
  colRefs.forEach(d=>{for(const i in d.cnt){const c=pool[i];if(!c)continue;if(c.t==="イベント")evAvg+=d.cnt[i];else curve[Math.min(11,c.lv||0)]+=d.cnt[i]}});
  const curveTot=curve.reduce((a,b)=>a+b,0)||1;evAvg=colRefs.length?evAvg/colRefs.length:7;
  const want=curve.map(x=>x/curveTot*(40-evAvg)); // 目標: レベルごとのキャラ枚数
  // --- 入力カードの特徴・名前 ---
  const traitW={},names=new Set();
  for(const i in cnt){const c=DB[rep[i]];names.add(c.nm);for(const t of fillTraits(c))traitW[t]=(traitW[t]||0)+cnt[i]}
  if(partner){names.add(DB[partner].nm);for(const t of fillTraits(DB[partner]))traitW[t]=(traitW[t]||0)+1}
  // --- 補う ---
  const have=()=>Object.values(cnt).reduce((a,b)=>a+b,0);
  const lvCnt=Array(12).fill(0);let evCnt=0;
  const tally=()=>{lvCnt.fill(0);evCnt=0;for(const i in cnt){const c=DB[rep[i]];if(c.t==="イベント")evCnt+=cnt[i];else lvCnt[Math.min(11,c.lv||0)]+=cnt[i]}};
  const score=(i,c)=>{
    const have1=cnt[i]||0;const parts={};
    parts.実績=(prior[i]||0)/W*4*3;                      // 入力に近い環境デッキでの採用
    parts.基礎=(base[i]||0)*2;                          // 同じ色の環境デッキ全体での採用
    // 色
    const cols=(c.c||"").split("");const inCols=cols.every(x=>colW[x]>0&&mainCols.includes(x)||false);
    if(!cols.length)parts.色=0;else if(inCols)parts.色=1;
    else if(cols.some(x=>mainCols.includes(x)))parts.色=-1.5;else parts.色=-6;
    // 効果の条件（パートナー・事件の色）
    const cd=fillConds(c);
    for(const x of cd.p)if(pcol){if(x.split("").some(y=>pcol.includes(y)))parts.パートナー=(parts.パートナー||0)+1.5;else parts.パートナー=(parts.パートナー||0)-3}
    for(const x of cd.k)if(kcol){if(x.split("").some(y=>kcol.includes(y)))parts.事件=(parts.事件||0)+1;else parts.事件=(parts.事件||0)-2.5}
    for(const x of cd.bond){if([...names].some(n=>n.includes(x)||x.includes(n)))parts.絆=(parts.絆||0)+1.5;else parts.絆=(parts.絆||0)-1}
    // 特徴
    let tr=0;const tt=Object.values(traitW).reduce((a,b)=>a+b,0)||1;for(const t of fillTraits(c))tr+=(traitW[t]||0)/tt;
    parts.特徴=Math.min(2,tr*3);
    // レベル配分・イベント枚数
    if(c.t==="イベント"){parts.配分=(evAvg-evCnt)*.35-(have1?0:0)}
    else{const lv=Math.min(11,c.lv||0);parts.配分=Math.max(-3,Math.min(2.5,(want[lv]-lvCnt[lv])*.9))}
    // 枚数: 参考デッキの平均枚数まで入れ、そこから先は入りにくくする
    const tgt=(avgN[i]||2);parts.枚数=have1>=tgt?-(have1-tgt+1)*1.6:(have1?.3:0);
    if((c.f||"").includes("何枚でも")===false&&have1>=3)return null;
    if(LIMIT1.includes(i)&&have1>=1)return null;
    // 機能A: 対戦記録からの補正
    if(bias[i])parts.記録=bias[i];
    for(const j in cnt)if(cnt[j]>0){const b=pairBias[i+"|"+j]||pairBias[j+"|"+i];if(b)parts.記録=(parts.記録||0)+b}
    let s=0;for(const k in parts)s+=parts[k];return {s,parts}};
  tally();
  const filled=[];
  while(have()<40){
    let best=null;
    for(const [i,c] of Object.entries(pool)){
      if(exclude.has(i))continue;
      if(onlyAuto&&!auto(c))continue;
      const r=score(i,c);if(!r)continue;
      if(!best||r.s>best.s+1e-9)best={i,c,...r}}
    if(!best){warns.push(`候補が足りず${have()}枚までしか補えませんでした（自動で処理されるカードに絞っているため。onlyAuto=false なら増やせます）`);break}
    cnt[best.i]=(cnt[best.i]||0)+1;rep[best.i]=rep[best.i]||best.c.n;tally();
    const top=Object.entries(best.parts).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,2).filter(x=>x[1]).map(x=>x[0]);
    filled.push({n:best.c.n,i:best.i,s:best.s,why:top.join("・")});
    for(const t of fillTraits(best.c))traitW[t]=(traitW[t]||0)+.5}
  const main=[];for(const i in cnt)for(let k=0;k<cnt[i];k++)main.push(rep[i]);
  const fixedMain=[];const seedCnt={};
  for(const n of seed.main||[])seedCnt[DB[n]&&DB[n].i]=(seedCnt[DB[n]&&DB[n].i]||0)+1;
  // 理由は「補った」カードだけ。同じIDはまとめる
  const sum={};for(const f of filled){const x=sum[f.i]=sum[f.i]||{n:f.n,k:0,why:f.why};x.k++}
  for(const x of Object.values(sum))why.push({n:x.n,k:x.k,why:x.why});
  return {partner,caseN,main,why,warns,colors:mainCols}}
// デッキの一覧表示用（テキスト化は deckToText）
function fillText(r){return deckToText({partner:r.partner,caseN:r.caseN,main:r.main})}

// ---- デッキ補完画面（js/setup.js）用: 事件の色の主力カード候補 ----
let _fillPool=null;
function fillPoolInfo(){ // 環境デッキに出てくるカード（IDごと）の採用デッキ数・代表カードNo。1回だけ数える
  if(_fillPool)return _fillPool;const used={},rep={};
  const isP=n=>/P\d*$/.test(n);
  for(const d of (window.ENV_DECKS&&ENV_DECKS.decks)||[]){const r=parseDeckText(d.text);
    for(const n of new Set([...r.main,r.partner,r.caseN].filter(Boolean))){const c=DB[n];if(!c)continue;used[c.i]=(used[c.i]||0)+1}}
  for(const c of window.CARD_DB){const r=rep[c.i];if(!r||(isP(r)&&!isP(c.n))||(isP(r)===isP(c.n)&&c.n.length<r.length))rep[c.i]=c.n}
  return _fillPool={used,rep};
}
function fillCandidates(caseN){ // 事件の色に収まる、環境デッキに出てくるレベル6以上のキャラ（MRはレベル9）。レベルの高い順、同じなら採用の多い順
  const {used,rep}=fillPoolInfo();const cols=(DB[caseN]&&DB[caseN].c)||"";
  const inCols=c=>c&&[...c.c].every(x=>cols.includes(x));
  return Object.keys(used).map(i=>DB[rep[i]]).filter(c=>c&&c.t==="キャラ"&&(c.lv||0)>=6&&inCols(c))
    .sort((a,b)=>(b.lv-a.lv)||(used[b.i]-used[a.i])||a.n.localeCompare(b.n));
}
