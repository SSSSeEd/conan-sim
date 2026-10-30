"use strict";
// カード個別効果（赤）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 赤（FBI・赤井家） ---
DEF["0438"]={ // 赤井秀一 B04046
  lvAura:(q,self,y)=>G.turn===q.idx&&opp(q).field.includes(y)?-1:0,
  enter:async p=>{drawN(p,1);await playFromHand(p,y=>hasTrait(y,"FBI")&&lvOf(y)<=6,"レベル6以下の［FBI］を登場")},
  abilities:[{label:"［FBI］に「レベル7以下とコンタクトしたら両方リムーブ」を与える",turn1:true,can:p=>p.field.some(y=>hasTrait(y,"FBI")),
    aiCan:p=>p.field.some(y=>hasTrait(y,"FBI")&&y.st==="a"&&canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"&&lvOf(y)>=5&&lvOf(y)<=7),
    run:async p=>{const t=await chooseChar(p,"能力を与える［FBI］",y=>!isOpp(p,y)&&hasTrait(y,"FBI"),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>lvOf(a)-lvOf(b)).slice(0,1)});
      if(t){giveKw(t,"相打ち7")}return true}}]};
DEF["0886"]={ // アンドレ・キャメル B08048
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target)return;target.lvT=(target.lvT||0)-1;log(`　${C(target).nm} をターン終了時までレベル－1（Lv${lvOf(target)}）`,"n");
    if(lvOf(target)<=6){self.apA=(self.apA||0)+3000;log(`　${C(self).nm} はアクション終了時までAP＋3000`,"n")}},
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&hasTrait(y,"FBI")))giveKw(x,"突撃")}};
DEF["0320"]={ // 赤井秀一 B03066
  enter:async(p,x)=>{if(!oppHas(p,y=>lvOf(y)<=7))return;if(!await yes(p,"登場時","相手に証拠を1つ与えて、レベル7以下のキャラをリムーブしますか？",()=>opp(p).ev.length<4))return;
    gainEv(opp(p),1);await rmChar(p,y=>y!==x&&lvLe(7)(y))}};
DEF["0321"]={ // 沖矢昴 B03067
  apSelf:p=>partnerIs(p,"赤")&&myTurn(p)?1000:0,
  abilities:[{label:"レベル7以上の［赤井秀一］か［ライ］をリムーブ: アクティブにする",turn1:true,noAi:true,
    can:(p,x)=>partnerIs(p,"赤")&&x.st!=="a"&&p.field.some(y=>named("赤井秀一","ライ")(y)&&lvOf(y)>=7),
    run:async(p,x)=>{const cs=p.field.filter(y=>named("赤井秀一","ライ")(y)&&lvOf(y)>=7);const [c]=await pickCards(p,"コスト: リムーブするキャラ","",cs,{min:1,max:1});if(!c)return false;
      removeCard(c,"コスト");await runQueue();activateC(x);return true}}]};
DEF["1000"]={ // 羽田秀𠮷 B09058
  enter:async(p,x)=>{const f=y=>hasTrait(y,"赤井家")&&lvOf(y)<=6;if(!p.hand.length||!p.rm.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、リムーブエリアのレベル6以下の［赤井家］を登場させますか？",true))return;
    sleepC(x);await discard(p,1);await enterFromRm(p,f,"登場させる［赤井家］（レベル6以下）")},
  abilities:[{label:"他の［赤井家］をスリープ: 1枚引く",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家")),aiCan:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家")&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y!==x&&y.st==="a"&&hasTrait(y,"赤井家"));const [c]=await pickCards(p,"コスト: スリープさせる［赤井家］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);drawN(p,1);return true}}]};

// --- 赤単ハンドレス（手札2枚以下・宮野家） ---
const handLe=(p,n=2)=>p.hand.length<=n;
const lv7Count=p=>p.field.filter(y=>lvOf(y)===7).length;
const solvedLv=n=>({lvSelf:p=>p.solved?n:0}); // 【解決編】現場にいるこのキャラをレベル＋N
DEF["0794"]={ // 世良真純＆メアリー B07065
  abilities:[{label:"手札1枚リムーブ: キャラをリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&p.hand.length>0&&allChars().some(y=>y!==x),aiCan:p=>oppHas(p,y=>lvOf(y)>=6),
    run:async(p,x)=>{await discard(p,1);await rmChar(p,y=>y!==x);return true}},
    {label:"1枚引く（手札2枚以下）",turn1:true,partner:true,can:p=>handLe(p),run:async p=>{drawN(p,1);return true}}]};
DEF["0796"]={ // 沖矢昴 B07067
  enter:async(p,x)=>{if(partnerIs(p,"赤")&&opp(p).hand.length>=p.hand.length)await rmChar(p,y=>y!==x&&lvLe(8)(y))},
  abilities:[{label:"レベル6以上の【赤】をスリープ: レベル7以下をリムーブ",turn1:true,
    can:(p,x)=>handLe(p)&&x.st!=="a"&&p.field.some(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6),aiCan:(p,x)=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)&&p.field.some(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&hasColor(y,"赤")&&lvOf(y)>=6);const [c]=await pickCards(p,"コスト: スリープさせる【赤】のキャラ","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0798"]={ // 本堂瑛海 B07069
  abilities:[{label:"レベル8以下をリムーブ（手札2枚以下）",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&handLe(p)&&allChars().some(y=>y!==x&&lvOf(y)<=8),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=8),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(8)(y));return true}},
    {label:"【スリープ】手札1枚とFILEの上1枚をリムーブ: リムーブエリアのレベル7以下の【赤】を登場",turn1:true,
    can:(p,x)=>p.file.length>=8&&x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasColor(y,"赤")&&lvOf(y)<=7),aiCan:p=>p.field.length<5,
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const top=[...p.file].reverse().find(y=>y!==p.partner);if(top){p.file.splice(p.file.indexOf(top),1);p.rm.push(top);log(`　FILEの上の ${C(top).nm} をリムーブ`,"n")}
      await enterFromRm(p,y=>hasColor(y,"赤")&&lvOf(y)<=7,"登場させる【赤】のキャラ（レベル7以下）");return true}}]};
DEF["0797"]={ // 羽田秀𠮷 B07068
  enter:async(p,x)=>{const f=y=>isChar(y)&&hasColor(y,"赤")&&lvOf(y)<=5;if(!partnerIs(p,"赤")||!p.hand.length||!p.rm.some(f))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、リムーブエリアのレベル5以下の【赤】をスリープ状態で登場させますか？",true))return;
    sleepC(x);await discard(p,1);const cs=p.rm.filter(f);const [y]=await pickCards(p,"登場させる【赤】のキャラ（レベル5以下）","",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(y&&await enterByEffect(p,y,"s")&&handLe(p)){activateC(y);activateC(x)}}};
DEF["0885"]={ // 沖矢昴 B08047
  endTurn:async p=>{if(p.hand.length<2)drawN(p,2-p.hand.length)},
  abilities:[{label:"【スリープ】手札が2枚になるまでリムーブ: キャラをリムーブ",can:(p,x)=>partnerIs(p,"赤")&&x.st==="a"&&allChars().some(y=>y!==x),aiCan:p=>p.hand.length<=3&&oppHas(p,y=>lvOf(y)>=6),
    run:async(p,x)=>{sleepCost(x);if(p.hand.length>2)await discard(p,p.hand.length-2);await rmChar(p,y=>y!==x);return true}}]};
DEF["0894"]={ // 宮野厚司 B08056
  abilities:[{label:"【スリープ】: 手札からレベル7以下の［宮野エレーナ］［宮野志保］［宮野明美］を登場",
    can:(p,x)=>p.file.length>=5&&x.st==="a"&&p.field.length<5&&p.hand.some(y=>isChar(y)&&lvOf(y)<=7&&named("宮野エレーナ","宮野志保","宮野明美")(y)),
    run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>lvOf(y)<=7&&named("宮野エレーナ","宮野志保","宮野明美")(y));return true}}]};
DEF["0896"]={ // 宮野志保 B08058
  endTurn:async p=>{if(lv7Count(p)<3)return;drawN(p,1);const t=await chooseChar(p,"スタンさせる相手のキャラ",y=>isOpp(p,y));if(t)stunC(t)},
  enter:async(p,x)=>{const f=y=>y!==x&&y.st!=="a"&&lvOf(y)<=8;if(p.file.length<8||!p.hand.length||!oppHas(p,f))return;
    if(!await yes(p,"登場時","このキャラをスリープさせ手札を1枚リムーブして、スリープかスタン状態のレベル8以下をデッキの下に移しますか？",true))return;
    sleepC(x);await discard(p,1);await bottomChar(p,f)}};
DEF["0799"]={ // 新出智明 B07070
  enter:async(p,x)=>{if(!handLe(p))return;const t=await chooseChar(p,"AP＋1000と突撃を与える【赤】のキャラ（レベル7以上）",y=>!isOpp(p,y)&&hasColor(y,"赤")&&lvOf(y)>=7,{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});
    if(t){apTurn(t,1000);giveKw(t,"突撃")}}};
DEF["0895"]={ // 宮野エレーナ B08057
  ...solvedLv(2),
  abilities:[{label:"【スリープ】デッキの上から9枚リムーブ: Lv5・4・1をデッキの下へ、3枚なら相手のキャラをデッキの下へ",turn1:true,
    can:(p,x)=>p.solved&&x.st==="a"&&lv7Count(p)>=3&&p.deck.length>9,aiCan:p=>p.deck.length>18&&opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);millSelf(p,9);let n=0;
      for(const lv of [5,4,1]){const cs=p.rm.filter(y=>(C(y).lv||0)===lv);const [y]=await pickCards(p,`デッキの下に移すレベル${lv}のカード`,"",cs,{max:1,ai:c=>c.slice(0,1)});if(y){detach(y);p.deck.push(y);n++}}
      log(`　リムーブエリアから${n}枚をデッキの下へ`,"n");if(n===3)await bottomChar(p,y=>isOpp(p,y));return true}}]};
DEF["1055"]={...solvedLv(2),enter:async(p,x)=>{if(lv7Count(p)>=3)giveKw(x,"突撃［事件］")}}; // 宮野明美 PR264
DEF["0888"]={ // 宮野明美 B08050
  ...solvedLv(3),
  enter:async p=>{const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const fam=named("諸星大","宮野志保","宮野エレーナ","宮野厚司");
    const [y]=await pickCards(p,"手札に加えるカード（1枚まで）","残りはリムーブエリアへ",xs,{max:1,ai:c=>c.slice().sort((a,b)=>(fam(b)-fam(a))||aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);
    if(y&&!fam(y))await discard(p,1)}};
DEF["1118"]=solvedLv(5); // 宮野明美 B10059
DEF["1117"]={}; // 世良真純 B10058（カットイン: ownCutinAp）
DEF["1120"]={ // 骨董盆は隠せない
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"手札1枚とデッキの上2枚をリムーブ: AP＋2000か1枚引く",turn1:true,can:p=>p.solved&&p.hand.length>0&&p.deck.length>2,
    aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara"))&&p.hand.length>=2,
    run:async p=>{await discard(p,1);millSelf(p,2);
      const v=p.cpu?(handLe(p)&&!p.field.some(y=>y.st==="a")?2:1):await ask(`${p.name}: 骨董盆は隠せない`,"1つ選んで行います",[{label:"キャラ1枚をAP＋2000",value:1,primary:true},{label:"1枚引く（手札2枚以下）",value:2}]);
      if(v===2){if(handLe(p))drawN(p,1)}else{const t=await chooseChar(p,"AP＋2000するキャラ",()=>true,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,2000)}return true}}]};

// --- 赤単赤井家・FBI ---
DEF["0401"]={enter:async(p,x)=>{if(p.field.some(y=>y!==x&&(C(y).nm.includes("沖矢昴")||hasTrait(y,"赤井家"))))giveKw(x,"突撃")}}; // 世良真純 PR043
DEF["0568"]={ // 赤井務武 B05068
  enter:async(p,x)=>{if(!partnerIs(p,"赤")||!myTurn(p))return;if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（［赤井家］のキャラがあれば突撃）",()=>p.deck.length>10))return;
    if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"赤井家")))giveKw(x,"突撃")}};
DEF["0440"]={ // 羽田秀𠮷 B04048
  enter:async p=>{if(!partnerIs(p,"赤"))return;const n=Math.max(0,7-p.hand.length);if(!n)return;drawN(p,n);
    const back=await pickCards(p,`デッキの下に移すカード（${n}枚）`,"選んだカードはシャッフルしてデッキの下へ",p.hand,{min:n,max:n,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b)).slice(0,n)});
    for(const y of shuffle(back)){detach(y);p.deck.push(y)}log(`　手札${back.length}枚をデッキの下へ`,"n")},
  abilities:[{label:"カード名を指定し、デッキの上から2枚見て手札に",turn1:true,can:p=>p.deck.length>0,
    run:async p=>{const names=[...new Set(p.deck.map(y=>C(y).nm))];let nm;
      if(p.cpu){const cnt={};for(const y of p.deck)cnt[C(y).nm]=(cnt[C(y).nm]||0)+1;nm=names.sort((a,b)=>cnt[b]-cnt[a])[0]}
      else{const opts=names.map(n=>p.deck.find(y=>C(y).nm===n));const [y]=await chooseCards(`${p.name}: カード名を指定`,"指定するカード名のカードを選びます（デッキの並びは分かりません）",opts,{min:1,max:1,okLabel:"指定"});nm=y&&C(y).nm}
      if(!nm)return false;log(`　［${nm}］を指定`,"n");await lookTop(p,2,y=>C(y).nm===nm,{title:`［${nm}］を1枚まで手札に`});return true}}]};
DEF["0698"]={ // 羽田秀𠮷 B06078
  abilities:[{label:"レベル6以上の［赤井家］をスリープ＋デッキの上から3枚リムーブ: ［赤井家］が落ちたらAP8000以下をリムーブ",turn1:true,
    can:p=>p.deck.length>3&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6),aiCan:p=>p.deck.length>12&&oppHas(p,apLe(8000))&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&hasTrait(y,"赤井家")&&lvOf(y)>=6);const [c]=await pickCards(p,"コスト: スリープさせる［赤井家］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"赤井家")))await rmChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["0700"]={ // 世良真純 B06080
  leaveOppTurn:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"レベル7以下をリムーブ（スリープかスタン状態のとき）",turn1:true,can:(p,x)=>x.st!=="a"&&allChars().some(y=>y!==x&&lvOf(y)<=7),aiCan:p=>oppHas(p,y=>lvOf(y)>=4&&lvOf(y)<=7),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(7)(y));return true}}]};
DEF["0696"]={ // ジェイムズ・ブラック B06076
  enter:async p=>{if(!p.solved)return;const t=await chooseChar(p,"手札に移す相手のキャラ（レベル5以下）",y=>isOpp(p,y)&&lvOf(y)<=5);if(t)toHandFromField(t)},
  abilities:[{label:"【スリープ】: 相手は手札を1枚リムーブ",can:(p,x)=>x.st==="a"&&opp(p).hand.length>=4,aiCan:(p,x)=>!canAct(x,p,"chara"),run:async(p,x)=>{sleepCost(x);const o=opp(p);await discard(o,1,"手札をリムーブ",o);return true}}]};

// --- 赤（FBI・赤井家 その2） ---
DEF["0697"]={ // ジョディ・スターリング B06077
  actionEnd:async(p,x)=>{const f=y=>hasTrait(y,"FBI")&&lvOf(y)<=6;if(p.file.length<6||!p.field.includes(x)||!p.hand.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"アクション終了時","このキャラをリムーブして、手札からレベル6以下の［FBI］を登場させますか？",true))return;removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();await playFromHand(p,f)}};
DEF["0996"]={ // 赤井秀一&世良真純 B09054
  abilities:[{label:"AP9000以下をリムーブ",turn1:true,can:(p,x)=>p.field.filter(y=>hasTrait(y,"赤井家")).length>=3&&allChars().some(y=>y!==x&&apOf(y)<=9000),aiCan:p=>oppHas(p,y=>apOf(y)<=9000&&lvOf(y)>=5),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&apLe(9000)(y));return true}},
    {label:"［赤井家］に「スリープ状態でもガードできる」を与える",turn1:true,partner:true,can:p=>p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&!canAct(y,p,"chara")),
    run:async p=>{const t=await chooseChar(p,"能力を与える［赤井家］",y=>!isOpp(p,y)&&y.st==="a"&&hasTrait(y,"赤井家"),{ai:cs=>cs.sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t){t.guardT=G.turnNo+1;log(`　${C(t).nm} は相手のターン終了時までスリープ状態でもガードできる`,"n")}return true}}]};
DEF["0795"]={ // 赤井秀一 B07066
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||turnCount(self,"ak")||!hasTrait(y,"赤井家")||lvOf(y)>7||!oppHas(p,apLe(8000)))return;useTurn(self,"ak");await rmChar(p,z=>z!==self&&apLe(8000)(z))},
  abilities:[{label:"［赤井家］をスリープ: デッキの上から3枚見て［赤井家］を手札に",turn1:true,can:p=>p.deck.length>0&&p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")),aiCan:p=>p.field.some(y=>y.st==="a"&&hasTrait(y,"赤井家")&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&(y===x||hasTrait(y,"赤井家")));const [c]=await pickCards(p,"コスト: スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>canAct(a,p,"chara")-canAct(b,p,"chara"))});if(!c)return false;
      sleepC(c);await searchTop(p,3,y=>isChar(y)&&hasTrait(y,"赤井家"),1,"［赤井家］のキャラを1枚まで手札に",1);return true}}]};
DEF["0997"]={ // 世良真純 B09055
  enter:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(7)(y))},
  abilities:[{label:"【スリープ】手札の［赤井秀一］をリムーブ: このキャラをリムーブして［赤井秀一&世良真純］を登場",
    can:(p,x)=>partnerIs(p,"赤")&&p.file.length>=8&&x.st==="a"&&p.hand.some(named("赤井秀一"))&&p.rm.some(y=>isChar(y)&&idOf(y)==="0996"),
    run:async(p,x)=>{sleepCost(x);await discard(p,1,"リムーブする［赤井秀一］",p,named("赤井秀一"));removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();
      await enterFromRm(p,y=>idOf(y)==="0996","登場させる［赤井秀一&世良真純］");return true}}]};
DEF["0884"]={ // 赤井秀一＆ジョディ・スターリング B08046
  abilities:[{label:"レベル9以下をリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"赤")&&p.field.filter(y=>hasTrait(y,"FBI")).length>=2&&allChars().some(y=>y!==x&&lvOf(y)<=9),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=9),
    run:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}},
    {label:"手札の［FBI］をリムーブ: 1枚引く（レベル8以上ならもう1枚）",turn1:true,partner:true,can:p=>p.hand.some(y=>isChar(y)&&hasTrait(y,"FBI")),aiCan:p=>p.hand.some(y=>isChar(y)&&hasTrait(y,"FBI")&&lvOf(y)>=8&&lvOf(y)>p.file.length+2),
    run:async p=>{const [y]=await discard(p,1,"リムーブする［FBI］",p,y=>isChar(y)&&hasTrait(y,"FBI"));drawN(p,y&&(C(y).lv||0)>=8?2:1);return true}}]};
DEF["0933"]={ // メアリー PR235
  enter:async p=>{const f=y=>isChar(y)&&hasColor(y,"赤")&&hasTrait(y,"赤井家");if(!p.hand.some(f)||!await yes(p,"登場時","手札の【赤】の［赤井家］を1枚リムーブして、2枚引きますか？",()=>p.hand.filter(f).length>=2))return;
    await discard(p,1,"リムーブする［赤井家］",p,f);drawN(p,2)}};
