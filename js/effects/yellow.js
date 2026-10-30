"use strict";
// カード個別効果（黄）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 黄（警察） ---
DEF["0619"]={ // 諸伏景光 SP009
  enter:async(p,x)=>{if(!partnerIs(p,"黄")||!myTurn(p))return;
    if(!await yes(p,"登場時","デッキの上から3枚をリムーブしますか？（［警察］のキャラがあれば突撃）",()=>p.deck.length>10))return;
    if(millSelf(p,3).some(y=>isChar(y)&&hasTrait(y,"警察")))giveKw(x,"突撃")}};
DEF["0706"]={ // 萩原千速 B06087
  contactWin:async(p,x)=>{if(p.file.length<6||!p.field.includes(x))return;const f=y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=7&&!C(y).nm.includes("萩原千速");
    if(!p.hand.some(f)||!await yes(p,"萩原千速","このキャラをリムーブして、手札からレベル7以下の［警察］を登場させますか？",true))return;
    removeCard(x,"自分の効果",{by:p,effect:true});await runQueue();await playFromHand(p,f)}};
DEF["0941"]={ // 横溝重悟 D11014
  gale:async(p,x)=>{const t=await chooseChar(p,"疾風: AP－1000するキャラ");if(t)apTurn(t,-1000)},
  abilities:[{label:"【スリープ】手札1枚リムーブ: リムーブエリアのレベル5以下の［警察］を登場",
    can:(p,x)=>x.st==="a"&&p.hand.length>0&&p.rm.some(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);await discard(p,1);const y=await enterFromRm(p,y=>hasTrait(y,"警察")&&lvOf(y)<=5,"登場させる［警察］（レベル5以下）");
      if(y&&C(y).nm.includes("萩原千速"))drawN(p,1);return true}}]};
DEF["1011"]={ // 萩原千速 B09071
  gale:async(p,x)=>{giveKw(x,"アクティブ指定");log(`　（相手のアクティブ状態のキャラを指定してアクションできる）`,"n")},
  contactWin:async(p,x)=>{if(turnCount(x,"chi"))return;useTurn(x,"chi");const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};
DEF["1014"]={ // 松田陣平 B09074
  gale:async p=>drawN(p,1),
  enter:async p=>{await searchTop(p,4,y=>isChar(y)&&/【疾風】/.test(C(y).f||""),1,"【疾風】を持つキャラを1枚まで手札に",1)}};
DEF["1015"]={ // 宮本由美 B09075
  gale:async p=>{if(p.solved)await enterFromRm(p,y=>hasTrait(y,"警察")&&lvOf(y)<=6,"登場させる［警察］（レベル6以下）")},
  abilities:[{label:"【スリープ】: ［警察］のキャラをAP＋2000",can:(p,x)=>x.st==="a"&&allChars().some(y=>hasTrait(y,"警察")),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"AP＋2000する［警察］",y=>hasTrait(y,"警察"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,2000);return true}}]};
DEF["0808"]={ // 風見裕也 B07080
  enter:async(p,x)=>{await rmChar(p,y=>y!==x&&lvLe(7)(y))},
  abilities:[{label:"【スリープ】レベル7以下の［警視庁］をデッキの下へ: キャラをリムーブ",
    can:(p,x)=>partnerIs(p,"黄")&&p.file.length>=5&&x.st==="a"&&p.field.some(y=>hasTrait(y,"警視庁")&&lvOf(y)<=7),aiCan:p=>opp(p).field.some(y=>lvOf(y)>=7),
    run:async(p,x)=>{const cs=p.field.filter(y=>hasTrait(y,"警視庁")&&lvOf(y)<=7);
      const [c]=await pickCards(p,"コスト: デッキの下に移す［警視庁］","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;
      sleepCost(x);toDeckBottom(c);await rmChar(p,()=>true);return true}}]};
DEF["0703"]={ // 安室透＆榎本梓 B06084
  enter:async(p,x)=>{if(!partnerIs(p,"黄"))return;const o=opp(p);log(`　${o.name} は手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`);await rmChar(p,y=>y!==x&&lvLe(9)(y))},
  abilities:[{label:"1枚引いて〚捜査1〛",turn1:true,partner:true,can:p=>p.deck.length>1,
    run:async p=>{drawN(p,1);if(investigate(p,1).some(y=>(C(y).lv||0)<=7))await discard(p,1);return true}}]};

// --- 黄単佐藤高木 ---
const SATO=named("佐藤美和子","高木渉");
const allSato=p=>p.field.length>0&&p.field.every(SATO);
const apLeSelf=x=>y=>y!==x&&apOf(y)<=apOf(x);
DEF["0899"]={ // 佐藤美和子＆高木渉 B08062
  onAllyEnter:async(p,self,y)=>{if(y===self||!partnerIs(p,"黄")||!myTurn(p)||turnCount(self,"st")||!SATO(y))return;if(!oppHas(p,apLe(8000)))return;useTurn(self,"st");await rmChar(p,z=>z!==self&&apLe(8000)(z))},
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&allSato(q)?1000:0,partnerToo:true};
DEF["0455"]={ // 佐藤美和子 B04069
  lpSelf:p=>p.field.filter(y=>hasTrait(y,"警察")).length>=3?1:0,
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&named("高木渉")(y)&&condOk("絆高木渉",q)?1000:0,
  enter:async(p,x)=>{if(partnerIs(p,"黄")&&p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察")).length>=3)await rmChar(p,y=>y!==x&&lvLe(8)(y))}};
DEF["0910"]={ // 高木渉 B08073
  endTurn:async(p,x)=>{if(condOk("絆佐藤美和子",p)&&allSato(p)&&x.st!=="a")activateC(x)},
  abilities:[{label:"【スリープ】: このキャラのAP以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&allChars().some(apLeSelf(x)),aiCan:(p,x)=>oppHas(p,y=>apLeSelf(x)(y)&&lvOf(y)>=5)&&!canAct(x,p,"chara"),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,apLeSelf(x));return true}}]};
DEF["1125"]={ // 高木渉 B10069
  lpSelf:p=>partnerIs(p,"黄")&&condOk("絆佐藤美和子",p)?1:0,
  abilities:[{label:"手札の［佐藤美和子］か［高木渉］をリムーブ: このキャラのAP以下をリムーブして1枚引く",turn1:true,can:p=>p.hand.some(SATO),aiCan:(p,x)=>oppHas(p,y=>apLeSelf(x)(y)&&lvOf(y)>=5),
    run:async(p,x)=>{await discard(p,1,"リムーブする［佐藤美和子］か［高木渉］",p,SATO);await rmChar(p,apLeSelf(x));drawN(p,1);return true}}]};
DEF["0456"]={ // 高木渉 B04070
  abilities:[{label:"［佐藤美和子］をスリープ＋手札1枚リムーブ: アクティブにする",turn1:true,noAi:true,
    can:(p,x)=>condOk("絆佐藤美和子",p)&&x.st!=="a"&&p.hand.length>0&&p.field.some(y=>y.st==="a"&&named("佐藤美和子")(y)),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&named("佐藤美和子")(y));const [c]=await pickCards(p,"コスト: スリープさせる［佐藤美和子］","",cs,{min:1,max:1});if(!c)return false;
      sleepC(c);await discard(p,1);activateC(x);return true}}]};
DEF["0810"]={ // 高木渉 B07082
  enter:async(p,x)=>{if(p.field.some(y=>y!==x&&lvOf(y)>=7&&hasTrait(y,"警視庁"))){const cs=p.rm.filter(y=>isChar(y)&&named("佐藤美和子")(y)&&lvOf(y)<=5);
    const [y]=await pickCards(p,"スリープ状態で登場させる［佐藤美和子］","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s")}}};
DEF["1131"]={apAura:(q,self,y)=>G.turn===q.idx&&y!==self&&q.field.includes(y)&&hasColor(y,"黄")&&hasTrait(y,"警視庁")&&condOk("絆高木渉",q)?1000:0}; // 佐藤美和子 B10075
DEF["0909"]={ // 佐藤美和子 B08072
  enter:async(p,x)=>{if(condOk("絆高木渉",p)&&p.solved&&allSato(p))await rmChar(p,apLeSelf(x))}};
DEF["1020"]={apAura:(q,self,y)=>G.turn!==q.idx&&q.field.includes(y)&&named("佐藤美和子")(y)&&condOk("絆佐藤美和子",q)?1000:0}; // 高木渉 B09080
DEF["1019"]={ // 佐藤美和子 B09079
  enter:async p=>{const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [y]=await pickCards(p,"手札に加える［高木渉］（1枚まで）","残りはリムーブエリアへ",xs.filter(named("高木渉")),{max:1,ai:c=>c.slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p)}};
DEF["0908"]={ // 佐藤正義 B08071
  abilities:[{label:"このキャラをリムーブ: デッキの上から4枚見て［佐藤美和子］を手札に",can:p=>p.deck.length>0,aiCan:p=>myTurn(p)&&!p.hand.some(named("佐藤美和子")),
    run:async(p,x)=>{removeCard(x,"コスト");await runQueue();await lookTop(p,4,named("佐藤美和子"),{title:"［佐藤美和子］を1枚まで手札に"});return true}}],
  cutin:async(p,card,mine)=>{if(mine&&named("佐藤美和子")(mine))drawN(p,1)}};
DEF["0913"]={ // 揺れる警視庁 1200万人の人質
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠2つを表に＋キャラ1枚をデッキの下へ: レベル4以下の［佐藤美和子］か［高木渉］をスリープで登場",turn1:true,
    can:p=>p.solved&&p.field.length>=2&&p.ev.filter(e=>!e.up).length>=2&&p.rm.some(y=>isChar(y)&&SATO(y)&&lvOf(y)<=4),aiCan:p=>p.field.length<5&&allSato(p),
    run:async p=>{const [c]=await pickCards(p,"コスト: デッキの下に移すキャラ","",allChars(),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>aiScoreTarget(p,b)-aiScoreTarget(p,a)).slice(0,1)});if(!c)return false;
      if(!flipEvidence(p,2))return false;toDeckBottom(c);if(!allSato(p))return true;
      const cs=p.rm.filter(y=>isChar(y)&&SATO(y)&&lvOf(y)<=4);const [y]=await pickCards(p,"スリープ状態で登場させるキャラ","",cs,{ai:c=>c.slice(0,1)});if(y)await enterByEffect(p,y,"s");return true}}]};

// --- 黄単長野県警 ---
const NAGANO=y=>isChar(y)&&hasTrait(y,"長野県警");
DEF["0234"]={ // 上原由衣 B02073
  abilities:[{label:"【スリープ】このキャラをリムーブ: ［長野県警］に迅速を与える",can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"長野県警")),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.fresh&&hasTrait(y,"長野県警")&&!canAct(y,p,"chara")),
    run:async(p,x)=>{const t=await chooseChar(p,"迅速を与える［長野県警］",y=>y!==x&&!isOpp(p,y)&&hasTrait(y,"長野県警"),{ai:cs=>cs.filter(y=>y.fresh).slice(0,1)});x.st="s";removeCard(x,"コスト");await runQueue();if(t)giveKw(t,"迅速");return true}}]};
DEF["0500"]={ // 大和敢助 D09004
  lpSelf:p=>myTurn(p)&&condOk("絆諸伏高明",p)?1:0,
  enter:async(p,x)=>{drawN(p,1);const [y]=await discard(p,1);if(y&&NAGANO(y))await rmChar(p,z=>z!==x&&apLe(8000)(z))}};
DEF["0509"]={ // 空城の計
  event:async p=>{const y=await enterFromRm(p,y=>hasTrait(y,"長野県警")&&lvOf(y)<=5,"登場させる［長野県警］（レベル5以下）");if(y)giveKw(y,"突撃")},
  ai:p=>p.field.length<5&&p.rm.some(y=>NAGANO(y)&&lvOf(y)<=5)};
DEF["0510"]={ // 死亡の館、赤い壁
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: ［長野県警］に突撃［キャラ］",turn1:true,can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&p.field.some(y=>hasTrait(y,"長野県警")),
    aiCan:p=>myTurn(p)&&p.field.some(y=>y.fresh&&y.st==="a"&&hasTrait(y,"長野県警")&&!canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"),
    run:async p=>{if(!flipEvidence(p,3))return false;const t=await chooseChar(p,"突撃［キャラ］を与える［長野県警］",y=>hasTrait(y,"長野県警"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.fresh).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0585"]={ // 諸伏高明 B05087
  onRmLeave:async(p,self,y)=>{if(!partnerIs(p,"黄")||!myTurn(p)||turnCount(self,"kom")||!NAGANO(y)||!oppHas(p,apLe(7000)))return;useTurn(self,"kom");await rmChar(p,z=>z!==self&&apLe(7000)(z))},
  endTurn:async p=>{const cs=p.rm.filter(y=>NAGANO(y)&&lvOf(y)<=6);if(!cs.length)return;
    const [y]=await pickCards(p,"ターン終了時: 手札に加える［長野県警］（レベル6以下）","",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    if(!y)return;detach(y);p.hand.push(y);log(`　${C(y).nm} を手札に`);await runQueue();if(p.hand.length>=6)await discard(p,1)}};
DEF["0586"]={ // 大和敢助 B05088
  apSelf:p=>myTurn(p)&&condOk("絆上原由衣",p)?1000:0,
  onRmLeave:async(p,self,y)=>{if(!myTurn(p)||turnCount(self,"yam")||!NAGANO(y))return;useTurn(self,"yam");const t=await chooseChar(p,"AP－1000するキャラ");if(t)apTurn(t,-1000)},
  abilities:[{label:"リムーブエリアの［長野県警］をデッキの下へ: 突撃を得る",turn1:true,can:p=>partnerIs(p,"黄")&&p.rm.some(NAGANO),aiCan:(p,x)=>myTurn(p)&&x.fresh&&x.st==="a"&&!canAct(x,p,"chara"),
    run:async(p,x)=>{const [y]=await pickCards(p,"コスト: デッキの下に移す［長野県警］","",p.rm.filter(NAGANO),{min:1,max:1});if(!y)return false;detach(y);p.deck.push(y);await runQueue();giveKw(x,"突撃");return true}}]};
DEF["0534"]={ // 遠山銀司郎 B05030
  apSelf:(p,x)=>myTurn(p)?1000*(x.set||[]).filter(s=>!s.under).length:0,
  enter:async(p,x)=>setTop(p,x)};

// --- 黄（公安） ---
DEF["0233"]={ // 降谷零 B02072
  abilities:[{label:"【スリープ】: 〚捜査X〛して、発見したレベルの合計以下をリムーブ",turn1:true,can:(p,x)=>x.st==="a"&&p.field.some(y=>hasTrait(y,"警察")),aiCan:p=>opp(p).field.length>0,
    run:async(p,x)=>{sleepCost(x);const n=p.field.filter(y=>hasTrait(y,"警察")).length;const s=investigate(p,n).reduce((a,y)=>a+(C(y).lv||0),0);
      await rmChar(p,y=>y!==x&&lvOf(y)<=s,`リムーブするキャラ（レベル${s}以下）`);return true}}]};
DEF["0911"]={ // 降谷零 B08074
  enter:async(p,x)=>{const o=opp(p);const ts=[...new Set([...o.deck,...o.hand,...o.field,...o.rm].flatMap(y=>(C(y).ct||"").split(",").filter(Boolean)))];if(!ts.length)return;
    let t;if(p.cpu){const cnt={};for(const y of [...o.field,...o.rm])for(const k of (C(y).ct||"").split(",").filter(Boolean))cnt[k]=(cnt[k]||0)+1;t=ts.sort((a,b)=>(cnt[b]||0)-(cnt[a]||0))[0]}
    else t=await ask(`${p.name}: 降谷零 登場時`,"指定する〚特徴〛",ts.slice(0,12).map((k,i)=>({label:k,value:k,primary:!i})));
    log(`　［${t}］を指定`,"n");const n=investigate(p,3).filter(y=>hasTrait(y,t)).length;
    if(n>=1)giveKw(x,"突撃［キャラ］");if(n>=2)giveKw(x,"突撃");if(n>=3)giveKw(x,"迅速")}};
