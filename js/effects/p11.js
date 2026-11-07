"use strict";
// カード個別効果（新弾 CT-P11「月下のSHOW TIME!」）。DEF["カードID"]={...}。共通の部品は core.js。
// 進める順番: レベル8 → MR → 7 → 6 → … → 1（事件は並行）。残りは node tools/coverage.js --set CT-P11

// --- 部品 ---
const evTot=p=>p.ev.length+opp(p).ev.length; // お互いの証拠の合計
const faceDownEv=p=>p.ev.filter(e=>!e.up);
// リムーブエリアのキャラをスリープ状態で登場させる
async function enterFromRmS(p,filter,title){
  const cs=p.rm.filter(y=>isChar(y)&&filter(y));if(!cs.length)return null;
  const [y]=await pickCards(p,title,"",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(!y)return null;await enterByEffect(p,y,"s");return y}
const isKomae=y=>isChar(y)&&lvOf(y)===4&&hasTrait(y,"少年探偵団"); // レベル4の［少年探偵団］
const colorAny=(y,...cs)=>cs.some(c=>hasColor(y,c));
const exactName=n=>y=>namesOf(y).includes(n);
// 同名のカード名のどれか
const anyExact=(...ns)=>y=>ns.some(n=>exactName(n)(y));

// --- レベル8 ---
DEF["1170"]={ // 江戸川コナン B11002
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||turnCount(self,"p11a")||!condOk("事件青＆白",p)||lvOf(y)<5||!colorAny(y,"青","白")||!oppHas(p,apLe(8000)))return;
    useTurn(self,"p11a");await rmChar(p,apLe(8000))},
  selfRemovedOwnTurn:async(p,x)=>{if(evTot(p)<5||!faceDownEv(p).length)return;
    if(!await yes(p,"江戸川コナン","裏向きの証拠を1つ表向きにして、リムーブエリアのレベル2以下の【青】か【白】のキャラをスリープ状態で登場させますか？",true))return;
    const e=faceDownEv(p).pop();e.up=true;log(`　${p.name} は裏向きの証拠を1つ表向きにした`,"n");
    await enterFromRmS(p,y=>lvOf(y)<=2&&colorAny(y,"青","白"),"スリープ状態で登場させるキャラ")}};
DEF["1171"]={ // 灰原哀 B11003
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||!partnerIs(p,"青")||turnCount(self,"p11a")||!isKomae(y)||!oppHas(p,apLe(8000)))return;
    useTurn(self,"p11a");await rmChar(p,apLe(8000))},
  abilities:[
    {label:"デッキの上から3枚をリムーブ: このキャラをレベル－4",turn1:true,can:p=>p.deck.length>3,
      run:async(p,x)=>{millSelf(p,3);x.lvT-=4;log(`　${C(x).nm} をターン終了時までレベル－4`,"n");return true},
      aiCan:p=>p.deck.length>12&&p.hand.some(y=>lvOf(y)<=p.file.length+4)},
    {label:"スリープ: レベル4の［少年探偵団］をAP＋2000",can:(p,x)=>x.st==="a"&&p.field.some(isKomae),
      run:async(p,x)=>{const [y]=await pickCards(p,"AP＋2000するキャラ","",p.field.filter(isKomae),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});
        if(!y)return false;sleepCost(x);apTurn(y,2000);return true},
      aiCan:(p,x)=>false}]};
DEF["1182"]={ // 毛利小五郎 B11014
  enter:async p=>{await enterFromRmS(p,y=>lvOf(y)<=4&&(exactName("妃英理")(y)||hasTrait(y,"毛利探偵事務所")),"スリープ状態で登場させるキャラ")}};
DEF["1186"]={ // 大岡紅葉 B11019
  enter:async(p,x)=>{if(!oppHas(p,lvLe(8)))return;
    if(!await yes(p,"大岡紅葉","このキャラをスリープさせて、相手のキャラにカードを裏向きでセットしますか？",()=>x.st==="a"))return;
    sleepC(x);const t=await chooseChar(p,"セットされるキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8);if(t)setTop(opp(p),t)},
  abilities:[{label:"裏向きのカードがセットされた相手のキャラをリムーブ",
    can:(p,x)=>partnerIs(p,"緑")&&turnCount(x,"p11b")<2&&opp(p).field.some(y=>faceDownSet(y).length&&!immune(p,y)),
    run:async(p,x)=>{useTurn(x,"p11b");const t=await chooseChar(p,"リムーブするキャラ（裏向きのカードがセット済み）",y=>isOpp(p,y)&&faceDownSet(y).length);
      if(!t)return true;rmBy(p,t);if(!opp(p).field.includes(t))setTop(p,x);return true},
    aiCan:(p,x)=>true}]};
DEF["1188"]={ // 服部平次 B11021（【事件緑＆赤】突撃は本体が判定）
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target||turnCount(self,"p11a")||apOf(target)>apOf(self)-4000||!oppHas(p,lvLe(7)))return;
    useTurn(self,"p11a");await rmChar(p,lvLe(7))}};
DEF["1197"]={ // 怪盗キッド B11031
  abilities:[
    {label:"手札を1枚リムーブ: アクティブにしてAP－2000、キャラを1枚スリープ",turn1:true,
      can:(p,x)=>condOk("事件探偵VS怪盗",p)&&evTot(p)>=5&&p.hand.length>=1,
      run:async(p,x)=>{await discard(p,1);activateC(x);apTurn(x,-2000);const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a"&&y!==x);if(t)sleepC(t);return true},
      aiCan:(p,x)=>x.st==="s"&&p.hand.length>=2},
    {label:"スリープ: 相手のスリープ状態のキャラとコンタクト",can:(p,x)=>x.st==="a"&&!x.fresh&&opp(p).field.some(y=>y.st==="s"),
      run:async(p,x)=>{const t=await chooseChar(p,"コンタクトする相手のキャラ（スリープ状態）",y=>isOpp(p,y)&&y.st==="s");if(!t)return false;
        sleepCost(x);log(`　${C(x).nm} と ${C(t).nm} のコンタクトが発生`);await contact(p,x,t);return true},
      aiCan:(p,x)=>opp(p).field.some(y=>y.st==="s"&&apOf(y)<=apOf(x))}]};
DEF["1198"]={ // 中森銀三 B11032
  handLevel:(p,x)=>condOk("事件青＆白",p)&&partnerIs(p,"白")&&evTot(p)>=5?Math.max(0,(C(x).lv||0)-1):null,
  enter:async(p,x)=>{const t=await chooseChar(p,"リムーブするキャラ（このキャラのAP以下）",y=>y!==x&&apOf(y)<=apOf(x));rmBy(p,t);
    if(p.file.length<=7)sleepC(x)}};
DEF["1218"]={ // 沖矢昴 B11053
  enter:async p=>{if(!partnerIs(p,"赤")||!p.rm.some(y=>hasColor(y,"緑")))return;
    const cs=opp(p).field.filter(y=>!immune(p,y));if(!cs.length)return;
    const ts=await pickCards(p,"AP－2000するキャラ（5枚まで）","",cs,{min:0,max:5,ai:c=>c});for(const y of ts)apTurn(y,-2000)},
  abilities:[{label:"AP6000以下のキャラをリムーブ",turn1:true,can:p=>condOk("事件緑＆赤",p)&&oppHas(p,apLe(6000)),
    run:async p=>{await rmChar(p,apLe(6000));return true},aiCan:p=>oppHas(p,apLe(6000))}],
  leaveOppTurn:async p=>{drawN(p,1);if(p.hand.length>=6)await discard(p,1)}};
DEF["1219"]={ // ジョディ・スターリング B11054
  abilities:[{label:"スリープ: 相手のAP8000以下をリムーブ",can:(p,x)=>condOk("事件緑＆赤",p)&&x.st==="a"&&oppHas(p,apLe(8000)),
    run:async(p,x)=>{const t=await chooseChar(p,"リムーブするキャラ（AP8000以下）",y=>isOpp(p,y)&&apOf(y)<=8000);if(!t)return false;sleepCost(x);
      const low=apOf(t)<=apOf(x)-4000;rmBy(p,t);
      if(low&&!opp(p).field.includes(t))await enterFromRmS(p,y=>lvOf(y)===2&&colorAny(y,"緑","赤"),"スリープ状態で登場させるキャラ");return true},
    aiCan:(p,x)=>oppHas(p,apLe(8000))}]};
DEF["1228"]={ // 宮野厚司 B11063
  lvSelf:p=>p.solved&&myTurn(p)?-1:0,
  abilities:[{label:"AP8000以下のキャラをリムーブ（スリープかスタン状態）",turn1:true,can:(p,x)=>x.st!=="a"&&oppHas(p,apLe(8000)),
    run:async p=>{await rmChar(p,apLe(8000));return true},aiCan:p=>oppHas(p,apLe(8000))}],
  leaveOppTurn:async p=>{if(!partnerIs(p,"赤"))return;
    const xs=p.deck.slice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const ok=xs.filter(anyExact("宮野エレーナ","宮野明美","宮野志保"));
    const [g]=await pickCards(p,"手札に加えるカード（宮野エレーナ・宮野明美・宮野志保）","",ok,{max:1,ai:c=>c.slice(0,1)});
    for(const y of xs){detach(y);if(y===g){p.hand.push(y);log(`　${p.name} は ${C(y).nm} を手札に加えた`)}else p.rm.push(y)}checkDeck(p)}};
DEF["1231"]={ // 高木渉 B11067（【パートナー黄】突撃は本体が判定）
  abilities:[{label:"佐藤美和子をスリープ: リムーブエリアのレベル2以下の佐藤美和子か高木渉を登場",turn1:true,
    can:p=>condOk("絆佐藤美和子",p)&&p.field.some(y=>exactName("佐藤美和子")(y)&&y.st==="a")&&p.rm.some(y=>isChar(y)&&lvOf(y)<=2&&anyExact("佐藤美和子","高木渉")(y)),
    run:async p=>{const [s]=await pickCards(p,"スリープさせる佐藤美和子","",p.field.filter(y=>exactName("佐藤美和子")(y)&&y.st==="a"),{min:1,max:1});
      if(!s)return false;sleepC(s);await enterFromRm(p,y=>lvOf(y)<=2&&anyExact("佐藤美和子","高木渉")(y),"登場させるキャラ");return true},
    aiCan:p=>p.field.length<4}]};
DEF["1237"]={ // 榎本梓 B11073
  enter:async p=>{const xs=p.deck.slice(0,2);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を公開: ${xs.map(y=>C(y).nm).join("、")}`,"n");
    const cs=xs.filter(isChar);const [g]=await pickCards(opp(p),"相手の手札に加えるキャラを選ぶ","公開されたキャラから1枚選びます。",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
    for(const y of xs){detach(y);if(y===g){p.hand.push(y);log(`　${p.name} は ${C(y).nm} を手札に加えた`)}else p.rm.push(y)}checkDeck(p);
    if(g&&hasTrait(g,"喫茶ポアロ")){const lv=lvOf(g);await rmChar(p,lvLe(lv),`リムーブするキャラ（レベル${lv}以下）`)}},
  abilities:[{label:"手札を1枚リムーブ: 突撃を得る",turn1:true,
    can:p=>p.hand.length>=1&&p.field.filter(y=>hasTrait(y,"喫茶ポアロ")).length>=4,
    run:async(p,x)=>{await discard(p,1);giveKw(x,"突撃");return true},aiCan:p=>p.hand.length>=3}]};
DEF["1246"]={ // バーボン B11083
  endTurn:async p=>{if(p.field.length>2||!p.hand.length||!p.rm.some(y=>isChar(y)&&lvOf(y)===2&&/【疾風】/.test(C(y).f||"")))return;
    if(!await yes(p,"バーボン","手札を1枚リムーブして、リムーブエリアの【疾風】を持つレベル2のキャラをスリープ状態で登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);await enterFromRmS(p,y=>lvOf(y)===2&&/【疾風】/.test(C(y).f||""),"スリープ状態で登場させるキャラ")},
  gale:async p=>{const up=p.ev.filter(e=>e.up);if(up.length){up[up.length-1].up=false;log(`　${p.name} は表向きの証拠を1つ裏向きにした`,"n")}},
  enter:async p=>{if(!partnerIs(p,"黒")||!condOk("事件黄＆黒",p)||p.deck.length<4)return;
    if(!await yes(p,"バーボン","デッキの上から3枚をリムーブしますか？",()=>p.deck.length>10))return;
    const xs=p.deck.slice(0,3);const gale=xs.some(y=>isChar(y)&&/【疾風】/.test(C(y).f||""));millSelf(p,3);if(gale)await rmChar(p,lvLe(8))}};
DEF["1249"]={ // ベルモット B11086
  enter:async p=>{if(partnerIs(p,"黒"))await rmChar(p,lvLe(8))},
  abilities:[{label:"スリープ: 【黒】のキャラを1枚リムーブし、そのレベル以下のスリープ状態のキャラをリムーブ",
    can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasColor(y,"黒")),
    run:async(p,x)=>{sleepCost(x);const cs=p.field.filter(y=>y!==x&&hasColor(y,"黒"));
      const [y]=await pickCards(p,"リムーブする自分の【黒】のキャラ（しなくてもよい）","",cs,{min:0,max:1,ai:c=>[]});
      if(!y)return true;const lv=lvOf(y);removeCard(y,"効果",{by:p,effect:true});await runQueue();
      await rmChar(p,z=>z.st==="s"&&lvOf(z)<=lv,`リムーブするスリープ状態のキャラ（レベル${lv}以下）`);return true},
    aiCan:(p,x)=>false}]};

// --- 事件 ---
const solvedDiscard={solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")}};
DEF["1257"]={...solvedDiscard, // ドライマティーニ B11094
  abilities:[{label:"裏向きの証拠3つを表に: レベル7以下の自分のキャラをリムーブして［黒ずくめの組織］を登場",turn1:true,
    can:p=>p.solved&&faceDownEv(p).length>=3,
    run:async p=>{if(!flipEvidence(p,3))return false;
      const [y]=await pickCards(p,"リムーブする自分のキャラ（レベル7以下・しなくてもよい）","",p.field.filter(lvLe(7)),{min:0,max:1,ai:c=>[]});
      if(!y)return true;removeCard(y,"効果",{by:p,effect:true});await runQueue();
      await enterFromRmS(p,z=>lvOf(z)<=3&&hasTrait(z,"黒ずくめの組織"),"スリープ状態で登場させるキャラ");return true},
    aiCan:p=>false}]};
DEF["1261"]={...solvedDiscard, // コナンVS怪盗キッド B11098
  abilities:[{label:"裏向きの証拠2つを表に: 自分のキャラをリムーブして相手のスリープ状態のキャラを手札に戻す",turn1:true,
    can:p=>p.solved&&(partnerIs(p,"青")||partnerIs(p,"白"))&&faceDownEv(p).length>=2,
    run:async p=>{if(!flipEvidence(p,2))return false;
      const [y]=await pickCards(p,"リムーブする自分のキャラ（しなくてもよい）","",p.field,{min:0,max:1,ai:c=>[]});
      if(!y)return true;removeCard(y,"効果",{by:p,effect:true});await runQueue();
      const t=await chooseChar(p,"手札に戻すキャラ（レベル7以下・MR以外のスリープ状態）",z=>isOpp(p,z)&&z.st==="s"&&lvOf(z)<=7&&!isMR(z));if(!t)return true;
      const o=opp(p);toHandFromField(t);const [d]=await discard(o,1);
      if(d&&idOf(d)!==idOf(t))await discard(o,1);return true},
    aiCan:p=>false}]};
DEF["1262"]={...solvedDiscard, // あんた何者や B11099
  abilities:[{label:"裏向きの証拠2つを表に: キャラをAP－3000",turn1:true,can:p=>p.solved&&faceDownEv(p).length>=2,
    run:async p=>{if(!flipEvidence(p,2))return false;const t=await chooseChar(p,"AP－3000するキャラ");if(t)apTurn(t,-3000);return true},
    aiCan:p=>oppHas(p,y=>true)}]};
