"use strict";
// ================= データ =================
const DB={},DBU={};for(const c of window.CARD_DB){DB[c.n]=c;DBU[c.n.toUpperCase()]=c.n}
// 画像: 同じフォルダの images/ を優先し、無ければ公式サイトから読む
const IMG={local:location.protocol==="file:",bundle:location.protocol!=="file:",lok:0,lng:0,on:true,ok:0,ng:0};
const IMGB={};
function bundleKey(pk){pk=pk||"misc";return /^[A-Za-z0-9-]+$/.test(pk)?pk:pk.startsWith("SP")?"SP":"PR"}
function loadBundle(pk){
  if(IMGB[pk])return IMGB[pk].p;
  const e=IMGB[pk]={data:null};
  e.p=fetch(`img/${pk}.json`).then(r=>{if(!r.ok)throw 0;return r.json()}).then(d=>{e.data=d;return d}).catch(()=>{IMG.bundle=false;return null});
  return e.p;
}const IMG_BASE="https://www.takaratomy.co.jp/products/conan-cardgame/storage/card/";
const COLOR_VAR={"青":"--c-blue","赤":"--c-red","黄":"--c-yellow","緑":"--c-green","白":"--c-white","黒":"--c-black"};
const BANNED=["0208","0050"],LIMIT1=["0002","0624"];
const SAMPLE_DECK={name:"白（X3zM3U7m）",text:`パートナー B01042
事件 D03016
B06066 x3
B03046 x3
PR149 x3
B02038 x3
B04042 x2
B06055 x2
D03006 x1
D03015 x2
D06012 x3
B01055 x3
B02044 x3
B02049 x3
B10045 x3
D03005 x3
B04040 x3`};

const PRESETS=[SAMPLE_DECK,{"name": "黒試し（RVVutYH1）", "text": "パートナー B03107\n事件 B06105\nB05108 x3\nB06099 x2\nB10086 x3\nB10087 x3\nB03111 x3\nB06104 x3\nPR310 x3\nB03116 x3\nD07012 x3\nD07019 x3\nB08089 x2\nD07016 x3\nB04095 x3\nB03132 x3"},{"name": "サッカー4（hlxo2zIa）", "text": "パートナー B10002\n事件 B10019\nB10003 x3\nB10004 x3\nB10005 x2\nB10007 x2\nB10013 x3\nB10017 x1\nB10012 x3\nD01005 x3\nD01015 x2\nD01013 x2\nB03011 x1\nB10016 x3\nB01023 x2\nB09009 x1\nB10008 x3\nB10018 x3\nD01014 x3"},{"name": "青単SOSアグロ（sgsSBbDE）", "text": "パートナー B04002Sec1\n事件 B05024\nD01002 x3\nB01009 x3\nB01010 x3\nB03015 x3\nD01005 x3\nD01012 x3\nD01003 x3\nD01013 x3\nB04010 x2\nD01010 x2\nD08015 x1\nD08016 x2\nB05010 x2\nD01011 x1\nD08018 x1\nPR182 x3\nD01014 x2"}];
function parseDeckText(text){
  const res={partner:null,caseN:null,main:[],errors:[]};
  const tokens=[];
  for(let line of text.split(/\n|,|、/)){
    line=line.trim();if(!line)continue;
    const m=line.match(/([A-Z]{1,2}\d{2,3}[A-Z0-9]*|PR\d{3}[A-Z]?)/i);
    if(!m){continue}
    const n=DBU[m[1].toUpperCase()]||m[1].toUpperCase();
    let cnt=1;const rest=line.replace(m[1],"");
    const cm=rest.match(/[x×*]\s*(\d+)|(\d+)\s*枚|^\s*(\d+)\s|\s(\d+)\s*$/i);
    if(cm)cnt=parseInt(cm[1]||cm[2]||cm[3]||cm[4]);
    const pre=line.slice(0,line.indexOf(m[1]));
    const lead=pre.match(/^(\d+)\s*$/);if(lead)cnt=parseInt(lead[1]);
    tokens.push({n,cnt,hint:/パートナー/.test(line)?"p":/事件/.test(line)?"c":""});
  }
  for(const t of tokens){
    const c=DB[t.n];if(!c){res.errors.push(`不明なカードNo: ${t.n}`);continue}
    if(c.t==="パートナー"||t.hint==="p"&&c.t==="パートナー"){res.partner=t.n;continue}
    if(c.t==="事件"){res.caseN=t.n;continue}
    for(let i=0;i<t.cnt;i++)res.main.push(t.n);
  }
  return res;
}
function validateDeck(d){
  const w=[];
  if(!d.partner)w.push("パートナーがありません");
  if(!d.caseN)w.push("事件がありません");
  if(d.main.length!==40)w.push(`デッキが${d.main.length}枚です（40枚ちょうどが必要）`);
  const byId={};
  for(const n of d.main){const c=DB[n];byId[c.i]=(byId[c.i]||[]);byId[c.i].push(c)}
  for(const [id,cs] of Object.entries(byId)){
    const any=cs.some(c=>(c.f||"").includes("何枚でも"));
    if(BANNED.includes(id))w.push(`禁止カード: ${cs[0].nm}（${id}）`);
    if(LIMIT1.includes(id)&&cs.length>1)w.push(`制限カード（1枚まで）: ${cs[0].nm}`);
    if(cs.length>3&&!any)w.push(`同じIDが${cs.length}枚: ${cs[0].nm}（3枚まで）`);
  }
  return w;
}
function deckToText(d){
  const cnt={};for(const n of d.main)cnt[n]=(cnt[n]||0)+1;
  return `パートナー ${d.partner}\n事件 ${d.caseN}\n`+Object.entries(cnt).map(([n,k])=>`${n} x${k}`).join("\n");
}
// マイデッキ（リンクから登録したデッキ。端末に保存）
const MY_KEY="conan-sim-mydecks";
function loadMyDecks(){try{return JSON.parse(localStorage.getItem(MY_KEY)||"[]")}catch(e){return []}}
function saveMyDecks(a){try{localStorage.setItem(MY_KEY,JSON.stringify(a))}catch(e){}}
function shareIdOf(s){s=(s||"").trim();const m=s.match(/(?:deck\/|share_id=|deck=)([A-Za-z0-9_-]{4,})/);return m?m[1]:s.replace(/[^A-Za-z0-9_-]/g,"")}
function deckGroups(){return [["プリセット","p",PRESETS],["環境デッキ（note・10弾）","e",(window.ENV_DECKS&&ENV_DECKS.decks)||[]],["マイデッキ","m",loadMyDecks()]]}
// 効果の自動化率: 効果文のあるカード（枚数で数える。パートナー・事件も1枚）のうち自動で処理されるもの。CPUは100%のデッキだけ使う
function autoRate(d){let all=0,ok=0;const ng=[];
  for(const id of [...d.main,d.partner,d.caseN]){const c=DB[id];if(!c||!(c.f||c.hr||c.ci))continue;
    all++;if(window.FX&&FX.automated({n:id}))ok++;else ng.push(c)}
  return {all,ok,pct:all?Math.floor(ok/all*100):100,ng}}
function cpuReady(d){const r=autoRate(d);return r.ok===r.all}
function deckByKey(v){const [g,k]=String(v).split(":");const grp=deckGroups().find(x=>x[1]===g);return grp&&grp[2][+k]}
async function fetchShareDeck(id){
  const r=await fetch(`https://conan-tcg-app.com/api/deck/share?share_id=${encodeURIComponent(id)}`,{headers:{Accept:"application/json"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const j=await r.json();const k=j.deck;
  return {name:k.name,text:deckToText({partner:k.partner_num,caseN:k.case_card_num,main:k.card_num_list})};
}
function randomDeck(color){
  const pool=window.CARD_DB.filter(c=>(c.t==="キャラ"||c.t==="イベント")&&c.c===color&&!/P$/.test(c.n)&&!BANNED.includes(c.i));
  const byId={};for(const c of pool)if(!byId[c.i])byId[c.i]=c;
  const uniq=Object.values(byId);shuffle(uniq);
  const curve={1:2,2:3,3:3,4:3,5:3,6:2,7:2,8:2,9:1};
  const main=[];
  for(const [lv,k] of Object.entries(curve)){
    const xs=uniq.filter(c=>c.lv==lv&&(c.t==="キャラ"||Math.random()<.4)).slice(0,k);
    for(const c of xs)for(let i=0;i<3&&main.length<40;i++)main.push(c.n);
  }
  let i=0;const chars=uniq.filter(c=>c.t==="キャラ"&&c.lv<=6);
  while(main.length<40&&i<chars.length*3){const c=chars[i%chars.length];if(main.filter(x=>DB[x].i===c.i).length<3)main.push(c.n);i++}
  const partners=window.CARD_DB.filter(c=>c.t==="パートナー"&&c.c===color&&!/P$/.test(c.n));
  const cases=window.CARD_DB.filter(c=>c.t==="事件"&&c.c===color&&/先攻7/.test(c.df||"")&&!/P$/.test(c.n));
  return {name:`ランダム（${color}）`,text:deckToText({partner:pick(partners).n,caseN:pick(cases).n,main:main.slice(0,40)})};
}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

