"use strict";
// ================= 通知・ダイアログ（人の操作を待つ画面） =================
function toast(msg){if(G&&G.sim)return;const t=document.getElementById("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2600)}
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
// 文字を入力してもらう。決定で文字列、キャンセルで null
function askText(title,body,init){
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(title)}</div>${body?`<div class="mb">${esc(body)}</div>`:""}<input id="askTx" value="${esc(init||"")}" style="width:100%;box-sizing:border-box;margin:6px 0"><div class="opts"></div>`);
    const inp=m.querySelector("#askTx"),o=m.querySelector(".opts");
    const ok=document.createElement("button");ok.className="primary";ok.textContent="決定";
    const go=()=>{const v=inp.value.trim();if(v)done(v)};
    ok.onclick=go;inp.onkeydown=e=>{if(e.key==="Enter")go()};
    const no=document.createElement("button");no.textContent="やめる";no.onclick=()=>done(null);
    o.appendChild(ok);o.appendChild(no);inp.focus();inp.select();
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
function orderCards(title,cards,{body,okLabel="この順番で戻す",keepLabel="表示の順のまま"}={}){
  if(cards.length<2)return Promise.resolve(cards.slice());
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(title)}</div><div class="mb">${esc(body||"デッキの下に戻す順番を、カードをタップして決めてください。①が上（先に引く側）、最後の番号がデッキの一番下になります。もう一度タップで取り消し。")}</div><div class="cards"></div><div class="opts"></div>`);
    const ord=[];const box=m.querySelector(".cards");const els=new Map();
    const ok=document.createElement("button");ok.className="primary";
    const upd=()=>{for(const [x,el] of els){const i=ord.indexOf(x);el.classList.toggle("sel",i>=0);const t=el.querySelector(".ordn");if(t)t.remove();if(i>=0)el.insertAdjacentHTML("beforeend",`<span class="ordn">${i+1}</span>`)}
      ok.disabled=ord.length!==cards.length;ok.textContent=ord.length===cards.length?okLabel:`あと${cards.length-ord.length}枚`};
    for(const x of cards){const el=cardEl(x);els.set(x,el);el.onclick=()=>{const i=ord.indexOf(x);if(i>=0)ord.splice(i,1);else ord.push(x);upd()};box.appendChild(el)}
    ok.onclick=()=>done(ord.slice());m.querySelector(".opts").appendChild(ok);
    const as=document.createElement("button");as.textContent=keepLabel;as.onclick=()=>done(cards.slice());m.querySelector(".opts").appendChild(as);upd();
  });
}

// ===== 記録の圧縮コピー（長いログがコピーできないとき） =====
// 人には読めない短い形（js/feedback.js の pack）。ログなし=分析に要るものだけ。貼り付けて読み込み画面に入れれば元に戻る
// 詳しい対戦ログ（dlog.js）のコピー・保存。圧縮はしない（そのまま貼って読める形）
async function dlogCopy(r,compact){const t=compact?dlCompact(r):dlText(r);let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){}
  if(ok)toast(`詳しいログをコピーしました（${Math.round(t.length/1000)}KB）`);
  else await ask("コピーできませんでした","下の内容を選んでコピーするか、保存を使ってください。\n\n"+t.slice(0,20000),[{label:"OK",value:1,primary:true}])}
async function dlogFile(r,kind){const json=kind==="json",body=json?JSON.stringify(r,null,1):kind==="cmp"?dlCompact(r):dlText(r),type=json?"application/json":"text/plain";
  const name=`conan-sim-detail-${r.start.slice(0,16).replace(/[-:T]/g,"")}${kind==="cmp"?"-short":""}.${json?"json":"txt"}`;
  const blob=new Blob([body],{type});
  try{const f=new File([blob],name,{type});if(navigator.canShare&&navigator.canShare({files:[f]})&&matchMedia("(pointer:coarse)").matches){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove()}
async function dlogMenu(r){const v=await ask("詳しい対戦ログ",`${r.names[0]} vs ${r.names[1]}（${r.decks[0]} / ${r.decks[1]}）${r.turns}ターン\n通常のログに、手札の中身・ドロー・選択の候補と選んだ札・ガード/カットインの判断材料・探索の点数を足したものです。`,
  [{label:"振り返り（勝負所を文章で）",value:"rv",primary:true},{label:"コピー（短縮版・分析用）",value:"cpc"},{label:"短縮版を保存",value:"cmp"},{label:"コピー（通常テキスト）",value:"cp"},{label:"通常テキストで保存",value:"txt"},{label:"JSONで保存",value:"json"},{label:"閉じる",value:0}]);
  if(v==="rv")await dlogReview(r);else if(v==="cpc")await dlogCopy(r,true);else if(v==="cp")await dlogCopy(r);else if(v==="txt"||v==="json"||v==="cmp")await dlogFile(r,v)}
// 対戦後の振り返り（js/review.js）: 人の手番ごとにCPUの探索と比べ、勝負所を定型文で出す。探索を回すので数秒〜十数秒かかる
async function dlogReview(r){
  if(G&&!G.over&&G.rec){toast("対戦中は使えません（対戦が終わってから）");return}
  let text="";
  await modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">振り返り</div><div class="mb frbody" id="rvBody" style="font-size:13px;line-height:1.5">計算しています…</div>
      <div class="opts"><button id="rvCopy" disabled>コピー</button><button class="primary" id="rvClose">閉じる</button></div>`);
    m.querySelector("#rvClose").onclick=()=>done();
    const body=m.querySelector("#rvBody");
    reviewGame(r,{onProgress:(i,n)=>{body.textContent=`計算しています… ${i}/${n}手番`}}).then(res=>{
      text=res.lines.join("\n");
      const cardsHtml=res.cards.map(c=>`<div class="rvcard"><div class="rvt">${c.t}<small>ターン目</small></div><div class="rvitems">${c.items.map(i=>`<div class="rvit sev-${i.sev}"><span class="rvs">${i.sev}</span><div><b>${esc(i.head)}</b><div class="rvd">${esc(i.detail)}</div></div></div>`).join("")}</div></div>`).join("");
      body.style.whiteSpace="normal";
      body.innerHTML=`<div class="rvhead">${esc(res.head)}</div>${res.note?`<div class="rvd">${esc(res.note)}</div>`:`<div class="rvd">勝負所の手番（大＝特に大きい取りこぼし）</div>`}${cardsHtml}<div class="rvfoot">盤面の定型判定とCPUの探索の点数だけの参考です。カードの細かい効果読みや相手の手札の推測は含みません。</div>`;
      const c=m.querySelector("#rvCopy");c.disabled=false;
      c.onclick=async()=>{try{await navigator.clipboard.writeText(text);toast("コピーしました")}catch(e){toast("コピーできませんでした")}}
    }).catch(e=>{console.warn(e);body.textContent="振り返りを作れませんでした"})})}
async function copyPacked(recs,{log}={}){
  const list=Array.isArray(recs)?recs:[recs];
  let chunks;try{chunks=await Feedback.packChunks(list,{parse:t=>parseDeckText(t),nameOf:n=>(DB[n]||{}).nm||n,log},{per:10})}catch(e){console.warn(e);toast("圧縮できませんでした");return}
  if(!chunks.length){toast("圧縮できる記録がありません");return}
  const all=chunks.join("\n\n"),name=`conan-sim-packed-${new Date().toISOString().slice(0,10)}`;
  const save=async()=>{const blob=new Blob([all],{type:"text/plain"}),f=new File([blob],name+".txt",{type:"text/plain"});
    try{if(navigator.canShare&&navigator.canShare({files:[f]})&&matchMedia("(pointer:coarse)").matches){await navigator.share({files:[f],title:f.name});return}}catch(e){if(e&&e.name==="AbortError")return}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=f.name;document.body.appendChild(a);a.click();a.remove()};
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">圧縮コピー（${list.length}戦・${chunks.length}分割）</div>
      <div class="mb" style="font-size:12px;color:var(--ink-dim)">1つずつコピーして順に貼るか、テキストファイルで保存して渡してください（全部入りの1ファイル）。人には読めない形です。</div><div class="opts" id="cpL"></div>
      <div class="opts"><button id="cpSave">テキストファイルで保存（全${chunks.length}分割）</button><button class="primary" id="cpClose">閉じる</button></div>`);
    const L=m.querySelector("#cpL");
    chunks.forEach((c,i)=>{const b=document.createElement("button");b.textContent=`${i+1}/${chunks.length} をコピー（${c.length}文字）`;
      b.onclick=async()=>{try{await navigator.clipboard.writeText(c);b.textContent=`✓ ${i+1}/${chunks.length} コピー済み`}catch(e){b.textContent="コピーできません（ファイル保存を使ってください）"}};L.appendChild(b)});
    m.querySelector("#cpSave").onclick=save;m.querySelector("#cpClose").onclick=()=>done();
  })}
// ===== 対戦記録（JSON）を取り込んで、アプリ内でフィードバックを見る =====
// 記録JSON v2（アプリの「全記録を書き出す」）の配列または1試合分。分析は js/feedback.js（tools/feedback.js と共通）
function feedbackReport(records,srcLabel){
  const recs=(Array.isArray(records)?records:[records]).filter(r=>r&&r.deckLists&&r.acts);
  return modal((m,done)=>{
    let res=[];try{res=Feedback.analyze(recs,{parse:t=>parseDeckText(t),nameOf:n=>(DB[n]||{}).nm||n})}catch(e){console.warn(e)}
    const close='<div class="opts"><button class="primary" id="frClose">閉じる</button></div>';
    if(!res.length){
      m.insertAdjacentHTML("beforeend",`<div class="mt">フィードバック</div><div class="mb">分析できる対戦記録がありません。「全記録を書き出す（JSON）」で保存した記録JSON（v2）を読み込んでください。${recs.length!==(Array.isArray(records)?records.length:1)?"\n（行動の記録が無い古い形式の記録は対象外です）":""}</div>${close}`);
      m.querySelector("#frClose").onclick=()=>done();return}
    const n=recs.length;
    m.insertAdjacentHTML("beforeend",`<div class="mt">フィードバック</div>
      <div class="mb" style="font-size:12px;color:var(--ink-dim)">${esc(srcLabel||"")} ${n}戦を分析（あなたの席のデッキごと）。試合数が少ないうちは傾向として見てください。</div>
      <div class="frbody">${res.map(dk=>`<div class="frdeck"><div class="frh">${esc(dk.label)}<span>${dk.games}戦 ${dk.wins}勝（勝率${dk.games?Math.round(dk.wins/dk.games*100):0}%）</span></div>
        <ul class="frtips">${dk.tips.map(t=>`<li class="fr-${t.kind}">${hl(t.text)}</li>`).join("")}</ul>
        ${dk.memo&&dk.memo.length?`<div class="meta">自分のメモ: ${dk.memo.map(esc).join(" / ")}</div>`:""}
        <details><summary>相手デッキ別の成績（${dk.opps.length}種）</summary><table class="frt"><tr><th>相手</th><th>戦績</th><th>勝ち平均T</th><th>負け平均T</th><th>3T目の証拠差</th></tr>${dk.opps.map(o=>`<tr><td>${esc(o.label)}</td><td>${o.wins}勝${o.games-o.wins}敗（${o.rate}%）</td><td>${o.avgWin??"-"}</td><td>${o.avgLose??"-"}</td><td>${o.gap??"-"}</td></tr>`).join("")}</table><div class="meta">3T目の証拠差＝3回目の自分のターンの始めの（相手の証拠−自分の証拠）。プラスは押されている</div></details>
        <details><summary>カード別の使用率（${dk.rows.length}種）</summary><table class="frt"><tr><th>カード</th><th>枚数</th><th>使用率</th><th>使った時の勝率</th><th>使わない時の勝率</th></tr>${dk.rows.map(r=>`<tr><td>${esc(r.nm)}</td><td>${r.copies}</td><td>${r.rate}%</td><td>${r.playedG?r.wPlayed+"%":"-"}</td><td>${r.notPlayedG?r.wNot+"%":"-"}</td></tr>`).join("")}</table></details></div>`).join("")}</div>
      <div class="opts"><button id="frCopy">Markdownでコピー</button>${close.replace('<div class="opts">','').replace('</div>','')}</div>`);
    m.querySelector("#frClose").onclick=()=>done();
    m.querySelector("#frCopy").onclick=async()=>{try{await navigator.clipboard.writeText(Feedback.toMarkdown(res));toast("コピーしました")}catch(e){toast("コピーできませんでした")}};
  });
}
// 記録JSONの取り込み画面: ファイルを選ぶか、中身を貼り付ける
function feedbackImport(){
  return modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">記録JSONを読み込む</div>
      <div class="mb" style="font-size:12px;color:var(--ink-dim)">「全記録を書き出す（JSON）」で保存したファイルや、圧縮コピーのテキストファイルを選ぶか、中身を貼り付けてください（圧縮コピーは何個つなげて貼ってもOK）。</div>
      <input type="file" id="fiFile" accept=".json,.txt,application/json,text/plain">
      <textarea id="fiText" rows="5" placeholder="ここにJSONを貼り付け" style="width:100%;box-sizing:border-box;margin-top:6px;font-size:12px"></textarea>
      <div class="dmsg" id="fiMsg"></div>
      <div class="opts"><button class="primary" id="fiGo">フィードバックを見る</button><button id="fiClose">閉じる</button></div>`);
    const msg=t=>{const e=m.querySelector("#fiMsg");e.className="dmsg bad";e.textContent=t};
    const run=async(txt,label)=>{let j;
      if(/^\s*CS[12]/.test(txt)){try{const u=await Feedback.unpackAny(txt,{nameOf:n=>(DB[n]||{}).nm||n});j=u.records;if(u.missing.length)label=(label||"")+`（${u.total}分割のうち ${u.missing.join("・")} が足りません）`}catch(e){msg("圧縮コピーとして読めませんでした");return}}
      else try{j=JSON.parse(txt)}catch(e){msg("JSONとして読めませんでした");return}
      const a=(Array.isArray(j)?j:[j]).filter(r=>r&&r.deckLists&&r.acts);
      if(!a.length){msg("対戦記録が見つかりません（記録JSON v2 の配列、または1試合分が必要です）");return}
      done();await feedbackReport(a,label)};
    m.querySelector("#fiFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>run(String(rd.result),f.name);rd.readAsText(f)};
    m.querySelector("#fiGo").onclick=()=>{const t=m.querySelector("#fiText").value.trim();if(!t){msg("ファイルを選ぶか、JSONを貼り付けてください");return}run(t,"貼り付けた記録")};
    m.querySelector("#fiClose").onclick=()=>done();
  });
}

// ===== 対戦後のフィードバック（改善点・CPUへのアドバイス） =====
// 対戦記録に一緒に保存し、GitHubのIssueとしても送れる（Claudeが後で読める）
const FB_REPO="SSSSeEd/conan-sim";
function feedbackPage(rec){
  return modal((m,done)=>{
    const old=rec&&rec.feedback||{};
    const sum=rec?`${rec.names[0]}（${rec.decks[0]}） vs ${rec.names[1]}（${rec.decks[1]}）・${rec.turns||"?"}ターン・${rec.winner!=null?rec.names[rec.winner]+" の勝ち":"途中"}`:"";
    m.insertAdjacentHTML("beforeend",`<div class="mt">フィードバック</div>
      <div class="mb" style="font-size:12px;color:var(--ink-dim)">${rec?esc(sum)+"\n書いた内容はこの対戦の記録と一緒に保存されます。":"アプリ全体への要望・バグ報告です。"}「GitHubに送る」を押すと、Claudeが次の作業で読めるように送信画面が開きます。${rec?"対戦ログなどの詳細はクリップボードにコピーされるので、開いた画面の本文の最後に貼り付けてください。":""}</div>
      <label class="fbl">アプリの改善点・バグ<textarea id="fbApp" rows="4" placeholder="例: アクションの後に画面が戻らない、カードの効果が違う など">${esc(old.app||"")}</textarea></label>
      <label class="fbl">CPUへのアドバイス<textarea id="fbCpu" rows="4" placeholder="例: 2ターン目にパスしないで、このカードを先に出すべき など">${esc(old.cpu||"")}</textarea></label>
      <div class="opts"><button class="primary" id="fbSave">保存</button><button id="fbGh">${rec?"保存して":""}GitHubに送る</button><button id="fbClose">閉じる</button></div>`);
    const save=()=>{const fb={app:m.querySelector("#fbApp").value.trim(),cpu:m.querySelector("#fbCpu").value.trim(),at:new Date().toISOString()};
      if(rec){rec.feedback=fb;try{const all=loadRecords();const i=all.findIndex(r=>r.start===rec.start);if(i>=0){all[i].feedback=fb;localStorage.setItem(REC_KEY,JSON.stringify(all))}}catch(e){}}
      return fb};
    m.querySelector("#fbSave").onclick=()=>{save();toast("保存しました");done(true)};
    m.querySelector("#fbClose").onclick=()=>done(false);
    m.querySelector("#fbGh").onclick=async()=>{const fb=save();
      const acts=rec?rec.acts.filter(a=>!rec.cpu[a.who]).slice(-30).map(a=>`- ${a.t}T ${a.kind}${a.card?" "+a.card.nm:""}${a.target?" → "+(a.target.nm||a.target):""}`).join("\n"):"";
      const main=`${rec?`## 対戦\n${sum}\n決着: ${rec.why||""}\n先攻: ${rec.names[rec.first]}\n\n`:""}## アプリの改善点・バグ\n${fb.app||"（なし）"}\n\n## CPUへのアドバイス\n${fb.cpu||"（なし）"}`;
      let detail=rec?`<details><summary>自分の行動（最後の30件）</summary>\n\n${acts}\n</details>\n\n<details><summary>ログ（最後の60行）</summary>\n\n\`\`\`\n${rec.log.slice(-60).map(x=>x[1]).join("\n")}\n\`\`\`\n</details>\n\n<details><summary>デッキ</summary>\n\n\`\`\`\n${rec.deckLists.join("\n---\n")}\n\`\`\`\n</details>`:"";
      // URLが長いとGitHubが500を返す（未ログイン時はログイン画面へのリダイレクトで更に長くなる）ので短く保つ
      let body=main+(detail?"\n\n## 対戦ログ\n（ここにコピーした対戦ログを貼り付け）\n":"");
      const title=`[フィードバック] ${(fb.app||fb.cpu||"対戦の感想").split("\n")[0].slice(0,40)}`;
      const mk=b=>`https://github.com/${FB_REPO}/issues/new?labels=feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(b)}`;
      if(mk(body).length>2000){ // 長すぎるときは本文ごとクリップボードへ回す
        detail=main+(detail?"\n\n"+detail:"");body=`${rec?sum+"\n\n":""}（本文が長いのでコピーしました。ここに貼り付けてください）\n`}
      window.open(mk(body),"_blank"); // ポップアップがブロックされないよう、コピーより先に開く
      if(detail){let copied=false;try{await navigator.clipboard.writeText(detail);copied=true}catch(e){}
        if(copied)toast("内容をコピーしました。送信画面の「貼り付け」と書いた所に貼ってください");
        else await ask("コピーできませんでした","下の内容を選んでコピーし、送信画面に貼り付けてください。\n\n"+detail,[{label:"OK",value:1,primary:true}])}
      done(true)};
  });
}
