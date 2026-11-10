"use strict";
// カード個別効果（イベント・事件を優先した自動化）。SeEdの方針(2026-11-10): イベント→事件→MR→レベル8 の順に進める。
// 優先順位の元データは共有フォルダ simulator/unimplemented-priority-2026-11-10.csv。確認は node tools/coverage.js

// --- 部品 ---
// デッキの上から条件に合うカードが出るまで1枚ずつ公開し、それを返す（手札に加えるのは呼び出し側）。残りはデッキの下に移してシャッフル
function digTop(p,f){const xs=[];let hit=null;
  while(p.deck.length){const y=p.deck.shift();xs.push(y);if(f(y)){hit=y;break}}
  log(`　${p.name} はデッキの上から${xs.length}枚を公開`,"n");
  for(const y of xs)if(y!==hit)p.deck.push(y);
  shuffle(p.deck);return hit}
const digToHand=(p,f)=>{const y=digTop(p,f);if(y){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}return y};
// デッキの上からn枚見て、条件に合うカードを max 枚まで手札に。残りはリムーブエリアへ
async function lookToRm(p,n,f,title,max=1){const xs=p.deck.splice(0,n);if(!xs.length)return [];
  log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const got=await pickCards(p,title,"",xs.filter(f),{max,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,max)});
  for(const y of xs){if(got.includes(y)){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}else p.rm.push(y)}
  if(xs.length>got.length)log(`　残り${xs.length-got.length}枚をリムーブエリアへ`,"n");checkDeck(p);return got}
// デッキの上からn枚見て、条件に合うキャラを max 枚まで登場させ、残りをシャッフルしてデッキの下に移す
async function lookEnter(p,n,f,max,title){const xs=p.deck.splice(0,n);if(!xs.length)return [];
  log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const got=await pickCards(p,title,"",xs.filter(f),{max,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,max)});
  const rest=xs.filter(y=>!got.includes(y));shuffle(rest);p.deck.push(...rest);checkDeck(p);
  for(const y of got)await enterByEffect(p,y,"a");return got}
// 手札から条件に合うキャラを1枚まで、指定の状態で登場させる
async function playFromHandSt(p,filter,title,st="s"){
  const cs=p.hand.filter(x=>C(x).t==="キャラ"&&filter(x));if(!cs.length)return null;
  const [x]=await pickCards(p,title,"",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});
  if(!x)return null;await enterByEffect(p,x,st);return x}
// このイベントを表向きのまま証拠として得る
function evidenceSelf(p,x){const i=p.rm.indexOf(x);if(i<0)return;p.rm.splice(i,1);x.st="a";x.up=true;p.ev.push(x);log(`　${C(x).nm} を表向きのまま証拠として得た（証拠${p.ev.length}）`)}
// 「以下から1つ選んで行う。条件を満たす場合、代わりに全部」型。fns は上から順に行う
async function modeEvent(p,title,labels,fns,all,aiIdx=0){
  if(all){for(const f of fns)await f();return}
  await fns[await pickMode(p,title,labels,aiIdx)]()}
const ownCh=(p,f=()=>true)=>y=>!isOpp(p,y)&&f(y);
const bestOwn=(p)=>cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1);
// 自分の現場のキャラを好きな数選ぶ（CPUは全員）
const pickOwnMany=(p,title,f)=>pickCards(p,title,"",p.field.filter(f),{max:5,ai:c=>c});
const fileTopCard=p=>[...p.file].reverse().find(y=>y!==p.partner);
const takeFileTop=(p)=>{const y=fileTopCard(p);if(!y)return null;p.file.splice(p.file.indexOf(y),1);return y};
const isCIblack=y=>hasColor(y,"黒")&&!!C(y).ci;
// カード名の指定（相手の持つカード名から）。CPUは相手のデッキで一番多い名前
async function guessName(p,title){const o=opp(p);const pool=[...o.deck,...o.file.filter(y=>y!==o.partner),...o.hand,...o.rm,...o.field,...o.ev];
  const cnt=new Map;for(const y of pool)for(const n of namesOf(y))cnt.set(n,(cnt.get(n)||0)+1); // 複数名カードはそれぞれの名前で数える
  const names=[...cnt.keys()].sort((a,b)=>cnt.get(b)-cnt.get(a));if(!names.length)return null;
  if(p.cpu)return names[0];
  const [y]=await chooseCards(`${p.name}: カード名を指定`,title||"カード名を指定します",names.map(n=>pool.find(z=>nameOf(z)===n)||pool.find(exactName(n))),{min:1,max:1,okLabel:"指定"});
  return y?names[names.map(n=>pool.find(z=>nameOf(z)===n)||pool.find(exactName(n))).indexOf(y)]:null}

// ================= 事件 =================
// 「自分の【黒】のパートナーの【事件解決】能力を以下の能力に書き換える。【解決編】【証拠隠滅】…」型
const eraseCase=(extra={})=>({eraseEvidence:true,...extra});
const oppDrawOnSolved={solvedTrigger:async p=>drawN(opp(p),1)};
DEF["0384"]=eraseCase(); // あばよ…名探偵!! B03135
DEF["0398"]=eraseCase(); // コードネーム・シェリー D07024
DEF["0614"]=eraseCase(oppDrawOnSolved); // 裏切りの制裁 B05118
DEF["0615"]=eraseCase(oppDrawOnSolved); // 裏切りの矛先 B05119
DEF["0723"]=eraseCase(oppDrawOnSolved); // 白の世界 B06106
DEF["0724"]=eraseCase(oppDrawOnSolved); // 満月の夜の二元ミステリー B06107
DEF["0725"]=eraseCase(oppDrawOnSolved); // 漆黒の特急 B06108
DEF["0616"]={ // 集められた名探偵 B05120
  ...oppDrawOnSolved,handBlock:(p,x)=>hasTrait(x,"探偵")?null:"［探偵］以外のキャラは手札から使用できない"};
DEF["0726"]={ // 紅の修学旅行 B06109
  ...oppDrawOnSolved,handBlock:(p,x)=>hasTrait(x,"高校生")?null:"［高校生］以外のキャラは手札から使用できない"};
DEF["0565"]={ // 園子のアブない夏物語 B05063
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を3つ表向きに: 手札のレベル8以下の［京極真］を登場（ターン終了時に手札へ）",turn1:true,
    can:p=>p.solved&&evDown(p)>=3&&p.field.filter(y=>hasTrait(y,"鈴木財閥")).length>=3&&p.hand.some(y=>isChar(y)&&lvOf(y)<=8&&named("京極真")(y)),
    run:async p=>{if(!flipEvidence(p,3))return false;const y=await playFromHandSt(p,y=>lvOf(y)<=8&&named("京極真")(y),"登場させる［京極真］（レベル8以下）","a");if(y)giveKw(y,"終了時手札");return true}}]};
DEF["0583"]={ // 太閤名人の将棋盤 B05083
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を3つ表向きに: リムーブエリアの［赤井家］のキャラを手札に",turn1:true,
    can:p=>p.solved&&evDown(p)>=3&&p.file.length<=5&&p.field.filter(y=>hasTrait(y,"赤井家")).length>=3&&p.rm.some(y=>isChar(y)&&hasTrait(y,"赤井家")),
    run:async p=>{if(!flipEvidence(p,3))return false;await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"赤井家"),"手札に加える［赤井家］のキャラ");return true}}]};
DEF["0714"]={ // 榎本梓誘拐事件 B06095
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を2つ表向きに: このターン、自分のキャラはすべて［喫茶ポアロ］を持つ",turn1:true,can:p=>p.solved&&evDown(p)>=2&&p.field.length>0,
    aiCan:p=>p.field.some(y=>hasTrait(y,"喫茶ポアロ"))||p.hand.some(y=>hasTrait(y,"喫茶ポアロ")),
    run:async p=>{if(!flipEvidence(p,2))return false;p.poaroT=G.turnNo;log("　このターン、自分のキャラはすべて［喫茶ポアロ］を持つ","n");return true}}]};
DEF["0806"]={ // 揺れる心 B07077
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を1つ表向きに: 相手のキャラをレベル－1",turn1:true,can:p=>p.solved&&evDown(p)>=1&&p.field.some(y=>hasTrait(y,"FBI"))&&opp(p).field.length>0,
    run:async p=>{if(!flipEvidence(p,1))return false;const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y));if(t){t.lvT-=1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}return true}}]};
DEF["0499"]={ // 青の古城探索事件 D08026
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を1つ以上表向きに: ［少年探偵団］をAP＋1000（表向きにした数だけ）",turn1:true,can:p=>p.solved&&evDown(p)>=1&&p.field.some(y=>hasTrait(y,"少年探偵団")),
    run:async p=>{const max=Math.min(evDown(p),5);let n=1;
      if(max>1&&!p.cpu)n=await ask(`${p.name}: 表向きにする証拠の数`,"表向きにした証拠1つにつきAP＋1000",Array.from({length:max},(_,i)=>({label:`${i+1}つ`,value:i+1,primary:i===0})));
      else n=Math.min(max,2);
      if(!flipEvidence(p,n))return false;const t=await chooseChar(p,"AP＋する［少年探偵団］",ownCh(p,y=>hasTrait(y,"少年探偵団")),{ai:bestOwn(p)});if(t)apTurn(t,1000*n);return true}}]};
DEF["1059"]={ // ハイウェイの堕天使 PR286
  solvedTrigger:solvedDisc,
  abilities:[{label:"手札の［神奈川県警］か【疾風】を1枚リムーブ: このターン次に登場するキャラは【疾風】の条件を無視",turn1:true,
    can:p=>p.solved&&p.hand.some(y=>isChar(y)&&(hasTrait(y,"神奈川県警")||gale(y))),aiCan:p=>p.hand.some(y=>isChar(y)&&gale(y))&&p.hand.length>=3,
    run:async p=>{const [y]=await discard(p,1,"リムーブする［神奈川県警］か【疾風】のキャラ",p,y=>isChar(y)&&(hasTrait(y,"神奈川県警")||gale(y)));if(!y)return false;p.galeFree=G.turnNo;log("　このターン、次に登場するキャラは【疾風】の条件を無視できる","n");return true}}]};
DEF["1164"]={ // 警察学校の風呂掃除 PR320
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を2つ表向きに: デッキの上2枚から警察学校組を手札に",turn1:true,
    can:p=>p.solved&&evDown(p)>=2&&p.field.some(named("降谷零")),
    run:async p=>{if(!flipEvidence(p,2))return false;await lookToRm(p,2,named("降谷零","諸伏景光","伊達航","萩原研二","松田陣平"),"手札に加える警察学校組");return true}}]};
DEF["1046"]={ // 犯人たちの犯行 B09107
  noSolve:true,
  abilities:[{label:"デッキをすべてリムーブ: 証拠をすべて表向きに（［犯人］が8枚以上なら相手の敗北）",turn1:true,
    can:p=>p.solved&&p.deck.length>0,aiCan:p=>p.ev.filter(y=>hasTrait(y,"犯人")).length>=8||p.ev.filter(e=>!e.up&&hasTrait(e,"犯人")).length+p.ev.filter(e=>e.up&&hasTrait(e,"犯人")).length>=8,
    run:async p=>{millSelf(p,p.deck.length);for(const e of p.ev)e.up=true;log(`　${p.name} は証拠をすべて表向きにした`,"n");
      const n=p.ev.filter(y=>hasTrait(y,"犯人")).length;if(n>=8)win(p,`犯人たちの犯行（証拠に［犯人］が${n}枚）で相手が敗北`);return true}}]};

// ================= イベント =================
// --- 表向きの証拠になるイベント ---
for(const id of ["0162","0164","0165","0166","0406"])DEF[id]={event:async(p,x)=>evidenceSelf(p,x),ai:p=>true}; // なるほどな… ほか

DEF["0018"]={ // 少年探偵団 B01022
  event:async p=>{if(!partnerIs(p,"青"))return noEff();if(p.hand.length)await discard(p,1);
    await lookEnter(p,6,y=>isChar(y)&&lvOf(y)<=4&&hasTrait(y,"少年探偵団"),2,"登場させる［少年探偵団］（レベル4以下）")},
  ai:p=>partnerIs(p,"青")&&p.deck.length>8&&p.hand.length>=2};
DEF["0034"]={ // 「オレの和葉に何さらしとんじゃ!!!」 B01040
  event:async p=>{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);drawN(p,1)},ai:p=>true};
DEF["0066"]={ // 「開けるんだキャメル…」 B01076
  event:async p=>{await enterFromRm(p,y=>hasColor(y,"赤")&&lvOf(y)<=6,"登場させる【赤】のキャラ（レベル6以下）")},
  ai:p=>p.rm.some(y=>isChar(y)&&hasColor(y,"赤")&&lvOf(y)<=6)};
DEF["0067"]={ // 「赤井…秀一!?」 B01077
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();const o=opp(p);
    if(o.hand.length){const y=o.hand[Math.floor(Math.random()*o.hand.length)];detach(y);o.rm.push(y);log(`　${o.name} の手札をランダムに1枚リムーブ`,"n")}
    const t=await chooseChar(p,"ブレットを与えるキャラ",ownCh(p),{ai:bestOwn(p)});if(t)giveKw(t,"ブレット")},
  ai:p=>partnerIs(p,"赤")&&p.field.length>0};
DEF["0082"]={ // 「刑事なら刑事らしく…」 B01094
  event:async p=>{await pickRmToHand(p,y=>isChar(y)&&hasColor(y,"黄"),"手札に加える【黄】のキャラ");
    const t=await chooseChar(p,"突撃［キャラ］を与えるキャラ（レベル7以下）",ownCh(p,lvLe(7)),{ai:bestOwn(p)});if(t)giveKw(t,"突撃［キャラ］")},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasColor(y,"黄"),"ヒラメキ: 手札に加える【黄】のキャラ")},
  ai:p=>p.rm.some(y=>isChar(y)&&hasColor(y,"黄"))};
DEF["0083"]={ // 「僕の日本から…」 B01095
  event:async p=>{if(!partnerIs(p,"黄"))return noEff();const nm=await guessName(p,"捜査1で見つかるカード名を指定します");if(!nm)return;
    log(`　カード名［${nm}］を指定`,"n");const found=investigate(p,1).some(exactName(nm));
    if(!found){log("　指定したカード名は発見されなかった","n");return}
    for(let i=0;i<2;i++){const t=await chooseChar(p,"スタンさせるキャラ",y=>y.st!=="x");if(t)stunC(t)}},
  ai:p=>partnerIs(p,"黄")};
DEF["0186"]={ // 少年探偵団の活躍 B02014
  event:async p=>{const cs=await pickOwnMany(p,"突撃［事件］を与える［少年探偵団］（レベル5以下）",y=>lvOf(y)<=5&&hasTrait(y,"少年探偵団"));
    for(const y of cs){giveKw(y,"突撃［事件］");y.actDrawT=G.turnNo}},
  ai:p=>p.field.some(y=>lvOf(y)<=5&&hasTrait(y,"少年探偵団")&&y.st==="a")};
DEF["0202"]={ // 「立てや坂田ァ!!」 B02032
  useBlock:p=>p.solved&&p.field.some(named("服部平次"))?null:"自分の事件が解決編で、現場に［服部平次］がいるときだけ使える",
  event:async p=>{for(const y of opp(p).field)if(y.st==="a")sleepC(y)},ai:p=>opp(p).field.filter(y=>y.st==="a").length>=2};
DEF["0172"]={ // レッドヘリング B02051
  event:async p=>{const own=p.field.filter(y=>y.st==="a");
    if(!own.length||!await yes(p,"レッドヘリング","自分のキャラを1枚スリープさせて、レベル7以下のキャラをリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)))return;
    const [t]=await pickCards(p,"スリープさせる自分のキャラ","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!t)return;
    sleepC(t);await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）")},
  ai:p=>p.field.some(y=>y.st==="a")&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)};
DEF["0218"]={ // 「か、怪盗キッド!!!」 B02053
  event:async p=>{await enterFromRm(p,y=>hasColor(y,"白")&&hasTrait(y,"怪盗")&&lvOf(y)<=7,"登場させる【白】の［怪盗］（レベル7以下）")},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasColor(y,"白")&&hasTrait(y,"怪盗"),"ヒラメキ: 手札に加える【白】の［怪盗］")},
  ai:p=>p.rm.some(y=>isChar(y)&&hasColor(y,"白")&&hasTrait(y,"怪盗")&&lvOf(y)<=7)};
DEF["0231"]={ // 「行け秀一！その熱病でお前の命が尽きるまで…」 B02068
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();const cs=await pickOwnMany(p,"能力を与える【赤】のキャラ",y=>hasColor(y,"赤"));
    for(const y of cs){y.fevT=G.turnNo;log(`　${C(y).nm} にアクション［事件］時の能力を与えた`,"n")}},
  ai:p=>partnerIs(p,"赤")&&p.field.some(y=>hasColor(y,"赤")&&y.st==="a")&&p.hand.length>=2};
DEF["0244"]={ // 「いや、もうオトリはなしだ…」 B02083
  event:async p=>{if(!partnerIs(p,"黄"))return noEff();const n=opp(p).field.filter(y=>y.st==="x").length;
    if(n)drawN(p,n);else{const t=await chooseChar(p,"スタンさせるキャラ",y=>y.st!=="x");if(t)stunC(t)}},
  ai:p=>partnerIs(p,"黄")};
DEF["0282"]={ // 「新一!!!」 B03024
  event:async p=>{const own=p.field.filter(y=>lvOf(y)<=8);
    if(!own.length||!await yes(p,"「新一!!!」","自分のレベル8以下のキャラを1枚デッキの下に移して、相手のレベル8以下のキャラも移し、手札のレベル6以下の【青】のキャラを登場させますか？",true))return;
    const [t]=await pickCards(p,"デッキの下に移す自分のキャラ","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!t)return;toDeckBottom(t);
    await bottomChar(p,y=>isOpp(p,y)&&lvOf(y)<=8,"デッキの下に移す相手のキャラ（レベル8以下）");
    await playFromHandSt(p,y=>hasColor(y,"青")&&lvOf(y)<=6,"スリープ状態で登場させる【青】のキャラ（レベル6以下）")},
  ai:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8)&&p.field.some(y=>lvOf(y)<=3)};
DEF["0283"]={ // 「え？取材？」 B03025
  event:async p=>{await lookToRm(p,5,y=>isChar(y)&&hasTrait(y,"少年探偵団"),"手札に加える［少年探偵団］");
    await playFromHand(p,y=>lvOf(y)<=6&&hasTrait(y,"少年探偵団"),"登場させる［少年探偵団］（レベル6以下）")},
  ai:p=>p.deck.length>8};
DEF["0582"]={ // 「FBI…」 B05082
  event:async p=>{await lookToRm(p,5,y=>isChar(y)&&hasTrait(y,"FBI"),"手札に加える［FBI］");
    await playFromHand(p,y=>lvOf(y)<=6&&hasTrait(y,"FBI"),"登場させる［FBI］（レベル6以下）")},
  ai:p=>p.deck.length>8};
DEF["0299"]={ // 「ボクは好きだな… 君みたいな熱い探偵…」 B03042
  event:async p=>{const xs=p.deck.splice(0,5);log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const det=xs.filter(y=>isChar(y)&&hasTrait(y,"探偵"));
    const [a]=await pickCards(p,"手札に加える［探偵］","",det,{max:1,ai:c=>c.slice().sort((x,y)=>lvOf(y)-lvOf(x)).slice(0,1)});
    let b=null;if(a){const ca=colorsOf(C(a).c);[b]=await pickCards(p,"手札に加える［探偵］（1枚目と同じ色を持たない）","",det.filter(y=>y!==a&&!colorsOf(C(y).c).some(ch=>ca.includes(ch))),{max:1,ai:c=>c.slice().sort((x,y)=>lvOf(y)-lvOf(x)).slice(0,1)})}
    for(const y of [a,b])if(y){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}
    const rest=xs.filter(y=>y!==a&&y!==b);shuffle(rest);p.deck.push(...rest);checkDeck(p)},
  ai:p=>p.deck.length>8};
DEF["0317"]={ // 私はもう貴方のそばに… B03062
  event:async p=>{if(!partnerIs(p,"白"))return noEff();
    if(!p.field.length||!await yes(p,"貴方のそばに…","自分のキャラを1枚デッキの下に移して、デッキの上からレベル8のキャラを探して登場させますか？",()=>p.field.some(y=>lvOf(y)<=5)&&p.deck.some(y=>isChar(y)&&lvOf(y)===8)))return;
    const [t]=await pickCards(p,"デッキの下に移す自分のキャラ","",p.field,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!t)return;toDeckBottom(t);
    const hit=digTop(p,y=>isChar(y)&&lvOf(y)===8);if(hit)await enterByEffect(p,hit,"a")},
  ai:p=>partnerIs(p,"白")&&p.field.some(y=>lvOf(y)<=5)&&p.deck.some(y=>isChar(y)&&lvOf(y)===8)};
DEF["0318"]={ // 死闘 B03063
  event:async p=>{const ks=p.field.filter(y=>hasTrait(y,"空手家"));
    for(let i=0;i<ks.length;i++){const t=await chooseChar(p,"スリープさせる相手のキャラ",y=>isOpp(p,y)&&y.st==="a");if(!t)break;sleepC(t)}
    for(const y of ks)apTurn(y,1000)},
  ai:p=>p.field.some(y=>hasTrait(y,"空手家"))&&oppHas(p,y=>y.st==="a")};
DEF["0335"]={ // 「吹っ飛べェ!!」 B03081
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();const t=await chooseChar(p,"手札に移す相手のキャラ",y=>isOpp(p,y));if(t){toHandFromField(t);await runQueue()}
    const q=opp(p);await discard(q,1,"手札をリムーブ（「吹っ飛べェ!!」）",q)},
  ai:p=>partnerIs(p,"赤")&&opp(p).field.length>0};
DEF["0356"]={ // ヤンチャな5人組 B03103
  event:async p=>{if(!partnerIs(p,"黄"))return noEff();const big=p.field.length>=5;
    const t=await chooseChar(p,big?"リムーブする相手のキャラ":"スタンさせる相手のキャラ",y=>isOpp(p,y)&&(big||y.st!=="x"));
    if(t){if(big)rmBy(p,t);else stunC(t)}},
  ai:p=>partnerIs(p,"黄")&&oppHas(p,y=>y.st!=="x")};
DEF["0357"]={ // 24時間、年中無休 B03104
  event:async p=>{const n=p.rm.length>=15?2:1;const cs=await pickCards(p,`AP＋2000する［警察］（${n}枚まで）`,"",p.field.filter(y=>hasTrait(y,"警察")),{max:n,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a)).slice(0,n)});
    for(const y of cs){apTurn(y,2000);giveKw(y,"突撃［キャラ］")}},
  ai:p=>p.field.some(y=>hasTrait(y,"警察")&&y.st==="a")};
DEF["0383"]={ // ジンの眼光 B03134
  useBlock:p=>p.ev.length<=opp(p).ev.length?null:"自分の証拠が相手より多いときは使えない",
  event:async p=>{if(!partnerIs(p,"黒"))return noEff();await rmChar(p,()=>true)},ai:p=>partnerIs(p,"黒")&&oppHas(p,y=>lvOf(y)>=4)};
DEF["0417"]={ // 最後の切り札 B04014
  event:async p=>{if(!partnerIs(p,"青")||!p.solved)return noEff();
    await modeEvent(p,"最後の切り札",["キャラ2枚をスリープ、1枚引く","レベル6以下のキャラをリムーブ","キャラに突撃を与える"],[
      async()=>{for(let i=0;i<2;i++){const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}drawN(p,1)},
      async()=>{await rmChar(p,lvLe(6),"リムーブするキャラ（レベル6以下）")},
      async()=>{const t=await chooseChar(p,"突撃を与えるキャラ",ownCh(p),{ai:bestOwn(p)});if(t)giveKw(t,"突撃")}],false,oppHas(p,y=>lvOf(y)<=6&&lvOf(y)>=4)?1:0)},
  ai:p=>partnerIs(p,"青")&&p.solved};
DEF["0452"]={ // 「諦めるなよ瑛海!!」 B04063
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();const xs=p.deck.splice(0,3);log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [g]=await pickCards(p,"手札に加えるカード","",xs,{max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
    let sum=0;for(const y of xs){if(y===g){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}else{p.rm.push(y);sum+=C(y).lv||0}}checkDeck(p);
    if(sum>0)await rmChar(p,lvLe(sum),`リムーブするキャラ（レベル${sum}以下）`)},
  ai:p=>partnerIs(p,"赤")&&p.deck.length>5};
DEF["0453"]={ // 「消えろ!!」 B04064
  useBlock:p=>p.file.length<=5?null:"FILEが6枚以上あるときは使えない",
  event:async p=>{if(!partnerIs(p,"赤")||!p.solved)return noEff();await rmChar(p,y=>lvOf(y)>=8,"リムーブするキャラ（レベル8以上）");
    await playFromHand(p,y=>lvOf(y)<=4,"登場させるキャラ（レベル4以下）")},
  ai:p=>partnerIs(p,"赤")&&p.solved&&oppHas(p,y=>lvOf(y)>=8)};
DEF["0468"]={ // バカな作戦 B04084
  event:async p=>{if(!partnerIs(p,"黄")||!p.solved)return noEff();
    if(p.hand.length<2||!await yes(p,"バカな作戦","手札を2枚リムーブして、リムーブエリアの［警察］を2枚まで登場させますか？",()=>p.hand.length>=4&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警察"))))return;
    await discard(p,2);const cs=p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=8);
    let got=await pickCards(p,"登場させる［警察］（レベルの合計10以下・2枚まで）","",cs,{max:2,ai:c=>{const s=c.slice().sort((a,b)=>lvOf(b)-lvOf(a));const out=[];let sum=0;for(const y of s){if(sum+lvOf(y)<=10&&out.length<2){out.push(y);sum+=lvOf(y)}}return out}});
    if(got.length===2&&lvOf(got[0])+lvOf(got[1])>10)got=[got[0]];
    if(got[0])await enterByEffect(p,got[0],"a");if(got[1])await enterByEffect(p,got[1],"s")},
  ai:p=>partnerIs(p,"黄")&&p.solved&&p.hand.length>=4&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警察"))};
DEF["0469"]={ // 「わかってくれますよね…」 B04085
  event:async p=>{const own=p.field.filter(y=>y.st==="a"&&hasTrait(y,"警察"));
    if(!own.length||!await yes(p,"「わかってくれますよね…」","アクティブの［警察］を1枚スタンさせて、キャラをリムーブして1枚引きますか？",()=>oppHas(p,y=>lvOf(y)>=4)))return;
    const [t]=await pickCards(p,"スタンさせる自分の［警察］","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(!t)return;
    stunC(t);await rmChar(p,()=>true);drawN(p,1)},
  ai:p=>p.field.some(y=>y.st==="a"&&hasTrait(y,"警察"))&&oppHas(p,y=>lvOf(y)>=4)};
DEF["0528"]={ // 「オレがついてる!!」 B05022
  event:async p=>{const cs=await pickCards(p,"元のAPを0にする相手のキャラ","",opp(p).field.filter(y=>!immune(p,y)),{max:5,ai:c=>c});
    for(const y of cs){y.apT-=(C(y).ap||0);log(`　${C(y).nm} をターン終了時まで元のAP0に`,"n")}},
  ai:p=>opp(p).field.some(y=>y.st==="a")};
DEF["0529"]={ // 「探偵の毛利小五郎でございます…」 B05023
  event:async p=>{const all=p.field.some(named("毛利小五郎"));
    await modeEvent(p,"毛利小五郎でございます",["［毛利探偵事務所］に突撃を与える","キャラをスリープさせ、1枚引く"],[
      async()=>{const t=await chooseChar(p,"突撃を与える［毛利探偵事務所］",ownCh(p,y=>hasTrait(y,"毛利探偵事務所")),{ai:bestOwn(p)});if(t)giveKw(t,"突撃")},
      async()=>{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);drawN(p,1)}],all,1)},
  ai:p=>true};
DEF["0546"]={ // ラブリースポット B05042
  event:async(p,x)=>{digToHand(p,y=>C(y).t==="イベント");
    const cs=p.hand.filter(y=>C(y).t==="イベント"&&hasColor(y,"緑")&&(C(y).lv||0)<=6&&C(y).nm!=="ラブリースポット"&&!playableReason(p,y,false,true));
    const [y]=await pickCards(p,"使用する【緑】のイベント（レベル6以下）","",cs,{max:1,ai:c=>c.filter(z=>FX.eventAi(p,z)).slice(0,1)});
    if(y)await useFromHand(p,y,false,true)},
  ai:p=>p.deck.length>8};
DEF["0563"]={ // 終極 B05061
  event:async p=>{if(!partnerIs(p,"白"))return noEff();
    if(p.deck.length<8||!await yes(p,"終極","デッキの上から7枚をリムーブして、相手のキャラ1枚をデッキの下に移しますか？",()=>p.deck.length>25&&oppHas(p,y=>lvOf(y)>=4)))return;
    millSelf(p,7);await bottomChar(p,y=>isOpp(p,y),"デッキの下に移す相手のキャラ")},
  ai:p=>partnerIs(p,"白")&&p.deck.length>25&&oppHas(p,y=>lvOf(y)>=5)};
DEF["0564"]={ // 鈴木家と京極真 B05062
  event:async p=>{const all=p.rm.filter(y=>isChar(y)&&(named("京極真")(y)||hasTrait(y,"鈴木財閥"))).length>=4;
    await modeEvent(p,"鈴木家と京極真",["2枚引き、手札を1枚リムーブ","リムーブエリアの［京極真］か［鈴木財閥］を登場","レベル7以下のキャラをスリープ"],[
      async()=>{drawN(p,2);await discard(p,1)},
      async()=>{await enterFromRm(p,y=>lvOf(y)<=7&&(named("京極真")(y)||hasTrait(y,"鈴木財閥")),"登場させる［京極真］か［鈴木財閥］（レベル7以下）")},
      async()=>{const t=await chooseChar(p,"スリープさせるキャラ（レベル7以下）",y=>lvOf(y)<=7&&y.st==="a");if(t)sleepC(t)}],all,0)},
  ai:p=>true};
DEF["0581"]={ // 威嚇射撃 B05081
  useBlock:p=>p.field.length<opp(p).field.length?null:"自分の現場のキャラが相手より少ないときだけ使える",
  event:async p=>{await rmChar(p,()=>true)},ai:p=>oppHas(p,y=>lvOf(y)>=4)};
DEF["0600"]={ // 小五郎の弟子 B05102
  event:async p=>{if(!partnerIs(p,"黄"))return noEff();const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y));if(t){t.lvT-=1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}
    drawN(p,1);await playFromHand(p,y=>hasColor(y,"黄")&&lvOf(y)<=p.file.length,"登場させる【黄】のキャラ（レベルがFILEの枚数以下）")},
  ai:p=>partnerIs(p,"黄")};
DEF["0601"]={ // 「籌を帷幄の中に運らし…勝ちを千里の外に決す…」 B05103
  event:async p=>{if(!partnerIs(p,"黄"))return noEff();await rmChar(p,()=>true);const o=opp(p);
    if(o.ev.length>=p.ev.length+2&&p.hand.length&&await yes(p,"籌を帷幄の中に運らし…","手札を1枚リムーブして、相手の証拠を1つデッキの下に移し、自分は証拠を1つ得ますか？",true)){
      await discard(p,1);const e=o.ev.pop();o.deck.push(e);e.up=false;log(`　${o.name} の証拠を1つデッキの下に移した`,"n");gainEv(p,1)}},
  ai:p=>partnerIs(p,"黄")&&oppHas(p,y=>lvOf(y)>=4)};
DEF["0657"]={ // 鬼丸城 B06034
  event:async p=>{if(!p.solved)return noEff();await onigiriFlip(p)},hirameki:async o=>{if(o.solved)await onigiriFlip(o)},
  ai:p=>p.solved&&evDown(p)>=1};
async function onigiriFlip(p){const fd=p.ev.filter(e=>!e.up);if(!fd.length)return;const e=fd[fd.length-1];e.up=true;log(`　${p.name} は裏向きの証拠を1つ表向きにした: ${C(e).nm}`,"n");
  if(hasTrait(e,"YAIBA")&&C(e).hr&&await yes(p,"鬼丸城",`${C(e).nm} の【ヒラメキ】を発動させますか？`,true)){log(`　${C(e).nm}【ヒラメキ】発動`,"n");await FX.hirameki(p,e)}}
DEF["0702"]={ // 「説得するよりこの方が早い…」 B06082
  event:async p=>{if(!p.solved)return noEff();await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");await runQueue();
    const y=fileTopCard(p);if(!y||!await yes(p,"「説得するよりこの方が早い…」","FILEの上から1枚を手札に加えて、AP8000以下のキャラをもう1枚リムーブしますか？",()=>p.file.length>=4&&oppHas(p,apLe(8000))))return;
    takeFileTop(p);p.hand.push(y);noteFileHand(p);log(`　FILEの上から1枚を手札に`,"n");await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）")},
  ai:p=>p.solved&&oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4)};
DEF["0713"]={ // 高木君のおごり B06094
  event:async p=>{const all=p.field.filter(y=>hasTrait(y,"喫茶ポアロ")).length>=3;
    await modeEvent(p,"高木君のおごり",["アクティブ状態のキャラをスタン","スリープ状態のキャラをスタン"],[
      async()=>{const t=await chooseChar(p,"スタンさせるアクティブ状態のキャラ",y=>y.st==="a");if(t)stunC(t)},
      async()=>{const t=await chooseChar(p,"スタンさせるスリープ状態のキャラ",y=>y.st==="s",{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)stunC(t)}],all,oppHas(p,y=>y.st==="a")?0:1)},
  ai:p=>oppHas(p,y=>y.st==="a")||p.field.some(y=>y.st==="s")};
DEF["0758"]={ // 相応しいお方 B07026
  event:async p=>{if(!partnerIs(p,"緑"))return noEff();await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");if(G.evtEff)drawN(p,1)},
  ai:p=>partnerIs(p,"緑")&&oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4)};
DEF["0783"]={ // 「アイスクリームは……甘いんだぜ!!」 B07054
  event:async p=>{if(!partnerIs(p,"白"))return noEff();const all=p.field.some(named("黒羽快斗"))&&p.field.some(named("中森青子"));
    await modeEvent(p,"アイスクリーム",["【白】のキャラにAP＋2000と突撃","レベル7以下のスリープ状態のキャラをスタン","【白】のキャラにアクティブ指定"],[
      async()=>{const t=await chooseChar(p,"AP＋2000と突撃を与える【白】のキャラ",ownCh(p,y=>hasColor(y,"白")),{ai:bestOwn(p)});if(t){apTurn(t,2000);giveKw(t,"突撃")}},
      async()=>{const t=await chooseChar(p,"スタンさせるキャラ（レベル7以下・スリープ状態）",y=>lvOf(y)<=7&&y.st==="s");if(t)stunC(t)},
      async()=>{const t=await chooseChar(p,"アクティブ指定を与える【白】のキャラ",ownCh(p,y=>hasColor(y,"白")),{ai:bestOwn(p)});if(t)giveKw(t,"アクティブ指定")}],all,0)},
  ai:p=>partnerIs(p,"白")&&p.field.some(y=>hasColor(y,"白"))};
DEF["0785"]={ // 怪盗キッドと中森王女 B07056
  useBlock:p=>p.field.some(y=>named("小泉紅子")(y)&&y.st==="s")?null:"現場にスリープ状態の［小泉紅子］がいるときだけ使える",
  event:async p=>{const t=await chooseChar(p,"アクティブにする［黒羽快斗］か［中森青子］（レベル8以下）",ownCh(p,y=>lvOf(y)<=8&&named("黒羽快斗","中森青子")(y)),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st!=="a").slice(0,1)});if(t)activateC(t)},
  ai:p=>p.field.some(y=>y.st!=="a"&&named("黒羽快斗","中森青子")(y))};
DEF["0786"]={ // 「時価4億円！」 B07057
  event:async p=>{const own=p.field.filter(named("黒羽快斗","怪盗キッド"));
    if(!own.length||!await yes(p,"「時価4億円！」","［黒羽快斗］か［怪盗キッド］を1枚手札に移して、キャラに突撃を与えて1枚引きますか？",()=>own.some(y=>lvOf(y)<=4)))return;
    const [h]=await pickCards(p,"手札に移すキャラ","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!h)return;toHandFromField(h);await runQueue();
    const t=await chooseChar(p,"突撃を与えるキャラ",ownCh(p),{ai:bestOwn(p)});if(t)giveKw(t,"突撃");drawN(p,1)},
  ai:p=>p.field.some(y=>named("黒羽快斗","怪盗キッド")(y)&&lvOf(y)<=4)};
DEF["0805"]={ // 「君は思ったより手強いって事がね！」 B07076
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();
    await modeEvent(p,"君は思ったより手強いって事がね！",["手札が2枚になるまでリムーブし、キャラをリムーブ","手札をすべてリムーブして4枚引く（相手はカットイン・変装できない）"],[
      async()=>{let sum=0;while(p.hand.length>2){const [y]=await discard(p,1,"リムーブする手札（2枚になるまで）");if(!y)break;sum+=C(y).lv||0}
        let left=sum;for(let i=0;i<2&&left>0;i++){const t=await chooseChar(p,`リムーブするキャラ（レベルの合計${left}以下）`,y=>lvOf(y)<=left);if(!t)break;left-=lvOf(t);rmBy(p,t);await runQueue()}},
      async()=>{while(p.hand.length)await discard(p,1,"手札をリムーブ");drawN(p,4);opp(p).noCiDis=G.turnNo;log("　このターン、相手はカットインと変装を使用できない","n")}],false,p.hand.length>=6?1:0)},
  ai:p=>partnerIs(p,"赤")&&p.hand.length>=5};
DEF["0818"]={ // 「えええええ!?」 B07090
  event:async p=>{await enterFromRm(p,y=>hasTrait(y,"警視庁")&&lvOf(y)<=5,"登場させる［警視庁］（レベル5以下）");
    const t=await chooseChar(p,"AP＋1000とアクティブ指定を与える［警視庁］",ownCh(p,y=>hasTrait(y,"警視庁")),{ai:bestOwn(p)});if(t){apTurn(t,1000);giveKw(t,"アクティブ指定")}},
  ai:p=>p.rm.some(y=>isChar(y)&&hasTrait(y,"警視庁")&&lvOf(y)<=5)||p.field.some(y=>hasTrait(y,"警視庁"))};
DEF["0858"]={ // 「どうしてお姉ちゃんを…助けてくれなかったの？」 B08017
  event:async(p,x)=>{if(condOk("事件青＆黒",p)!==true)return noEff();const y=await enterFromRm(p,y=>named("江戸川コナン")(y)&&lvOf(y)<=7,"登場させる［江戸川コナン］（レベル7以下）");
    if(y)await setEventOn(p,x,h=>h===y)},
  setShield:(q,host,t)=>host.st==="s"&&named("灰原哀")(t),
  ai:p=>condOk("事件青＆黒",p)===true&&p.rm.some(y=>isChar(y)&&named("江戸川コナン")(y)&&lvOf(y)<=7)};
DEF["0882"]={ // 手のこんだ悪巧み B08043
  event:async p=>{const mx=Math.max(-1,...p.field.map(lpOf));const t=await chooseChar(p,"選ぶ相手のキャラ",y=>isOpp(p,y));
    if(t&&lpOf(t)<=mx)rmBy(p,t);else if(t)log(`　${C(t).nm} のLPが高いので何も起きない`,"n")},
  ai:p=>{const mx=Math.max(-1,...p.field.map(lpOf));return oppHas(p,y=>lpOf(y)<=mx&&lvOf(y)>=4)}};
DEF["0898"]={ // 託されたカセットテープ B08060
  event:async p=>{const y=digToHand(p,y=>(C(y).lv||0)===7);if(y)await discard(p,1);
    await playFromHand(p,y=>lvOf(y)<=p.file.length,"登場させるキャラ（レベルがFILEの枚数以下）")},
  ai:p=>p.deck.some(y=>(C(y).lv||0)===7)};
DEF["0912"]={ // ブライダルは女が主役 B08075
  event:async p=>{
    const steps=[
      ["［佐藤美和子］をアクティブにする",p.field.some(named("佐藤美和子")),async()=>{const t=await chooseChar(p,"アクティブにする［佐藤美和子］",ownCh(p,named("佐藤美和子")),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)activateC(t)}],
      ["［高木渉］に突撃［キャラ］を与える",p.field.some(named("高木渉")),async()=>{const t=await chooseChar(p,"突撃［キャラ］を与える［高木渉］",ownCh(p,named("高木渉")),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］")}],
      ["デッキの上4枚から［佐藤美和子］か［高木渉］を手札に",p.deck.length>0,async()=>{await lookTop(p,4,named("佐藤美和子","高木渉"),{max:1,title:"手札に加える［佐藤美和子］か［高木渉］"})}]];
    for(const [label,can,fn] of steps){if(!can)continue;if(await yes(p,"ブライダルは女が主役",`${label}を行いますか？`,true))await fn()}},
  ai:p=>p.field.some(named("佐藤美和子","高木渉"))};
DEF["0928"]={ // 出来損ないの名探偵 B08092
  event:async p=>{if(condOk("事件青＆黒",p)!==true)return noEff();drawN(p,1);
    await playFromHandSt(p,y=>hasLeave(y)&&lvOf(y)<=4,"スリープ状態で登場させる【現場リムーブ時】持ち（レベル4以下）");
    if(p.field.some(named("シェリー","灰原哀")))await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）")},
  ai:p=>condOk("事件青＆黒",p)===true};
DEF["0977"]={ // 「ひょっとしたら…」 B09033
  event:async p=>{if(!p.solved)return noEff();const xs=p.deck.splice(0,4);log(`　${p.name} はデッキの上から${xs.length}枚を公開`,"n");
    const f=y=>isChar(y)&&lvOf(y)<=6&&hasTrait(y,"高校生");const used=[];
    const enter=async()=>{const [y]=await pickCards(p,"登場させる［高校生］（レベル6以下）","",xs.filter(z=>!used.includes(z)&&f(z)),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      if(y){used.push(y);await enterByEffect(p,y,"a");return true}return false};
    await enter();
    for(let i=0;i<3;i++){if(!fileTopCard(p)||!xs.some(z=>!used.includes(z)&&f(z))||!await yes(p,"「ひょっとしたら…」","FILEの上から1枚をリムーブして、公開したカードからもう1枚登場させますか？",()=>p.file.length>=3))break;
      const y=takeFileTop(p);p.rm.push(y);log("　FILEの上から1枚をリムーブ","n");await enter()}
    p.deck.push(...xs.filter(z=>!used.includes(z)));checkDeck(p)},
  ai:p=>p.solved};
DEF["0978"]={ // 「朝日射し夕日輝く鉄の瓶…黄金千枚二千杯」 B09034
  event:async p=>{const got=await pickCards(p,"手札に加えるイベント（2枚まで）","",p.rm.filter(y=>C(y).t==="イベント"),{max:2,ai:c=>c.slice().sort((a,b)=>(C(b).lv||0)-(C(a).lv||0)).slice(0,2)});
    for(const y of got)rmToHand(p,y);p.noEvT=G.turnNo;log("　このターン、自分はイベントを使用できない","n")},
  hirameki:async o=>{await pickRmToHand(o,y=>C(y).t==="イベント","ヒラメキ: 手札に加えるイベント")},
  ai:p=>p.rm.filter(y=>C(y).t==="イベント").length>=2};
DEF["0995"]={ // 「い、いつの間に!?」 B09052
  event:async p=>{drawN(p,1);const y=await playFromHand(p,y=>hasColor(y,"白")&&lvOf(y)<=p.file.length,"登場させる【白】のキャラ（レベルがFILEの枚数以下）");
    if(!y)return;const cs=p.field.filter(z=>z!==y&&lvOf(z)<=8);if(!cs.length||!await yes(p,"「い、いつの間に!?」",`${C(y).nm} のカード名を現場のキャラの名前に書き換えますか？`,true))return;
    const [z]=await pickCards(p,"カード名を借りるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});if(z){y.nmT=nameOf(z);log(`　${C(y).nm} のカード名をターン終了時まで ${nameOf(z)} に`,"n")}},
  ai:p=>p.hand.some(y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=p.file.length)};
DEF["1009"]={ // 「よしキャメル…走れ!!」 B09067
  event:async p=>{const cm=p.hand.filter(named("アンドレ・キャメル"));let all=false;
    if(cm.length&&await yes(p,"「よしキャメル…走れ!!」","手札の［アンドレ・キャメル］を1枚リムーブして、3つとも行いますか？",()=>p.hand.length>=3)){await discard(p,1,"リムーブする［アンドレ・キャメル］",p,named("アンドレ・キャメル"));all=true}
    const kw=k=>async()=>{const t=await chooseChar(p,`${k}を与えるキャラ`,ownCh(p),{ai:bestOwn(p)});if(t)giveKw(t,k)};
    await modeEvent(p,"よしキャメル",["突撃［キャラ］","突撃［事件］","ブレット"],[kw("突撃［キャラ］"),kw("突撃［事件］"),kw("ブレット")],all,0)},
  ai:p=>p.field.some(y=>y.st==="a")};
DEF["1029"]={ // 刑事だらけの店 B09089
  event:async p=>{await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");
    if(!p.field.some(y=>y.fresh))await enterFromRm(p,y=>hasTrait(y,"警察")&&lvOf(y)<=4,"登場させる［警察］（レベル4以下）")},
  ai:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4)};
DEF["1045"]={ // 暗殺計画 B09106
  event:async p=>{if(condOk("事件赤＆黒",p)!==true)return noEff();await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");const o=opp(p);
    if(o.refreshed)await enterFromRm(p,y=>lvOf(y)<=4&&colorAny(y,"赤","黒"),"登場させる【赤】か【黒】のキャラ（レベル4以下）");else millSelf(o,3)},
  ai:p=>condOk("事件赤＆黒",p)===true&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)};
DEF["1093"]={ // 「神妙にして、縛に就けや!!!」 B10032
  event:async p=>{if(!partnerIs(p,"緑"))return noEff();
    const t=await chooseChar(p,"突撃［キャラ］を与える【緑】の［警察］",ownCh(p,y=>hasColor(y,"緑")&&hasTrait(y,"警察")),{ai:bestOwn(p)});if(t)giveKw(t,"突撃［キャラ］");
    await enterFromRm(p,y=>hasColor(y,"緑")&&hasTrait(y,"警察")&&lvOf(y)<=3,"登場させる【緑】の［警察］（レベル3以下）")},
  ai:p=>partnerIs(p,"緑")&&(p.rm.some(y=>isChar(y)&&hasColor(y,"緑")&&hasTrait(y,"警察")&&lvOf(y)<=3)||p.field.some(y=>hasColor(y,"緑")&&hasTrait(y,"警察")))};
DEF["1094"]={ // ドゴ B10033
  handLevel:(p,x)=>G.turn===p.idx&&p.solved&&p.field.some(named("服部平蔵","遠山銀司郎"))?Math.max(0,(C(x).lv||0)-3):null,
  event:async p=>{if(!partnerIs(p,"緑"))return noEff();await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");
    const t=await chooseChar(p,"デッキの上から1枚をセットする［警察］",ownCh(p,y=>hasTrait(y,"警察")),{ai:bestOwn(p)});if(t)setTop(p,t)},
  ai:p=>partnerIs(p,"緑")&&oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4)};
DEF["1108"]={ // 「真さんガンバッてー♡」 B10048
  event:async p=>{const cs=await pickOwnMany(p,"コンタクト時に引ける能力を与えるキャラ",()=>true);for(const y of cs){y.contactDrawT=G.turnNo;log(`　${C(y).nm} にコンタクト時の能力を与えた`,"n")}},
  ai:p=>p.field.length>=2};
DEF["1119"]={ // 「あ…赤井が!?」 B10060
  event:async p=>{if(condOk("事件赤＆黄",p)!==true)return noEff();
    const y=await enterFromRm(p,y=>colorAny(y,"赤","黄")&&!(C(y).f||"").trim(),"登場させる【赤】か【黄】のキャラ（【カットイン】と【ヒラメキ】以外の元の能力を持たない）");if(!y)return;
    await modeEvent(p,"「あ…赤井が!?」",["登場させたキャラをスリープして、同じレベル以下のキャラをリムーブ","登場させたキャラに突撃［事件］を与える"],[
      async()=>{if(y.st==="a"&&await yes(p,"「あ…赤井が!?」",`${C(y).nm} をスリープさせて、レベル${lvOf(y)}以下のキャラをリムーブしますか？`,true)){sleepC(y);await rmChar(p,lvLe(lvOf(y)),`リムーブするキャラ（レベル${lvOf(y)}以下）`)}},
      async()=>{giveKw(y,"突撃［事件］")}],false,oppHas(p,y2=>lvOf(y2)>=4&&lvOf(y2)<=lvOf(y))?0:1)},
  ai:p=>condOk("事件赤＆黄",p)===true&&p.rm.some(y=>isChar(y)&&colorAny(y,"赤","黄")&&!(C(y).f||"").trim())};
DEF["1137"]={ // 「化け物屋敷!?」 B10081
  event:async p=>{const y=await pickRmToHand(p,named("降谷零","諸伏景光","伊達航","萩原研二","松田陣平"),"手札に加える警察学校組");
    if(y)await rmChar(p,t=>lvOf(t)>=(C(y).lv||0),`リムーブするキャラ（レベル${C(y).lv||0}以上）`)},
  ai:p=>p.rm.some(y=>isChar(y)&&named("降谷零","諸伏景光","伊達航","萩原研二","松田陣平")(y))};
DEF["1151"]={ // 「何の真似だ…」 B10096
  event:async p=>{if(!partnerIs(p,"黒"))return noEff();
    if(p.deck.length<4||!await yes(p,"「何の真似だ…」","デッキの上から3枚をリムーブしますか？",()=>p.deck.length>25&&p.deck.slice(0,3).some(isCIblack)))return;
    const n=millSelf(p,3).filter(isCIblack).length;if(!n)return;
    await modeEvent(p,"「何の真似だ…」",["デッキの上4枚から【カットイン】持ちの【黒】を手札に","手札からFILE枚数以下の【カットイン】持ちの【黒】のキャラを登場"],[
      async()=>{await lookTop(p,4,isCIblack,{max:1,title:"手札に加える【カットイン】持ちの【黒】"})},
      async()=>{await playFromHand(p,y=>isCIblack(y)&&lvOf(y)<=p.file.length,"登場させる【カットイン】持ちの【黒】のキャラ")}],n>=3,0)},
  ai:p=>partnerIs(p,"黒")&&p.deck.length>25};
DEF["1168"]={ // 「やっとお逢いできましたね…月下の手品師…」 PR330
  event:async p=>{if(condOk("事件白＆黄",p)!==true)return noEff();await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");
    if(!p.solved)return;const y=await enterFromRmS(p,y=>lvOf(y)<=2,"スリープ状態で登場させるキャラ（レベル2以下）");if(!y)return;
    const [z]=await pickCards(p,"デッキの下に移す同じカード名のキャラ","",p.rm.filter(c=>isChar(c)&&sameName(c,y)),{max:1,ai:c=>c.slice(0,1)});
    if(z){detach(z);p.deck.push(z);log(`　${C(z).nm} をデッキの下へ`,"n")}},
  ai:p=>condOk("事件白＆黄",p)===true&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)};
DEF["0832"]={ // ブルーサファイア PR195
  event:async(p,x)=>{digToHand(p,named("中森青子"));if(p.rm.includes(x))toPartnerArea(p,x)},
  hirameki:async(o,e)=>{if(o.rm.includes(e))toPartnerArea(o,e)},ai:p=>true};
DEF["0498"]={ // 「あら…頼もしいじゃない…」 D08024
  event:async p=>{await enterFromRm(p,y=>lvOf(y)<=5&&(named("阿笠博士")(y)||hasTrait(y,"少年探偵団")),"登場させる［阿笠博士］か［少年探偵団］（レベル5以下）");
    const t=await chooseChar(p,"AP＋2000する［少年探偵団］",ownCh(p,y=>hasTrait(y,"少年探偵団")),{ai:bestOwn(p)});if(t)apTurn(t,2000)},
  ai:p=>p.rm.some(y=>isChar(y)&&lvOf(y)<=5&&(named("阿笠博士")(y)||hasTrait(y,"少年探偵団")))||p.field.some(y=>hasTrait(y,"少年探偵団")&&y.st==="a")};
DEF["0944"]={ // 15の受難 D11019
  event:async p=>{const y=digTop(p,y=>isChar(y)&&hasColor(y,"黄")&&lvOf(y)<=4);if(!y)return;await enterByEffect(p,y,"a");
    if(p.rm.filter(z=>hasColor(z,"黄")).length>=20)giveKw(y,"突撃［事件］")},
  ai:p=>p.deck.some(y=>isChar(y)&&hasColor(y,"黄")&&lvOf(y)<=4)};
DEF["0625"]={ // 「もう少し引き付けろ…」 PR156
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();await rmChar(p,lvLe(7),"リムーブするキャラ（レベル7以下）");
    const t=await chooseChar(p,"突撃［事件］を与えるキャラ",ownCh(p),{ai:bestOwn(p)});if(t)giveKw(t,"突撃［事件］")},
  ai:p=>partnerIs(p,"赤")&&oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7)};
DEF["1044"]={ // キッ B09105
  event:async p=>{if(condOk("事件犯人",p)!==true)return noEff();
    if(p.pLoc!=="area"||p.partner.st!=="a"||!p.hand.length||!fileTopCard(p)||!await yes(p,"キッ","パートナーをスリープさせ、手札を1枚とFILEの上から2枚をリムーブして、リムーブエリアの［犯人］を5枚まで登場させますか？",()=>p.rm.filter(y=>isChar(y)&&hasTrait(y,"犯人")).length>=3))return;
    p.partner.st="s";log("　パートナーをスリープ","n");await discard(p,1);for(let i=0;i<2;i++){const y=takeFileTop(p);if(y){p.rm.push(y);log("　FILEの上から1枚をリムーブ","n")}}
    const cs=p.rm.filter(y=>isChar(y)&&hasTrait(y,"犯人")&&lvOf(y)<=8);
    let got=await pickCards(p,"登場させる［犯人］（それぞれレベルの異なるもの・5枚まで）","",cs,{max:5,ai:c=>{const seen=new Set,out=[];for(const y of c.slice().sort((a,b)=>lvOf(b)-lvOf(a))){if(!seen.has(lvOf(y))&&out.length<5){seen.add(lvOf(y));out.push(y)}}return out}});
    const seen=new Set;got=got.filter(y=>!seen.has(lvOf(y))&&seen.add(lvOf(y)));
    for(const y of got)await enterByEffect(p,y,"a");p.noHint=true;log("　このターン、自分はネクストヒントできない","n")},
  ai:p=>condOk("事件犯人",p)===true&&p.pLoc==="area"&&p.partner.st==="a"&&p.hand.length>=2&&p.rm.filter(y=>isChar(y)&&hasTrait(y,"犯人")).length>=3};
DEF["0964"]={ // 「くさるなよ！」 B09019
  event:async p=>{const y0=takeFileTop(p);if(y0){p.rm.push(y0);log("　FILEの上から1枚をリムーブ","n")}
    const s=p.field.find(named("結成 少年探偵団"));
    if(s&&await yes(p,"「くさるなよ！」","現場の［結成 少年探偵団］をリムーブして、リムーブエリアの［少年探偵団］を5枚まで登場させますか？",()=>p.rm.filter(y=>isChar(y)&&lvOf(y)<=4&&hasTrait(y,"少年探偵団")).length>=3)){
      removeCard(s,"効果",{by:p,effect:true});await runQueue();
      const cs=p.rm.filter(y=>isChar(y)&&lvOf(y)<=4&&hasTrait(y,"少年探偵団"));
      let got=await pickCards(p,"スリープ状態で登場させる［少年探偵団］（それぞれカード名の異なるもの・5枚まで）","",cs,{max:5,ai:c=>{const seen=new Set,out=[];for(const y of c){if(!seen.has(nameOf(y))&&out.length<5){seen.add(nameOf(y));out.push(y)}}return out}});
      const seen=new Set;got=got.filter(y=>!seen.has(nameOf(y))&&seen.add(nameOf(y)));
      for(const y of got)await enterByEffect(p,y,"s");if(got.length>=5)await rmChar(p,()=>true)}
    p.noHint=true;log("　このターン、自分はネクストヒントできない","n")},
  ai:p=>p.field.some(named("結成 少年探偵団"))&&p.rm.filter(y=>isChar(y)&&lvOf(y)<=4&&hasTrait(y,"少年探偵団")).length>=3};
DEF["0745"]={ // 「今時、予告状を送りつける、レトロな泥棒さんの面をな…」 B07013
  event:async p=>{const k=p.field.filter(y=>named("江戸川コナン")(y)&&y.st==="a");let all=false;
    if(k.length&&await yes(p,"「今時、予告状を送りつける…」","［江戸川コナン］を1枚スリープさせて、3つとも行いますか？",()=>true)){
      const [t]=await pickCards(p,"スリープさせる［江戸川コナン］","",k,{min:1,max:1,ai:c=>c.slice(0,1)});if(t){sleepC(t);all=true}}
    await modeEvent(p,"レトロな泥棒さんの面をな…",["スタン状態のキャラをアクティブに（さらにアクティブに）","［怪盗］のキャラをスタン","リムーブエリアのキャラを手札に"],[
      async()=>{const t=await chooseChar(p,"アクティブにするスタン状態のキャラ",y=>y.st==="x",{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t){activateC(t);activateC(t)}},
      async()=>{const t=await chooseChar(p,"スタンさせる［怪盗］",y=>hasTrait(y,"怪盗")&&y.st!=="x");if(t)stunC(t)},
      async()=>{await pickRmToHand(p,y=>isChar(y),"手札に加えるキャラ")}],all,2)},
  ai:p=>p.rm.some(isChar)};
DEF["0746"]={ // 弁当型携帯FAX B07014
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"青"))},
  setKw:()=>["突撃［キャラ］"],
  grants:[{label:"リムーブエリアのキャラを1枚デッキの上に移す",turn1:true,can:p=>p.rm.some(isChar),aiCan:p=>p.rm.some(y=>isChar(y)&&lvOf(y)>=5),
    run:async p=>{const [y]=await pickCards(p,"デッキの上に移すキャラ","",p.rm.filter(isChar),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(!y)return false;
      detach(y);p.deck.unshift(y);log(`　${C(y).nm} をデッキの上へ`,"n");return true}}],
  ai:p=>p.field.some(y=>hasColor(y,"青"))};
