// コンボ探し（盤面を組んで試す版）: 2〜3枚が絡むコンボを、試合を回さずに直接見つける。
// 例: 遠山和葉＆大岡紅葉 B07015 と 服部平次 B07016 が現場にいて、B07015 の【宣言】で手札の「平次…」「カッコエ――ッ♡」B11027 を使う
//     → B11027 の条件が3つともそろって2体リムーブ＋1枚ドロー、さらに B07016 の「緑のイベントを使ったとき」で1体リムーブ（計3体、手札は減らない）
// やり方: 候補カードから「現場の1〜2枚」と「手札の1枚」を選んで盤面を作り、1回の行動（手札の使用か、現場のキャラの【宣言】）をCPUにさせて、
//   盤面がどれだけ得したかを測る。どれか1枚を効果のないカードに入れ替えた盤面と比べ、「全部そろったときだけ大きく得する」ものをコンボとして出す。
// usage: node tools/combo_lab.js デッキ [--cards B11027,B07016,...] [--top 20] [--log] [--notsolved]
//   デッキ: デッキ.txt か、環境デッキの番号・名前の一部。候補はデッキのカード（重複なし）＋ --cards。パートナー・事件の色はデッキのもの
//   --cards だけで試すときは デッキに - を書く（パートナーは候補の1枚目の色の環境デッキから借りる）
//   盤面: 自分は解決編（--notsolved で事件編）・FILE 8枚・手札に効果なしのカード3枚。相手は現場5体（AP2000〜8000、うち3体スリープ）・手札4枚・証拠3つ
// 得点: 手札の使用（1ターン1回）を使ったら-1、相手の現場を離れた枚数×3、自分の手札の増減×1、相手の手札の増減×-1、自分の証拠×3、相手の証拠×-3、自分の現場の増減×1.5、相手のキャラをスリープ/スタン×1
const H=require("./headless");const fs=require("fs");
const args=process.argv.slice(2);const flag=k=>{const i=args.indexOf(k);if(i<0)return null;const v=args[i+1];args.splice(i,2);return v};
const bool=k=>{const i=args.indexOf(k);if(i<0)return false;args.splice(i,1);return true};
const JSONOUT=flag("--json");
const EXTRA=(flag("--cards")||"").split(",").filter(Boolean),TOP=+(flag("--top")||20),SHOWLOG=bool("--log"),SOLVED=!bool("--notsolved");
const deckArg=args[0];
if(!deckArg){console.log("usage: node tools/combo_lab.js デッキ.txt|環境デッキ番号|名前の一部|- [--cards 番号,...] [--top 20] [--log] [--notsolved] [--json 出力.json]");process.exit(1)}

(async()=>{
  const w=H.load({seed:1});const E=w.ENV_DECKS.decks;const C=w.C,FX=w.ev("FX"),DB=w.ev("DB");
  const byN=n=>w.CARD_DB.find(c=>c.n===n||c.n.toUpperCase()===n.toUpperCase());
  let deck,label;
  if(deckArg==="-"){const c0=byN(EXTRA[0]||"");const col=c0?c0.c[0]:"青";
    const d=E.find(d=>{const r=w.parseDeckText(d.text);return (C({n:r.partner}).c||"").includes(col)})||E[0];deck=w.parseDeckText(d.text);deck.main=[];label=`候補カード（パートナー・事件は ${d.name} から）`}
  else if(fs.existsSync(deckArg)){deck=w.parseDeckText(fs.readFileSync(deckArg,"utf8"));label=deckArg}
  else{const d=/^\d+$/.test(deckArg)?E[+deckArg]:E.find(d=>d.name.includes(deckArg));if(!d){console.log("デッキが見つからない:",deckArg);process.exit(1)}deck=w.parseDeckText(d.text);label=d.name}
  const pool=[...new Set([...deck.main,...EXTRA.map(n=>{const c=byN(n);if(!c){console.log("カードが見つからない:",n);process.exit(1)}return c.n})])];
  const chars=pool.filter(n=>DB[n].t==="キャラ");
  // 効果のないカード（入れ替え用・盤面の水増し用）
  const plain=w.CARD_DB.filter(c=>c.t==="キャラ"&&!c.f&&!c.dg&&!c.hr);
  const filler=(plain.find(c=>c.lv===2)||plain[0]).n;
  const oppField=[2000,3000,5000,6000,8000].map(ap=>(plain.find(c=>c.ap===ap)||plain[0]).n);

  function board({field,hand}){
    w.ev("UID=1");
    const P=[0,1].map(i=>{const p=w.mkPlayer(i,i?"相手":"自分",{partner:deck.partner,caseN:deck.caseN,main:[]},true);
      p.deck=Array.from({length:20},()=>w.inst(filler));return p});
    const [me,op]=P;
    me.field=field.map(n=>w.inst(n));me.hand=[...hand,filler,filler,filler].map(n=>w.inst(n));me.file=Array.from({length:8},()=>w.inst(filler));me.solved=SOLVED;
    op.field=oppField.map(n=>w.inst(n));op.field.forEach((y,i)=>{if(i<3)y.st="s"});op.hand=Array.from({length:4},()=>w.inst(filler));op.ev=Array.from({length:3},()=>w.inst(filler));
    me.ev=[w.inst(filler)];
    const G={cfg:{names:["自分","相手"],cpu:true,cpu0:true},P,turn:0,turnNo:5,first:0,over:false,ui:{mode:null},queue:[],undo:[],busy:0,phase:"main",rec:{log:[],acts:[]}};
    w.__setG(G);return G}
  const snap=G=>{const [me,op]=G.P;return {oF:op.field.length,oA:op.field.filter(y=>y.st==="a").length,oH:op.hand.length,oE:op.ev.length,mF:me.field.length,mH:me.hand.length,mE:me.ev.length,uh:!!me.usedHand}};
  const value=(a,b)=>3*(a.oF-b.oF)+1*Math.max(0,(a.oA-b.oA)-(a.oF-b.oF))+(b.mH-a.mH)-(b.oH-a.oH)+3*(b.mE-a.mE)-3*(b.oE-a.oE)+1.5*(b.mF-a.mF)-(b.uh&&!a.uh?1:0); // 手札の使用（1ターン1回）を使ったら-1
  const desc=(a,b)=>{const s=[];if(a.oF>b.oF)s.push(`相手${a.oF-b.oF}体が現場を離れた`);if(b.mH!==a.mH)s.push(`手札${b.mH>a.mH?"+":""}${b.mH-a.mH}`);
    if(b.mE>a.mE)s.push(`証拠+${b.mE-a.mE}`);if(b.oE<a.oE)s.push(`相手の証拠${b.oE-a.oE}`);if(b.mF!==a.mF)s.push(`自分の現場${b.mF>a.mF?"+":""}${b.mF-a.mF}`);if(b.oH<a.oH)s.push(`相手の手札${b.oH-a.oH}`);if(!b.uh)s.push("手札の使用は残る");return s.join("・")||"変化なし"};
  // 1回の行動を試す。act: {kind:"hand",idx} 手札の何枚目を使う／{kind:"ab",fi,label} 現場の fi 番目のキャラの能力
  async function run(field,hand,act){
    const G=board({field,hand});const me=G.P[0];const s0=snap(G);
    try{
      if(act.kind==="hand"){const x=me.hand[0];if(w.playableReason(me,x,false))return null;if(!await w.useFromHand(me,x,false))return null}
      else{const x=me.field[act.fi];const ab=FX.abilities(me,x).find(a=>a.label===act.label);if(!ab||!ab.ok)return null;await FX.useAbility(me,x,ab)}
      await w.runQueue();
    }catch(e){return null}
    const s1=snap(G);return {v:value(s0,s1),d:desc(s0,s1),log:G.rec.log.map(l=>l[1])}}
  // 盤面の組み合わせ: 現場0〜2枚 × 手札0〜1枚 × 行動
  const fieldSets=[[]];for(let i=0;i<chars.length;i++){fieldSets.push([chars[i]]);for(let j=i+1;j<chars.length;j++)fieldSets.push([chars[i],chars[j]])}
  const handSet=[null,...pool];
  const results=[];let tried=0;
  for(const F of fieldSets)for(const X of handSet){
    if(!F.length&&!X)continue;
    const hand=X?[X]:[];
    const acts=[];if(X)acts.push({kind:"hand"});
    {const G=board({field:F,hand});const me=G.P[0];me.field.forEach((x,fi)=>{for(const a of FX.abilities(me,x))if(a.ok&&!a.alt)acts.push({kind:"ab",fi,label:a.label})})}
    for(const act of acts){
      const parts=[...F.map((n,i)=>({n,where:"現場",i})),...(X?[{n:X,where:"手札"}]:[])];
      if(parts.length<2)continue; // 1枚だけの効果はコンボではない
      tried++;const full=await run(F,hand,act);if(!full||full.v<=0)continue;
      // どれか1枚を効果のないカードに入れ替えると、どれだけ減るか（行動の元になるカードは入れ替えない）
      let best=-Infinity,ok=true;
      for(const pt of parts){
        if(act.kind==="ab"&&pt.where==="現場"&&pt.i===act.fi)continue;
        if(act.kind==="hand"&&pt.where==="手札")continue;
        const F2=F.map((n,i)=>pt.where==="現場"&&i===pt.i?filler:n),h2=pt.where==="手札"?[filler]:hand;
        // 手札のカードを入れ替えると「使う」行動ができないので、能力の行動だけ
        const r=await run(F2,h2,act);best=Math.max(best,r?r.v:0)}
      if(best===-Infinity)continue;
      const gain=full.v-best;if(gain<=0.5)continue;
      const how=act.kind==="hand"?`手札の ${C({n:X}).nm} を使う`:`${C({n:F[act.fi]}).nm} の【宣言】「${act.label.slice(0,40)}」`;
      results.push({act:act.kind==='hand'?{kind:'hand',n:X}:{kind:'ab',n:F[act.fi],label:act.label},parts:parts.map(p=>({n:p.n,where:p.where})),gain,v:full.v,size:parts.length,cards:parts.map(p=>`${C({n:p.n}).nm}(${p.n}・${p.where})`),names:parts.map(p=>C({n:p.n}).nm+"・"+p.where),ns:parts.map(p=>p.n),how,d:full.d,log:full.log})}}
  // 同じ顔ぶれの重複（行動違い）は得点の高い方だけ
  // 同じカード名の顔ぶれ（再録・番号違いを含む）は1行にまとめ、番号を並べる
  const seen=new Map();for(const r of results){const k=r.names.slice().sort().join("|");const o=seen.get(k);
    if(!o||o.v<r.v||o.v===r.v&&o.gain<r.gain)seen.set(k,{...r,alt:o?o.alt:new Set()});seen.get(k).alt.add(r.ns.join("+"))}
  const rows=[...seen.values()].sort((a,b)=>b.v-a.v||b.gain-a.gain);
  if(JSONOUT)fs.writeFileSync(JSONOUT,JSON.stringify(rows.map(r=>({act:r.act,parts:r.parts,v:r.v,gain:r.gain,how:r.how,d:r.d})),null,1));
  console.log(`${label}: 候補${pool.length}枚（キャラ${chars.length}）、${tried}通りの盤面と行動を試した（${SOLVED?"解決編":"事件編"}）`);
  console.log("そろったときだけ得するもの（得点＝その行動の得、上乗せ＝どれか1枚を抜いたときとの差。得点の高い順）:");
  const f=v=>(v>=0?"+":"")+(+v.toFixed(1));
  for(const r of rows.slice(0,TOP)){
    console.log(`${f(r.gain).padStart(6)} 得点${f(r.v).padStart(6)}  ${r.size}枚: ${r.cards.join(" ＋ ")}`);
    console.log(`        行動: ${r.how} → ${r.d}`);if(r.alt.size>1)console.log(`        同じ名前の別番号でも: ${[...r.alt].join(" / ")}`);
    if(SHOWLOG)for(const l of r.log)console.log("          | "+l.trim())}
  if(!rows.length)console.log("（見つからなかった）");
})();
