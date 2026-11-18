// 対戦記録からのフィードバック: node tools/feedback.js 記録.json
// 分析ロジックは js/feedback.js（アプリの「記録からフィードバック」と共通）。ここは Node 用の入口。
const fs=require("fs");
const {analyze,toMarkdown,unpack,unpackAny}=require("../js/feedback.js");
module.exports={analyze,toMarkdown,pack:require("../js/feedback.js").pack,unpack,packChunks:require("../js/feedback.js").packChunks,unpackAny};
// 圧縮コピー(CS1/CS2)を記録JSONに戻す: node tools/feedback.js --unpack 圧縮.txt [出力.json]（出力省略で標準出力）。CS2はチャンクをつなげた1ファイルでよい
if(require.main===module&&process.argv[2]==="--unpack"){
  const f=process.argv[3];if(!f){console.log("使い方: node tools/feedback.js --unpack 圧縮.txt [出力.json]");process.exit(1)}
  unpackAny(fs.readFileSync(f,"utf8"),{nameOf:n=>n}).then(u=>{const j=JSON.stringify(u.records,null,1);
    if(process.argv[4])fs.writeFileSync(process.argv[4],j);else console.log(j);
    console.error(`${u.records.length}戦を復元（${u.chunks}/${u.total}分割）`+(u.missing.length?` 足りない分割: ${u.missing.join(",")}`:""))})
}else if(require.main===module){
  const f=process.argv[2];if(!f){console.log("使い方: node tools/feedback.js 記録.json\n         node tools/feedback.js --unpack 圧縮.txt [出力.json]");process.exit(1)}
  const H=require("./headless");const w=H.load({seed:1});
  const txt=fs.readFileSync(f,"utf8");const nm=n=>w.ev("(DB[\""+n+"\"]||{}).nm")||n;
  (async()=>{const recs=/^\s*CS[12]/.test(txt)?(await unpackAny(txt,{nameOf:nm})).records:JSON.parse(txt);
    console.log(toMarkdown(analyze(recs,{parse:t=>w.parseDeckText(t),nameOf:nm})))})();
}
