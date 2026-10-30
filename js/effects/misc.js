"use strict";
// カード個別効果（黄・緑のその他）。DEF["カードID"]={...} を足す。共通の部品は core.js。

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
      const t=await chooseChar(p,"相手の証拠にするキャラ（AP8000以下）",y=>isOpp(p,y)&&apOf(y)<=8000);if(t){for(const s of t.set||[])o.rm.push(s.c);t.set=[];detach(t);resetMods(t);t.up=true;o.ev.push(t);log(`　${C(t).nm} は表向きで ${o.name} の証拠になった`,"n")}return true}}]};
DEF["0732"]={ // 目暮十三 PR181
  abilities:[{label:"【スリープ】: リムーブエリアのレベル4以下の［警視庁］を登場（突撃［事件］、ターン終了時にデッキの下へ）",can:(p,x)=>x.st==="a"&&p.field.length<5&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警視庁")&&lvOf(y)<=4),aiCan:p=>myTurn(p)&&opp(p).ev.length>0,
    run:async(p,x)=>{sleepCost(x);const y=await enterFromRm(p,y=>hasTrait(y,"警視庁")&&lvOf(y)<=4,"登場させる［警視庁］（レベル4以下）");if(y){giveKw(y,"突撃［事件］");giveKw(y,"終了時デッキの下")}return true}}]};
