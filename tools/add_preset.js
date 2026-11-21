// 端末のプリセット（アプリの「端末プリセットをコピー」で出る JSON）を、コード側の PRESETS（js/data.js）に足す。
// 使い方: node tools/add_preset.js プリセット.json   （[{name,text},...] または {name,text}）
// 名前か中身（パートナー・事件・40枚）が同じものは足さない。足したあとは総当たり（tools/gen_winrate.js で DECK_WR 更新）へ。
const fs=require("fs"),H=require("./headless");
const src=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const add=Array.isArray(src)?src:[src];
const w=H.load({seed:1});const key=t=>w.deckToText(w.parseDeckText(t));
const have=[...w.ev("PRESETS"),...w.ENV_DECKS.decks];
const file=require("path").join(__dirname,"../js/data.js");let s=fs.readFileSync(file,"utf8");let n=0;
for(const d of add){
  const p=w.parseDeckText(d.text);const bad=[...p.errors,...w.validateDeck(p)];
  if(bad.length){console.log("スキップ（デッキに問題）:",d.name,bad.join(" / "));continue}
  const same=have.find(x=>x.name===d.name||key(x.text)===key(d.text));
  if(same){console.log("スキップ（すでにある）:",d.name,"=",same.name);continue}
  const i=s.indexOf("const PRESETS=[");const e=s.indexOf("}];",i);
  s=s.slice(0,e+1)+","+JSON.stringify({name:d.name,text:key(d.text)})+s.slice(e+1);have.push(d);n++;console.log("追加:",d.name)}
if(n)fs.writeFileSync(file,s);console.log(n+"個追加");
