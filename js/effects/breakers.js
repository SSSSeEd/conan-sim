"use strict";
// カード個別効果（ガード・カットインを崩す効果。ガードさせる・ブレットを与える・カットインを封じる。環境デッキ用。blue.js が DEF["0511"] を引き継ぐので、色のファイルより先に読む）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- ガード・カットインを崩す効果（環境デッキで使われるもの） ---
const canGuardNow=(o,y)=>{const k=staticKw(y,o);return !k.noGuard&&(y.st==="a"||y.st==="s"&&(k.guardSleep||FX.canGuardSleeping(y)))};
// 「必ずガードさせる」: 自分のアクティブなキャラでAP勝ちできる相手のキャラを、レベルの高い順に狙う
const forceGuardTargets=p=>{const o=opp(p);
  const atk=p.field.filter(a=>a.st==="a"&&!staticKw(a,p).bullet&&(canAct(a,p,"chara")&&o.field.some(y=>y.st!=="a")||canAct(a,p,"case")&&o.ev.length>0));
  return o.field.filter(y=>canGuardNow(o,y)&&!staticKw(y,o).mustGuard&&atk.some(a=>apOf(a)>=apOf(y))).sort((a,b)=>lvOf(b)-lvOf(a))};
const forceGuard=label=>({label,turn1:true,
  can:p=>opp(p).field.length>0,
  run:async(p,x)=>{const t=await chooseChar(p,"ターン終了時まで「必ずガードする」を与える相手のキャラ",y=>isOpp(p,y),{ai:()=>forceGuardTargets(p).slice(0,1)});
    if(t){t.kw.push("必ずガード");log(`　${C(t).nm} はターン終了時まで「ガードできる場合、必ずガードする」`,"n")}return true},
  aiCan:p=>forceGuardTargets(p).length>0});
DEF["0511"]={partial:true, // 江戸川コナン＆工藤新一 B05005（ネクストヒント時の効果は未対応）
  abilities:[forceGuard("相手のキャラに「必ずガードする」を与える")]};
DEF["1061"]={partial:true, // 沖田総司 PR290（自分ターン中のレベル＋1は未対応。AP＋1000は apBonus）
  abilities:[{...forceGuard("相手のキャラに「必ずガードする」を与える"),can:p=>condOk("事件緑＆白",p)&&opp(p).field.length>0}]};
DEF["0513"]={ // 妃英理 B05007
  enter:async(p,x)=>{const f=y=>C(y).t==="キャラ"&&lvOf(y)<=6&&(C(y).nm.includes("工藤新一")||hasTrait(y,"毛利探偵事務所"));
    if(!await yes(p,"登場時","このキャラをスリープして、手札からレベル6以下の工藤新一か［毛利探偵事務所］のキャラを1枚まで登場させ、1枚引きますか？",()=>p.hand.some(f)))return;
    sleepC(x);await playFromHand(p,f,"レベル6以下の工藤新一か［毛利探偵事務所］");drawN(p,1)},
  abilities:[{label:"手札を1枚リムーブ: ［毛利探偵事務所］のアクションに相手はカットインできない",turn1:true,
    can:p=>condOk("絆毛利小五郎",p)&&p.hand.length>0&&p.cutLock!==G.turnNo,
    run:async p=>{if(!(await discard(p,1)).length)return false;p.cutLock=G.turnNo;log(`　このターン、${p.name} の［毛利探偵事務所］のアクション中は相手はカットインできない`,"n");return true},
    aiCan:p=>{const o=opp(p);return p.hand.length>=2&&o.hand.length>0&&p.field.some(y=>hasTrait(y,"毛利探偵事務所")&&(canAct(y,p,"chara")&&o.field.some(z=>z.st!=="a"&&apOf(z)<=apOf(y)+2000)||canAct(y,p,"case")&&o.ev.length>0))}}]};
// ブレットが効くキャラ: 動けて、相手にAPで負けるガード役がいる
const bulletWorth=(p,y)=>{const o=opp(p);return y.st==="a"&&!staticKw(y,p).bullet&&(canAct(y,p,"chara")&&o.field.some(z=>z.st!=="a"&&apOf(z)<=apOf(y))||canAct(y,p,"case")&&o.ev.length>0)&&o.field.some(z=>canGuardNow(o,z)&&apOf(z)>apOf(y))};
DEF["0481"]={ // 沖矢昴 PR085
  enter:async(p,x)=>{const t=await chooseChar(p,"登場時: ターン終了時まで〚ブレット〛を与えるキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&bulletWorth(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)giveKw(t,"ブレット")}};
DEF["0220"]={ // 沖矢昴 B02057
  endTurn:async(p,x)=>{if(!partnerIs(p,"赤")||x.st==="a")return;const t=await chooseChar(p,"ターン終了時: リムーブするキャラ（AP8000以下）",y=>y!==x&&apOf(y)<=8000);if(t)removeCard(t,"効果",{by:p,effect:true})},
  abilities:[{label:"スリープ: レベル7以下の【赤】に〚ブレット〛か〚突撃［事件］〛",turn1:true,
    can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7),
    run:async(p,x)=>{x.st="s";log(`　コスト: ${C(x).nm} をスリープ`,"n");const o=opp(p);
      const [y]=await pickCards(p,"〚ブレット〛か〚突撃［事件］〛を与えるキャラ（レベル7以下の【赤】）","",p.field.filter(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7),{min:0,max:1,ai:cs=>cs.filter(y=>y.st==="a"&&(bulletWorth(p,y)||y.fresh&&o.ev.length>0)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(!y)return true;
      const rushE=p.cpu?y.fresh&&!canAct(y,p,"case"):!await yes(p,"どちらを与える？","「はい」で〚ブレット〛、「いいえ」で〚突撃［事件］〛");
      giveKw(y,rushE?"突撃［事件］":"ブレット");return true},
    aiCan:(p,x)=>{const o=opp(p);return p.field.some(y=>y!==x&&hasColor(y,"赤")&&lvOf(y)<=7&&y.st==="a"&&(bulletWorth(p,y)||y.fresh&&!canAct(y,p,"case")&&o.ev.length>0))}}]};
const akaiCard=y=>C(y).nm.includes("赤井秀一")||C(y).nm==="ライ";
DEF["0328"]={ // 沖矢昴 B03074（各ターン2回）
  abilities:[{label:"手札の赤井秀一かライをリムーブ: 〚突撃〛か〚ブレット〛",
    can:(p,x)=>turnCount(x,"oki2")<2&&p.hand.some(akaiCard),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: リムーブする赤井秀一かライ","",p.hand.filter(akaiCard),{min:1,max:1});if(!c)return false;
      useTurn(x,"oki2");detach(c);p.rm.push(c);log(`　コスト: 手札の ${C(c).nm} をリムーブ`,"n");
      const rush=p.cpu?x.fresh&&!canAct(x,p,"case"):await yes(p,"どちらを持つ？","「はい」で〚突撃〛、「いいえ」で〚ブレット〛");
      giveKw(x,rush?"突撃":"ブレット");return true},
    aiCan:(p,x)=>{const o=opp(p);return p.hand.length>=3&&x.st==="a"&&(x.fresh&&!canAct(x,p,"case")&&o.ev.length>0||bulletWorth(p,x))}}]};
