// 対戦記録からのフィードバック: node tools/feedback.js 記録.json
// 分析ロジックは js/feedback.js（アプリの「記録からフィードバック」と共通）。ここは Node 用の入口。
const fs=require("fs");
const {analyze,toMarkdown,unpack}=require("../js/feedback.js");
module.exports={analyze,toMarkdown,pack:require("../js/feedback.js").pack,unpack};
if(require.main===module){
  const f=process.argv[2];if(!f){console.log("使い方: node tools/feedback.js 記録.json");process.exit(1)}
  const H=require("./headless");const w=H.load({seed:1});
  const txt=fs.readFileSync(f,"utf8");const nm=n=>w.ev("(DB[\""+n+"\"]||{}).nm")||n;
  const res=analyze(txt.trim().startsWith("CS1")?unpack(txt,{nameOf:nm}):JSON.parse(txt),{parse:t=>w.parseDeckText(t),nameOf:n=>w.ev("(DB[\""+n+"\"]||{}).nm")||n});
  console.log(toMarkdown(res));
}
