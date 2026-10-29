"use strict";
// ================= セットアップ画面 =================
function showSetup(){document.documentElement.classList.remove("spectate");
  G=null;
  document.getElementById("app").hidden=true;const S=document.getElementById("setup");S.hidden=false;
  let saved={};try{saved=JSON.parse(localStorage.getItem("conan-sim-setup")||"{}")}catch(e){}
  S.innerHTML=`<div><h1 style="font-size:24px">コナンTCG 卓上シミュレータ</h1>
   <div class="hint">ルールマニュアル Ver.2.5 準拠の進行（オート・手札の使用・ネクストヒント・推理・アクション・ガード・コンタクト・ミスリード・ヒラメキ・リフレッシュ・事件解決）を自動で処理します。カード個別の効果は表示のみで、右パネルの手動操作で処理します。収録カード ${window.CARD_DB.length} 枚。</div></div>
   ${resumeBox()}
   <div class="cols">
    ${[0,1].map(i=>`<div class="box"><b>${i===0?"あなた（下側）":"相手（上側）"}</b>
      <div class="row"><input id="nm${i}" value="${esc(saved["nm"+i]||(i?"相手":"あなた"))}" size="10" aria-label="名前">
      ${i===1?`<label><input type="checkbox" id="cpu1" ${saved.cpu1===false?"":"checked"}> CPUが操作</label>`:`<label><input type="checkbox" id="cpu0"> CPUが操作（観戦）</label>`}</div>
      <div class="row"><select id="ps${i}" aria-label="デッキ一覧">${deckGroups().map(([lab,g,a])=>a.length?`<optgroup label="${esc(lab)}">${a.map((d,k)=>`<option value="${g}:${k}" ${g==="p"&&k===(i?1:0)?"selected":""}>${esc(d.name)}</option>`).join("")}</optgroup>`:"").join("")}</select><button data-s="${i}">このデッキを使う</button></div>
      <div class="row">
        <select id="rc${i}" aria-label="ランダム構築の色">${["青","赤","黄","緑","白","黒"].map(c=>`<option>${c}</option>`).join("")}</select><button data-r="${i}">ランダム構築</button></div>
      <div class="row"><input id="sh${i}" placeholder="共有ID 例: X3zM3U7m" size="16"><button data-f="${i}">conan-tcg-appから読込</button></div>
      <textarea id="dk${i}" spellcheck="false" aria-label="デッキリスト">${esc(saved["dk"+i]||PRESETS[i?1:0].text)}</textarea>
      <div class="dmsg" id="dm${i}"></div></div>`).join("")}
   </div>
   <div class="row"><label>先攻: <select id="first"><option value="rand">ランダム</option><option value="0">あなた</option><option value="1">相手</option></select></label>
     <button class="primary" id="go" style="font-size:14px;padding:8px 18px">対戦開始</button><button id="fbTop" style="margin-left:auto">フィードバックを送る</button></div>
   <div class="hint">デッキリストの書き方: 1行に「カードNo x枚数」。パートナーと事件はカードNoを書けば自動で判別します。conan-tcg-app の共有IDでの読込はブラウザから直接通信するため、環境によっては失敗します。その場合はリストを貼り付けてください。<br>
   操作: カードをクリックすると右パネルに操作が出ます。アクション［キャラ］は対象（赤く点滅）をクリック、Escでキャンセル。デッキ・FILE・証拠・リムーブの枚数をクリックすると中身と手動操作が開きます。</div>
   <div class="box" id="myBox"></div>
   <div class="box" id="recBox"></div>`;
  renderRecords();renderMyDecks();
  const rs=document.getElementById("resume");if(rs)rs.onclick=()=>{const v=loadSave();if(v)resumeGame(v);else showSetup()};
  const rd=document.getElementById("resumeDel");if(rd)rd.onclick=async()=>{if(await ask("途中の対戦を消しますか？","元に戻せません。",[{label:"消す",value:true},{label:"やめる",value:false,primary:true}])){clearSave();showSetup()}};
  const chk=i=>{const d=parseDeckText(document.getElementById("dk"+i).value);const w=[...d.errors,...validateDeck(d)];const m=document.getElementById("dm"+i);
    if(w.length){m.className="dmsg bad";m.textContent=w.join("\n")}else{m.className="dmsg good";m.textContent=`OK: ${C({n:d.partner}).nm} / ${C({n:d.caseN}).nm} / 40枚`}return {d,w}};
  for(const i of [0,1]){
    const ta=document.getElementById("dk"+i);ta.oninput=()=>chk(i);chk(i);
    S.querySelector(`[data-s="${i}"]`).onclick=()=>{const d=deckByKey(document.getElementById("ps"+i).value);if(d){ta.value=d.text;chk(i)}};
    document.getElementById("ps"+i).onchange=()=>S.querySelector(`[data-s="${i}"]`).click();
    S.querySelector(`[data-r="${i}"]`).onclick=()=>{ta.value=randomDeck(document.getElementById("rc"+i).value).text;chk(i)};
    S.querySelector(`[data-f="${i}"]`).onclick=async()=>{const id=document.getElementById("sh"+i).value.trim().replace(/.*deck\//,"");const m=document.getElementById("dm"+i);
      m.className="dmsg";m.textContent="読込中…";try{const r=await fetchShareDeck(id);ta.value=r.text;chk(i);m.textContent+=`（${r.name}）`}catch(e){m.className="dmsg bad";m.textContent="読み込めませんでした（"+e.message+"）。リストを貼り付けてください。"}};
  }
  document.getElementById("fbTop").onclick=()=>feedbackPage(null);
  document.getElementById("go").onclick=()=>{
    const a=chk(0),b=chk(1);
    if(!a.d.partner||!a.d.caseN||!b.d.partner||!b.d.caseN||a.d.main.length<10||b.d.main.length<10){toast("デッキを確認してください");return}
    const cfg={decks:[a.d,b.d],names:[document.getElementById("nm0").value||"あなた",document.getElementById("nm1").value||"相手"],cpu:document.getElementById("cpu1").checked,cpu0:document.getElementById("cpu0").checked,first:document.getElementById("first").value};
    try{localStorage.setItem("conan-sim-setup",JSON.stringify({nm0:cfg.names[0],nm1:cfg.names[1],dk0:document.getElementById("dk0").value,dk1:document.getElementById("dk1").value,cpu1:cfg.cpu}))}catch(e){}
    startGame(cfg);
  };
}
// 途中の対戦（接続切れ・リロードで中断したもの）
function saveLabel(s){const m=s.meta,d=new Date(s.at);
  return `${m.turnNo}ターン目（${m.turnName}の番）・${m.names[0]}（${m.decks[0]}） vs ${m.names[1]}（${m.decks[1]}）・${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}
function resumeBox(){const s=loadSave();if(!s)return "";
  return `<div class="box"><b>途中の対戦があります</b><div class="hint">${esc(saveLabel(s))}</div>
   <div class="row"><button class="primary" id="resume">続きから</button><button id="resumeDel">消す</button></div>
   <div class="hint">新しく対戦を始めると、この対戦は消えます。</div></div>`}
function renderMyDecks(){
  const B=document.getElementById("myBox");if(!B)return;const my=loadMyDecks();
  B.innerHTML=`<b>デッキ登録（マイデッキ ${my.length}個）</b>
   <div class="hint">conan-tcg-app のデッキ共有リンク（または共有ID）を貼って「登録」すると、上のデッキ一覧の「マイデッキ」に追加されます。端末に保存されます。</div>
   <div class="row"><input id="myUrl" placeholder="共有リンク または ID" style="flex:1;min-width:0"><button id="myAdd" class="primary">登録</button></div>
   <div class="dmsg" id="myMsg"></div>
   <div class="reclist">${my.map((d,k)=>`<div class="row" style="gap:6px"><span style="flex:1;font-size:12px">${esc(d.name)}</span><button data-mydel="${k}">削除</button></div>`).join("")}</div>`;
  document.getElementById("myAdd").onclick=async()=>{const id=shareIdOf(document.getElementById("myUrl").value);const m=document.getElementById("myMsg");
    if(!id){m.className="dmsg bad";m.textContent="リンクを貼ってください";return}
    m.className="dmsg";m.textContent="読込中…";
    try{const r=await fetchShareDeck(id);const d=parseDeckText(r.text);const w=[...d.errors,...validateDeck(d)];
      const a=loadMyDecks();a.push({name:`${r.name||"デッキ"}（${id}）`,text:r.text,id});saveMyDecks(a);
      m.className=w.length?"dmsg bad":"dmsg good";m.textContent=`登録しました: ${r.name}${w.length?"\n注意: "+w.join(" / "):""}`;
      const keep=m.textContent,cls=m.className;showSetup();const m2=document.getElementById("myMsg");m2.textContent=keep;m2.className=cls}
    catch(e){m.className="dmsg bad";m.textContent="読み込めませんでした（"+(e.message==="Cannot read properties of null (reading 'name')"?"そのIDのデッキが見つかりません":e.message)+"）"}};
  B.querySelectorAll("[data-mydel]").forEach(b=>b.onclick=()=>{const a=loadMyDecks();a.splice(+b.dataset.mydel,1);saveMyDecks(a);showSetup()});
}
function renderRecords(){
  const B=document.getElementById("recBox");if(!B)return;
  const all=loadRecords();
  const fmt=t=>{const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`};
  B.innerHTML=`<b>対戦記録（${all.length}件・端末に保存）</b>
   <div class="hint">対戦が終わるたびに、行動・その時に選べた選択肢・ログを自動で保存します（最新${REC_MAX}件）。将来のフィードバック機能の材料になります。</div>
   <div class="reclist">${all.slice().reverse().slice(0,20).map((r,i)=>{const me=r.cpu[0]?null:0;const res=me===null?`${esc(r.names[r.winner])} 勝利`:r.winner===me?"勝ち":"負け";
     return `<button class="rec" data-i="${all.length-1-i}"><span class="${me===null?"":r.winner===me?"rw":"rl"}">${res}</span>${r.feedback&&(r.feedback.app||r.feedback.cpu)?" ✎":""} ${fmt(r.start)}・${r.turns}T・${esc(r.decks[0])} vs ${esc(r.decks[1])}</button>`}).join("")||'<div class="meta">まだありません</div>'}</div>
   <div class="row"><button id="recExp" ${all.length?"":"disabled"}>全記録を書き出す（JSON）</button><button id="recClr" ${all.length?"":"disabled"}>全部消す</button></div>`;
  B.querySelectorAll(".rec").forEach(e=>e.onclick=()=>{const r=all[+e.dataset.i];
    const sum=`${r.names[0]}（${r.decks[0]}） vs ${r.names[1]}（${r.decks[1]}）\n先攻: ${r.names[r.first]}／${r.turns}ターン／${r.names[r.winner]} の勝利（${r.why}）\n記録した行動: ${r.acts.length}回\n\n`;
    const fbt=r.feedback&&(r.feedback.app||r.feedback.cpu)?`【フィードバック】\n${r.feedback.app?"改善点: "+r.feedback.app+"\n":""}${r.feedback.cpu?"CPUへ: "+r.feedback.cpu+"\n":""}\n`:"";
    ask("対戦記録",sum+fbt+r.log.map(([t,m])=>m).join("\n"),[{label:"フィードバックを書く",value:"fb"},{label:"閉じる",value:0,primary:true}]).then(async v=>{if(v==="fb"){await feedbackPage(r);renderRecords()}})});
  const ex=document.getElementById("recExp");if(ex)ex.onclick=async()=>{const blob=new Blob([JSON.stringify(all,null,1)],{type:"application/json"});
    const name=`conan-sim-records-${new Date().toISOString().slice(0,10)}.json`;
    try{const f=new File([blob],name,{type:"application/json"}); // スマホは共有シートで保存
      if(navigator.canShare&&navigator.canShare({files:[f]})&&matchMedia("(pointer:coarse)").matches){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==="AbortError")return}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`conan-sim-records-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove()};
  const cl=document.getElementById("recClr");if(cl)cl.onclick=async()=>{if(await ask("対戦記録を全部消しますか？","元に戻せません。",[{label:"消す",value:true},{label:"やめる",value:false,primary:true}])){try{localStorage.removeItem(REC_KEY)}catch(e){}renderRecords()}};
}
// スマホ（縦・横）ではコンパクト表示
function applyCompact(){const r=document.documentElement;const mq=window.matchMedia("(max-width: 760px), (max-height: 520px)").matches;
  const was=r.classList.contains("compact");r.classList.toggle("compact",mq);r.classList.toggle("portrait",mq&&window.innerHeight>window.innerWidth);
  document.getElementById("detail").classList.toggle("zoom",mq);
  let lay="lr";try{lay=localStorage.getItem("conan-sim-layout")||"lr"}catch(e){}
  r.classList.toggle("lr",!mq&&window.innerWidth>=1280&&lay==="lr");
  if(G&&was!==mq)render()}
// 空白をタップ: アクションの対象選びや選択中のカードをキャンセル
document.addEventListener("click",e=>{if(!G||!document.getElementById("modal-bg").hidden)return;
  if(e.target.closest("#detail,.card,.stack,.filez,#modal,#topbar,button,details,#peek,.cutin,#reveal,#setup,a,input,select,textarea"))return;
  if(G.ui.mode){G.ui.mode=null;render();toast("キャンセルしました");return}
  if(_sel)clearSel()});
// カードを長押し: 効果を大きく表示（選択はしない）
const LP={t:null,fired:false,x0:0,y0:0};
function showPeek(x){
  const c=C(x);const old=document.getElementById("peek");if(old)old.remove();
  const d=document.createElement("div");d.id="peek";
  const parts=[c.dg,c.hr,c.ci,c.f].filter(Boolean).join("\n\n");
  d.innerHTML=`<div class="pk"><div class="pkc"></div><div class="pkt"><div class="dn">${esc(c.nm)}</div><div class="meta">${esc(c.t)}・${esc(c.c||"-")}${c.lv!=null?"・Lv"+c.lv:""}${c.ap!=null?"・AP"+c.ap:""}${c.lp!=null?"・LP"+c.lp:""}${c.ct?"・"+esc(c.ct):""}</div><div class="eff">${parts?hl(parts):'<span class="meta">効果なし</span>'}</div><div class="meta" style="margin-top:8px">タップで閉じる</div></div></div>`;
  const ce=cardEl(x);ce.classList.remove("s-s","s-x");d.querySelector(".pkc").appendChild(ce);
  d.onclick=ev=>{ev.stopPropagation();d.remove()};
  document.body.appendChild(d);
}
document.addEventListener("pointerdown",e=>{const el=e.target.closest(".card");if(!el||!el._x||el.classList.contains("facedown")||el.closest("#peek"))return;
  LP.fired=false;LP.x0=e.clientX;LP.y0=e.clientY;clearTimeout(LP.t);
  LP.t=setTimeout(()=>{LP.fired=true;showPeek(el._x)},450)});
document.addEventListener("pointermove",e=>{if(LP.t&&Math.hypot(e.clientX-LP.x0,e.clientY-LP.y0)>10){clearTimeout(LP.t);LP.t=null}});
for(const ev of ["pointerup","pointercancel"])document.addEventListener(ev,()=>{clearTimeout(LP.t);LP.t=null});
document.addEventListener("click",e=>{if(LP.fired){LP.fired=false;e.stopPropagation();e.preventDefault()}},true); // 長押し後のタップは無効
document.addEventListener("contextmenu",e=>{if(e.target.closest(".card"))e.preventDefault()});
document.getElementById("detail").addEventListener("click",e=>{if(e.target.id==="detail"||e.target.classList.contains("zoomcard"))clearSel()});
// 観戦中はクリック・長押し・キー操作を止める（スクロールはそのまま）
const spectating=()=>document.documentElement.classList.contains("spectate")&&G&&!G.over;
const specOk=t=>t.closest&&t.closest(".tb-quit,#modal-bg");
for(const ev of ["click","dblclick","contextmenu","pointerdown","mousedown"])document.addEventListener(ev,e=>{if(!spectating()||specOk(e.target))return;e.stopImmediatePropagation();if(ev!=="pointerdown"&&ev!=="mousedown")e.preventDefault()},true);
document.addEventListener("keydown",e=>{if(!spectating()||specOk(e.target))return;if(/^(Arrow|Page|Home|End| )/.test(e.key)&&!e.target.closest("button"))return;e.stopImmediatePropagation();e.preventDefault()},true);
applyCompact();window.addEventListener("resize",()=>{applyCompact();if(G)render()});
showSetup();
{const s=loadSave();if(s)ask("前回の対戦が途中です",saveLabel(s),[{label:"続きから",value:true,primary:true},{label:"ニューゲーム",value:false}]).then(v=>{if(v)resumeGame(s)})}
