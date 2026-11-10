// コンボ表の採用判定: combo_lab.js が見つけたコンボを、「そのコンボを使うCPU」と「使わないCPU」で同じ乱数の並びから対戦させて比べ、
// 有意に勝ったものだけを js/combo_table.js に書く。試合を回す前に1手だけの得点で当たりをつけ、勝敗で確かめる2段構え
// usage: node tools/combo_gate.js デッキ.txt|環境デッキ番号|名前の一部 [--top 8] [--fired 40] [--max 400] [--seed 1] [--search] [--write]
//   --top: 試すコンボの数（combo_labの得点が高い順）  --fired: コンボが実際に出た対戦をここまで集める  --max: 1コンボあたりの対戦数の上限
//   --search: 探索ありのCPU同士で比べる（遅い）。なしなら探索なしのCPU  --write: 採用したものを js/combo_table.js に書く（既存の表はそのまま残す）
// 比べ方（ペア）: 同じ seed・同じデッキ・同じ席で「コンボあり」と「コンボなし」を1回ずつ。コンボが出なかった対戦は両方同じなので数えない。
//   出た対戦のうち「あり だけ勝った」b と「なし だけ勝った」c を符号検定（片側）。採用は b>c かつ p < 0.05÷試したコンボ数（試す数が多いほど厳しく）、b+c>=8
//   勝率の差そのものは「出た対戦」の中の値。実際の対戦全体では、出る割合（fire率）を掛けた分しか効かない
const H=require("./headless");const fs=require("fs"),path=require("path"),cp=require("child_process");
const args=process.argv.slice(2);const flag=(k,d)=>{const i=args.indexOf(k);if(i<0)return d;const v=args[i+1];args.splice(i,2);return v};
const bool=k=>{const i=args.indexOf(k);if(i<0)return false;args.splice(i,1);return true};
const TOP=+flag("--top",8),FIRED=+flag("--fired",40),MAX=+flag("--max",400),SEED=+flag("--seed",1),SEARCH=bool("--search"),WRITE=bool("--write");
const deckArg=args[0];
if(!deckArg){console.log("usage: node tools/combo_gate.js デッキ.txt|番号|名前 [--top 8] [--fired 40] [--max 400] [--seed 1] [--search] [--write]");process.exit(1)}
const TABLE=path.join(H.ROOT,"js/combo_table.js");
// 片側符号検定: n 回中 b 回以上「あり」だけ勝つ確率（勝ちやすさが同じなら 0.5）
function signP(b,n){let s=0;const lg=[0];for(let i=1;i<=n;i++)lg[i]=lg[i-1]+Math.log(i);
  for(let k=b;k<=n;k++)s+=Math.exp(lg[n]-lg[k]-lg[n-k]-n*Math.log(2));return Math.min(1,s)}
(async()=>{
  const tmp=path.join(require("os").tmpdir(),`combo_gate_${process.pid}.json`);
  cp.execFileSync("node",[path.join(__dirname,"combo_lab.js"),deckArg,"--top","1000","--json",tmp],{stdio:"ignore"});
  const found=JSON.parse(fs.readFileSync(tmp,"utf8")).filter(f=>f.act).slice(0,TOP); // 2手以上・デッキから引く連携は、CPUの comboNow が扱えないので除くfs.unlinkSync(tmp);
  const w=H.load({seed:1,init:{AI_OFF:[]}});const E=w.ENV_DECKS.decks,AI_OFF0=w.ev("AI_OFF0");
  let d;if(fs.existsSync(deckArg))d={name:deckArg,text:fs.readFileSync(deckArg,"utf8")};
  else d=/^\d+$/.test(deckArg)?E[+deckArg]:E.find(x=>x.name.includes(deckArg));
  const mine=w.parseDeckText(d.text);
  const COMBO2=w.ev("COMBO2");
  // 1試合: 自分の席に コンボ表 [e]（on なら使う、off なら使わない）。相手は環境デッキから seed で決め、コンボ表は使わない
  async function game(e,on,i){
    w.reseed(SEED*100003+i);const opp=w.parseDeckText(E[Math.floor(w.rnd()*E.length)].text);const seat=i%2;
    COMBO2.length=0;COMBO2.push(e);
    const aiOff=[];aiOff[seat]=on?AI_OFF0:[...AI_OFF0,"combo2"];aiOff[1-seat]=[...AI_OFF0,"combo2"];
    const decks=[];decks[seat]=mine;decks[1-seat]=opp;
    const r=await H.play(w,{decks,search:[SEARCH,SEARCH],aiOff});
    return {win:r.winner===seat,fired:(w.__G().comboFired||0)}}
  const res=[];
  for(const f of found){
    const e={parts:f.parts,act:f.act,how:f.how,deck:d.name};
    let games=0,fired=0,b=0,c=0,onW=0,offW=0;
    for(let i=0;i<MAX&&fired<FIRED;i++){
      const on=await game(e,true,i);games++;if(!on.fired)continue;
      const off=await game(e,false,i);fired++;
      if(on.win)onW++;if(off.win)offW++;if(on.win&&!off.win)b++;if(!on.win&&off.win)c++}
    const p=b+c?signP(b,b+c):1;
    res.push({e,games,fired,onW,offW,b,c,p});
    console.log(`${f.how} [${f.parts.map(x=>x.n+x.where[0]).join("+")}] 出た${fired}/${games}戦  あり${onW}勝・なし${offW}勝  b=${b} c=${c} p=${p.toFixed(3)}`);
  }
  const alpha=0.05/Math.max(1,found.length);
  const adopt=res.filter(r=>r.b>r.c&&r.b+r.c>=8&&r.p<alpha);
  console.log(`\n採用の基準: b>c・b+c>=8・p<${alpha.toFixed(4)}（0.05÷${found.length}）。採用 ${adopt.length}件 / 試した ${res.length}件  [${d.name}・${SEARCH?"探索あり":"探索なし"}]`);
  for(const r of adopt)console.log("  採用:",r.e.how,r.e.parts.map(x=>x.n+x.where[0]).join("+"));
  if(WRITE&&adopt.length){
    const text=fs.readFileSync(TABLE,"utf8");
    const old=new Function(text.replace('"use strict";','')+";return COMBO2")();
    const key=e=>JSON.stringify([e.parts,e.act]);const keep=old.filter(o=>!adopt.some(r=>key(r.e)===key(o)));
    const add=adopt.map(r=>({...r.e,wr:{fired:r.fired,on:r.onW,off:r.offW,b:r.b,c:r.c,p:+r.p.toFixed(4),seed:SEED,search:SEARCH,date:new Date().toISOString().slice(0,10)}}));
    fs.writeFileSync(TABLE,text.split("const COMBO2=")[0]+"const COMBO2=[\n"+[...keep,...add].map(x=>" "+JSON.stringify(x)).join(",\n")+"\n];\n");
    console.log("js/combo_table.js に書いた");
  }
})();
