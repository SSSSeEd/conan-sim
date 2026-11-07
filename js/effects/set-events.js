"use strict";
// キャラにセットするイベント（かみなり斬り・せんぷう剣 など）。共通の部品は setEventOn と、DEF に書く次の4つ:
//   setAp(p,host)  セットされているキャラのAP（hooks.js の apBonus）
//   setKw(p,host)  セットされているキャラのキーワード（kwExtra。"突撃" "アクティブ指定" "必ずガード" など）
//   grants         セットされているキャラが持つ【宣言】（hooks.js の abilities）
//   setToRm(p,c,info) セットされていたこのイベントがリムーブエリアに置かれたとき（info.turn でどちらのターンか分かる）

// イベント x を自分の現場の条件に合うキャラ1枚にセットする。セット先がいなければイベントはリムーブエリアに残る
async function setEventOn(p,x,f=()=>true,title){
  const cs=p.field.filter(f);if(!cs.length){log(`　${C(x).nm} をセットできるキャラがいない`,"n");return null}
  const [h]=await pickCards(p,title||`${C(x).nm} をセットするキャラ`,"",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});
  if(!h)return null;detach(x);h.set=h.set||[];h.set.push({c:x,up:true});log(`　${C(x).nm} を ${C(h).nm} にセット`,"n");noteSetOn(p,h);await FX.onSet(p,h,x);return h}
const oppTurnOf=(p,info)=>info.turn!==p.idx;
const yaiba8=y=>lvOf(y)>=8&&hasTrait(y,"YAIBA");
// リムーブエリアにあるレベル5以下の［YAIBA］のキャラを1枚まで、スリープ状態で登場させる
async function yaibaFromRm(p){const cs=p.rm.filter(y=>isChar(y)&&lvOf(y)<=5&&hasTrait(y,"YAIBA"));
  const [y]=await pickCards(p,"スリープ状態で登場させる［YAIBA］（レベル5以下）","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(y)await enterByEffect(p,y,"s");return y}
const yaibaSet=h=>setEvents(h).filter(c=>hasTrait(c,"YAIBA")).length;
DEF["0667"]={ // 鉄刃 B06046（迅速は本文から）
  onSet:async(p,h,c)=>{if(!myTurn(p)||!hasTrait(c,"YAIBA")||turnCount(h,"jin")>=2)return;useTurn(h,"jin");activateC(h)},
  endTurn:async(p,x)=>{if(yaibaSet(x)<2||!p.hand.length||!p.rm.some(y=>isChar(y)&&lvOf(y)<=5&&hasTrait(y,"YAIBA")))return;
    if(!await yes(p,"鉄刃","手札を1枚リムーブして、リムーブエリアのレベル5以下の［YAIBA］をスリープ状態で登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await yaibaFromRm(p)}};
DEF["0668"]={ // 鉄刃 B06047（迅速は本文から）
  handLvAura:(p,self,x)=>p.hand.includes(x)&&C(x).t==="イベント"&&hasColor(x,"白")&&hasTrait(x,"YAIBA")?-1:0,
  onSet:async(p,h,c)=>{if(!myTurn(p)||!hasTrait(c,"YAIBA")||turnCount(h,"jin1"))return;useTurn(h,"jin1");await yaibaFromRm(p)}};

DEF["0683"]={ // かみなり斬り
  event:async(p,x)=>{await rmChar(p,apLe(8000));await runQueue();await setEventOn(p,x,yaiba8);millSelf(p,3)},
  ai:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4)};
DEF["0684"]={ // せんぷう剣
  event:async(p,x)=>{const t=await chooseChar(p,"手札に移す相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(t){toHandFromField(t);await runQueue()}
    await setEventOn(p,x,yaiba8)},
  setAp:p=>myTurn(p)?2000:0,
  ai:p=>oppHas(p,y=>lvOf(y)<=7&&lvOf(y)>=4)||p.field.some(yaiba8)};
DEF["0685"]={ // 刃新陰流風車
  event:async(p,x)=>{await setEventOn(p,x,yaiba8)},
  setKw:()=>["アクティブ指定"],
  setToRm:async(p,c,info)=>{if(oppTurnOf(p,info))await yaibaFromRm(p)},
  ai:p=>p.field.some(yaiba8)};
DEF["0245"]={ // 安室の愛車
  event:async(p,x)=>{if(await setEventOn(p,x,y=>lvOf(y)>=6))await rmChar(p,lvLe(6))},
  setToRm:async(p,c,info)=>{if(oppTurnOf(p,info))await pickRmToHand(p,y=>isChar(y)&&lvOf(y)<=5&&hasTrait(y,"警察"),"手札に加える［警察］（レベル5以下）")},
  ai:p=>p.field.some(y=>lvOf(y)>=6)};
const gale=y=>/【疾風】/.test(C(y).f||"");
const yk=y=>hasColor(y,"黄")||hasColor(y,"黒");
DEF["1244"]={ // 「まだ配属先は決まってないけどね…」
  event:async(p,x)=>{await setEventOn(p,x,y=>gale(y)&&lvOf(y)>=7&&yk(y))},
  setToRm:async(p,c,info)=>{if(oppTurnOf(p,info))await enterFromRm(p,y=>gale(y)&&lvOf(y)<=6&&yk(y),"登場させる【疾風】のキャラ（レベル6以下）")},
  ai:p=>p.field.some(y=>gale(y)&&lvOf(y)>=7&&yk(y))};
DEF["0185"]={ // ターボエンジン付きスケートボード
  event:async(p,x)=>{await setEventOn(p,x,y=>lvOf(y)<=7&&hasColor(y,"青"))},
  setKw:()=>["突撃"],
  ai:p=>p.field.some(y=>lvOf(y)<=7&&hasColor(y,"青")&&y.fresh&&y.st==="a")};
DEF["0201"]={ // 平次のバイク
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"緑")&&hasTrait(y,"探偵"))},
  setKw:()=>["突撃［キャラ］","アクティブ指定"],
  ai:p=>p.field.some(y=>hasColor(y,"緑")&&hasTrait(y,"探偵"))};
DEF["0298"]={ // 直球勝負
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"緑"))},
  setKw:()=>["必ずガード"],
  setAp:(p,h)=>G.contact&&(G.contact.a===h||G.contact.d===h)?2000:0,
  ai:p=>p.field.some(y=>hasColor(y,"緑"))};
