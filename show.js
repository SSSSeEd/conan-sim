"use strict";
// ================= 演出（カットイン・証拠めくり・行動の強調） =================
// 証拠をめくって見せる（タップで早送り）
function revealCard(x,title,sub,hit){
  if(window.SIM_TURBO||G&&G.sim)return Promise.resolve();
  return new Promise(res=>{
    const d=document.createElement("div");d.id="reveal";if(hit)d.classList.add("hit");
    d.innerHTML=`<div class="rvt">${esc(title)}</div><div class="flip"><div class="fin"><div class="face back"></div><div class="face front"></div></div></div><div class="rvs"></div>`;
    d.querySelector(".front").appendChild(cardEl(x));
    document.body.appendChild(d);
    const rm=()=>{if(!d.isConnected)return;d.remove();res()};
    setTimeout(()=>{d.querySelector(".rvs").textContent=sub},1000);
    d.onclick=()=>{if(d.querySelector(".rvs").textContent)rm();else{d.querySelector(".rvs").textContent=sub;d.querySelectorAll(".fin").forEach(f=>{f.style.animation="none";f.style.transform="rotateY(180deg)"})}};
    setTimeout(rm,hit?2600:1900);
  })}
// 帯の演出（タップで早送り）。SIM_FAST のときは出さない（テスト用）
// 演出の速さ（≡メニューで変更・端末に保存）。人が対戦しているときだけ使う
const SPEEDS={slow:{label:"ゆっくり",m:1.5},normal:{label:"ふつう",m:1},fast:{label:"はやい",m:.6}};
function speedKey(){try{return localStorage.getItem("conan-sim-speed")||"slow"}catch(e){return "slow"}}
function pace(){if(window.SIM_FAST)return 0;if(G&&G.cfg&&G.cfg.cpu0)return 1;return (SPEEDS[speedKey()]||SPEEDS.slow).m}
function cutin(x,title,sub,{who=null,kind="",ms=1300,fx=null}={}){
  if(!G||window.SIM_FAST||G.sim)return Promise.resolve();
  ms=Math.round(ms*pace());
  return new Promise(res=>{
    const d=document.createElement("div");d.className="cutin "+(kind||(who&&who.idx===0?"me":"op"))+(fx?" fx":"");
    d.innerHTML=`<div class="band">${x?'<div class="ccard"></div>':""}<div class="ctx"><div class="ct">${esc(title)}</div>${sub?`<div class="cs">${esc(sub)}</div>`:""}${fx?`<div class="fxt">${hl(fx)}</div>`:""}</div></div><div class="tap">タップで次へ</div>`;
    if(x)d.querySelector(".ccard").appendChild(cardEl(x));
    document.body.appendChild(d);
    let t;const end=()=>{if(d.classList.contains("out"))return;clearTimeout(t);d.classList.add("out");setTimeout(()=>{d.remove();res()},220)};
    d.onclick=end;t=setTimeout(end,ms);
  })}
// 効果を使ったことを、カードと効果文で大きく見せる（effects.js から呼ばれる）
async function showFx(p,x,kind,text,{after=false}={}){
  if(!G||window.SIM_FAST||G.sim||!x)return;
  const t=String(text||"").trim();
  render();
  await cutin(x,`${p.name}: ${C(x).nm}`,`【${kind}】の効果${after?"が発動":"を使う"}`,{who:p,fx:t.slice(0,220),ms:Math.min(4200,1500+t.length*28)});
}
// 行動を見せる: 行動するカードと対象を光らせ、帯で知らせる（自分の行動も同じように見せる）
async function showCpu(p,x,title,sub,target){
  if(window.SIM_FAST||G.sim)return;
  G.ui.act={a:x,t:target&&target!=="case"?target:null};render();
  await cutin(x,`${p.name}: ${title}`,sub,{who:p,ms:p.cpu?1300:900});
  await sleep(250*pace());
}
function clearAct(){if(G&&G.ui.act){G.ui.act=null;render()}}
