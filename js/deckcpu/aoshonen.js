"use strict";
// デッキ専用CPU: 青単探偵団（公式レシピ B2RISJY2P、プリセット「青単探偵団」）。SeEdの方針 notes/aoshonen-cpu-policy-2026-11-22.md（プロジェクト共有フォルダ）
// 軸: レベル4の名前の違う少年探偵団を並べる（吉田B11007・小嶋B11008・円谷B11009 の条件）→ リムーブエリアを貯めて 結成B03006・五人囃子B11017
// SeEdの方針を手で書いた加点（スイッチ deck）
// 元は PR #109（SeEd版の青少年探偵団向け）。このデッキに無いカード（7コナンB11010・小さくなった名探偵B04013）の分は外した
// 除去カットインの積極化（PR #109 の cut）は、カットインの判断（cpuContact）を別の作業が直しているので、ここには入れていない
(function(){
const SHONEN=x=>/少年探偵団/.test((C(x)||{}).ct||"");
// 手札・山・場など全部から少年探偵団の枚数を数えて、このデッキかを判定する（初回だけ）
const isAo=p=>{
  const all=[...p.hand,...p.deck,...p.field,...p.file,...p.rm,...(p.ev||[])];
  const n=all.filter(x=>C(x).t==="キャラ"&&SHONEN(x)).length;
  const blue=all.filter(x=>C(x).c==="青").length;
  return n>=18&&blue>=all.length-2};
const names=(xs,f)=>new Set(xs.filter(x=>C(x).t==="キャラ"&&SHONEN(x)&&(f?f(x):true)).map(x=>C(x).nm));
// ①SeEdの方針（手札のカード x を使う優先度への加点）
function human(p,x){
  const c=C(x),id=x.n,ph=deckPhase(p);
  const early=ph==="early",late=ph==="late";
  const rmNames=names(p.rm).size;                    // リムーブエリアにある名前の違う少年探偵団
  const lv4Field=names(p.field,y=>C(y).lv===4);     // 場のレベル4少年探偵団（名前違い）
  let v=0;
  if(c.t==="キャラ"&&c.lv===4&&SHONEN(x)&&!lv4Field.has(c.nm))v+=early?28:18; // レベル4を名前違いで並べる（カットイン・各登場時効果の条件）
  if(id==="B01016"||id==="B04005")v+=early?12:0;      // 序盤: 手札を整える登場時
  if(c.t==="キャラ"&&c.lv===2)v+=early?10:-6;         // 序盤の証拠貯め要員（中盤からはカットインとして持っておく）
  if(id==="B03006"||id==="D08021"){v+=rmNames>=5?70:rmNames>=3?30:rmNames<=1?-70:-25} // 結成: リムーブが貯まってから
  if(id==="B11017")v+=names(p.rm,y=>C(y).lv===4).size>=3?45:-45; // 五人囃子: リムーブにLv4が3種以上あるとき
  if(id==="B05005")v+=45;                             // MR(江戸川コナン＆工藤新一)は出せるなら出す
  if(id==="B11003")v+=late?32:24;                     // 8灰原: レベル4が出るたびに除去
  return v}
window.DECK_CPU=window.DECK_CPU||{};
DECK_CPU.aoshonen={detect:isAo,play:(p,x)=>ai2(p,"deck")?human(p,x):0};
})();
