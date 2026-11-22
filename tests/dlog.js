// 詳しい対戦ログ（js/dlog.js）: 1戦ずつ保存し、3戦を超えたら古い順に消える。テキスト化が通常ログと同じターン番号で読める
const assert=require("assert");const H=require("../tools/headless");
module.exports=[
  ["4戦すると直近3戦だけ残り、手札・ドロー・選択・ガード/カットイン・探索の記録が入る",async()=>{
    const w=H.load({seed:3,init:{SIM_SAVE:1}});const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
    const starts=[];
    for(let i=0;i<4;i++){const r=await H.play(w,{decks:[ds[0],ds[1]],search:[true,true]});assert.ok(r.over,"決着");starts.push(w.__G().rec.start);await new Promise(r=>setTimeout(r,2))}
    const all=w.dlLoad();assert.strictEqual(all.length,3);
    assert.ok(!all.some(r=>r.start===starts[0])||new Set(starts).size<4,"最初の1戦が消えている");
    const r=all[2],kinds=new Set(r.ev.map(e=>e.k));
    for(const k of ["turnStart","turnEnd","draw","pick"])assert.ok(kinds.has(k),k+" の記録がない");
    const t=w.dlText(r);
    assert.ok(/— 1ターン目: /.test(t),"通常ログのターン番号");assert.ok(t.includes("【手番開始・盤面】")&&t.includes("【ドロー】")&&t.includes("【選択(CPU)】"));
    assert.ok(r.log.length>10&&r.winner!=null);
    // 手番開始の記録は通常ログの「— Nターン目 —」より後ろに入る
    assert.ok(t.indexOf("— 1ターン目")<t.indexOf("【手番開始・盤面】"));
    assert.ok(!w.warns.length,w.warns.slice(0,2).join("/"))}],
  ["探索の試しの手番や大量対戦（SIM_FAST）では記録しない",async()=>{
    const w=H.load({seed:4});const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
    await H.play(w,{decks:[ds[0],ds[1]],search:[true,true]});
    assert.strictEqual(w.dlLoad().length,0);assert.strictEqual(w.__G().dlog.length,0)}],
];

// ---- 短縮版を読み戻して、元のイベントと一致することを確かめる（情報が落ちていないことの確認）----
function expand(t){
  const L=t.split("\n"),di=L.indexOf("カード辞書:"),li=L.indexOf("## ログ"),D={};
  for(const l of L.slice(di+1,li)){const m=/^#(\d+)=(.*)$/.exec(l);D["#"+m[1]]=m[2]}
  const un=tok=>{const m=/^(#\d+)(?:x(\d+))?$/.exec(tok);return m?Array(+(m[2]||1)).fill(D[m[1]]):[tok]};
  const cl=s=>s==="-"?[]:s.split(" ").flatMap(un);
  const tl=s=>{const m=/^(#\d+)(.*)$/.exec(s);return D[m[1]]+m[2]};   // #n + 後ろ
  const fl=s=>{const m=/^(#\d+)(\([SX]\))?:(\d+)$/.exec(s);return D[m[1]]+(m[2]||"")+"AP"+m[3]};
  const S=" ¦ ",out=[],last={},log=[];
  for(let i=li+1;i<L.length;i++){const l=L[i];const f=l.split(S),h=f[0].split(" ");
    const pn=x=>+x[1];
    if(l==="[始]"||l==="[終]"){const k=l==="[始]"?"turnStart":"turnEnd",b=[];
      while(/^P\d /.test(L[i+1]||"")){i++;const fs=L[i].split(S),who=+fs[0][1];const o=last[who]||{hand:[],field:[],file:0,ev:0,level:0,solved:0,rm:0,deck:0,partner:""};const n={...o,hand:[...o.hand],field:[...o.field],who};
        let first=fs[0].slice(3);const parts=[first,...fs.slice(1)];
        for(const p of parts){const sp=p.indexOf(" "),key=p.slice(0,sp),v=p.slice(sp+1);
          if(key==="手"){if(!last[who])n.hand=cl(v);else for(const x of v.split(" ")){const [c]=un(x.slice(1));const sgn=x[0],name=D[x.slice(1)];const arr=n.hand;if(sgn==="+")arr.push(name);else arr.splice(arr.indexOf(name),1)}}
          else if(key==="場"){if(!last[who])n.field=v==="-"?[]:v.split(" ").map(fl);else for(const x of v.split(" ")){const s=fl(x.slice(1));if(x[0]==="+")n.field.push(s);else n.field.splice(n.field.indexOf(s),1)}}
          else n[{file:"file",ev:"ev",lv:"level",solved:"solved",rm:"rm",deck:"deck",pt:"partner"}[key]]=key==="pt"?v:+v}
        last[who]=n;b.push(n)}
      out.push({k,b:[0,1].filter(q=>last[q]).map(q=>last[q])});continue} // 変化のないプレイヤーは行が省かれる＝前回と同じ
    if(h[0]==="引")out.push({k:"draw",who:pn(h[1]),cards:cl(h.slice(2).join(" ")),tag:f[1]||""});
    else if(h[0]==="マリガン"){const m=/^マリガン P(\d) 手 (.*) 戻 (.*)$/.exec(l);out.push({k:"mull",who:+m[1],hand:cl(m[2]),back:cl(m[3])})}
    else if(h[0]==="選"){const [mn,mx]=f[2].split("-");out.push({k:"pick",who:pn(f[0].split(" ")[1]),cpu:f[0].endsWith("*"),title:f[1],min:+mn,max:+mx,cands:cl(f[3]),chose:cl(f[4])})}
    else if(h[0]==="諾否")out.push({k:"yes",who:pn(f[0].split(" ")[1]),cpu:f[0].endsWith("*"),title:f[1],body:f[2],v:f[3]==="1"});
    else if(h[0]==="ガード"){const o=f[7].split(" ").map(Number);out.push({k:"guard",who:pn(f[0].split(" ")[1]),cpu:f[0].endsWith("*"),atk:D[f[1]],apAtk:+f[2],target:f[3]==="事件"?"事件":tl(f[3]),cands:f[4]==="-"?[]:f[4].split(" ").map(tl),chose:f[5]==="-"?"":tl(f[5]),hand:cl(f[6]),oHand:o[0],oField:o[1],ev:o[2],oEv:o[3]})}
    else if(h[0]==="接触"){const o=f[9].split(" ").map(Number);out.push({k:"contact",who:pn(f[0].split(" ")[1]),cpu:f[0].endsWith("*"),tp:f[1]==="1",mine:tl(f[2]),theirs:tl(f[3]),need:+f[4],cuts:f[5]==="-"?[]:f[5].split(" ").map(tl),dis:cl(f[6]),
      chose:f[7]==="-"?"":tl(f[7].replace(/\((カ|変装)\)$/,""))+(/変装\)$/.test(f[7])?"(変装)":"(カットイン)"),hand:cl(f[8]),oHand:o[0],oRm:o[1]})}
    else if(h[0]==="探索")out.push({k:"search",who:pn(f[0].split(" ")[1]),pick:f[1],plans:f.slice(2).map(x=>{const j=x.indexOf(" ");return [x.slice(j+1),+x.slice(0,j)]})});
    else if(h[0]==="コンボ表")out.push({k:"combo",who:pn(f[0].split(" ")[1]),how:f[1]});
    else log.push(l)}
  return {ev:out,log}}
const norm=e=>{const o={};for(const k of Object.keys(e).sort())if(k!=="t"&&k!=="li")o[k]=e[k];for(const k of ["hand","cands","chose","cards","back"])if(Array.isArray(o[k]))o[k]=[...o[k]].sort();return o};
module.exports.push(["短縮版を読み戻すと、元のイベント(手札・ドロー・選択・ガード・カットイン・探索・盤面)とログが全部一致する",async()=>{
  const w=H.load({seed:11,init:{SIM_SAVE:1}});const ds=w.ev("PRESETS").map(d=>w.parseDeckText(d.text));
  for(let i=0;i<3;i++){await H.play(w,{decks:[ds[i%2],ds[(i+1)%2]],search:[true,i%2===0]});
    const r=w.dlLoad().pop(),t=w.dlCompact(r),x=expand(t),T=w.dlText(r);
    assert.strictEqual(x.log.join("\n"),r.log.map(l=>l[1]).join("\n"),"通常ログが同じ");
    assert.strictEqual(x.ev.length,r.ev.length,"イベント数");
    r.ev.forEach((e,j)=>{
      let a=e,b=x.ev[j];
      if(e.k==="turnStart"||e.k==="turnEnd"){ // 盤面は両者の全項目で比べる（辞書順は問わない）
        const nb=bs=>bs.map(q=>({who:q.who,hand:[...q.hand].sort(),field:[...q.field].sort(),file:q.file,ev:q.ev,level:q.level,solved:q.solved?1:0,rm:q.rm,deck:q.deck,partner:q.partner}));
        a={k:e.k,b:nb(e.b)};b={k:b.k,b:nb(b.b)}}
      assert.strictEqual(JSON.stringify(norm(b)),JSON.stringify(norm(a)),`${j}番目 ${e.k}`)});
    assert.ok(t.length<T.length,`短縮版が短い ${t.length} < ${T.length}`);console.log(`   (参考) ${i+1}戦目 テキスト版${T.length}字 → 短縮版${t.length}字`)}}]);
