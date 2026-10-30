"use strict";
// カード個別効果（サッカー4）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- サッカー4（比護隆佑） ---
DEF["1081"]={ // プロサッカー選手脅迫事件
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠2つを表に: リムーブエリアのサッカー選手/ガジェットを手札に",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=2&&p.field.some(y=>hasTrait(y,"サッカー選手"))&&p.rm.some(y=>lvOf(y)<=6&&((C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"))||(C(y).t==="イベント"&&hasTrait(y,"ガジェット")))),
    run:async p=>{if(!flipEvidence(p,2))return false;
      const cs=p.rm.filter(y=>lvOf(y)<=6&&((C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"))||(C(y).t==="イベント"&&hasTrait(y,"ガジェット"))));
      const [y]=await pickCards(p,"手札に加えるカード","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      if(y){detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}return true}}]};
DEF["1065"]={ // 工藤新一 B10003
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  actionEnd:async(p,x)=>{if(!p.field.includes(x)||turnCount(x,"shin")||!faceDownSet(x).length)return;useTurn(x,"shin");
    const can2=p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手")&&!faceDownSet(y).length);
    const v=p.cpu?(can2?"move":"hand"):await ask(`${p.name}: 工藤新一 アクション終了時`,"",[{label:"セットされたカードを手札に",value:"hand",primary:true},...(can2?[{label:"セットを他のサッカー選手に移す",value:"move"}]:[])]);
    if(v==="hand"){const s=faceDownSet(x)[0];x.set.splice(x.set.indexOf(s),1);p.hand.push(s.c);log(`　セットされていたカードを手札に`,"n")}else await moveSet(p,x)}};
DEF["1066"]={ // 江戸川コナン B10004
  abilities:[{label:"セットを1枚リムーブ: AP8000以下のキャラをリムーブ",
    can:(p,x)=>partnerIs(p,"青")&&p.file.length>=5&&turnCount(x,"conan")<3&&faceDownSet(x).length>0&&p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手"))&&allChars().some(y=>y!==x&&apOf(y)<=8000),
    run:async(p,x)=>{if(!removeSetCost(p,x))return false;const n=useTurn(x,"conan");
      const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",y=>apOf(y)<=8000&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true});
      if(n===3)gainEv(p,1);return true}}]};
DEF["1067"]={ // 灰原哀 B10005
  enter:async(p,x)=>{const cs=p.hand.filter(y=>C(y).t==="キャラ"&&hasTrait(y,"サッカー選手")&&lvOf(y)<=6);if(!cs.length)return;
    if(!await yes(p,"登場時","この灰原哀をスリープさせて、手札からレベル6以下のサッカー選手を登場させますか？",true))return;
    x.st="s";const y=await playFromHand(p,y=>hasTrait(y,"サッカー選手")&&lvOf(y)<=6);if(y&&C(y).nm.includes("比護隆佑"))drawN(p,1)},
  endTurn:async(p,x)=>{if(p.field.filter(y=>hasTrait(y,"サッカー選手")).length>=3)drawN(p,1)}};
const MOVE_SET_AB={label:"【スリープ】: セットを他のサッカー選手に移す",
  can:(p,x)=>x.st==="a"&&faceDownSet(x).length>0&&p.field.some(y=>y!==x&&hasTrait(y,"サッカー選手")&&!faceDownSet(y).length),
  run:async(p,x)=>{x.st="s";await moveSet(p,x);return true},noAi:true};
DEF["1069"]={ // 赤木英雄
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"【スリープ】セットを1枚リムーブ: AP6000以下のキャラをリムーブ",
    can:(p,x)=>x.st==="a"&&faceDownSet(x).length>0&&allChars().some(y=>y!==x&&apOf(y)<=6000),
    run:async(p,x)=>{x.st="s";removeSetCost(p,x);const t=await chooseChar(p,"リムーブするキャラ（AP6000以下）",y=>apOf(y)<=6000&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true});return true}}]};
DEF["1075"]={ // 比護隆佑 B10013
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"セットを1枚リムーブ: 突撃を得る／キャラ1枚をスリープ",
    can:(p,x)=>turnCount(x,"hiko")<2&&faceDownSet(x).length>0,
    run:async(p,x)=>{removeSetCost(p,x);useTurn(x,"hiko");
      const v=p.cpu?(x.fresh&&x.st==="a"?"rush":"sleep"):await ask(`${p.name}: 比護隆佑`,"",[{label:"ターン終了時まで突撃",value:"rush",primary:true},{label:"キャラを1枚スリープ",value:"sleep"}]);
      if(v==="rush"){x.kw.push("突撃");log(`　${C(x).nm} は突撃を得た`,"n")}else{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}return true},
    aiCan:(p,x)=>(x.fresh&&x.st==="a")||opp(p).field.some(y=>y.st==="a")}]};
DEF["1079"]={ // キック力増強シューズ
  event:async(p,x)=>{if(!partnerIs(p,"青")){log("　パートナーの色が条件を満たさないので効果なし","n");return}
    const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",y=>apOf(y)<=8000);if(t)removeCard(t,"効果",{by:p,effect:true});
    const cs=p.field.filter(y=>C(y).nm.includes("江戸川コナン"));if(!cs.length)return;
    const [c]=await pickCards(p,"セットする江戸川コナン","",cs,{min:1,max:1});if(c){detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　キック力増強シューズを ${C(c).nm} にセット`,"n")}},
  ai:p=>opp(p).field.some(y=>apOf(y)<=8000),
  // セットされているキャラが得る能力
  grants:[{label:"ベルトをリムーブ: AP8000以上のキャラをリムーブ",turn1:true,
    can:(p,x)=>(x.set||[]).some(s=>s.up&&idOf(s.c)==="1080")&&allChars().some(y=>apOf(y)>=8000),
    run:async(p,x)=>{const s=x.set.find(s=>s.up&&idOf(s.c)==="1080");if(!s)return false;x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);
      log(`　コスト: ${C(x).nm} にセットされたベルトをリムーブ`,"n");
      const t=await chooseChar(p,"リムーブするキャラ（AP8000以上）",y=>apOf(y)>=8000);if(t)removeCard(t,"効果",{by:p,effect:true});return true},
    aiCan:p=>opp(p).field.some(y=>apOf(y)>=8000)}]};
DEF["1074"]={ // 真田貴大
  enter:async(p,x)=>{if(partnerIs(p,"青"))setTop(p,x)},
  abilities:[MOVE_SET_AB,{label:"セットを1枚リムーブ: ターン終了時まで突撃",turn1:true,
    can:(p,x)=>faceDownSet(x).length>0&&!x.kw.includes("突撃"),
    run:async(p,x)=>{removeSetCost(p,x);x.kw.push("突撃");log(`　${C(x).nm} は突撃を得た`,"n");return true},aiCan:(p,x)=>x.fresh&&x.st==="a"}]};
DEF["0269"]={ // ゴロ
  abilities:[{label:"デッキの下に移す: LP0の【青】のキャラをLP＋1",
    can:(p,x)=>allChars().some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)===0),
    run:async(p,x)=>{toDeckBottom(x);const t=await chooseChar(p,"LP＋1するキャラ",y=>hasColor(y,"青")&&lpOf(y)===0,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}return true},
    aiCan:(p,x)=>p.field.some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)===0&&y.st==="a"&&!y.fresh)}]};
DEF["1078"]={guardWhileSleeping:true}; // レイ・カーティス
DEF["0019"]={ // シャッフルロマンス
  event:async(p,x)=>{await lookTop(p,5,()=>true,{title:"カードを1枚まで手札に"});
    if(!p.field.length)return;const [c]=await pickCards(p,"シャッフルロマンスをセットするキャラ","",p.field,{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>apOf(b)-apOf(a))});
    if(c){detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　シャッフルロマンスを ${C(c).nm} にセット（コンタクト中AP＋2000）`,"n")}},
  ai:p=>true};
DEF["0954"]={ // 赤木守
  hirameki:async o=>{const cs=o.rm.filter(y=>C(y).t==="キャラ"&&hasTrait(y,"サッカー選手"));const [y]=await pickCards(o,"ヒラメキ: 手札に加えるサッカー選手","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(y){detach(y);o.hand.push(y);log(`　${C(y).nm} を手札に`)}}};
const setBelt=(p,x,c)=>{const bonus=hasTrait(c,"サッカー選手")&&!faceDownSet(c).length;
  detach(x);c.set=c.set||[];c.set.push({c:x,up:true});log(`　ベルトを ${C(c).nm} にセット`,"n");
  if(bonus){setTop(p,c);drawN(p,1)}};
const isConan=y=>C(y).nm.includes("江戸川コナン");
const hasGadget=p=>p.field.some(y=>hasTrait(y,"ガジェット")||(y.set||[]).some(s=>s.up&&hasTrait(s.c,"ガジェット")));
DEF["1080"]={ // どこでもボール射出ベルト
  event:async(p,x)=>{const cs=p.field.filter(y=>hasColor(y,"青"));if(!cs.length){log("　セットできる【青】のキャラがいない","n");return}
    const [c]=await pickCards(p,"ベルトをセットする【青】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>(hasTrait(b,"サッカー選手")&&!faceDownSet(b).length)-(hasTrait(a,"サッカー選手")&&!faceDownSet(a).length))});
    if(c)setBelt(p,x,c)},
  ai:p=>p.field.some(y=>hasColor(y,"青")),
  // 【FILE8】【宣言】手札から江戸川コナンにセット（現場にガジェットがないとき）
  handAbilities:[{label:"手札から江戸川コナンにセット",
    can:(p,x)=>p.file.length>=8&&p.field.some(isConan)&&!hasGadget(p),
    run:async(p,x)=>{const [c]=await pickCards(p,"ベルトをセットする江戸川コナン","",p.field.filter(isConan),{min:1,max:1});if(!c)return false;setBelt(p,x,c);return true},
    aiCan:p=>true}]};
