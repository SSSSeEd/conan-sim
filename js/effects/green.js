"use strict";
// カード個別効果（緑）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 緑（平次・和葉・紅葉） ---
DEF["0427"]={ // 「後ろの女に一言遺したろ思てなァ…」
  useBlock:p=>p.file.length>5?"FILEが6枚以上":null,
  event:async(p,x)=>{if(!partnerIs(p,"緑")||!p.solved){log("　条件（パートナー緑・解決編）を満たさないので効果なし","n");return}
    await rmChar(p,y=>apOf(y)>=7000,"リムーブするキャラ（AP7000以上）");await rmChar(p,apLe(5000),"リムーブするキャラ（AP5000以下）")},
  ai:p=>p.solved&&partnerIs(p,"緑")&&oppHas(p,y=>apOf(y)>=7000||apOf(y)<=5000)};
DEF["0419"]={ // 遠山和葉 B04018
  onAllyEnter:async(p,self,y)=>{if(y!==self&&!C(y).nm.includes("服部平次"))return;
    const t=await chooseChar(p,"ターン終了時まで元の能力を無効にするキャラ",z=>isOpp(p,z),{ai:cs=>cs.filter(z=>def0(z)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(t){t.negT=G.turnNo;log(`　${C(t).nm} はターン終了時まで元の能力を失う`,"n")}},
  leaveOppTurn:async p=>drawN(p,1),
  abilities:[{label:"【スリープ】手札1枚リムーブ: リムーブエリアのレベル5以下の［服部平次］を登場",
    can:(p,x)=>partnerIs(p,"緑")&&p.solved&&x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&C(y).nm.includes("服部平次")&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);await enterFromRm(p,y=>C(y).nm.includes("服部平次")&&lvOf(y)<=5,"登場させる［服部平次］");return true}}]};
DEF["0404"]={ // 服部平次 PR060
  enter:async(p,x)=>{if(!p.solved||opp(p).field.filter(y=>y.st!=="a").length<2)return;await rmChar(p,y=>y.st==="s"&&lvOf(y)<=7)}};
DEF["0652"]={ // ヘビ男 B06029
  enter:async p=>{if(!p.ev.length||!p.hand.length||!await yes(p,"登場時","証拠を1つ手札に加えて、手札から1枚を裏向きで証拠にしますか？",false))return;
    const [e]=await pickCards(p,"手札に加える証拠","",p.ev,{min:1,max:1,faceUp:false});if(!e)return;detach(e);p.hand.push(e);
    const [y]=await pickCards(p,"裏向きで証拠にするカード","",p.hand,{min:1,max:1});if(y){detach(y);y.up=false;p.ev.push(y);log(`　証拠を1枚入れ替えた`,"n")}}};
DEF["0532"]={ // 服部平蔵 B05028
  abilities:[{label:"セットされた裏向きのカードを1枚リムーブ: AP8000以下のキャラをリムーブ",turn1:true,can:p=>partnerIs(p,"緑")&&setCardsAll().length>0,aiCan:p=>oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(!await removeAnySet(p,"裏向きのカードをリムーブするキャラ"))return false;await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}},
    {label:"【スリープ】: 自分の［警察］と相手のキャラにデッキの上から1枚ずつセット",can:(p,x)=>x.st==="a"&&allChars().length>0,aiCan:p=>p.field.some(y=>hasTrait(y,"警察")),
    run:async(p,x)=>{sleepCost(x);const a=await chooseChar(p,"セットする自分の［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:cs=>cs.slice(0,1)});if(a)setTop(p,a);
      const b=await chooseChar(p,"セットする相手のキャラ",y=>isOpp(p,y));if(b)setTop(opp(p),b);return true}}]};
DEF["0533"]={ // 大岡紅葉 B05029
  abilities:[{label:"【スリープ】: 自分のキャラにデッキの上から1枚セット",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:p=>!myTurn(p)||p.field.every(y=>y.st!=="a"||!canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"セットするキャラ",y=>!isOpp(p,y),{ai:cs=>cs.slice(0,1)});if(t)setTop(p,t);return true}},
    {label:"セットされた裏向きのカードを2枚リムーブ: レベル7以下のキャラをリムーブ",turn1:true,can:p=>partnerIs(p,"緑")&&setCardsAll().reduce((n,y)=>n+faceDownSet(y).length,0)>=2,aiCan:p=>oppHas(p,lvLe(7)),
    run:async(p,x)=>{for(let i=0;i<2;i++)if(!await removeAnySet(p,`裏向きのカードをリムーブするキャラ（${i+1}枚目）`))return false;await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0729"]={ // 「助けて平次ィ!!!」
  event:async p=>{if(!await yes(p,"イベント","デッキの上から3枚をリムーブして、リムーブエリアのレベル6以下のキャラを登場させますか？",()=>p.deck.length>8))return;
    millSelf(p,3);await enterFromRm(p,y=>lvOf(y)<=6,"登場させるキャラ（レベル6以下）")},
  ai:p=>p.deck.length>8&&p.field.length<5};

// --- 緑（紅葉・伊織・大阪府警） ---
const IORI=named("伊織無我"),MOMI=named("大岡紅葉");
async function removeSets2(p){for(let i=0;i<2;i++)if(!await removeAnySet(p,`裏向きのカードをリムーブするキャラ（${i+1}枚目）`))return false;return true}
function rmToHand(p,y){if(!y)return;detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}
DEF["0167"]={ // 服部平次 D06003
  onAction:async(p,self,actor)=>{if(actor!==self||!partnerIs(p,"緑")||turnCount(self,"hei"))return;useTurn(self,"hei");await pickRmToHand(p,y=>/【カットイン】AP[＋+]/.test(C(y).ci||""),"手札に加える「【カットイン】AP＋」を持つカード")}};
DEF["0621"]={ // 伊織無我 PR136
  lpSelf:p=>condOk("絆大岡紅葉",p)?1:0,
  contactWin:async(p,x)=>{if(turnCount(x,"io"))return;useTurn(x,"io");const t=await chooseChar(p,"デッキの上から1枚を裏向きでセットするキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(ownerOf(t),t)}};
DEF["0749"]={ // 伊織無我 B07017
  apSelf:p=>condOk("絆大岡紅葉",p)?1000:0,
  contactWin:async p=>{await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"緑")&&(C(y).lv||0)>=6,"手札に加えるレベル6以上の【緑】のイベント")}};
DEF["0754"]={ // 沖田総司 B07022
  enter:async(p,x)=>{const y=await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"高校生"),"公開する［高校生］のキャラ",{ai:c=>myTurn(p)?c.slice().sort((a,b)=>colorsOf(C(b).c).some(ch=>ch!=="緑")-colorsOf(C(a).c).some(ch=>ch!=="緑")).slice(0,1):[]});
    if(!y)return;giveKw(x,"突撃");if(colorsOf(C(y).c).some(ch=>ch!=="緑"))apTurn(x,1000)}};
DEF["0834"]={ // 大滝悟郎 PR200
  kwSelf:p=>setTotal(p.field)>=2?["突撃"]:[],
  abilities:[{label:"［警察］にデッキの上から1枚セット",turn1:true,can:p=>p.deck.length>0&&p.field.some(y=>hasTrait(y,"警察")),
    run:async p=>{const t=await chooseChar(p,"セットする［警察］",y=>!isOpp(p,y)&&hasTrait(y,"警察"),{ai:cs=>cs.slice(0,1)});if(t)setTop(p,t);return true}}]};
DEF["0859"]={ // 大岡紅葉＆伊織無我 B08019
  onAllyEnter:async(p,self,y)=>{if(y===self||!partnerIs(p,"緑")||!myTurn(p)||turnCount(self,"mi")||!(IORI(y)||MOMI(y))||!oppHas(p,apLe(8000)))return;useTurn(self,"mi");await rmChar(p,z=>z!==self&&apLe(8000)(z))},
  abilities:[{label:"セットされた裏向きのカードを2枚リムーブ: 1枚引く",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&(IORI(y)||MOMI(y)))&&setTotal(allChars())>=2,aiCan:p=>setTotal(opp(p).field)>=1,
    run:async p=>{if(!await removeSets2(p))return false;drawN(p,1);return true}}]};
DEF["0863"]={ // 大岡紅葉 B08023
  enter:async p=>{const has=p.field.some(IORI);
    const v=p.cpu?(has?(myTurn(p)?2:1):3):await ask(`${p.name}: 大岡紅葉 登場時`,"1つ選んで行います",[{label:"［伊織無我］にセットしてAP＋2000",value:1,primary:true},{label:"［伊織無我］にセットして突撃",value:2},{label:"相手のキャラにセットしてスリープ",value:3}]);
    if(v===3){const t=await chooseChar(p,"セットしてスリープさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(t){setTop(opp(p),t);sleepC(t)}return}
    const t=await chooseChar(p,"［伊織無我］",y=>!isOpp(p,y)&&IORI(y),{ai:cs=>cs.slice(0,1)});if(!t)return;setTop(p,t);if(v===1)apTurn(t,2000);else giveKw(t,"突撃")}};
DEF["0865"]={ // 伊織無我 B08025
  abilities:[{label:"デッキの上から3枚リムーブ: ［大岡紅葉］か［伊織無我］ならAP8000以下をリムーブしてセット",turn1:true,can:p=>partnerIs(p,"緑")&&p.deck.length>3,aiCan:p=>p.deck.length>12&&oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(millSelf(p,3).some(y=>IORI(y)||MOMI(y))){await rmChar(p,y=>y!==x&&apLe(8000)(y));if(p.field.includes(x))setTop(p,x)}return true}}]};
DEF["0869"]={ // 小も大を兼ねる
  event:async p=>{if(!partnerIs(p,"緑")){log("　条件（パートナー緑）を満たさないので効果なし","n");return}
    const y=await enterFromRm(p,y=>IORI(y)&&lvOf(y)<=7,"登場させる［伊織無我］（レベル7以下）");
    if(y){const v=p.cpu?(opp(p).field.some(z=>z.st!=="a")?1:2):await ask(`${p.name}: 小も大を兼ねる`,`${C(y).nm} に与える能力`,[{label:"突撃［キャラ］",value:1,primary:true},{label:"アクティブ状態のキャラを指定してアクションできる",value:2}]);
      giveKw(y,v===1?"突撃［キャラ］":"アクティブ指定")}
    await pickRmToHand(p,y=>MOMI(y)&&lvOf(y)<=7,"手札に加える［大岡紅葉］（レベル7以下）")},
  ai:p=>partnerIs(p,"緑")&&p.rm.some(y=>IORI(y))};
DEF["0870"]={ // 執事になった理由
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠1つを表に: ［伊織無我］をAP＋2000",turn1:true,can:p=>p.solved&&p.ev.some(e=>!e.up)&&p.field.some(MOMI)&&p.field.some(IORI),aiCan:p=>myTurn(p)&&p.field.some(y=>IORI(y)&&y.st==="a"),
    run:async p=>{if(!flipEvidence(p,1))return false;const t=await chooseChar(p,"AP＋2000する［伊織無我］",y=>!isOpp(p,y)&&IORI(y),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(t)apTurn(t,2000);return true}}]};
DEF["0970"]={ // 伊織無我 B09026
  apSelf:p=>myTurn(p)&&condOk("絆大岡紅葉",p)?2000:0,
  onAllyContactWin:async(p,self,winner)=>{if(!IORI(winner)||turnCount(self,"io2"))return;const cs=p.rm.filter(y=>isChar(y)&&MOMI(y)&&lvOf(y)<=6);if(!cs.length)return;useTurn(self,"io2");
    const [y]=await pickCards(p,"スリープ状態で登場させる［大岡紅葉］","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s")}};
DEF["0971"]={ // 大岡紅葉 B09027
  abilities:[{label:"セットされた裏向きのカードか手札を1枚リムーブ: スリープ状態のキャラをスタン",turn1:true,can:p=>(setTotal(p.field)>0||p.hand.length>0)&&allChars().some(y=>y.st==="s"),aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)>=5),
    run:async p=>{if(setTotal(p.field)>0){const cs=p.field.filter(y=>faceDownSet(y).length);const [y]=await pickCards(p,"コスト: 裏向きのカードをリムーブするキャラ","",cs,{min:1,max:1});if(y)removeSetCost(p,y)}else await discard(p,1);
      const t=await chooseChar(p,"スタンさせるキャラ",y=>y.st==="s");if(t)stunC(t);return true}}]};
DEF["0968"]={ // 服部平蔵 B09024（他の［大阪府警］の現場リムーブ時: FX.onLeave）
  abilities:[{label:"【スリープ】［警察］を公開: 相手のレベル7以下をリムーブ",can:(p,x)=>partnerIs(p,"緑")&&x.st==="a"&&p.hand.some(y=>isChar(y)&&hasTrait(y,"警察")),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{if(!await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"警察"),"公開する［警察］",{must:true}))return false;sleepCost(x);
      const t=await chooseChar(p,"リムーブする相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(!t)return true;const sl=t.st==="s";rmBy(p,t);await runQueue();if(sl&&p.field.includes(x))setTop(p,x);return true}}]};
