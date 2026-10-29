"use strict";
// ================= 描画 =================
function cardEl(x,{faceUp=true,small=false}={}){
  const c=C(x);const el=document.createElement("div");
  el.className="card"+(c.t==="事件"?" h":"")+(x.st==="s"?" s-s":x.st==="x"?" s-x":"");
  el.tabIndex=0;
  if(!faceUp){el.classList.add("facedown");return el}
  const cols=colorsOf(c.c);
  const p=G&&ownerOf(x);
  const inField=p&&(p.field.includes(x));
  const ap=c.ap!=null?apOf(x):null;const base=c.ap||0;
  const kw=p&&inField?staticKw(x,p):null;
  const kws=kw?[kw.rush&&"突撃",kw.rushC&&"突撃C",kw.rushE&&"突撃事",kw.swift&&"迅速",kw.bullet&&"ブレット",kw.misread&&("ミス"+kw.misread)].filter(Boolean):[];
  el.innerHTML=`<div class="tx"><div style="display:flex;gap:4px;align-items:center">${c.lv!=null?`<span class="lv">${c.lv}</span>`:""}<span class="tp">${esc(c.t)}${c.ct?"・"+esc(c.ct):""}</span></div>
    <div class="nm">${esc(c.nm)}</div>
    <div class="st">${ap!=null?`<span class="ap ${ap>base?"up":ap<base?"down":""}">AP${ap}</span>`:"<span></span>"}${c.lp!=null?`<span>LP${inField?lpOf(x):c.lp}</span>`:c.t==="事件"?`<span>${esc(c.df||"")}</span>`:""}</div></div>
    <div class="stripe">${cols.map(ch=>`<i style="background:var(${COLOR_VAR[ch]})"></i>`).join("")}</div>
    ${x.fresh&&inField?'<span class="badge">名乗り</span>':""}${kws.length?`<span class="kw">${kws.join(" ")}</span>`:""}${inField&&x.set&&x.set.length?`<span class="kw" style="top:auto;bottom:20px;background:#6b5627">セット${x.set.length}</span>`:""}`;
  if(c.img&&!IMG.local&&IMG.bundle){ // スマホ・リンク版: 同梱の縮小画像（パック単位のまとめファイル）
    const key=c.img.split("/").pop().replace(/\.\w+$/,"");
    const put=d=>{const src=d&&d[key];if(!src)return;const im=new Image();im.alt="";im.onload=()=>el.classList.add("hasimg");im.src=src;el.prepend(im)};
    const bk=bundleKey(c.pk);const b=IMGB[bk];if(b&&b.data)put(b.data);else loadBundle(bk).then(put);
  }else if(c.img&&(IMG.local||IMG.on)){const webUrl=/^https?:/.test(c.img)?c.img:IMG_BASE+c.img;const im=new Image();im.alt="";im.loading="lazy";let web=!IMG.local;
    im.onload=()=>{if(web)IMG.ok++;else IMG.lok++;el.classList.add("hasimg")};
    im.onerror=()=>{if(!web){if(++IMG.lng>=4&&!IMG.lok)IMG.local=false;if(IMG.on){web=true;im.src=webUrl;return}}
      im.remove();if(++IMG.ng>=4&&!IMG.ok)IMG.on=false};
    im.src=web?webUrl:"images/"+c.img.split("/").pop();el.prepend(im)}
  el._x=x;
  el.addEventListener("mouseenter",()=>showDetail(x));
  el.addEventListener("focus",()=>showDetail(x));
  el.addEventListener("mouseleave",()=>{if(_sel)document.getElementById("hoverPane").innerHTML=""});
  return el;
}
const SEL_HINT='<div class="meta">カードをクリックすると選択され、ここに操作が出ます。選択中はカーソルを他のカードに合わせても切り替わりません（下に参考表示）。</div>';
function clearSel(){document.getElementById("detail").classList.remove("open");_sel=null;document.getElementById("selPane").innerHTML=SEL_HINT;document.getElementById("hoverPane").innerHTML="";if(G)render()}
function showDetail(x,withActs){
  const c=C(x);
  if(!withActs&&_sel&&G&&ownerOf(_sel)){ // 選択中はホバーを下の参考欄にだけ出す
    if(x===_sel){document.getElementById("hoverPane").innerHTML="";return}
    document.getElementById("hoverPane").innerHTML=`<div class="selhead" style="color:var(--ink-dim)">カーソル中のカード（参考）</div><div class="dn">${esc(c.nm)}</div><div class="meta">${esc(c.t)}・${esc(c.c||"-")}${c.lv!=null?"・Lv"+c.lv:""}${c.ap!=null?"・AP"+c.ap:""}${c.lp!=null?"・LP"+c.lp:""}</div><div class="eff">${hl([c.dg,c.hr,c.ci,c.f].filter(Boolean).join("\n\n"))}</div>`;return}
  const D=document.getElementById("selPane");if(withActs)document.getElementById("hoverPane").innerHTML="";
  const p=G&&ownerOf(x);const z=G&&zoneOf(x);
  const parts=[c.dg&&c.dg,c.hr&&c.hr,c.ci&&c.ci,c.f].filter(Boolean).join("\n\n");
  D.innerHTML=`<div class="dn">${esc(c.nm)}</div>
   <div class="meta">${esc(c.n)}・ID ${esc(c.i)}・${esc(c.t)}・${esc(c.c||"-")}${c.lv!=null?"・Lv"+c.lv:""}${c.ap!=null?"・AP"+c.ap:""}${c.lp!=null?"・LP"+c.lp:""}${c.df?"・"+esc(c.df):""}</div>
   ${c.ct?`<div class="meta">特徴: ${esc(c.ct)}</div>`:""}
   ${p&&(x.apM||x.apT||x.apC||x.lpM||x.lpT)?`<div class="meta">修整: AP${x.apM+x.apT+x.apC>=0?"+":""}${x.apM+x.apT+x.apC}（永続${x.apM}/ターン${x.apT}/コンタクト${x.apC}）LP${x.lpM+x.lpT>=0?"+":""}${x.lpM+x.lpT}</div>`:""}
   <div class="eff">${parts?hl(parts):'<span class="meta">効果なし</span>'}</div><div class="acts"></div>`;
  if(withActs&&document.documentElement.classList.contains("compact")){const z2=document.createElement("div");z2.className="zoomcard";z2.appendChild(cardEl(x,{faceUp:!(z==="file"||z==="deck")}));D.prepend(z2)}
  if(withActs&&p){document.getElementById("detail").classList.add("open");D.insertAdjacentHTML("afterbegin",'<div class="selbar"><span class="selhead">選択中のカード</span><button id="unsel">選択を解除</button></div>');document.getElementById("unsel").onclick=clearSel;buildActs(D.querySelector(".acts"),x,p,z);if(!showDetail.busy){showDetail.busy=true;render();showDetail.busy=false}}
}
function btn(box,label,fn,opt={}){const b=document.createElement("button");b.textContent=label;if(opt.primary)b.className="primary";if(opt.danger)b.className="danger";if(opt.disabled)b.disabled=true;
  b.onclick=async()=>{ // 行動を決めたら選択を解除して通常画面に戻る（PCの手動操作だけは選択を残す）
    const close=opt.close||document.documentElement.classList.contains("compact");
    if(close){document.getElementById("detail").classList.remove("open");_sel=null}
    if(G&&!opt.noUndo)await act(fn);else await fn();render();if(close){if(G)clearSel()}else if(G&&x0()&&ownerOf(x0()))showDetail(x0(),true);else if(G)clearSel()};box.appendChild(b);return b}
let _sel=null;const x0=()=>_sel;
function buildActs(box,x,p,z){
  _sel=x;
  const myTurn=G.turn===p.idx&&!G.over&&!p.cpu;
  const h=t=>box.insertAdjacentHTML("beforeend",`<h3 style="flex-basis:100%">${t}</h3>`);
  if(myTurn){
    h("できること");
    const _btn=btn;const btn2=(b2,l,f,o={})=>{const e=_btn(b2,l,f,{...o,close:true});if(!o.primary&&!o.disabled)e.classList.add("rule");return e};
    if(z==="hand"){const r=playableReason(p,x,false);btn2(box,r?`使用不可: ${r}`:"使用する",()=>useFromHand(p,x),{primary:!r,disabled:!!r});
      for(const a of FX.abilities(p,x))btn2(box,`能力: ${a.label}`,()=>FX.useAbility(p,x,a),{disabled:!a.ok})}
    if(z==="field"||z==="partner"){
      btn2(box,"推理",()=>reason(p,x),{disabled:!canAct(x,p,"reason")});
      if(z==="field"){
        btn2(box,"アクション［キャラ］",()=>{G.ui.mode={kind:"target",atk:x};document.getElementById("detail").classList.remove("open");toast("相手のスリープ/スタン状態のキャラをタップ");},{noUndo:true,disabled:!canAct(x,p,"chara")||!opp(p).field.some(y=>y.st!=="a")});
        btn2(box,"アクション［事件］",()=>declareAction(p,x,"case"),{disabled:!canAct(x,p,"case")||opp(p).ev.length===0});
      }
      if(z==="partner"){btn2(box,"アシスト",()=>assist(p),{disabled:x.st!=="a"});btn2(box,FX.eraseEvidence(p)?"証拠隠滅（相手の敗北）":"事件解決",()=>solve(p),{disabled:x.st!=="a"||!p.solved,primary:p.solved&&p.ev.length>=p.level})}
    }
    if(z==="field"||z==="case"){
      for(const a of FX.abilities(p,x))btn2(box,`能力: ${a.label}${a.turn1?"（ターン1）":""}`,()=>FX.useAbility(p,x,a),{disabled:!a.ok});
    }
  }
  if(FX.automated(x))box.insertAdjacentHTML("beforeend",'<div class="meta" style="flex-basis:100%">このカードの効果は自動で処理されます。</div>');
  const man=document.createElement("details");man.innerHTML="<summary>手動操作（カード効果を自分で処理するとき）</summary>";
  const mbox=document.createElement("div");mbox.className="acts";man.appendChild(mbox);box.appendChild(man);
  const mv=(label,fn)=>btn(mbox,label,()=>{fn();log(`[手動] ${p.name}: ${C(x).nm} → ${label}`,"n")});
  if(z==="field"||z==="partner"){
    mv("アクティブ",()=>x.st="a");mv("スリープ",()=>x.st="s");mv("スタン",()=>x.st==="a"?x.st="x":x.st="x");
    mv("AP+1000(ターン)",()=>x.apT+=1000);mv("AP-1000(ターン)",()=>x.apT-=1000);
    mv("AP+1000(永続)",()=>x.apM+=1000);mv("LP+1(ターン)",()=>x.lpT+=1);mv("LP-1(ターン)",()=>x.lpT-=1);
    mv("突撃を付与",()=>x.kw.push("突撃"));mv("迅速を付与",()=>x.kw.push("迅速"));mv("ブレットを付与",()=>x.kw.push("ブレット"));
  }
  if(z!=="partner"&&z!=="case"&&x!==p.partner){
    if(C(x).t==="キャラ"&&z!=="field"){mv("現場に登場(アクティブ)",()=>{detach(x);x.st="a";x.fresh=true;p.field.push(x)});mv("現場に登場(スリープ)",()=>{detach(x);x.st="s";x.fresh=true;p.field.push(x)})}
    if(z!=="hand")mv("手札に加える",()=>{detach(x);resetMods(x);p.hand.push(x)});
    if(z!=="rm")mv("リムーブ",()=>removeCard(x,"手動"));
    mv("デッキの上へ",()=>{detach(x);resetMods(x);p.deck.unshift(x)});
    mv("デッキの下へ",()=>{detach(x);resetMods(x);p.deck.push(x);});
    if(z!=="ev")mv("証拠に",()=>{detach(x);resetMods(x);p.ev.push(x)});
    if(z!=="file")mv("FILEに",()=>{detach(x);resetMods(x);p.file.push(x)});
  }
  if(z==="case")mv(p.solved?"事件編に戻す":"解決編にする",()=>p.solved=!p.solved);
}
function pileMenu(p,kind){
  const isMe=!p.cpu||G.showOppHand;
  const list=kind==="rm"?p.rm:kind==="file"?p.file:kind==="ev"?p.ev:p.deck;
  const label={rm:"リムーブエリア",file:"FILE",ev:"証拠",deck:"デッキ"}[kind];
  modal((m,done)=>{
    m.insertAdjacentHTML("beforeend",`<div class="mt">${esc(p.name)}の${label}（${list.length}枚）</div><div class="mb">カードをクリックすると右パネルに手動操作を出します。${kind==="ev"||kind==="file"?"（裏向きのエリアです。確認用に表示しています）":""}</div><div class="cards"></div><div class="opts"></div>`);
    const box=m.querySelector(".cards");
    const show=kind==="rm"||isMe&&kind!=="deck";
    const arr=kind==="deck"?[]:[...list].reverse();
    for(const x of arr){const el=cardEl(x,{faceUp:show});el.onclick=()=>{done();showDetail(x,true)};box.appendChild(el)}
    const o=m.querySelector(".opts");
    const add=(l,f)=>{const b=document.createElement("button");b.textContent=l;b.onclick=()=>{f();done();render()};o.appendChild(b)};
    if(kind==="deck"){
      add("1枚引く",()=>{draw(p,1);log(`[手動] ${p.name} は1枚引いた`,"n")});
      add("上から1枚を証拠に",()=>{gainEvidence(p,1);log(`[手動] ${p.name} は証拠を1つ得た`,"n")});
      add("上から1枚をFILEに",()=>{toFile(p,1);log(`[手動] ${p.name} はFILEに1枚置いた`,"n")});
      add("上から1枚をリムーブ",()=>{const x=popDeck(p);if(x){p.rm.push(x);log(`[手動] ${p.name} はデッキ上の ${C(x).nm} をリムーブ`,"n")}});
      add("シャッフル",()=>{shuffle(p.deck);log(`[手動] ${p.name} はデッキをシャッフル`,"n")});
      add("上から見る…",()=>setTimeout(()=>peekDeck(p),0));
    }
    if(kind==="ev")add("一番上をリムーブ",()=>{const x=p.ev.pop();if(x){p.rm.push(x);log(`[手動] ${p.name} の証拠を1つリムーブ`,"n")}});
    const c=document.createElement("button");c.className="primary";c.textContent="閉じる";c.onclick=()=>done();o.appendChild(c);
  });
}
async function peekDeck(p){
  const max=Math.min(10,p.deck.length);if(!max)return;
  const n=await ask(`${p.name}: デッキを上から何枚見る？`,"",[...Array(max)].map((_,i)=>({label:`${i+1}枚`,value:i+1})).concat([{label:"やめる",value:0}]));
  if(!n)return;const xs=p.deck.slice(0,n);
  const sel=await chooseCards(`${p.name}: デッキの上から${n}枚`,"手札に加えるカードを選べます。選ばなかったカードはそのままです（並べ替えはデッキ上/下ボタンで）。",xs,{min:0,max:n,okLabel:"手札に加える"});
  for(const x of sel){detach(x);p.hand.push(x);log(`[手動] ${p.name} はデッキから ${C(x).nm} を手札に`,"n")}
  const rest=xs.filter(x=>!sel.includes(x));
  if(rest.length){
    const v=await ask("残りのカードは？",rest.map(x=>C(x).nm).join("、"),[{label:"デッキの下に移す",value:"bottom",primary:true},{label:"そのまま上に戻す",value:"top"},{label:"リムーブする",value:"rm"}]);
    if(v==="bottom"){for(const x of rest){detach(x);p.deck.push(x)}log(`[手動] ${p.name} は残り${rest.length}枚をデッキの下へ`,"n")}
    if(v==="rm"){for(const x of rest){detach(x);p.rm.push(x)}log(`[手動] ${p.name} は残り${rest.length}枚をリムーブ`,"n");checkDeck(p)}
  }
  render();
}
function render(){
  if(!G||G.sim)return;
  const me=G.P[0],cp=G.P[1];
  document.getElementById("oppSide").replaceChildren(sideEl(cp,true));
  document.getElementById("meSide").replaceChildren(sideEl(me,false));
  document.getElementById("board").classList.toggle("p1first",G.first===1);
  renderGuide();
  const T=document.getElementById("topbar");T.innerHTML="";
  const p=cur();
  T.insertAdjacentHTML("beforeend",`<h1>コナンTCG 卓上シミュレータ</h1><span class="phase">${G.over?"終了":`${G.turnNo}T ${esc(p.name)}`}</span>
   <span class="meta" style="color:var(--ink-dim)">${G.over?"":`手札の使用 ${p.usedHand?"済":"可"}・ネクストヒント ${p.hintN?p.hintN+"回":"可"}`}</span>`);
  const human=!p.cpu&&!G.over;
  const b=(l,f,o={})=>{const e=document.createElement("button");e.textContent=l;if(o.primary)e.className="primary";if(o.cls)e.classList.add(...o.cls.split(" "));e.disabled=!!o.disabled;e.onclick=f;T.appendChild(e)};
  const R=document.documentElement;
  const spec=!!(G.cfg.cpu0&&G.cfg.cpu&&!G.over);R.classList.toggle("spectate",spec);
  if(spec)T.insertAdjacentHTML("beforeend",'<span class="spec-tag">観戦中（操作できません）</span>');
  b("ログ",()=>{R.classList.toggle("logopen");R.classList.remove("menuopen");const L=document.getElementById("log");L.scrollTop=L.scrollHeight},{cls:"tb-only"});
  b("≡",()=>{R.classList.toggle("menuopen");R.classList.remove("logopen")},{cls:"tb-only"});
  b("↶ 戻す",undo,{cls:"tb-undo",disabled:!human||!G.undo.length});
  b("ネクストヒント",()=>act(()=>nextHint(p)),{cls:"fab tb-hint",disabled:!human||p.noHint||!p.file.some(x=>x!==p.partner)});
  b("ターン終了",()=>{if(G.ui.mode)G.ui.mode=null;endTurn()},{primary:true,cls:"fab tb-end",disabled:!human});
  if(G.cfg.cpu){b(G.showOppHand?"相手の手札を隠す":"相手の手札を見る",()=>{G.showOppHand=!G.showOppHand;render()},{cls:"tb-extra"})}
  b(`演出: ${(SPEEDS[speedKey()]||SPEEDS.slow).label}`,()=>{const ks=Object.keys(SPEEDS);const n=ks[(ks.indexOf(speedKey())+1)%ks.length];try{localStorage.setItem("conan-sim-speed",n)}catch(e){}toast(`演出の速さ: ${SPEEDS[n].label}`);render()},{cls:"tb-extra"});
  if(!R.classList.contains("compact"))b(`配置: ${R.classList.contains("lr")?"左右":"上下"}`,()=>{let n="lr";try{n=(localStorage.getItem("conan-sim-layout")||"lr")==="lr"?"tb":"lr";localStorage.setItem("conan-sim-layout",n)}catch(e){}applyCompact();render();if(n==="lr"&&!R.classList.contains("lr"))toast("画面幅が足りないので上下のままです")},{cls:"tb-extra"});
  b("降参",async()=>{const v=await ask("降参しますか？","",[{label:"降参する",value:true},{label:"続ける",value:false,primary:true}]);if(v)lose(human?p:me,"降参")},{cls:"tb-extra"});
  b(R.classList.contains("spectate")?"観戦をやめる":"デッキ選択へ",async()=>{const v=await ask("対戦を中断してデッキ選択に戻りますか？","",[{label:"戻る",value:true},{label:"続ける",value:false,primary:true}]);if(v)showSetup()},{cls:"tb-extra tb-quit"});
}
function renderGuide(){
  const g=document.getElementById("guide");const p=cur();let cls="",h="",t="";
  if(G.over){cls="wait";h="対戦終了";t="「デッキ選択へ」で別のデッキを選べます。"}
  else if(G.ui.mode&&G.ui.mode.kind==="target"){cls="target";h="アクションの対象を選ぶ";t=`${C(G.ui.mode.atk).nm} のアクション先: 相手の赤く点滅しているキャラをクリック（Escでキャンセル）`}
  else if(p.cpu){cls="wait";h=`${p.name} のターン`;t="CPUが行動中です。ガードやカットインを聞かれたら画面に選択肢が出ます。"}
  else{h=`${p.name} のメインフェイズ（FILE ${p.file.length}枚＝レベル${p.file.length}まで使える）`;
    const steps=[];
    if(!p.usedHand&&!p.hinted)steps.push(p.hand.some(x=>!playableReason(p,x,false))?"① 緑枠の手札をクリックして使う（ネクストヒントも可）":"① 使える手札がない → ネクストヒントも検討");
    else if(!p.hinted)steps.push("① 手札の使用は済み（ネクストヒントはまだ使える）");
    else steps.push("① ネクストヒント中（何回でも可・FILEが減るので注意）");
    const ready=p.field.filter(x=>canAct(x,p,"reason")||canAct(x,p,"chara")||canAct(x,p,"case")).length+(p.pLoc==="area"&&p.partner.st==="a"?1:0);
    steps.push(ready?`② 緑枠の現場・パートナー（${ready}枚）をクリックして推理／アクション`:"② 動けるカードはもうない");
    if(p.solved&&p.ev.length>=p.level&&p.pLoc==="area"&&p.partner.st==="a")steps.push("★ パートナーで事件解決できます！");
    steps.push("③ 終わったら「ターン終了」");t=steps.join("　")}
  g.className=cls;g.innerHTML=`<b>${esc(h)}</b><span>${esc(t)}</span>`;
}
function sideEl(p,top){
  const s=document.createElement("section");s.className="side"+(top?" opp":" me")+(G.turn===p.idx?" active-turn":"");
  const showHand=!p.cpu&&(top?!G.cfg.cpu:true)||p.cpu&&G.showOppHand;
  // 左: 事件・パートナー
  const sp=document.createElement("div");sp.className="special";
  const box=el=>{const w=document.createElement("div");w.appendChild(el);sp.appendChild(w)};
  const ce=cardEl(p.caseC);if(p.solved)ce.insertAdjacentHTML("beforeend",'<span class="case-tag">解決編</span>');
  ce.onclick=()=>showDetail(p.caseC,true);box(ce);
  if(p.pLoc==="area"){const pe=cardEl(p.partner);if(G.ui.act&&G.ui.act.a===p.partner)pe.classList.add("acting");if(!p.cpu&&G.turn===p.idx&&!G.over&&p.partner.st==="a")pe.classList.add("ready");pe.onclick=()=>showDetail(p.partner,true);box(pe)}
  else{const d=document.createElement("div");d.className="slot";d.innerHTML='<span style="color:var(--ink-dim);font-size:11px;text-align:center">パートナー<br>FILE中</span>';sp.appendChild(d)}
  // 中: 現場
  const sl=document.createElement("div");sl.className="slots";
  const human=!p.cpu&&G.turn===p.idx&&!G.over;
  for(const x of p.field){const e=cardEl(x);if(x===_sel)e.classList.add("sel");
    if(x._shown!=="field"){x._shown="field";if(!window.SIM_FAST)e.classList.add("justin")}
    if(G.ui.act){if(G.ui.act.a===x)e.classList.add("acting");if(G.ui.act.t===x)e.classList.add("targeted")}
    if(human&&(canAct(x,p,"reason")||canAct(x,p,"chara")||canAct(x,p,"case")))e.classList.add("ready");
    if(G.ui.mode&&G.ui.mode.kind==="target"&&p!==cur()&&x.st!=="a")e.classList.add("tgt");
    e.onclick=()=>{
      if(G.ui.mode&&G.ui.mode.kind==="target"&&p!==cur()){const a=G.ui.mode.atk;G.ui.mode=null;act(()=>declareAction(cur(),a,x));return}
      showDetail(x,true)};
    sl.appendChild(e)}
  for(let i=p.field.length;i<5;i++){const d=document.createElement("div");d.className="slot";sl.appendChild(d)}
  // 右: 山札類（カードを置いた見た目）
  const inf=document.createElement("div");inf.className="pinfo";
  inf.innerHTML=`<div class="pname"><span class="ord">${G.first===p.idx?"先攻":"後攻"}</span>${esc(p.name)}${p.cpu?"（CPU）":""}</div>`;
  const pile=(cls,label,n,kind,inner)=>{const w=document.createElement("div");
    const d=document.createElement("div");d.className="stack "+cls+(n?"":" empty");d.tabIndex=0;d.title=label;
    const depth=Math.min(6,Math.ceil(n/6));d.style.boxShadow=Array.from({length:depth},(_,i)=>`${i+1}px ${i+1}px 0 #0b141b`).join(",")||"none";
    d.innerHTML=inner||(n?`<span class="cnt">${n}</span>`:"");d.onclick=()=>pileMenu(p,kind);
    w.appendChild(d);w.insertAdjacentHTML("beforeend",`<div class="plabel">${label}</div>`);inf.appendChild(w)};
  pile("","デッキ",p.deck.length,"deck");
  const topRm=p.rm[p.rm.length-1];
  pile("rm",`リムーブ <b>${p.rm.length}</b>`,p.rm.length,"rm",topRm?esc(C(topRm).nm):"");
  // FILE と 証拠: 伏せたカードを横一列に重ねて置く（次の枠に番号、目標の枠は強調）
  const row=(kind,label,list,minSlots,goal,goalLabel,cls)=>{
    const fz=document.createElement("div");fz.className="filez "+cls;fz.tabIndex=0;fz.onclick=()=>pileMenu(p,kind);fz.title=label+"（クリックで中身）";
    fz.innerHTML=`<div class="flabel">${label}<b>${list.length}</b></div>`;
    const fs=document.createElement("div");fs.className="fstack";
    const n=list.length,W=document.documentElement.classList.contains("compact")?(window.innerWidth<500?window.innerWidth-120:300):400,slots=Math.max(minSlots,n);
    const fw=document.documentElement.classList.contains("compact")?32:46;
    const pitch=Math.min(fw-2,(W-fw)/(slots-1));
    list.forEach((x,i)=>{const f=document.createElement("div");f.className="fcard"+(x===p.partner?" partner":"")+(x.up?" up":"");f.style.left=(i*pitch)+"px";
      if(x===p.partner)f.textContent="パートナー";else if(x.up){f.textContent=C(x).nm;f.title="表向き: "+C(x).nm}fs.appendChild(f)});
    for(let k=n+1;k<=slots;k++){const g=document.createElement("div");g.className="fghost"+(k===goal?" goal":"");g.style.left=((k-1)*pitch)+"px";g.textContent=k;if(k===goal)g.dataset.goal=goalLabel;fs.appendChild(g)}
    fz.appendChild(fs);return fz};
  const fz=document.createElement("div");fz.className="fzwrap";
  const fileRow=row("file","FILE",p.file,9,7,"解決編","");
  const evRow=row("ev","証拠",p.ev,Math.max(p.level,7),p.level,"勝利","evz");
  if(top&&!document.documentElement.classList.contains("lr"))fz.append(evRow,fileRow);else fz.append(fileRow,evRow);
  // 手札
  const hd=document.createElement("div");hd.className="hand";
  if(showHand){const fan=!top&&document.documentElement.classList.contains("portrait"),hn=p.hand.length,
    hov=fan&&hn>1?Math.max(-50,Math.min(4,(window.innerWidth-48-hn*68)/(hn-1))):0;let hi=0;
   for(const x of p.hand){const e=cardEl(x);
    if(fan){const k=hi-(hn-1)/2,sp=Math.min(4,18/Math.max(1,hn));e.style.setProperty("--r",(k*sp)+"deg");e.style.setProperty("--y",Math.min(14,k*k*1.6)+"px");if(hi)e.style.marginLeft=hov+"px"}hi++;if(G.turn===p.idx&&!p.cpu&&!playableReason(p,x,false))e.classList.add("playable");if(x===_sel)e.classList.add("sel");e.onclick=()=>showDetail(x,true);hd.appendChild(e)}}
  else{const bk=document.createElement("div");bk.className="backs";bk.innerHTML=p.hand.map(()=>'<span class="back"></span>').join("")+`<span style="margin-left:6px">手札 ${p.hand.length}枚</span>`;hd.appendChild(bk)}
  s.append(sp,sl,inf,hd,fz);
  return s;
}
document.addEventListener("keydown",e=>{if(e.key!=="Escape"||!G||!document.getElementById("modal-bg").hidden)return;if(G.ui.mode){G.ui.mode=null;render();toast("キャンセル")}else if(_sel)clearSel()});

