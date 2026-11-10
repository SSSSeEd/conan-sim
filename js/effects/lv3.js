"use strict";
// カード個別効果（レベル3・レベル2、2026-11-10）。部品は lv6.js（l6_ を付けたもの）・lv5.js・lv7.js・mr8.js のものを使う。
// 追加した仕組み:
//  - DEF の onFileHand(p,self)（FILEエリアのカードを手札に加えたとき。engine.js noteFileHand。大上祝善 B05050）
//  - DEF の guardWhileSleeping は関数 (p,self) でも可（大滝悟郎 B09028）
// 近似: フィリップ王子 B07049 はパートナーエリアのカードは対象にしない（リムーブエリアのみ）／和田進一 B03040 は証拠を見るだけなので画面に出すだけ

const l3_fromFx=x=>{const s=x.entSrc;return !!s&&s.lv>=3&&(s.t==="キャラ"||s.t==="イベント")}; // レベル3以上のキャラの能力・イベントの効果によって登場
const l3_selfBottom=(x)=>{toDeckBottom(x)};
const l3_removeSelfCost=(p,x)=>{removeCard(x,"コスト",{by:p})};
const l3_sameName=(a,b)=>namesOf(a).some(n=>namesOf(b).includes(n));
const l3_cutinDraw=f=>async(p,card,mine)=>{if(mine&&f(mine))drawN(p,1)};
const l3_endActivate=(selfF,pickF,title)=>async(p,self)=>{if(!p.field.includes(self))return;if(!await yes(p,C(self).nm,title,true))return;selfF(p,self);const t=await chooseChar(p,"アクティブにするキャラ",y=>!isOpp(p,y)&&pickF(y),{ai:ownPick(p)});if(t)activateC(t)};

// ================= 青 =================
DEF["0011"]={enter:async(p,x)=>{if(l3_fromFx(x))await ownAp(p,2000,"AP＋2000するキャラ")}}; // 円谷光彦 B01015
DEF["0017"]={enter:async(p,x)=>{if(l3_fromFx(x))drawN(p,1)}}; // 吉田歩美 B01021
DEF["0275"]={cutin:async p=>{if(myTurn(p))return;const t=await chooseChar(p,"アクティブにする［少年探偵団］",y=>!isOpp(p,y)&&hasTrait(y,"少年探偵団"),{ai:ownPick(p)});if(t)activateC(t)}}; // 東尾マリア B03017
DEF["0279"]={abilities:[{label:"スリープ: 1枚引いて1枚リムーブ",can:(p,x)=>x.st==="a",aiCan:p=>p.deck.length>8,run:async(p,x)=>{sleepCost(x);drawN(p,1);await discard(p,1);return true}}]}; // 吉田歩美 B03021
DEF["0414"]={abilities:[{label:"リムーブエリアに移す: リムーブエリアの【青】のイベントを手札に",can:p=>p.rm.some(y=>C(y).t==="イベント"&&hasColor(y,"青")),aiCan:()=>true,
  run:async(p,x)=>{l3_removeSelfCost(p,x);await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"青"),"手札に加える【青】のイベント");return true}}]}; // 灰原哀 B04009
DEF["0517"]={onReason:async(p,self,x)=>{if(exactName("毛利小五郎")(x)&&p.field.includes(x)&&l6_ownTurnOnce(self,"ame3"))drawN(p,1)}}; // 雨城瑠璃 B05011
ALIAS["0518"]="毛利小五郎";
DEF["0518"]={traitAura:(p,self,x,t)=>x===self&&t==="探偵"}; // 恩田遼平 B05012（ミスリードは印字）
DEF["0526"]={leaveOppTurn:async p=>{await lookTop(p,1,y=>["江戸川コナン","灰原哀","小嶋元太","円谷光彦"].some(n=>exactName(n)(y)),{max:1,title:"手札に加える［江戸川コナン］［灰原哀］［小嶋元太］［円谷光彦］"})}}; // 吉田歩美 B05020
DEF["0635"]={abilities:[{label:"このキャラをデッキの下に移す: ［高校生］のキャラが出るまで公開して手札に",can:()=>true,aiCan:p=>myTurn(p),run:async(p,x)=>{l3_selfBottom(x);digToHand(p,y=>isChar(y)&&hasTrait(y,"高校生"));return true}}]}; // 中道 B06010
DEF["0743"]={ // 福井柚嬉 B07011
  enter:async p=>{if(p.solved)return;const win=Math.random()<0.5;log(`　じゃんけん: ${p.name} は${win?"勝った":"負けた"}`);drawN(p,1);if(!win)await discard(p,1)},
  hirameki:async o=>{if(o.solved)await pickRmToHand(o,exactName("毛利小五郎"),"手札に加える［毛利小五郎］")}};
DEF["0852"]={abilities:[{label:"スリープ・デッキの下に移す: LP1以下の［灰原哀］をLP＋1",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&exactName("灰原哀")(y)&&lpOf(y)<=1),aiCan:()=>false,
  run:async(p,x)=>{sleepCost(x);l3_selfBottom(x);const t=await chooseChar(p,"LP＋1する［灰原哀］",y=>!isOpp(p,y)&&exactName("灰原哀")(y)&&lpOf(y)<=1,{ai:ownPick(p)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}return true}}]}; // 東尾マリア B08011
DEF["0524"]={abilities:[{label:"リムーブエリアに移す: ［灰原哀］をAP＋2000",can:p=>p.field.some(exactName("灰原哀")),aiCan:p=>myTurn(p),run:async(p,x)=>{l3_removeSelfCost(p,x);const t=await chooseChar(p,"AP＋2000する［灰原哀］",y=>!isOpp(p,y)&&exactName("灰原哀")(y),{ai:ownPick(p)});if(t)apTurn(t,2000);return true}}]}; // 円谷光彦 B05018
DEF["0634"]={leaveOppTurn:async p=>{drawN(p,1);await discard(p,1)},hirameki:async o=>{if(o.field.some(y=>hasTrait(y,"少年探偵団")))drawN(o,1)}}; // トラカゲ B06009
DEF["0739"]={abilities:[{label:"スリープ・リムーブエリアに移す: AP6000以上のキャラをスリープ",can:(p,x)=>x.st==="a",aiCan:p=>opp(p).field.some(y=>apOf(y)>=6000&&y.st==="a"),
  run:async(p,x)=>{sleepCost(x);l3_removeSelfCost(p,x);const t=await chooseChar(p,"スリープさせるキャラ（AP6000以上）",y=>apOf(y)>=6000&&y.st==="a");if(t)sleepC(t);return true}}]}; // 沖野ヨーコ B07007
DEF["0741"]={cutin:l3_cutinDraw(y=>exactName("白鳥任三郎")(y)||hasTrait(y,"少年探偵団"))}; // 小林澄子 B07009
DEF["0271"]={leaveOppTurn:async p=>{const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000)}}; // 大尉 B03013
DEF["0728"]={abilities:[{label:"リムーブエリアに移す: デッキの上から2枚見て1枚手札に",can:p=>p.deck.length>=2,aiCan:p=>myTurn(p),run:async(p,x)=>{l3_removeSelfCost(p,x);await lookTop(p,2,()=>true,{max:1,title:"手札に加えるカード"});return true}}]}; // 灰原哀 PR194

// ================= 緑 =================
DEF["0031"]={onAction:async(p,self,actor,target)=>{if(!target||!p.field.includes(actor)||!hasColor(actor,"緑")||!l6_ownTurnOnce(self,"sizu3"))return;drawN(p,1);await discard(p,1)},hirameki:l6_hiDraw}; // 服部静華 B01037
DEF["0291"]={cutin:async p=>{const ct=G.contact;if(!ct)return;const t=[ct.a,ct.d].find(y=>isOpp(p,y));if(t&&opp(p).deck.length)setTop(opp(p),t)}}; // 稲尾一久 B03034（AP＋1000は印字から）
DEF["0292"]={abilities:[{label:"スリープ・セットされたカードを1枚リムーブ: 1枚引く",can:(p,x)=>x.st==="a"&&setCardsAll().length>0,aiCan:p=>setCardsAll().length>0,
  run:async(p,x)=>{sleepCost(x);if(await removeAnySet(p,"リムーブするセットされたカード"))drawN(p,1);return true}}],hirameki:l6_hiDraw}; // 大滝悟郎 B03035
DEF["0757"]={abilities:[{label:"スリープ・他の［マジシャン］をデッキの下に移す: そのレベル以下の［マジシャン］をリムーブエリアから手札に",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"マジシャン")),aiCan:()=>false,
  run:async(p,x)=>{sleepCost(x);const [c]=await pickCards(p,"デッキの下に移す［マジシャン］","",p.field.filter(y=>y!==x&&hasTrait(y,"マジシャン")),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return true;const lv=lvOf(c);toDeckBottom(c);
    await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"マジシャン")&&(C(y).lv||0)<=lv,`手札に加えるレベル${lv}以下の［マジシャン］`);return true}}]}; // 星河童吾 B07025
DEF["0867"]={enter:async(p,x)=>{if(!await yes(p,"長門秀臣","このキャラをリムーブして、両者のリムーブエリアをデッキの下に移してシャッフルしますか？",()=>false))return;removeCard(x,"効果",{by:p});for(const q of G.P){q.deck.push(...q.rm.splice(0));shuffle(q.deck)}log("　両者のリムーブエリアのカードをデッキの下に移してシャッフル","n")}}; // 長門秀臣 B08027
DEF["1090"]={enter:async(p,x)=>{if(!p.field.some(y=>exactName("服部平次")(y)||exactName("遠山和葉")(y))||!p.rm.some(y=>C(y).t==="イベント"&&hasColor(y,"緑")))return;
  if(!await yes(p,"国末照明","このキャラをスリープさせて、リムーブエリアの【緑】のイベントを手札に加えますか？",true))return;sleepC(x);await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"緑"),"手札に加える【緑】のイベント")}}; // 国末照明 B10029
DEF["0297"]={onCaseGain:async(p,self,actor)=>{if(!myTurn(p)||l6_ownTurnOnce(self,"wada")===false)return;const e=p.ev[p.ev.length-1];if(e&&!p.cpu)toast(`証拠の一番上: ${C(e).nm}`)}}; // 和田進一 B03040
DEF["0541"]={abilities:[{label:"スリープ・FILEの上から1枚リムーブ: 2枚引く",can:(p,x)=>x.st==="a"&&!!fileTopCard(p),aiCan:p=>p.file.length>4,
  run:async(p,x)=>{sleepCost(x);const y=takeFileTop(p);if(y){y.fu=false;p.rm.push(y);log(`　コスト: FILEの上の ${C(y).nm} をリムーブ`,"n")}drawN(p,2);return true}}]}; // 桧原ひかる B05037
DEF["0664"]={cutin:l3_cutinDraw(y=>["服部平次","服部平蔵","遠山和葉"].some(n=>exactName(n)(y)))}; // 服部静華 B06041
DEF["0755"]={endTurn:l3_endActivate((p,x)=>removeCard(x,"効果",{by:p}),y=>exactName("服部平次")(y)||exactName("毛利小五郎")(y),"このキャラを現場からリムーブして、［服部平次］か［毛利小五郎］をアクティブにしますか？")}; // 光本兵我 B07023
DEF["0972"]={guardWhileSleeping:p=>p.field.filter(y=>hasTrait(y,"大阪府警")).length>=2}; // 大滝悟郎 B09028
DEF["0426"]={hirameki:l6_hiToHand(exactName("綾小路文麿"),"手札に加える［綾小路文麿］"),cutin:l3_cutinDraw(y=>exactName("綾小路文麿")(y))}; // マロちゃん B04025

// ================= 白 =================
DEF["0046"]={leaveOppTurn:async p=>{const t=await chooseChar(p,"元のLPを0にするキャラ");if(t){t.lpT-=C(t).lp||0;log(`　${C(t).nm} をターン終了時まで元のLPを0に`,"n")}},hirameki:l6_hiDraw}; // 寺井黄之助 B01054
DEF["0307"]={disguiseReplaced:async(p,mine,by)=>{if(exactName("ベルモット")(by)){const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}return false},hirameki:l6_hiDraw}; // シャロン・ヴィンヤード B03052
DEF["0308"]={enter:async p=>{const y=await pickRmToHand(p,z=>isChar(z)&&hasTrait(z,"鈴木財閥")&&!exactName("鈴木綾子")(z),"手札に加える［鈴木財閥］");if(y)await discard(p,1)}}; // 鈴木綾子 B03053
DEF["0552"]={onFileHand:async(p,self)=>{if(!p.rm.some(y=>isChar(y)&&hasTrait(y,"探偵")))return;const y=await pickRmToHand(p,z=>isChar(z)&&hasTrait(z,"探偵"),"手札に加える［探偵］");if(y&&p.field.includes(self))removeCard(self,"効果",{by:p})},hirameki:l6_hiDraw}; // 大上祝善 B05050
DEF["0767"]={enter:async p=>{const y=digToHand(p,z=>exactName("小泉紅子")(z)||(C(z).t==="イベント"&&hasTrait(z,"赤魔術")));if(y)await discard(p,1)}}; // 紅子の執事 B07038
DEF["0771"]={leaveOppTurn:async p=>{await pickRmToHand(p,exactName("白馬探"),"手札に加える［白馬探］")}}; // 式部鹿紫子 B07042
DEF["0793"]={enter:async p=>{const q=opp(p);const xs=await pickCards(p,"表向きにする相手の裏向きの証拠","",q.ev.filter(e=>!e.up),{max:1,ai:c=>c});for(const e of xs)flipUp(q,e)}}; // ワトソン B07064
DEF["0879"]={apSelf:p=>!myTurn(p)?2000:0,hirameki:l6_hiDraw}; // 鈴木次郎吉 B08040
DEF["0992"]={ // 南條欽治 B09049
  endTurn:async(p,self)=>{if(!p.field.includes(self)||!p.field.some(y=>y!==self&&y.st==="a"))return;if(!await yes(p,"南條欽治","他のキャラを1枚スリープさせて、このキャラをアクティブにしますか？",()=>self.st!=="a"))return;
    const [s]=await pickCards(p,"スリープさせるキャラ","",p.field.filter(y=>y!==self&&y.st==="a"),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});if(s){sleepC(s);activateC(self)}},
  abilities:[{label:"スリープ・手札を1枚リムーブ: リムーブエリアの［鈴木財閥］を手札に",can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasTrait(y,"鈴木財閥")),aiCan:p=>p.hand.length>3,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"鈴木財閥"),"手札に加える［鈴木財閥］");return true}}]};
DEF["0594"]={cutin:async p=>{if(myTurn(p))return;const t=await chooseChar(p,"アクティブにする［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:ownPick(p)});if(t)activateC(t)}}; // 佐藤美和子 B05096
DEF["0778"]={abilities:[{label:"デッキの下に移す: リムーブエリアの［ビッグジュエル］を手札に",can:p=>p.rm.some(y=>hasTrait(y,"ビッグジュエル")),aiCan:()=>true,
  run:async(p,x)=>{l3_selfBottom(x);await pickRmToHand(p,y=>hasTrait(y,"ビッグジュエル"),"手札に加える［ビッグジュエル］");return true}}]}; // フィリップ王子 B07049
DEF["0876"]={abilities:[{label:"スリープ: ［京極真］に「相手のアクティブ状態のキャラを指定してアクションできる」を与える（解決編）",can:(p,x)=>p.solved&&x.st==="a"&&p.field.some(exactName("京極真")),aiCan:p=>myTurn(p),
  run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"能力を与える［京極真］",y=>!isOpp(p,y)&&exactName("京極真")(y),{ai:ownPick(p)});if(t)giveKw(t,"アクティブ指定");return true}}]}; // 鈴木園子 B08037
DEF["0596"]={abilities:[{label:"デッキの下に移す: リムーブエリアの【黄】のイベントを手札に",can:p=>p.rm.some(y=>C(y).t==="イベント"&&hasColor(y,"黄")),aiCan:()=>true,
  run:async(p,x)=>{l3_selfBottom(x);await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"黄"),"手札に加える【黄】のイベント");return true}}]}; // 白鳥任三郎 B05098

// ================= 赤 =================
DEF["0065"]={onAllyRemoved:async(p,self,info)=>{if(info.turn===p.idx||(info.x!==self&&!hasColor(info.x,"赤"))||!l6_ownTurnOnce(self,"akemi3"))return;drawN(p,1);await discard(p,1)},hirameki:l6_hiDraw}; // 宮野明美 B01075
DEF["0447"]={onAllyRemoved:async(p,self,info)=>{if(info.turn===p.idx||info.x===self||!hasColor(info.x,"赤")||self.st!=="s"||!p.field.includes(self)||!l6_ownTurnOnce(self,"amanda3"))return;
  const y=p.deck.shift();if(!y)return;log(`　デッキの上: ${C(y).nm} を公開`,"n");const tr=(C(info.x).ct||"").split(",").filter(Boolean);
  if((C(y).ct||"").split(",").some(t=>tr.includes(t))){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}else{p.deck.push(y);log("　デッキの下に移した","n")}checkDeck(p)}}; // アマンダ・ヒューズ B04055
DEF["0701"]={endTurn:async(p,self)=>{const cs=p.field.filter(y=>y!==self&&!exactName("保本ひかる")(y));if(!p.field.includes(self)||!cs.length)return;if(!await yes(p,"保本ひかる","他のキャラを1枚リムーブして、証拠を1つ得ますか？",()=>false))return;
  const [t]=await pickCards(p,"リムーブするキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(t){removeCard(t,"効果",{by:p,effect:true});gainEv(p,1)}}}; // 保本ひかる B06081
DEF["0893"]={cutin:async(p,card,mine)=>{if(!myTurn(p)||!mine||!p.hand.some(isChar))return;if(!await yes(p,"本堂瑛海","手札のキャラを1枚リムーブして、AP1000につきAP＋1000しますか？",true))return;
  const [h]=await discard(p,1,"リムーブするキャラ",p,isChar);if(h){const v=Math.floor((C(h).ap||0)/1000)*1000;mine.apC+=v;log(`　${C(mine).nm} をコンタクト中AP＋${v}`,"n")}}}; // 本堂瑛海 B08055
DEF["1007"]={ // マーク B09065
  endTurn:l3_endActivate((p,x)=>sleepC(x),y=>hasTrait(y,"FBI"),"このキャラをスリープさせて、他の［FBI］をアクティブにしますか？"),
  leaveOppTurn:async p=>{const t=await chooseChar(p,"アクティブにする［FBI］",y=>!isOpp(p,y)&&hasTrait(y,"FBI"),{ai:ownPick(p)});if(t)activateC(t)}};
DEF["0801"]={endTurn:l3_endActivate((p,x)=>removeCard(x,"効果",{by:p}),y=>hasColor(y,"赤")||hasColor(y,"黄"),"このキャラを現場からリムーブして、【赤】か【黄】のキャラをアクティブにしますか？")}; // 澁谷夏子 B07072

// ================= 黄 =================
DEF["0073"]={onAction:async(p,self,actor)=>{if(actor!==self)return;const xs=investigate(p,1);if(xs.some(y=>(C(y).lv||0)>=5))apTurn(self,2000)}}; // 安室透 B01085
DEF["0344"]={leaveOppTurn:async p=>{const t=await chooseChar(p,"AP＋1000する［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:ownPick(p)});if(t)apTurn(t,1000)}}; // 高木長介 B03091
DEF["0354"]={enter:async p=>{const t=await chooseChar(p,"スリープさせるミスリードを持つキャラ",y=>y.st==="a"&&staticKw(y,ownerOf(y)).misread>0);if(t)sleepC(t)},hirameki:l6_hiDraw}; // 横溝参悟 B03101
DEF["0464"]={enter:async p=>{const y=p.deck[0];if(!y)return;log(`　デッキの上: ${C(y).nm} を見た`,"n");if(await yes(p,"宮本由美",`${C(y).nm} をデッキの1番下に移しますか？`,()=>C(y).t!=="キャラ")){p.deck.shift();p.deck.push(y)}}}; // 宮本由美 B04079
DEF["0710"]={onAllyGuard:async(p,self,guard,target)=>{if(guard!==self||myTurn(p)||!l6_ownTurnOnce(self,"oe3"))return;activateC(self);apTurn(self,2000)}}; // 大江忍 B06091
DEF["0817"]={abilities:[{label:"スリープ: デッキの上を公開し、［警察］か［探偵］のキャラなら手札、それ以外はデッキの下",turn1:true,can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:p=>p.deck.length>5,
  run:async(p,x)=>{sleepCost(x);await revealTopYes(p,y=>isChar(y)&&(hasTrait(y,"警察")||hasTrait(y,"探偵")));return true}}]}; // 米原桜子 B07089
DEF["0907"]={abilities:[{label:"スリープ・デッキの下に移す: LP1以下の［諸伏高明］をLP＋1",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&exactName("諸伏高明")(y)&&lpOf(y)<=1),aiCan:()=>false,
  run:async(p,x)=>{sleepCost(x);l3_selfBottom(x);const t=await chooseChar(p,"LP＋1する［諸伏高明］",y=>!isOpp(p,y)&&exactName("諸伏高明")(y)&&lpOf(y)<=1,{ai:ownPick(p)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}return true}}]}; // 小橋葵 B08070
DEF["1128"]={abilities:[{label:"デッキの下に移す: レベル4か5の［喫茶ポアロ］［警察］［少年探偵団］が出るまで公開して手札に",can:()=>true,aiCan:p=>myTurn(p),
  run:async(p,x)=>{l3_selfBottom(x);digToHand(p,y=>isChar(y)&&[4,5].includes(C(y).lv||0)&&(hasTrait(y,"喫茶ポアロ")||hasTrait(y,"警察")||hasTrait(y,"少年探偵団")));return true}}],hirameki:hiSleep}; // アラン・カッセル B10072
DEF["1136"]={apSelf:()=>allChars().some(y=>hasTrait(y,"警察"))?-2000:0}; // 化け物屋敷の3人組 B10080
DEF["0350"]={onOppAction:async(q,self,actor,target)=>{if(!target)return;const m=q.field.find(exactName("目暮十三"));if(m){m.apA=(m.apA||0)+2000;log(`　${C(m).nm} をアクション終了時までAP＋2000`,"n")}},hirameki:l6_hiDraw}; // 目暮みどり B03097
DEF["0596x"]={};
delete DEF["0596x"];
DEF["1016"]={gale:async p=>{const q=opp(p);const xs=await pickCards(p,"表向きにする相手の裏向きの証拠","",q.ev.filter(e=>!e.up),{max:1,ai:c=>c});for(const e of xs)flipUp(q,e)}}; // 三池苗子 B09076（カットインは印字から）
DEF["1132"]={hirameki:l6_hiToHand(y=>exactName("伊達航")(y)||exactName("高木渉")(y),"手札に加える［伊達航］か［高木渉］"),cutin:l3_cutinDraw(y=>exactName("伊達航")(y)||exactName("高木渉")(y))}; // ナタリー・来間 B10076

// ================= 黒 =================
DEF["0249"]={ // 犯人 B02088
  onAllyEnter:async(p,self,y)=>{if(y!==self&&exactName("犯人")(y)&&p.field.includes(self))removeCard(self,"効果",{by:p})},
  endTurn:async(p,self)=>{await l3_culpritEv(p,self)},oppEndTurn:async(q,self)=>{await l3_culpritEv(q,self)},
  hirameki:async o=>{G.noEvGain=true},
  cutin:async(p,card)=>{if(p.field.length>=fieldMax(p))return;const i=p.rm.indexOf(card);if(i<0)return;p.rm.splice(i,1);await enterByEffect(p,card,"s")}};
async function l3_culpritEv(p,self){if(!p.field.includes(self))return;const e=p.ev.pop();if(e){p.rm.push(e);log(`　${p.name} の証拠を1つリムーブ（ヒラメキは発動しない）`,"n")}
  const i=p.field.indexOf(self);if(i<0)return;dropSets(p,self);detach(self);resetMods(self);self.st="a";self.up=true;p.ev.push(self);log(`　${C(self).nm} を表向きのまま証拠として得た（証拠${p.ev.length}）`)}
DEF["0367"]={onAllyCutin:async(p,self,mine,card)=>{if(mine===self){self.apC+=1000;log(`　${C(self).nm} はこのコンタクト中AP＋1000`,"n")}},hirameki:l6_hiDraw}; // キール B03118
DEF["0369"]={abilities:[{label:"スリープ: このキャラをリムーブ。AP4000以下のキャラをリムーブ",can:(p,x)=>x.st==="a",aiCan:p=>opp(p).field.some(y=>apOf(y)>=3000&&apOf(y)<=4000),
  run:async(p,x)=>{sleepCost(x);removeCard(x,"効果",{by:p});await rmChar(p,apLe(4000),"リムーブするキャラ（AP4000以下）");return true}}],hirameki:hiSleep}; // 楠田陸道 B03120
DEF["0475"]={onContact:async(p,self,ct)=>{if(self.st!=="a"||!p.field.includes(self))return;const m=[ct.a,ct.d].find(y=>p.field.includes(y)&&y!==self);if(!m)return;
  if(!await yes(p,"コルン","このキャラをスリープさせて、コンタクト中のキャラをAP＋1000しますか？",true))return;sleepC(self);const t=await chooseChar(p,"AP＋1000するコンタクト中のキャラ",y=>y===ct.a||y===ct.d,{ai:cs=>cs.filter(y=>p.field.includes(y))});if(t){t.apC+=1000;log(`　${C(t).nm} をこのコンタクト中AP＋1000`,"n")}}}; // コルン B04093
DEF["0544"]={cutin:async(p,card,mine)=>{if(!myTurn(p)||!mine||!p.hand.length)return;if(!await yes(p,"ロバート・テイラー","手札を1枚リムーブして、レベル1につきAP＋1000しますか？",true))return;const [h]=await discard(p,1);if(h){const v=1000*(C(h).lv||0);mine.apC+=v;log(`　${C(mine).nm} をコンタクト中AP＋${v}`,"n")}}}; // ロバート・テイラー B05040
DEF["0610"]={abilities:[{label:"デッキの下に移す: ［バーボン］が出るまで公開して手札に",can:()=>true,aiCan:p=>myTurn(p),run:async(p,x)=>{l3_selfBottom(x);digToHand(p,exactName("バーボン"));return true}}]}; // 弁崎桐平 B05114
DEF["1041"]={leaveOppTurn:async p=>{if(p.field.some(y=>hasTrait(y,"黒ずくめの組織")))await rmChar(p,apLe(3000),"リムーブするキャラ（AP3000以下）")},hirameki:async o=>{if(o.field.some(y=>hasTrait(y,"黒ずくめの組織")))await rmChar(o,apLe(3000),"リムーブするキャラ（AP3000以下）")}}; // 毒島桐子 B09102
DEF["0935"]={onContact:async(p,self,ct)=>{if(!myTurn(p)||!partnerIs(p,"黒")||ct.a!==self)return;const t=ct.d;if(t&&isChar(t)&&opp(p).field.includes(t))removeCard(t,"効果",{by:p,effect:true})},hirameki:async o=>{if(o.deck.length)millSelf(o,5)}}; // 犯人 PR237
DEF["0719"]={endTurn:l3_endActivate((p,x)=>sleepC(x),y=>exactName("キャンティ")(y),"このキャラをスリープさせて、［キャンティ］をアクティブにしますか？")}; // コルン B06102
DEF["0828"]={abilities:[{label:"スリープ・リムーブエリアに移す: レベル5以上のキャラをスリープ",can:(p,x)=>x.st==="a",aiCan:p=>opp(p).field.some(y=>lvOf(y)>=5&&y.st==="a"),
  run:async(p,x)=>{sleepCost(x);l3_removeSelfCost(p,x);const t=await chooseChar(p,"スリープさせるキャラ（レベル5以上）",y=>lvOf(y)>=5&&y.st==="a");if(t)sleepC(t);return true}}]}; // テキーラ B07101
DEF["0836"]={enter:async p=>{if(!p.solved)return;await discard(p,1);drawN(p,1)}}; // キール PR202
