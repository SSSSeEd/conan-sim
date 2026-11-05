"use strict";
// カード個別効果（その他。事件の宣言能力もここ）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 黄・緑 その他 ---
DEF["1012"]={ // 横溝重悟 B09072
  enter:async p=>{if(p.galeFired===G.turnNo){millSelf(p,2);drawN(p,1)}},
  abilities:[{label:"【スリープ】手札1枚リムーブ: ［神奈川県警］をアクティブに（推理できない）",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.field.some(y=>y!==x&&y.st!=="a"&&hasTrait(y,"神奈川県警")),
    aiCan:p=>myTurn(p)&&p.field.some(y=>y.st!=="a"&&hasTrait(y,"神奈川県警")&&apOf(y)>=6000)&&opp(p).field.some(y=>y.st!=="a"),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const t=await chooseChar(p,"アクティブにする［神奈川県警］",y=>!isOpp(p,y)&&hasTrait(y,"神奈川県警"),{ai:cs=>cs.filter(y=>y.st!=="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t){activateC(t);giveKw(t,"推理不可")}return true}}]};
DEF["0861"]={apSelf:p=>myTurn(p)&&condOk("絆遠山和葉",p)?2000:0}; // 服部平次 B08021
DEF["0704"]={ // 松田陣平 B06085（「MRのキャラを選んだ場合」はカードの情報にレアリティが無いので扱わない）
  abilities:[{label:"【スリープ】: 相手の証拠1つをデッキの下へ、相手のAP8000以下を相手の証拠に",turn1:true,can:(p,x)=>partnerIs(p,"黄")&&x.st==="a"&&(opp(p).ev.length>0||opp(p).field.length>0),aiCan:p=>oppHas(p,apLe(8000)),
    run:async(p,x)=>{sleepCost(x);const o=opp(p);if(o.ev.length){const e=o.ev.pop();o.deck.push(e);log(`　${o.name} の証拠を1つデッキの下へ`,"n")}
      const t=await chooseChar(p,"相手の証拠にするキャラ（AP8000以下）",y=>isOpp(p,y)&&apOf(y)<=8000);if(t){dropSets(o,t);detach(t);resetMods(t);t.up=true;o.ev.push(t);log(`　${C(t).nm} は表向きで ${o.name} の証拠になった`,"n")}return true}}]};
DEF["0732"]={ // 目暮十三 PR181
  abilities:[{label:"【スリープ】: リムーブエリアのレベル4以下の［警視庁］を登場（突撃［事件］、ターン終了時にデッキの下へ）",can:(p,x)=>x.st==="a"&&p.field.length<5&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警視庁")&&lvOf(y)<=4),aiCan:p=>myTurn(p)&&opp(p).ev.length>0,
    run:async(p,x)=>{sleepCost(x);const y=await enterFromRm(p,y=>hasTrait(y,"警視庁")&&lvOf(y)<=4,"登場させる［警視庁］（レベル4以下）");if(y){giveKw(y,"突撃［事件］");giveKw(y,"終了時デッキの下")}return true}}]};

// --- 事件の【解決編】【宣言】（裏向きの証拠を表向きにするコスト）と、デッキの上へのセットなど ---
const solvedDisc=async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")};
const evDown=p=>p.ev.filter(e=>!e.up).length;
// 「デッキの上から3枚見て、指定カード名を1枚公開して手札に」型の事件。names は部分一致
const caseSearch=(label,n,names)=>({solvedTrigger:solvedDisc,
  abilities:[{label:`裏向きの証拠を${n}つ表向きに: デッキの上3枚から${label}を手札に`,turn1:true,
    can:p=>p.solved&&evDown(p)>=n&&p.field.some(named(...names)),
    run:async p=>{if(!flipEvidence(p,n))return false;await lookTop(p,3,named(...names),{max:1,title:`${label}を1枚まで手札に`});return true}}]});
DEF["0638"]=caseSearch("［工藤新一］か［毛利蘭］",2,["工藤新一","毛利蘭"]); // 厄介な難事件 B06013
DEF["0666"]=caseSearch("［服部平次］か［遠山和葉］",2,["服部平次","遠山和葉"]); // 恋と推理の剣道大会 B06043
DEF["0883"]={ // 江戸川コナン誘拐事件 B08044
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を1つ表向きに: 現場のキャラにデッキの上から1枚をセット",turn1:true,can:p=>p.solved&&evDown(p)>=1&&p.field.length>0&&p.deck.length>0,
    run:async p=>{if(!flipEvidence(p,1))return false;const t=await chooseChar(p,"セット先のキャラ",y=>!isOpp(p,y),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)setTop(p,t);return true}}]};
DEF["1139"]={ // 帰らざる刑事 B10083
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を3つ表向きに: 現場の［松田陣平］を表向きの証拠にする",turn1:true,can:p=>p.solved&&p.file.length>=5&&evDown(p)>=3&&p.field.some(named("松田陣平")),
    run:async p=>{if(!flipEvidence(p,3))return false;const t=await chooseChar(p,"表向きの証拠にする［松田陣平］",y=>!isOpp(p,y)&&named("松田陣平")(y));
      if(t){for(const s of t.set||[])p.rm.push(s.c);t.set=[];detach(t);resetMods(t);t.up=true;p.ev.push(t);log(`　${C(t).nm} を表向きの証拠にした`,"n")}return true}}]};
DEF["0770"]={ // 黒羽盗一 B07041
  enter:async p=>{if(!partnerIs(p,"白"))return;const t=await chooseChar(p,"登場時: スタンさせるキャラ",y=>true,{ai:cs=>cs.filter(y=>isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(t){if(t.st==="x")log("　（スタン状態のキャラは代わりにスリープさせる）","n"),sleepC(t);else stunC(t)}},
  abilities:[{label:"【スリープ】: 現場のキャラにデッキの上から1枚をセット",can:(p,x)=>x.st==="a"&&p.field.length>0&&p.deck.length>0,
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"セット先のキャラ",y=>!isOpp(p,y),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)setTop(p,t);return true}}]};
DEF["0486"]={ // 工藤有希子 PR099（カード名の書き換えは、現場にいるキャラの名前から選ぶ）
  enter:async(p,x)=>{setTop(p,x);giveKw(x,"突撃［キャラ］")},
  abilities:[{label:"ターン終了時までAP＋1000（カード名を書き換えてもよい）",turn1:true,can:()=>true,aiCan:p=>myTurn(p),
    run:async(p,x)=>{apTurn(x,1000);const t=await chooseChar(p,"カード名を書き換える先（指定するカード名のキャラ）",y=>y!==x,{ai:()=>[]});if(t){x.nmT=nameOf(t);log(`　${C(x).nm} のカード名はターン終了時まで［${x.nmT}］`,"n")}return true}}]};
DEF["0177"]={ // 沖野ヨーコ B02005
  abilities:[{label:"現場の［毛利小五郎］にAP＋2000と突撃",turn1:true,can:p=>p.field.some(named("毛利小五郎")),aiCan:p=>myTurn(p)&&p.field.some(y=>named("毛利小五郎")(y)&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"AP＋2000する［毛利小五郎］",y=>!isOpp(p,y)&&named("毛利小五郎")(y));if(t){apTurn(t,2000);giveKw(t,"突撃")}return true}}]};

// --- 白黄キッド（怪盗キッド&安室透／キッドVS安室 王妃の前髪） ---
DEF["1048"]={ // 怪盗キッド&安室透 B09109
  abilities:[
    {label:"現場のレベル8以下のキャラ1枚を選ぶ: 同レベル・同カード名のキャラを山札から探して登場（終了時にデッキの下へ）",turn1:true,partner:true,
      can:p=>p.field.some(y=>lvOf(y)<=8),aiCan:p=>myTurn(p)&&p.field.length<5&&p.field.some(y=>lvOf(y)<=8&&lvOf(y)>=3),
      run:async p=>{const [m]=await pickCards(p,"選ぶ現場のキャラ（レベル8以下）","",p.field.filter(y=>lvOf(y)<=8),{ai:cs=>cs.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(!m)return true;
        const revealed=[];let hit=null;
        while(p.deck.length){const y=p.deck.shift();revealed.push(y);if(isChar(y)&&C(y).lv===lvOf(m)&&sameName(y,m)){hit=y;break}}
        log(`　${p.name} はデッキを公開: ${revealed.map(y=>C(y).nm).join("、")||"なし"}`,"n");
        const rest=revealed.filter(y=>y!==hit);
        if(hit){await enterByEffect(p,hit,"a");giveKw(hit,"終了時デッキの下")}
        for(const y of rest)p.deck.push(y);shuffle(p.deck);log("　デッキをシャッフル","n");return true}},
    {label:"手札のレベル8以下のキャラを公開: 現場のキャラのカード名を書き換える",turn1:true,partner:true,
      can:p=>p.hand.some(y=>isChar(y)&&lvOf(y)<=8)&&p.field.length>0,aiCan:()=>false,
      run:async p=>{const y=await revealFromHand(p,z=>isChar(z)&&lvOf(z)<=8,"公開するキャラ（レベル8以下）",{must:true});if(!y)return false;
        const t=await chooseChar(p,"カード名を書き換えるキャラ",z=>!isOpp(p,z),{ai:cs=>cs.filter(z=>!isOpp(p,z)).slice(0,1)});
        if(t){t.nmT=nameOf(y);log(`　${C(t).nm} のカード名はターン終了時まで［${t.nmT}］`,"n")}return true}}]};
DEF["1051"]={ // キッドVS安室 王妃の前髪 B09112
  solvedTrigger:solvedDisc,
  abilities:[{label:"裏向きの証拠を2つ表向きに: カード名を指定し、現場のそのキャラ1枚につき山札の上から見て、指定したカード名のキャラを手札に",turn1:true,
    can:p=>p.solved&&evDown(p)>=2&&p.field.length>0,aiCan:p=>p.field.length>0,
    run:async p=>{if(!flipEvidence(p,2))return false;
      const names=[...new Set(p.field.map(nameOf))];const cnt=n=>p.field.filter(y=>nameOf(y)===n).length;
      let nm=names[0];if(names.length>1){if(p.cpu)nm=names.sort((a,b)=>cnt(b)-cnt(a))[0];else nm=await ask(`${p.name}: 指定するカード名`,"現場のキャラ1枚につきデッキの上から1枚見ます。",names.slice(0,8).map((k,i)=>({label:`${k}（${cnt(k)}枚）`,value:k,primary:!i})))}
      const n=cnt(nm);log(`　カード名［${nm}］を指定（${n}枚）`,"n");
      await lookTop(p,n,y=>isChar(y)&&C(y).nm===nm,{max:1,title:`［${nm}］のキャラを1枚まで手札に`});return true}}]};
