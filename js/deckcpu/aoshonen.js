"use strict";
// デッキ専用CPU: 青少年探偵団（SeEdの方針 2026-11-22、notes/aoshonen-cpu-policy-2026-11-22.md）
// 仕組み: DECK_CPU に「判定 detect」と「手札を使う優先度の加点 play」を登録する。cpu.js の deckPlay が呼ぶ。
// 白単スタンキッドなど別デッキは別ファイルで DECK_CPU.xxx を足す（このファイルは触らない）。
// 切る: cfg.aiOff[席] に "deck" を入れる。AI_OFF0 には入れない（既定で有効、ただし対象デッキの席だけ働く）
window.DECK_CPU=window.DECK_CPU||{};
(function(){
const SHONEN=x=>/少年探偵団/.test((C(x)||{}).ct||"");
// 手札・山・場など全部から少年探偵団の枚数を数えて、このデッキかを判定する（初回だけ）
const isAo=p=>{
  const all=[...p.hand,...p.deck,...p.field,...p.file,...p.rm,...(p.ev||[])];
  const n=all.filter(x=>C(x).t==="キャラ"&&SHONEN(x)).length;
  const blue=all.filter(x=>C(x).c==="青").length;
  return n>=18&&blue>=all.length-2};
const names=(xs,f)=>new Set(xs.filter(x=>C(x).t==="キャラ"&&SHONEN(x)&&(f?f(x):true)).map(x=>C(x).nm));
DECK_CPU.aoshonen={
  detect:isAo,
  // コンタクトで負けそうなとき、条件が揃った「リムーブして1枚引く」系のカットインがあれば使う（SeEd: 条件がきついが使えたら強い）
  cut(q,mine,theirs,cuts,tp){
    const l=C(theirs).lv||0;
    return cuts.find(x=>{const t=C(x).ci||"";if(!/リムーブし/.test(t)||!ownCutinOk(x,q))return false;
      const le=t.match(/レベル(\d+)以下/),ge=t.match(/レベル(\d+)以上/);
      return (!le||l<=+le[1])&&(!ge||l>=+ge[1])&&!/AP[＋+]/.test(t.split("\n")[0])})||null},
  // 手札のカード x を使う優先度の加点（既存の点数に足す）
  play(p,x){
    const c=C(x),id=x.n,fcs=p.file.length;
    const early=!p.solved&&fcs<=5,late=p.solved||fcs>=7;
    const rmNames=names(p.rm).size;                    // リムーブエリアにある名前の違う少年探偵団
    const lv4Field=names(p.field,y=>C(y).lv===4);     // 場のレベル4少年探偵団（名前違い）
    let v=0;
    if(c.t==="キャラ"&&c.lv===4&&SHONEN(x)&&!lv4Field.has(c.nm))v+=early?28:18; // レベル4を名前違いで並べる（カットイン・各登場時効果の条件）
    if(id==="B01016"||id==="B04005")v+=early?12:0;      // 序盤: 手札を整える登場時
    if(id==="B04013")v+=early?18:4;                     // 小さくなった名探偵: サーチ＋登場
    if(c.t==="キャラ"&&c.lv===2)v+=early?10:-6;         // 序盤の証拠貯め要員
    if(id==="B03006"||id==="D08021"){v+=rmNames>=5?70:rmNames>=3?30:rmNames<=1?-70:-25} // 結成: リムーブが貯まってから
    if(id==="B11017")v+=names(p.rm,y=>C(y).lv===4).size>=3?45:-45; // 五人囃子: リムーブにLv4が3種以上あるとき
    if(id==="B05005")v+=45;                             // MR(江戸川コナン＆工藤新一)は出せるなら出す
    if(id==="B11010"||id==="B11003")v+=late?32:24;      // 7コナン・8灰原: リムーブを貯めて除去
    return v}};
})();
