"use strict";
// カード個別効果（黒）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 黒試し（ジン） ---
DEF["0722"]={ // ブラックインパクト！
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: 相手は手札を1枚リムーブ",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&opp(p).hand.length>0,
    run:async p=>{if(!flipEvidence(p,3))return false;const o=opp(p);
      const [y]=await discard(o,1,"手札をリムーブ（ブラックインパクト）",o);if(y&&lvOf(y)<=6)drawN(p,1);return true}}],
  eraseEvidence:true};
DEF["0604"]={ // バーボン B05108
  actionEnd:async(p,x)=>{if(!partnerIs(p,"黒")||p.file.length<6||!p.field.includes(x))return;
    if(!p.hand.some(y=>C(y).t==="キャラ"&&hasColor(y,"黒")&&lvOf(y)<=7))return;
    if(!await yes(p,"アクション終了時","このバーボンをリムーブして、手札からレベル7以下の【黒】のキャラを登場させますか？",true))return;
    removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();
    await playFromHand(p,y=>hasColor(y,"黒")&&lvOf(y)<=7)}};
DEF["0716"]={ // ラム
  enter:async(p,x)=>{if(!condOk("事件黒",p)||!partnerIs(p,"黒"))return;const t=await chooseChar(p,"登場時: リムーブするキャラ（レベル8以下）",y=>lvOf(y)<=8&&y!==x);if(t)removeCard(t,"効果",{by:p,effect:true})}};
DEF["1141"]={ // スコッチ
  cutin:async(p,card,mine)=>{if(C(mine).ci&&hasColor(mine,"黒"))drawN(p,1)},
  // 【パートナー黒】【自分ターン中】【ターン1】このキャラのコンタクト中に［バーボン］のカットインを使ったら、アクティブにする（以後このコンタクトではカットイン不可）
  onCutinInContact:async(p,self,card)=>{if(!card||!C(card).nm.includes("バーボン")||!partnerIs(p,"黒")||G.turn!==p.idx||turnCount(self,"scotch"))return;
    useTurn(self,"scotch");self.st="a";useTurn(self,"noCutin");log(`　${C(self).nm}: バーボンのカットインでアクティブに（このコンタクト中はもうカットインできない）`,"n")}};
DEF["1142"]={ // ジン B10087
  onCutinInContact:async(p,self)=>{drawN(p,1)},
  enter:async(p,x)=>{if(!partnerIs(p,"黒"))return;
    if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（【カットイン】を持つ【黒】が3枚ならコンタクトを発生）",()=>p.deck.length>8))return;
    const xs=p.deck.slice(0,3);for(const y of xs){detach(y);p.rm.push(y)}checkDeck(p);
    log(`　リムーブ: ${xs.map(y=>C(y).nm).join("、")}`,"n");
    const n=xs.filter(y=>C(y).ci&&hasColor(y,"黒")).length;
    if(n>=3&&G.turn===p.idx){const t=await chooseChar(p,"コンタクトさせる相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.slice().sort((a,b)=>(apOf(a)<=apOf(x)?0:1)-(apOf(b)<=apOf(x)?0:1)||lvOf(b)-lvOf(a)).slice(0,1)});
      if(t){log(`　${C(x).nm} と ${C(t).nm} のコンタクトが発生`);await contact(p,x,t)}}}};
DEF["0360"]={ // バーボン B03111
  enter:async(p,x)=>{if(!partnerIs(p,"黒"))return;const o=opp(p);
    log(`　${o.name} は手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`);
    const cs=o.hand.filter(y=>lvOf(y)<=7);if(!cs.length)return;
    const [y]=await pickCards(p,"相手の手札からリムーブさせるカード（レベル7以下）","",cs,{min:0,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(o,b)-aiCardValue(o,a)).slice(0,1)});
    if(y){detach(y);o.rm.push(y);log(`　${o.name} の手札の ${C(y).nm} をリムーブ`)}}};
DEF["0721"]={ // カッ
  event:async(p,x)=>{if(!partnerIs(p,"黒")||!p.solved){log("　条件（パートナー黒・解決編）を満たさないので効果なし","n");return}
    for(const y of allChars())removeCard(y,"カッ",{by:p,effect:true});
    const top=[...p.file].reverse().filter(y=>y!==p.partner).slice(0,2);
    for(const y of top){p.file.splice(p.file.indexOf(y),1);p.hand.push(y)}log(`　FILEの上から${top.length}枚を手札に（FILE ${p.file.length}枚）`);
    p.noHint=true;await runQueue();
    await playFromHand(p,y=>hasColor(y,"黒")&&lvOf(y)<=7)},
  ai:p=>p.solved&&partnerIs(p,"黒")&&opp(p).field.length>=p.field.length+1};
DEF["1163"]={ // ベルモット PR310
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒"))return;const t=await chooseChar(p,"リムーブするキャラ（レベル7以下・スリープ状態）",y=>lvOf(y)<=7&&y.st!=="a");if(t)removeCard(t,"ベルモット",{by:p,effect:true})}};
DEF["0365"]={ // ウォッカ B03116
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒")||!p.rm.includes(x))return;
    if(!await yes(p,"ウォッカ","リムーブエリアからスリープ状態で登場させて、カードを1枚引きますか？",true))return;
    await enterByEffect(p,x,"s");drawN(p,1)}};
DEF["0925"]={ // ヘルエンジェル
  leaveOppTurn:async(p,x)=>{drawN(p,1);if(p.solved)await discard(p,1)}};

// --- 黒（ジン・ウォッカ・ベルモット） ---
DEF["0382"]={ // 「見ィーつけた♪」
  event:async p=>{const f=y=>isChar(y)&&!!C(y).ci&&hasColor(y,"黒")&&lvOf(y)<=6;
    const got=await pickCards(p,"手札に加えるキャラ（2枚まで）","",p.rm.filter(f),{max:2,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,2)});
    for(const y of got){detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`)}
    const y=await playFromHand(p,f,"【カットイン】を持つレベル6以下の【黒】を登場");if(y)giveKw(y,"突撃［キャラ］")},
  ai:p=>p.rm.some(y=>isChar(y)&&!!C(y).ci&&hasColor(y,"黒"))};
DEF["0391"]={ // ベルモット D07008
  abilities:[{label:"【スリープ】このキャラをデッキの下へ: 手札からレベル5以下を登場して突撃",can:(p,x)=>x.st==="a"&&p.hand.some(y=>isChar(y)&&lvOf(y)<=5),aiCan:p=>myTurn(p)&&p.hand.some(y=>isChar(y)&&lvOf(y)>=4&&lvOf(y)<=5),
    run:async(p,x)=>{x.st="s";toDeckBottom(x);const y=await playFromHand(p,y=>lvOf(y)<=5);if(y)giveKw(y,"突撃");return true}}]};
DEF["0602"]={ // ジン＆ウォッカ B05106
  onOppRemoved:async(q,self)=>{if(!partnerIs(q,"黒")||!myTurn(q)||turnCount(self,"jv")||!oppHas(q,apLe(8000)))return;useTurn(self,"jv");await rmChar(q,z=>z!==self&&apLe(8000)(z))},
  abilities:[{label:"自分のレベル8以下のキャラをリムーブ: 1枚引く",turn1:true,partner:true,can:p=>p.field.some(y=>lvOf(y)<=8),aiCan:p=>p.field.some(y=>lvOf(y)<=8&&hasLeave(y)&&!myTurn(p))||p.field.some(y=>idOf(y)==="0603"),
    run:async(p,x)=>{const cs=p.field.filter(y=>lvOf(y)<=8);const [c]=await pickCards(p,"リムーブする自分のキャラ（レベル8以下）","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>(idOf(b)==="0603")-(idOf(a)==="0603")||lvOf(a)-lvOf(b))});if(!c)return false;
      removeCard(c,"自分の効果",{by:p,effect:true});await runQueue();drawN(p,1);return true}}]};
DEF["0603"]={ // ウォッカ B05107
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒")||!p.rm.includes(x))return;if(!await yes(p,"ウォッカ","リムーブエリアからスリープ状態で登場させますか？",true))return;await enterByEffect(p,x,"s")}};
DEF["0717"]={ // ベルモット B06100
  enter:async p=>{const f=y=>!!C(y).ci&&hasColor(y,"黒");if(!p.hand.some(f)||!await yes(p,"登場時","手札の【カットイン】を持つ【黒】を1枚リムーブして、2枚引きますか？",()=>p.hand.filter(f).length>=2||p.hand.length<=2))return;
    await discard(p,1,"リムーブする【カットイン】を持つ【黒】",p,f);drawN(p,2)}};
DEF["0720"]={ // ジン B06103
  handAbilities:[{label:"自分の【黒】のキャラをリムーブ: このキャラをスリープ状態で登場",can:(p,x)=>p.solved&&p.field.some(y=>hasColor(y,"黒"))&&!(p.banNm&&p.banNm.t===G.turnNo),aiCan:p=>p.field.some(y=>hasColor(y,"黒")&&lvOf(y)<=4),
    run:async(p,x)=>{const cs=p.field.filter(y=>hasColor(y,"黒"));const [c]=await pickCards(p,"リムーブする自分の【黒】のキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;
      removeCard(c,"自分の効果",{by:p,effect:true});await runQueue();await enterByEffect(p,x,"s");p.banNm={t:G.turnNo,nm:"ジン"};log("　このターン、［ジン］は使用も登場もできない","n");return true}}]};
DEF["0821"]={ // ジン B07094
  endTurn:async(p,x)=>{const own=p.field.filter(y=>lvOf(y)<=7);if(!partnerIs(p,"黒")||!p.hand.length||!own.length||!opp(p).field.length)return;
    if(!await yes(p,"ジン ターン終了時","手札を1枚と自分のレベル7以下のキャラを1枚リムーブして、キャラを1枚リムーブしますか？",()=>opp(p).field.some(y=>lvOf(y)>=6)&&own.some(y=>lvOf(y)<=4)))return;
    await discard(p,1);const [c]=await pickCards(p,"リムーブする自分のキャラ（レベル7以下）","",own,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(c){removeCard(c,"自分の効果",{by:p,effect:true});await runQueue()}
    await rmChar(p,y=>y!==x)}};
DEF["0822"]={ // ベルモット B07095
  enter:async(p,x)=>{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a"&&y!==x);if(t)sleepC(t)},
  abilities:[{label:"【スリープ】: スリープ状態のレベル6以下をリムーブ",can:(p,x)=>partnerIs(p,"黒")&&x.st==="a"&&allChars().some(y=>y.st==="s"&&lvOf(y)<=6),aiCan:p=>oppHas(p,y=>y.st==="s"&&lvOf(y)<=6),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y.st==="s"&&lvOf(y)<=6);return true}}]};

// --- 黒（バーボン・ベルモット） ---
DEF["0085"]={cutin:async p=>{drawN(p,2);await discard(p,1)}}; // ウォッカ B01097
DEF["0483"]={cutin:async p=>{if(p.solved)drawN(p,1)}}; // バーボン PR087（【黒】にカットインならAP＋1000: ownCutinAp）
const BO=y=>isChar(y)&&hasTrait(y,"黒ずくめの組織");
DEF["0715"]={ // ベルモット＆シェリー B06098
  abilities:[{label:"AP8000以下のキャラをリムーブ",turn1:true,can:(p,x)=>p.field.filter(BO).length>=2&&allChars().some(y=>y!==x&&apOf(y)<=8000),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=4),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}},
    {label:"デッキの上から3枚見て【カットイン】を持つ【黒】を手札に",turn1:true,partner:true,can:p=>p.field.filter(BO).length>=2&&p.deck.length>0,aiCan:p=>p.deck.length>8,
    run:async p=>{const xs=p.deck.slice(0,3);log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
      const [y]=await pickCards(p,"手札に加える【カットイン】を持つレベル8以下の【黒】（1枚まで）","残りはリムーブエリアへ",xs.filter(y=>!!C(y).ci&&hasColor(y,"黒")&&(C(y).lv||0)<=8),{max:1,ai:c=>c.slice(0,1)});
      for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);if(y&&(C(y).lv||0)>=4)await discard(p,1);return true}}]};
