"use strict";
// カード個別効果（青黒）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 青黒（灰原・シェリー・組織） ---
DEF["0929"]={ // 灰原哀＆シェリー B08093
  abilities:[{label:"【現場リムーブ時】を持つ【青】か【黒】のキャラを公開: レベル9以下をリムーブ",turn1:true,can:p=>p.hand.some(y=>isChar(y)&&hasLeave(y)&&(hasColor(y,"青")||hasColor(y,"黒"))),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=9),
    run:async(p,x)=>{if(!await revealFromHand(p,y=>isChar(y)&&hasLeave(y)&&(hasColor(y,"青")||hasColor(y,"黒")),"公開するキャラ",{must:true}))return false;await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}},
    {label:"【青】と【黒】のキャラを1枚ずつAP＋1000",turn1:true,partner:true,can:p=>p.field.length>0,aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara")),
    run:async p=>{for(const col of ["青","黒"]){const t=await chooseChar(p,`AP＋1000する【${col}】のキャラ`,y=>hasColor(y,col),{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>(b.st==="a")-(a.st==="a")).slice(0,1)});if(t)apTurn(t,1000)}return true}}],
  leaveOppTurn:async p=>{if(p.hand.length<=2)drawN(p,1)}};
DEF["0915"]={ // ピンガ B08079
  apSelf:p=>myTurn(p)?1000:0,
  leaveOppTurn:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"【スリープ】: AP8000以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&colorsOf(C(p.caseC).c).some(ch=>ch!=="黒")&&allChars().some(y=>y!==x&&apOf(y)<=8000),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=5),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["0919"]={ // ラム B08083
  leaveOppTurn:async p=>drawN(p,1),
  abilities:[{label:"【スリープ】: 手札から【現場リムーブ時】を持つレベル5以下のキャラを登場",can:(p,x)=>condOk("事件青＆黒",p)&&x.st==="a"&&p.field.length<5&&p.hand.some(y=>isChar(y)&&hasLeave(y)&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>hasLeave(y)&&lvOf(y)<=5);return true}}]};
DEF["0918"]={ // ピスコ B08082
  enter:async(p,x)=>{if(myTurn(p)&&await revealFromHand(p,y=>isChar(y)&&hasLeave(y),"公開する【現場リムーブ時】を持つキャラ"))giveKw(x,"突撃")},
  leaveOppTurn:async p=>{const f=y=>isChar(y)&&colorsOf(C(y).c).some(ch=>ch!=="黒");if(!p.hand.some(f)||!await yes(p,"ピスコ","手札の【黒】以外の色を持つキャラを1枚リムーブして、1枚引きますか？",true))return;
    await discard(p,1,"リムーブするキャラ",p,f);drawN(p,1)}};
DEF["0921"]={ // シェリー B08085
  leaveOppTurn:async p=>{if(!condOk("事件青＆黒",p))return;const e=opp(p).ev.find(z=>!z.up);if(e){e.up=true;log(`　${opp(p).name} の裏向きの証拠を1つ表向きにした`,"n")}}};
DEF["1038"]={ // バーボン B09099
  enter:async p=>{if(opp(p).refreshed){drawN(p,1);await discard(p,1)}else{const o=opp(p);const y=popDeck(o);if(y){o.rm.push(y);log(`　${o.name} のデッキの上の ${C(y).nm} をリムーブ`,"n");checkDeck(o)}}}};
