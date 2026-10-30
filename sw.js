// オフライン用: 同じ場所のファイルを端末に保存し、通信できないときも遊べるようにする
// V はキャッシュの名前。本体はいつもネット優先で取り直すので、ファイルを更新しても V を上げる必要はない
// （このファイルのキャッシュの仕組みを変えたときだけ上げる）
const V="v18";
const CORE=["./", "index.html", "style.css", "js/data.js", "js/state.js", "js/engine.js", "js/cpu.js", "js/search.js", "js/dialogs.js", "js/show.js", "js/ui.js", "js/setup.js", "js/cards.js", "js/effects/core.js", "js/effects/breakers.js", "js/effects/soccer.js", "js/effects/white.js", "js/effects/black.js", "js/effects/blue.js", "js/effects/blue-black.js", "js/effects/red.js", "js/effects/yellow.js", "js/effects/green.js", "js/effects/misc.js", "js/effects/auto.js", "js/effects/hooks.js", "js/decks.js", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png"];
const IMGS=["img/A-01.json", "img/A-02.json", "img/A-03.json", "img/CT-D01.json", "img/CT-D02.json", "img/CT-D03.json", "img/CT-D04.json", "img/CT-D05.json", "img/CT-D06.json", "img/CT-D07.json", "img/CT-D08.json", "img/CT-D09.json", "img/CT-D10.json", "img/CT-D11.json", "img/CT-P01.json", "img/CT-P02.json", "img/CT-P03.json", "img/CT-P04.json", "img/CT-P05.json", "img/CT-P06.json", "img/CT-P07.json", "img/CT-P08.json", "img/CT-P09.json", "img/CT-P10.json", "img/CT-P11.json", "img/PR.json", "img/SP.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==V)await caches.delete(k);
  await self.clients.claim();
  const c=await caches.open(V);for(const u of IMGS){if(!(await c.match(u)))try{await c.add(u)}catch(_){}} // 画像は後から順に保存
})())});
// 本体は通信できればネット優先（no-cache でブラウザのキャッシュも必ず確認し、更新をすぐ反映）、画像はキャッシュ優先
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  const img=/\/img\//.test(r.url);
  e.respondWith((async()=>{const c=await caches.open(V);
    if(img){const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}
    // 通信できない・エラーのとき（公開の更新中など）は保存済みの本体を使う
    let res=null;try{res=await fetch(r,{cache:"no-cache"})}catch(_){}
    if(res&&res.ok&&!res.redirected){c.put(r,res.clone());return res}
    const hit=await c.match(r,{ignoreSearch:true})||(r.mode==="navigate"&&await c.match("index.html"));
    if(hit)return hit;
    return res||Response.error()
  })())});
