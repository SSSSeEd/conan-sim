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

// --- 青黒新一蘭（毛利小五郎 D10011／ベルモット B10095／工藤新一NYの事件 B10100P） ---
const SHINRAN=named("工藤新一","毛利蘭");
DEF["0841"]={ // 毛利小五郎 D10011
  abilities:[{label:"【FILE6】このキャラをデッキの下へ: リムーブエリアのレベル7以下の［毛利蘭］を登場",turn1:true,
    can:(p,x)=>p.file.length>=6&&p.rm.some(y=>isChar(y)&&named("毛利蘭")(y)&&lvOf(y)<=7),aiCan:p=>p.field.length<5&&myTurn(p),
    run:async(p,x)=>{toDeckBottom(x);await enterFromRm(p,y=>named("毛利蘭")(y)&&lvOf(y)<=7,"登場させる［毛利蘭］（レベル7以下）");return true}}]};
DEF["1150"]={ // ベルモット B10095
  enter:async p=>{if(p.solved||!condOk("事件青＆黒",p)||!p.field.some(SHINRAN))return;const t=await chooseChar(p,"スリープさせるキャラ");if(t)sleepC(t)},
  abilities:[{label:"【スリープ】このキャラをリムーブエリアへ: リムーブエリアのレベル5以下の［工藤新一］か［毛利蘭］を登場してAP＋1000",
    can:(p,x)=>partnerIs(p,"青")&&p.solved&&p.file.length>=5&&x.st==="a"&&p.rm.some(y=>isChar(y)&&SHINRAN(y)&&lvOf(y)<=5),aiCan:p=>myTurn(p)&&p.field.length<5,
    run:async(p,x)=>{sleepCost(x);removeCard(x,"コスト");await runQueue();
      const y=await enterFromRm(p,y=>SHINRAN(y)&&lvOf(y)<=5,"登場させる［工藤新一］か［毛利蘭］（レベル5以下）");if(y)apTurn(y,1000);return true}}]};
DEF["1155"]={ // 工藤新一NYの事件 B10100P
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠1つを表に＋手札1枚リムーブ: ［工藤新一］か［毛利蘭］にレベル6以上のアクティブ指定とコンタクト勝利ドローを与える",turn1:true,
    can:p=>p.solved&&evDown(p)>=1&&p.hand.length>0&&p.field.some(SHINRAN),aiCan:p=>myTurn(p)&&p.field.some(y=>SHINRAN(y)&&y.st==="a")&&opp(p).field.some(y=>y.st==="a"&&lvOf(y)>=6),
    run:async p=>{if(!flipEvidence(p,1))return false;await discard(p,1);
      const t=await chooseChar(p,"能力を与える［工藤新一］か［毛利蘭］",y=>!isOpp(p,y)&&SHINRAN(y),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});
      if(t){giveKw(t,"アクティブ指定Lv6");giveKw(t,"勝利ドロー")}return true}}]};
