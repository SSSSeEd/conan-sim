// コンボ探し（盤面を組んで試す版）: 2〜3枚が絡むコンボを、試合を回さずに直接見つける。
// 例: 遠山和葉＆大岡紅葉 B07015 と 服部平次 B07016 が現場にいて、B07015 の【宣言】で手札の「平次…」「カッコエ――ッ♡」B11027 を使う
//     → B11027 の条件が3つともそろって2体リムーブ＋1枚ドロー、さらに B07016 の「緑のイベントを使ったとき」で1体リムーブ（計3体、手札は減らない）
// やり方: 候補カードから「現場の0〜2枚」「手札の1枚」「デッキの上から2枚目の1枚」のうち2〜3枚を置いた盤面を作り、
//   同じターンの行動（手札の使用・現場のキャラの【宣言】）を最大 --steps 回（既定3）まで、すべての並びをCPUにさせて一番得する並びを探す。
//   どれか1枚を効果のないカードに入れ替えた盤面の一番得する並びと比べ、「全部そろったときだけ大きく得する」ものをコンボとして出す。
//   デッキの2枚目に置いたカードは、1枚引くだけでは来ないが、2枚引く・上から見る効果（登場時に探す など）で届く。
//   ターンをまたぐもの（相手ターン中の効果・ターン終了時）と、相手の妨害（カットインなど）は見ない。
// usage: node tools/combo_lab.js デッキ [--cards B11027,B07016,...] [--steps 3] [--top 20] [--log] [--notsolved]
//   デッキ: デッキ.txt か、環境デッキの番号・名前の一部。候補はデッキのカード（重複なし）＋ --cards。パートナー・事件の色はデッキのもの
//   --cards だけで試すときは デッキに - を書く（パートナーは候補の1枚目の色の環境デッキから借りる）
//   盤面: 自分は解決編（--notsolved で事件編）・FILE 8枚・手札に効果なしのカード3枚。相手は現場5体（AP2000〜8000、うち3体スリープ）・手札4枚・証拠3つ
// 得点: 手札の使用（1ターン1回）を使ったら-1、相手の現場を離れた枚数×3、自分の手札の増減×1、相手の手札の増減×-1、自分の証拠×3、相手の証拠×-3、自分の現場の増減×1.5、相手のキャラをスリープ/スタン×1
const H=require("./headless");const fs=require("fs");
const args=process.argv.slice(2);const flag=k=>{const i=args.indexOf(k);if(i<0)return null;const v=args[i+1];args.splice(i,2);return v};
const bool=k=>{const i=args.indexOf(k);if(i<0)return false;args.splice(i,1);return true};
const STEPS=+(flag("--steps")||3),EXTRA=(flag("--cards")||"").split(",").filter(Boolean),TOP=+(flag("--top")||20),SHOWLOG=bool("--log"),SOLVED=!bool("--notsolved");
const deckArg=args[0];
if(!deckArg){console.log("usage: node tools/combo_lab.js デッキ.txt|環境デッキ番号|名前の一部|- [--cards 番号,...] [--steps 3] [--top 20] [--log] [--notsolved]");process.exit(1)}

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

  function board({field,hand,deckTop}){
    w.ev("UID=1");
    const P=[0,1].map(i=>{const p=w.mkPlayer(i,i?"相手":"自分",{partner:deck.partner,caseN:deck.caseN,main:[]},true);
      p.deck=Array.from({length:20},()=>w.inst(filler));return p});
    if(deckTop)P[0].deck[1]=w.inst(deckTop); // デッキの上から2枚目（1枚引くだけでは来ない。2枚引く・上から見る効果で届く）
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
  // 行動を順に試す。seq: [{kind:"hand",n}（手札のそのカードを使う）／{kind:"ab",n,label}（現場のそのカードの【宣言】）]。
  // 最後の盤面の得点と、次に選べる行動の一覧を返す（行動できなければ null）
  const actId=a=>a.kind==="hand"?"h"+a.n:"a"+a.n+a.label;
  async function run(field,hand,deckTop,seq){
    const G=board({field,hand,deckTop});const me=G.P[0];const s0=snap(G);
    try{for(const a of seq){
        if(a.kind==="hand"){const x=me.hand.find(y=>y.n===a.n&&!w.playableReason(me,y,false));if(!x||!await w.useFromHand(me,x,false))return null}
        else{let done=false;for(const x of me.field.filter(y=>y.n===a.n)){const ab=FX.abilities(me,x).find(b=>b.label===a.label&&b.ok&&!b.alt);if(ab){await FX.useAbility(me,x,ab);done=true;break}}if(!done)return null}
        await w.runQueue();if(G.over)break}
    }catch(e){return null}
    const s1=snap(G);const next=[];
    if(!G.over){for(const y of me.hand)if(y.n!==filler&&!w.playableReason(me,y,false)&&!next.some(b=>b.kind==="hand"&&b.n===y.n))next.push({kind:"hand",n:y.n});
      for(const x of me.field)if(x.n!==filler)for(const b of FX.abilities(me,x))if(b.ok&&!b.alt&&!next.some(c=>actId(c)===actId({kind:"ab",n:x.n,label:b.label})))next.push({kind:"ab",n:x.n,label:b.label})}
    return {v:value(s0,s1),d:desc(s0,s1),log:G.rec.log.map(l=>l[1]),next}}
  // その盤面で、STEPS回までの行動の並びのうち一番得するもの（同じ盤面は覚えておく）
  const memo=new Map();
  async function best(F,X,D){const k=[...F].sort().join(",")+"|"+X+"|"+D;if(memo.has(k))return memo.get(k);
    const hand=X?[X]:[],deckTop=D;let top={v:0,seq:[],d:"変化なし",log:[]};
    const go=async(seq)=>{const r=await run(F,hand,deckTop,seq);if(!r)return;
      if(seq.length&&(r.v>top.v+1e-9||r.v===top.v&&seq.length<top.seq.length&&seq.length))top={v:r.v,seq,d:r.d,log:r.log};
      if(seq.length<STEPS)for(const a of r.next)await go([...seq,a])};
    await go([]);memo.set(k,top);return top}
  const how=(seq)=>seq.map(a=>a.kind==="hand"?`手札の ${C({n:a.n}).nm} を使う`:`${C({n:a.n}).nm} の【宣言】「${a.label.slice(0,30)}」`).join(" → ");
  // 盤面の組み合わせ: 現場0〜2枚・手札0〜1枚・デッキの上から2枚目0〜1枚（STEPS≧2のときだけ。登場時などで探す・引くカード）で、合わせて2〜3枚
  const fieldSets=[[]];for(let i=0;i<chars.length;i++){fieldSets.push([chars[i]]);for(let j=i+1;j<chars.length;j++)fieldSets.push([chars[i],chars[j]])}
  const handSet=[null,...pool],deckSet=STEPS>=2?[null,...pool]:[null];
  const results=[];let tried=0;
  for(const F of fieldSets)for(const X of handSet)for(const D of deckSet){
    const parts=[...F.map((n,i)=>({n,where:"現場",i})),...(X?[{n:X,where:"手札"}]:[]),...(D?[{n:D,where:"デッキ"}]:[])];
    if(parts.length<2||parts.length>3)continue; // 1枚だけの効果はコンボではない
    tried++;const full=await best(F,X,D);if(full.v<=0||!full.seq.length)continue;
    // どれか1枚を効果のないカードに入れ替えると、一番得する並びでもどれだけ減るか
    let worst=-Infinity;
    for(const pt of parts){
      const F2=F.map((n,i)=>pt.where==="現場"&&i===pt.i?filler:n);
      const r=await best(F2,pt.where==="手札"?filler:X,pt.where==="デッキ"?null:D);worst=Math.max(worst,r.v)}
    const gain=full.v-worst;if(gain<=0.5)continue;
    results.push({gain,v:full.v,size:parts.length,steps:full.seq.length,cards:parts.map(p=>`${C({n:p.n}).nm}(${p.n}・${p.where})`),names:parts.map(p=>C({n:p.n}).nm+"・"+p.where),ns:parts.map(p=>p.n),how:how(full.seq),d:full.d,log:full.log})}
  // 同じ顔ぶれの重複（行動違い）は得点の高い方だけ
  // 同じカード名の顔ぶれ（再録・番号違いを含む）は1行にまとめ、番号を並べる
  const seen=new Map();for(const r of results){const k=r.names.slice().sort().join("|");const o=seen.get(k);
    if(!o||o.v<r.v||o.v===r.v&&o.gain<r.gain)seen.set(k,{...r,alt:o?o.alt:new Set()});seen.get(k).alt.add(r.ns.join("+"))}
  const rows=[...seen.values()].sort((a,b)=>b.v-a.v||b.gain-a.gain);
  console.log(`${label}: 候補${pool.length}枚（キャラ${chars.length}）、${tried}通りの盤面で${STEPS}手まで試した（${SOLVED?"解決編":"事件編"}・${memo.size}盤面）`);
  console.log("そろったときだけ得するもの（得点＝その並びの得、上乗せ＝どれか1枚を抜いたときとの差。得点の高い順）:");
  const f=v=>(v>=0?"+":"")+(+v.toFixed(1));
  for(const r of rows.slice(0,TOP)){
    console.log(`${f(r.gain).padStart(6)} 得点${f(r.v).padStart(6)}  ${r.size}枚・${r.steps}手: ${r.cards.join(" ＋ ")}`);
    console.log(`        行動: ${r.how} → ${r.d}`);if(r.alt.size>1)console.log(`        同じ名前の別番号でも: ${[...r.alt].join(" / ")}`);
    if(SHOWLOG)for(const l of r.log)console.log("          | "+l.trim())}
  if(!rows.length)console.log("（見つからなかった）");
})();
