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

// --- レベル7 ---
DEF["1172"]={ // 工藤新一 B11004（【事件青＆白】【パートナー青】突撃は本体が判定）
  enter:async(p,x)=>{if(!p.field.some(y=>y!==x&&hasTrait(y,"探偵")))return;
    const y=await enterFromRmS(p,z=>lvOf(z)<=2&&exactName("毛利蘭")(z),"スリープ状態で登場させる［毛利蘭］（レベル2以下）");
    if(y&&evTot(p)<=4)await discard(p,1)}};
DEF["1174"]={ // 阿笠博士 B11006
  abilities:[{label:"スリープ＋デッキの上から3枚をリムーブ: レベル7以下のキャラをリムーブ",
    can:(p,x)=>x.st==="a"&&p.deck.length>3&&p.field.some(isKomae),aiCan:p=>p.deck.length>12&&oppHas(p,lvLe(7)),
    run:async(p,x)=>{sleepCost(x);millSelf(p,3);await rmChar(p,lvLe(7));return true}}]};
DEF["1178"]={ // 江戸川コナン B11010
  abilities:[
    {label:"解決編: デッキの上から3枚をリムーブ: このキャラをレベル－3",turn1:true,can:(p,x)=>p.solved&&p.deck.length>3,aiCan:p=>false,
      run:async(p,x)=>{millSelf(p,3);x.lvT-=3;log(`　${C(x).nm} をターン終了時までレベル－3`,"n");return true}},
    {label:"スリープ: 手札からレベル4以下の［少年探偵団］を登場",can:(p,x)=>x.st==="a"&&p.field.length<5&&p.hand.some(y=>isChar(y)&&lvOf(y)<=4&&hasTrait(y,"少年探偵団")),
      aiCan:p=>p.field.length<4,
      run:async(p,x)=>{sleepCost(x);await playFromHand(p,y=>lvOf(y)<=4&&hasTrait(y,"少年探偵団"),"登場させる［少年探偵団］（レベル4以下）");return true}}]};
DEF["1189"]={ // 遠山和葉 B11022（【事件緑＆赤】突撃は本体が判定）
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target||turnCount(self,"p11k")||!condOk("事件緑＆赤",p)||apOf(target)>apOf(self)-4000)return;
    useTurn(self,"p11k");await enterFromRmS(p,y=>lvOf(y)===2&&colorAny(y,"緑","赤"),"スリープ状態で登場させるキャラ（レベル2の【緑】か【赤】）")}};
DEF["1199"]={ // 黒羽快斗 B11033
  enter:async(p,x)=>{if(!condOk("事件青＆白",p)||!partnerIs(p,"白")||!p.field.some(y=>y!==x&&hasTrait(y,"探偵")))return;
    if(x.st==="a")sleepC(x);
    if(!p.hand.length||!p.rm.some(y=>isChar(y)&&lvOf(y)<=5&&colorAny(y,"青","白")&&hasTrait(y,"高校生")))return;
    if(!await yes(p,"黒羽快斗","手札を1枚リムーブして、リムーブエリアのレベル5以下の【青】か【白】の［高校生］を登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);const y=await enterFromRm(p,z=>lvOf(z)<=5&&colorAny(z,"青","白")&&hasTrait(z,"高校生"),"登場させるキャラ");
    if(y&&exactName("中森青子")(y))drawN(p,1)}};
DEF["1201"]={ // 白馬探 B11035
  lpSelf:p=>condOk("事件青＆白",p)&&myTurn(p)&&evTot(p)>=5?1:0,
  abilities:[{label:"スリープ: レベル7以下のキャラをリムーブ",
    can:(p,x)=>condOk("事件青＆白",p)&&x.st==="a"&&p.field.some(y=>y!==x&&(hasTrait(y,"探偵")||hasTrait(y,"高校生")||hasTrait(y,"怪盗"))),
    aiCan:p=>oppHas(p,lvLe(7)),run:async(p,x)=>{sleepCost(x);await rmChar(p,lvLe(7));return true}}]};
DEF["1221"]={ // 羽田秀𠮷 B11056
  abilities:[
    {label:"スリープ: このキャラのAP以下のキャラをリムーブ",can:(p,x)=>condOk("事件緑＆赤",p)&&x.st==="a",aiCan:(p,x)=>oppHas(p,y=>apOf(y)<=apOf(x)),
      run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&apOf(y)<=apOf(x));return true}},
    {label:"このキャラをスタン: キャラをAP－2000",can:(p,x)=>partnerIs(p,"赤")&&x.st==="s",aiCan:()=>false,
      run:async(p,x)=>{stunC(x);const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000);return true}}]};
DEF["1229"]={ // レイチェル・浅香 B11064（【事件緑＆赤】突撃は本体が判定）
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target||apOf(target)>apOf(self)-4000)return;drawN(p,1)},
  abilities:[{label:"手札を1枚リムーブ: キャラをAP－2000",can:p=>p.hand.length>=1,aiCan:p=>p.hand.length>=3&&oppHas(p,y=>true),
    run:async p=>{await discard(p,1);const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000);return true}}]};
DEF["1235"]={ // 千葉和伸 B11071
  abilities:[{label:"他のレベル7以下の［警視庁］のアクティブ状態のキャラをスタン: そのレベル以下のキャラをリムーブ",turn1:true,
    can:(p,x)=>partnerIs(p,"黄")&&p.field.some(y=>y!==x&&y.st==="a"&&lvOf(y)<=7&&hasTrait(y,"警視庁")),aiCan:p=>false,
    run:async(p,x)=>{const [s]=await pickCards(p,"スタンさせる［警視庁］のキャラ（レベル7以下）","",p.field.filter(y=>y!==x&&y.st==="a"&&lvOf(y)<=7&&hasTrait(y,"警視庁")),{min:1,max:1});
      if(!s)return false;const lv=lvOf(s);stunC(s);await rmChar(p,lvLe(lv),`リムーブするキャラ（レベル${lv}以下）`);return true}}]};

// --- レベル6 ---
DEF["1173"]={ // 毛利蘭 B11005（【パートナー青】突撃は本体が判定）
  apSelf:p=>condOk("事件青＆白",p)&&myTurn(p)&&evTot(p)>=5?3000:0};
DEF["1179"]={ // 小林澄子 B11011
  enter:async(p,x)=>{if(!p.field.some(y=>y!==x&&hasTrait(y,"少年探偵団")))return;drawN(p,2);await discard(p,1)},
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||turnCount(self,"p11c")||!isChar(y)||lvOf(y)>4||!hasTrait(y,"少年探偵団"))return;
    useTurn(self,"p11c");const t=await chooseChar(p,"スリープさせるキャラ",z=>z.st==="a");if(t)sleepC(t)}};
DEF["1180"]={ // 日原誠人 B11012（現場以外では［工藤新一］扱いは core.js の ALIAS_OFF、ミスリード2は本体）
  abilities:[{label:"アクティブ状態の［工藤新一］をスタン: レベル6以下のキャラをリムーブ",turn1:true,
    can:p=>p.field.some(y=>y.st==="a"&&named("工藤新一")(y)),aiCan:p=>oppHas(p,lvLe(6)),
    run:async p=>{const [s]=await pickCards(p,"スタンさせる［工藤新一］","",p.field.filter(y=>y.st==="a"&&named("工藤新一")(y)),{min:1,max:1});
      if(!s)return false;stunC(s);await rmChar(p,lvLe(6));return true}}]};
// 自分の現場にいる【白】のキャラにデッキの上から1枚を裏向きでセットする（工藤優作）
async function setOnWhite(p){const t=await chooseChar(p,"セットされる自分の【白】のキャラ",y=>!isOpp(p,y)&&hasColor(y,"白"),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(p,t)}
DEF["1203"]={ // 工藤優作 B11037
  enter:async p=>{if(myTurn(p))await setOnWhite(p)},
  disguise:async p=>{if(myTurn(p))await setOnWhite(p);
    else if(p.deck.length){const y=p.deck.pop();p.hand.push(y);log(`　${p.name} はデッキの下から1枚を手札に加えた`,"n")}}};
DEF["1211"]={ // 茶木神太郎 B11045
  onOppDisguise:async(p,self)=>{if(turnCount(self,"p11d")||self.st==="a")return;useTurn(self,"p11d");activateC(self)},
  hirameki:async o=>{opp(o).noDisg=G.turnNo;log(`　${opp(o).name} はこのターン中【変装】を使用できない`,"n")}};
DEF["1220"]={ // 世良真純 B11055
  enter:async(p,x)=>{if(!p.field.some(y=>y!==x&&colorsOf(C(y).c).some(ch=>ch!=="赤")))return;
    const f=y=>isOpp(p,y)&&lvOf(y)<=6;const can2=p.solved&&x.st==="a"&&oppHas(p,f);
    const v=p.cpu?(can2?2:1):await ask(`${p.name}: 世良真純 登場時`,"1つ選んで行います",[{label:"突撃［事件］を得る",value:1,primary:true},
      ...(p.solved&&x.st==="a"?[{label:"スリープ: 相手のレベル6以下を手札に移し、相手は手札を1枚リムーブ",value:2}]:[])]);
    if(v===1)giveKw(x,"突撃［事件］");
    else if(v===2){sleepC(x);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル6以下）",f);if(t)toHandFromField(t);const o=opp(p);await discard(o,1)}}};
DEF["1222"]={ // 赤井秀一 B11057（突撃［キャラ］は本体）
  enter:async p=>{if(myTurn(p))await lvDown1(p)},disguise:async p=>{if(myTurn(p))await lvDown1(p)}};
async function lvDown1(p){const t=await chooseChar(p,"ターン終了時までレベル－1するキャラ",y=>isOpp(p,y));
  if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1（Lv${lvOf(t)}）`,"n")}}
DEF["1224"]={ // アンドレ・キャメル B11059（【事件緑＆赤】突撃は本体）
  apSelf:p=>myTurn(p)?1000:0,
  onAction:async(p,self,actor,target)=>{if(actor!==self||!target||apOf(target)>apOf(self)-4000||immune(p,target))return;
    if(await yes(p,"アンドレ・キャメル",`${C(target).nm} をデッキの下に移しますか？`,true))toDeckBottom(target)}};
DEF["1227"]={ // 宮野エレーナ B11062
  lvSelf:p=>p.solved?1:0,
  abilities:[{label:"レベル7のアクティブ状態のキャラをスタン: そのAP以下のキャラをリムーブ",turn1:true,
    can:p=>p.solved&&partnerIs(p,"赤")&&p.field.some(y=>y.st==="a"&&lvOf(y)===7),aiCan:p=>oppHas(p,y=>true),
    run:async p=>{const [s]=await pickCards(p,"スタンさせるレベル7のキャラ","",p.field.filter(y=>y.st==="a"&&lvOf(y)===7),{min:1,max:1});
      if(!s)return false;const ap=apOf(s);stunC(s);await rmChar(p,apLe(ap),`リムーブするキャラ（AP${ap}以下）`);return true}}]};
DEF["1233"]={ // 宮本由美 B11069
  gale:async p=>{if(!p.solved)drawN(p,1)},
  enter:async(p,x)=>{if(!p.solved)return;
    if(myTurn(p)){if(p.field.some(y=>y!==x&&/【疾風】/.test(C(y).f||"")))giveKw(x,"突撃");return}
    if(x.st!=="a"||!oppHas(p,apLe(5000)))return;
    if(!await yes(p,"宮本由美","このキャラをスリープさせて、相手のAP5000以下のキャラを手札に移しますか？",true))return;
    sleepC(x);const t=await chooseChar(p,"手札に移す相手のキャラ（AP5000以下）",y=>isOpp(p,y)&&apOf(y)<=5000);if(t)toHandFromField(t)}};
DEF["1234"]={ // 三池苗子 B11070
  gale:async(p,x)=>{apTurn(x,1000)},
  enter:async(p,x)=>{if(!p.solved||!condOk("事件黄＆黒",p)||x.st!=="a"||!p.field.some(y=>lvOf(y)>=8&&colorAny(y,"黄","黒")))return;
    if(!await yes(p,"三池苗子","このキャラをスリープさせて、このキャラのAP以下のキャラをリムーブしますか？",()=>oppHas(p,apLe(apOf(x)))))return;
    const ap=apOf(x);sleepC(x);await rmChar(p,y=>y!==x&&apOf(y)<=ap,`リムーブするキャラ（AP${ap}以下）`)}};
DEF["1248"]={ // ウォッカ B11085（突撃［キャラ］は本体）
  onAction:async(p,self,actor)=>{if(actor===self)self.actedT=G.turnNo},
  selfRemovedOwnTurn:async(p,x)=>{if(!partnerIs(p,"黒")||x.actedT!==G.turnNo||!p.rm.includes(x))return;
    if(!await yes(p,"ウォッカ","リムーブエリアからスリープ状態で登場させますか？",true))return;
    await enterFromRmS(p,y=>y===x,"スリープ状態で登場させるキャラ")}};
DEF["1250"]={ // 狼男 B11087
  abilities:[{label:"スリープ: レベル4以下の自分の【黒】のキャラをリムーブしてもよい。そのレベル以下のキャラをスタン",
    can:(p,x)=>p.solved&&x.st==="a",aiCan:p=>false,
    run:async(p,x)=>{sleepCost(x);const cs=p.field.filter(y=>y!==x&&lvOf(y)<=4&&hasColor(y,"黒"));
      const [y]=await pickCards(p,"リムーブする自分の【黒】のキャラ（レベル4以下・しなくてもよい）","",cs,{min:0,max:1,ai:c=>[]});
      if(!y)return true;const lv=lvOf(y);removeCard(y,"効果",{by:p,effect:true});await runQueue();
      const t=await chooseChar(p,`スタンさせるキャラ（レベル${lv}以下）`,z=>lvOf(z)<=lv);if(t)stunC(t);return true}}]};
DEF["1255"]={ // ラム B11092
  enter:async(p,x)=>{if(!partnerIs(p,"黒")||p.deck.length<4)return;
    if(!await yes(p,"ラム","デッキの上から3枚をリムーブしますか？",()=>p.deck.length>10))return;
    const n=p.deck.slice(0,3).filter(y=>C(y).ci&&hasColor(y,"黒")).length;millSelf(p,3);if(n>=3)giveKw(x,"突撃")}};

// --- レベル5 ---
DEF["1181"]={ // 間宮マス代 B11013（ヒラメキは auto.js）
  enter:async(p,x)=>{if(!p.solved&&p.field.some(y=>y!==x&&hasTrait(y,"少年探偵団")))drawN(p,1)},
  abilities:[{label:"スリープ＋［少年探偵団］をデッキの下へ: レベル6以下のキャラをリムーブ",
    can:(p,x)=>p.solved&&x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"少年探偵団")),aiCan:p=>p.field.length>2&&oppHas(p,lvLe(6)),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: デッキの下に移す［少年探偵団］","",p.field.filter(y=>y!==x&&hasTrait(y,"少年探偵団")),{min:1,max:1,ai:cs=>cs.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
      if(!c)return false;sleepCost(x);toDeckBottom(c);await rmChar(p,lvLe(6));return true}}]};
DEF["1187"]={ // 伊織無我 B11020（突撃［キャラ］は本体）
  kwSelf:p=>condOk("絆大岡紅葉",p)?["突撃［事件］"]:[],
  enter:async(p,x)=>{if(p.file.length>=8){x.iorT=G.turnNo;log(`　${C(x).nm} はターン終了時まで「コンタクトでリムーブしたら相手のキャラにセット」を得た`,"n")}},
  contactWin:async(p,x)=>{if(x.iorT!==G.turnNo||turnCount(x,"p11i"))return;
    const t=await chooseChar(p,"セットされる相手のキャラ",y=>isOpp(p,y));if(!t)return;useTurn(x,"p11i");setTop(opp(p),t)}};
DEF["1190"]={ // 島袋君恵 B11023
  leaveOppTurn:async(p,x)=>{if(!p.rm.includes(x)||!await yes(p,"島袋君恵","このキャラをリムーブエリアからデッキの下に移して、リムーブエリアのレベル3のキャラを手札に加えますか？",true))return;
    detach(x);p.deck.push(x);log(`　${C(x).nm} をデッキの下に移した`,"n");await pickRmToHand(p,y=>isChar(y)&&lvOf(y)===3,"手札に加えるレベル3のキャラ")}};
DEF["1200"]={ // 中森青子 B11034（【事件青＆白】【パートナー白】突撃は本体）
  enter:async(p,x)=>{if(evTot(p)>=5)apTurn(x,1000)}};
DEF["1210"]={ // 鈴木朋子 B11044
  kwSelf:(p,x)=>(x.set||[]).length?["突撃"]:[],
  enter:async(p,x)=>{const [y]=await pickCards(p,"このキャラにセットする［漆黒の星］","",p.rm.filter(exactName("漆黒の星")),{ai:c=>c.slice(0,1)});
    if(!y)return;detach(y);x.set=x.set||[];x.set.push({c:y,up:true});log(`　${C(y).nm} を ${C(x).nm} にセット`,"n")}};
DEF["1212"]={ // 土井塔克樹 B11046（ミスリード1は本体。変装で入れ替わるときは engine の disguiseReplaced）
  disguiseReplaced:async(p,x,by)=>{if(myTurn(p)||!anyExact("怪盗キッド")(by))return false;
    if(!await yes(p,"土井塔克樹","デッキの下に移す代わりにリムーブして、表向きの証拠を2つまで裏向きにしますか？",true))return false;
    const ups=p.ev.filter(e=>e.up);const gs=await pickCards(p,"裏向きにする証拠","",ups,{min:0,max:2,ai:c=>c.slice(0,2)});
    for(const e of gs)e.up=false;log(`　${p.name} は表向きの証拠を${gs.length}つ裏向きにした`,"n");return true}};
DEF["1213"]={ // 富沢雄三 B11047（現場にいるときの［鈴木財閥］は core.js の hasTrait）
  abilities:[{label:"このキャラをリムーブエリアへ: リムーブエリアのすべてのカードをデッキの下に移してシャッフル",can:()=>true,aiCan:()=>false,
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});const cs=p.rm.slice();for(const y of cs){detach(y);p.deck.push(y)}shuffle(p.deck);
      log(`　リムーブエリアの${cs.length}枚をデッキの下に移して、デッキをシャッフル`,"n");return true}}]};
DEF["1236"]={ // 安室透 B11072（【パートナー黄】突撃は本体、ヒラメキは auto.js）
  apSelf:(p,x)=>myTurn(p)?1000*p.field.filter(y=>y!==x&&hasTrait(y,"喫茶ポアロ")).length:0};
DEF["1239"]={ // 白鳥任三郎 B11075
  enter:async p=>{const shown=[];let got=null;
    while(p.deck.length){const y=p.deck.shift();if(isChar(y)&&lvOf(y)>=5&&hasTrait(y,"警察")){got=y;break}shown.push(y)}
    log(`　${p.name} はデッキの上から${shown.length+(got?1:0)}枚を公開`,"n");
    if(got){p.hand.push(got);log(`　${p.name} は ${C(got).nm} を手札に加えた`)}
    for(const y of shown)p.deck.push(y);shuffle(p.deck);if(shown.length)log("　残りをデッキの下に移して、デッキをシャッフル","n");checkDeck(p)}};
DEF["1241"]={ // 諸伏高明 B11077
  gale:async(p,x)=>{apTurn(x,1000)},
  enter:async(p,x)=>{if(!condOk("事件黄＆黒",p)||p.deck.length<4)return;
    if(!await yes(p,"諸伏高明","デッキの上から3枚をリムーブしますか？",()=>p.deck.length>10))return;
    const g=p.deck.slice(0,3).some(y=>isChar(y)&&/【疾風】/.test(C(y).f||""));millSelf(p,3);if(g)giveKw(x,"突撃")}};

// --- レベル4 ---
const komaeN=p=>new Set(p.field.filter(isKomae).map(nameOf)).size; // 現場の、レベル4のそれぞれカード名の異なる［少年探偵団］の数
// デッキの上からn枚見て、条件に合うカードを1枚まで手札に加え、残りをリムーブエリアに移す
async function lookTopRm(p,n,filter,title){
  const xs=p.deck.slice(0,n);if(!xs.length)return null;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
  const [g]=await pickCards(p,title,`デッキの上から${xs.length}枚。条件に合うカードを1枚まで手札に加え、残りはリムーブエリアへ。`,xs.filter(filter),{min:0,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
  for(const y of xs){detach(y);if(y===g){p.hand.push(y);log(`　${p.name} は ${C(y).nm} を手札に加えた`)}else p.rm.push(y)}
  if(xs.length>(g?1:0))log(`　残り${xs.length-(g?1:0)}枚をリムーブエリアへ`,"n");checkDeck(p);return g||null}
const komaeCut=(lim,name)=>async p=>{ // 小嶋元太・円谷光彦のカットイン: コンタクト中の（元太=Lv8以上／光彦=Lv7以下）のキャラをリムーブし、1枚引く
  const ct=G.contact;if(!myTurn(p)||komaeN(p)<2||!ct)return;
  await rmChar(p,y=>(y===ct.a||y===ct.d)&&lim(lvOf(y)),`リムーブするコンタクト中のキャラ（${name}）`);drawN(p,1)};
const fileRush=k=>async(p,x)=>{if(condOk("FILE5",p))giveKw(x,k)}; // 【FILE5】【登場時】ターン終了時まで〚突撃…〛を持つ
DEF["1175"]={ // 吉田歩美 B11007
  enter:fileRush("突撃"),
  disguise:async(p,x)=>{if(!myTurn(p)||komaeN(p)<3)return;
    await rmChar(p,y=>y.st==="s"&&lvOf(y)<=7,"リムーブするスリープ状態のキャラ（レベル7以下）");drawN(p,1)}};
DEF["1176"]={enter:fileRush("突撃［キャラ］"),cutin:komaeCut(l=>l>=8,"レベル8以上")}; // 小嶋元太 B11008
DEF["1177"]={enter:fileRush("突撃［キャラ］"),cutin:komaeCut(l=>l<=7,"レベル7以下")}; // 円谷光彦 B11009
DEF["1192"]={ // 服部静華 B11025（カットインの条件タグは本体が見る）
  enter:async p=>{if(!condOk("事件緑＆赤",p)||p.solved)return;const f=y=>hasColor(y,"緑")||hasColor(y,"赤");
    if(!p.hand.some(f)||!await yes(p,"服部静華","手札の【緑】か【赤】のカードを1枚リムーブして、カードを2枚引きますか？",()=>p.hand.length>=2))return;
    await discard(p,1,"リムーブする【緑】か【赤】のカード",p,f);drawN(p,2)},
  cutin:async p=>{drawN(p,2);await discard(p,1)}};
DEF["1193"]={ // 和田進一 B11026（すべてのエリアで［伊織無我］扱いは core.js の ALIAS_ALL）
  enter:async(p,x)=>{
    if(!p.solved){await lookTopRm(p,3,anyExact("服部平次","大岡紅葉","伊織無我"),"手札に加えるカード（服部平次・大岡紅葉・伊織無我）");return}
    if(!condOk("FILE6",p)||x.st!=="a")return;
    if(!await yes(p,"和田進一","このキャラをスリープさせて、相手のレベル7以下のキャラにデッキの上から1枚を裏向きでセットしますか？",()=>oppHas(p,lvLe(7))))return;
    sleepC(x);const t=await chooseChar(p,"セットされる相手のキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7);if(t)setTop(opp(p),t)}};
DEF["1204"]={ // 工藤有希子 B11038
  enter:async p=>{const byName=new Map;
    for(const y of [...p.deck,...p.hand,...p.rm,...p.field,...p.file,...p.ev])if(isChar(y)&&!byName.has(nameOf(y)))byName.set(nameOf(y),y);
    if(!byName.size)return;
    const cnt=n=>p.deck.filter(y=>isChar(y)&&nameOf(y)===n).length;
    const [r]=await pickCards(p,"指定するキャラのカード名","デッキの上から4枚を見て、指定した名前のキャラを手札に加えます。",[...byName.values()],{min:1,max:1,
      ai:cs=>cs.slice().sort((a,b)=>cnt(nameOf(b))-cnt(nameOf(a))||lvOf(b)-lvOf(a)).slice(0,1)});
    if(!r)return;const n=nameOf(r);log(`　${p.name} はカード名［${n}］を指定した`,"n");
    await lookTop(p,4,y=>isChar(y)&&nameOf(y)===n,{max:1,title:`［${n}］を1枚まで手札に`})}};
DEF["1206"]={ // シャロン・ヴィンヤード B11040（事件の色を無視は FX.ignoreCaseColor）
  disguiseReplaced:async(p,x,by)=>{if(myTurn(p)||!anyExact("ベルモット")(by))return false;
    if(!await yes(p,"シャロン・ヴィンヤード","デッキの下に移す代わりにリムーブして、アクション中のキャラ1枚をスタンさせますか？",true))return false;
    const ct=G.contact;const t=await chooseChar(p,"スタンさせるアクション中のキャラ",y=>!!ct&&(y===ct.a||y===ct.d||y===by));if(t)stunC(t);return true}};
DEF["1208"]={ // 鈴木次郎吉 B11042（ヒラメキは auto.js）
  apSelf:()=>allChars().some(exactName("怪盗キッド"))?2000:0};
DEF["1209"]={ // 鈴木園子 B11043
  enter:async p=>{if(!condOk("事件青＆白",p))return;const xs=p.deck.slice(0,3);if(!xs.length)return;
    log(`　${p.name} はデッキの上から${xs.length}枚を公開: ${xs.map(y=>C(y).nm).join("、")}`,"n");
    const miss=!xs.some(y=>isChar(y)&&(hasTrait(y,"高校生")||hasTrait(y,"怪盗")));
    const [h]=await pickCards(p,"手札に加えるカード","公開した3枚から1枚を手札に加えます。",xs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,b)-aiCardValue(p,a)).slice(0,1)});
    const [r]=await pickCards(p,"リムーブエリアに移すカード","残りから1枚をリムーブエリアに移します（残りはデッキの下）。",xs.filter(y=>y!==h),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b)).slice(0,1)});
    for(const y of xs){detach(y);if(y===h){p.hand.push(y);log(`　${p.name} は ${C(y).nm} を手札に加えた`)}else if(y===r)p.rm.push(y);else p.deck.push(y)}
    checkDeck(p);if(miss)await discard(p,1)}};
DEF["1214"]={ // ルパン B11048
  oppEndTurn:async(p,x)=>{const f=y=>isChar(y)&&hasTrait(y,"鈴木財閥");
    if(!await yes(p,"ルパン","このキャラを現場からリムーブしますか？",()=>p.rm.some(f)))return;removeCard(x,"効果",{by:p,effect:true});await runQueue()},
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"鈴木財閥"),"手札に加える［鈴木財閥］のキャラ")}};
DEF["1240"]={ // 目暮十三 B11076（ヒラメキは auto.js）
  enter:async p=>{const cs=p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察"));if(!cs.length)return;
    const got=await pickCards(p,"デッキの下に移す［警察］のキャラ（3枚まで）","",cs,{min:0,max:3,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,3)});
    for(const y of got){detach(y);p.deck.push(y)}
    if(got.length){log(`　リムーブエリアの${got.length}枚をデッキの下に移した`,"n");shuffle(p.deck);log("　デッキをシャッフル","n")}}};
DEF["1251"]={ // キール B11088
  enter:async p=>{const g=await lookTopRm(p,3,y=>isChar(y)&&hasTrait(y,"黒ずくめの組織"),"手札に加える［黒ずくめの組織］のキャラ");
    if(g&&p.solved)await discard(p,1)}};
DEF["1253"]={ // 亡霊船長 B11090
  abilities:[{label:"このキャラをリムーブエリアへ: 自分のキャラを好きな数選び、ターン終了時までAP＋1000",can:(p,x)=>p.field.some(y=>y!==x),aiCan:p=>false,
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});const cs=p.field.slice();
      const ts=await pickCards(p,"AP＋1000する自分のキャラ（好きな数）","",cs,{min:0,max:cs.length,ai:c=>c});for(const y of ts)apTurn(y,1000);return true}}]};

// --- レベル3 ---
DEF["1205"]={ // 真田一三 B11039（入れ替わったキャラはこの時点でデッキの下にあるので、下から1枚は［怪盗キッド］になる）
  disguise:async(p,x,mine)=>{if(myTurn(p)||!mine||!anyExact("怪盗キッド")(mine))return;
    if(!await yes(p,"真田一三","このキャラをリムーブして、デッキの下から1枚を手札に加え、手札を1枚リムーブしますか？",true))return;
    removeCard(x,"効果",{by:p,effect:true});await runQueue();
    const b=p.deck.pop();if(b){p.hand.push(b);log(`　${p.name} はデッキの下から ${C(b).nm} を手札に加えた`)}await discard(p,1)}};
DEF["1225"]={ // 瓜生祥子 B11060（ミスリード1は本体）
  cutin:async(p,card,mine)=>{if(mine&&(hasTrait(mine,"女流棋士")||hasTrait(mine,"棋士")))drawN(p,1)}};
DEF["1242"]={ // 大和敢助 B11078
  leaveOppTurn:async p=>{await lookTopRm(p,2,y=>isChar(y)&&/【疾風】/.test(C(y).f||""),"手札に加える【疾風】を持つキャラ")}};
DEF["1254"]={ // 火傷の男 B11091（ミスリード1は本体）
  selfRemovedOwnTurn:async p=>{drawN(p,1)}};

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

// --- MR（レベル9）---
DEF["1196"]={ // 工藤優作＆黒羽盗一 B11030
  enter:async p=>{if(partnerIs(p,"白"))await rmChar(p,lvLe(9))},
  abilities:[
    {label:"自分の【白】のキャラにデッキの上から1枚を裏向きでセット",turn1:true,can:p=>p.field.some(y=>hasColor(y,"白")),aiCan:p=>p.deck.length>8,
      run:async p=>{const t=await chooseChar(p,"セットされる自分の【白】のキャラ",y=>!isOpp(p,y)&&hasColor(y,"白"),{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t)setTop(p,t);return true}},
    {label:"カードを1枚引く（手札5枚以上なら1枚リムーブ）",turn1:true,partner:true,can:p=>p.field.some(y=>faceDownSet(y).length),aiCan:p=>true,
      run:async p=>{drawN(p,1);if(p.hand.length>=5)await discard(p,1);return true}}],
  partnerToo:true};
DEF["1217"]={ // 宮野志保＆宮野明美 B11052
  lvSelf:p=>p.solved&&myTurn(p)?-2:0,
  abilities:[{label:"レベル7のキャラをスタン: レベル9以下のキャラをリムーブ",turn1:true,
    can:p=>partnerIs(p,"赤")&&p.field.some(y=>y.st!=="x"&&lvOf(y)===7),aiCan:p=>oppHas(p,lvLe(9)),
    run:async p=>{const [s]=await pickCards(p,"スタンさせるレベル7のキャラ","",p.field.filter(y=>y.st!=="x"&&lvOf(y)===7),{min:1,max:1});
      if(!s)return false;stunC(s);await rmChar(p,lvLe(9));return true}}],
  endTurn:async p=>{if(!p.field.some(y=>y.st==="x"))return;drawN(p,2);await discard(p,1)},
  partnerToo:true};
DEF["1245"]={ // ジン＆ベルモット B11082
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||!partnerIs(p,"黒")||turnCount(self,"p11m")||!hasTrait(y,"黒ずくめの組織"))return;
    useTurn(self,"p11m");await rmChar(p,lvLe(9))},
  abilities:[{label:"レベル7以下の【黒】のキャラをスタン: 相手のターン終了時まで「現場リムーブ時に1枚引く」を与える",turn1:true,partner:true,
    can:p=>p.field.some(y=>y.st!=="x"&&hasColor(y,"黒")&&lvOf(y)<=7),aiCan:p=>false,
    run:async p=>{const [s]=await pickCards(p,"スタンさせる【黒】のキャラ（レベル7以下）","",p.field.filter(y=>y.st!=="x"&&hasColor(y,"黒")&&lvOf(y)<=7),{min:1,max:1});
      if(!s)return false;stunC(s);s.leaveDrawT=G.turnNo+1;log(`　${C(s).nm} は相手のターン終了時まで「現場リムーブ時: 1枚引く」を得た`,"n");return true}}],
  partnerToo:true};
DEF["1258"]={ // 江戸川コナン＆怪盗キッド B11095
  enter:async p=>{const n=evTot(p);
    if(n>=5){drawN(p,2);await discard(p,2)}
    else if(p.hand.length&&await yes(p,"江戸川コナン＆怪盗キッド","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=2)){await discard(p,1);gainEv(p,1)}},
  endTurn:async p=>{if(condOk("事件探偵VS怪盗",p)&&p.ev.length>=9){win(p,"江戸川コナン＆怪盗キッド");return}
    drawN(p,1);if(p.hand.length>=5)await discard(p,1)},
  abilities:[{label:"キャラを1枚デッキの下に移す",turn1:true,can:p=>condOk("事件探偵VS怪盗",p),aiCan:p=>oppHas(p,y=>lvOf(y)>=5),
    run:async p=>{await bottomChar(p,()=>true);return true}}],
  partnerToo:true};
DEF["1259"]={ // 服部平次＆ジョディ・スターリング B11096
  enter:async p=>{await rmChar(p,apLe(8000))},
  onAction:async(p,self,actor,target)=>{if(!target||!p.field.includes(actor)||turnCount(self,"p11h")||!colorAny(actor,"緑","赤")||apOf(target)>apOf(actor)-4000||!p.hand.length)return;
    if(!await yes(p,"服部平次＆ジョディ・スターリング","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=3))return;
    useTurn(self,"p11h");await discard(p,1);gainEv(p,1)},
  abilities:[{label:"キャラをターン終了時までAP－2000",turn1:true,partner:true,can:p=>true,aiCan:p=>myTurn(p)&&oppHas(p,y=>true),
    run:async p=>{const t=await chooseChar(p,"AP－2000するキャラ");if(t)apTurn(t,-2000);return true}}],
  partnerToo:true};
DEF["1260"]={ // 諸伏景光＆スコッチ B11097
  gale:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"AP8000以下のキャラをリムーブ",turn1:true,can:p=>true,aiCan:p=>oppHas(p,apLe(8000)),
    run:async p=>{await rmChar(p,apLe(8000));return true}}],
  onAllyEnter:async(p,self,y)=>{if(myTurn(p)||turnCount(self,"p11s")||!/【疾風】/.test(C(y).f||""))return;
    useTurn(self,"p11s");drawN(p,1);
    if(faceDownEv(p).length>=2&&await yes(p,"諸伏景光＆スコッチ","裏向きの証拠を2つ表向きにして、カードを1枚引きますか？",true)){flipEvidence(p,2);drawN(p,1)}},
  partnerToo:true};

// --- パートナーエリアへ移す型（engine.js の toPartnerArea / activatePartner / paReturn。MRの相手ターン中の移動も同じ仕組み）---
const isGale=y=>/【疾風】/.test(C(y).f||"");
// 「【疾風】を持つレベルN以下の【黄】か【黒】のキャラ」
const galeYK=n=>y=>isChar(y)&&isGale(y)&&lvOf(y)<=n&&colorAny(y,"黄","黒");
// 候補から1枚まで選び、パートナーエリアへ移す。「相手のターンのメインフェイズ開始時に登場させてもよい／しなければリムーブ」つき
async function toPaWithReturn(p,cands,title){
  if(!cands.length)return null;
  const [y]=await pickCards(p,title,"",cands,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
  if(!y)return null;toPartnerArea(p,y,{ret:true});return y}
// FILEの一番上（パートナー以外）をリムーブ
function fileTopRm(p){const top=[...p.file].reverse().find(y=>y!==p.partner);if(!top)return false;
  p.file.splice(p.file.indexOf(top),1);p.rm.push(top);log(`　FILEの上の ${C(top).nm} をリムーブ`,"n");return true}

DEF["1252"]={ // 犯人 B11089
  enter:async p=>{if(!myTurn(p))return;const o=opp(p);const was=o.pLoc==="file";activatePartner(o);
    log(`　${o.name} のパートナーをアクティブにした${was?"（FILEからパートナーエリアへ）":""}`,"n")},
  hirameki:async o=>{const n=Math.min(2,faceDownEv(o).length);if(n)flipEvidence(o,n)}};
DEF["1247"]={ // スコッチ B11084
  abilities:[{label:"このキャラをリムーブエリアに移し手札を1枚リムーブ: リムーブエリアの【疾風】のレベル6以下の【黄】か【黒】をパートナーエリアへ",
    can:p=>condOk("事件黄＆黒",p)&&p.file.length>=7&&p.hand.length>=1&&p.rm.some(galeYK(6)),
    aiCan:p=>p.hand.length>=2&&p.rm.some(y=>galeYK(6)(y)&&lvOf(y)>=5),
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});await discard(p,1);await runQueue();
      await toPaWithReturn(p,p.rm.filter(galeYK(6)),"パートナーエリアに移すキャラ");return true}}]};
DEF["1263"]={...solvedDiscard, // 警視庁公安部の潜入捜査官 B11100
  abilities:[{label:"FILEの上から1枚をリムーブ: 手札の【疾風】のFILEの枚数以下のレベルの【黄】か【黒】をパートナーエリアへ",turn1:true,
    can:p=>p.solved&&p.file.some(y=>y!==p.partner)&&p.hand.some(galeYK(p.file.length-1)),
    aiCan:p=>p.hand.some(y=>galeYK(p.file.length-1)(y)&&lvOf(y)>=5),
    run:async p=>{if(!fileTopRm(p))return false;await toPaWithReturn(p,p.hand.filter(galeYK(p.file.length)),"パートナーエリアに移すキャラ");return true}}]};

// --- レベル2・1 / 事件・イベント（残り）---
const noEff=()=>log("　条件を満たさないので効果なし","n");
const bigJewel=y=>C(y).t==="イベント"&&hasTrait(y,"ビッグジュエル");
// 選択肢から1つ（人は ask、CPUは aiIdx）
async function pickMode(p,title,labels,aiIdx=0){
  if(p.cpu)return aiIdx;
  return await ask(`${p.name}: ${title}`,"1つ選んで行います",labels.map((l,i)=>({label:l,value:i,primary:i===0})))}
const drawDiscard=async p=>{drawN(p,1);await discard(p,1)};
// 相手の証拠を上から1つリムーブして、自分は証拠を1つ得る
async function stealEv(p){const o=opp(p);if(!o.ev.length)return;const e=o.ev.pop();log(`　${o.name} の証拠を1つリムーブ`,"n");await hirameki(o,e);gainEvidence(p,1);log(`　${p.name} は証拠を1つ得た（証拠${p.ev.length}）`,"n")}

DEF["1183"]={ // 毛利蘭 B11015
  enter:async p=>{if(!condOk("絆工藤新一",p))return;await drawDiscard(p)}};
DEF["1184"]={ // 事件青＆白のイベント B11016
  event:async p=>{if(!condOk("事件青＆白",p)||!partnerIs(p,"青"))return noEff();
    drawN(p,2);await discard(p,1);await playFromHand(p,y=>lvOf(y)<=p.file.length&&colorAny(y,"青","白"),"登場させる【青】か【白】のキャラ")},
  ai:p=>condOk("事件青＆白",p)&&partnerIs(p,"青")};
DEF["1185"]={ // 五人囃子 B11017
  event:async p=>{const got=[];
    for(let i=0;i<3;i++){const cs=p.rm.filter(y=>isKomae(y)&&!got.includes(y)&&!got.some(g=>sameName(g,y)));if(!cs.length)break;
      const [y]=await pickCards(p,`リムーブエリアのレベル4の［少年探偵団］（${i+1}枚目・カード名が異なるもの）`,"",cs,{ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(!y)break;got.push(y)}
    if(!got.length)return;
    const [a]=await pickCards(p,"登場させるキャラ","",got,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});
    let rest=got.filter(y=>y!==a);
    const [b]=rest.length?await pickCards(p,"スリープ状態で登場させるキャラ","",rest,{min:1,max:1,ai:c=>c.slice(0,1)}):[];
    rest=rest.filter(y=>y!==b);
    if(a)await enterByEffect(p,a,"a");if(b)await enterByEffect(p,b,"s");
    for(const y of rest){if(!p.rm.includes(y))continue;rmToHand(p,y)}},
  ai:p=>p.rm.filter(isKomae).length>=2};
DEF["1194"]={ // 「平次…」「カッコエ――ッ♡」 B11027
  event:async p=>{if(!p.solved)return noEff();
    if(p.field.some(exactName("遠山和葉")))await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");
    if(p.field.some(exactName("大岡紅葉")))await rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）");
    if(p.field.some(exactName("服部平次")))drawN(p,1)},
  ai:p=>p.solved&&p.field.some(anyExact("遠山和葉","大岡紅葉","服部平次"))};
DEF["1195"]={ // 私のとてもとても大好きなお酒 B11028
  event:async p=>{if(!condOk("事件緑＆赤",p))return noEff();
    const cs=await pickCards(p,"AP＋4000するキャラ（好きな数）","相手の現場のアクティブ状態のキャラを指定してアクションできるようになります。",p.field,{max:5,ai:c=>c.slice()});
    for(const y of cs){apTurn(y,4000);giveKw(y,"アクティブ指定")}},
  ai:p=>condOk("事件緑＆赤",p)&&p.field.length>0};
DEF["1202"]={ // 怪盗キッド B11036
  enter:async p=>{if(!myTurn(p))return;await kidJewel(p)},
  disguise:async p=>{if(!myTurn(p))return;await kidJewel(p)}};
async function kidJewel(p){const y=await toPaWithReturnNo(p,p.rm.filter(bigJewel),"パートナーエリアに移す［ビッグジュエル］のイベント");if(y)drawN(p,1)}
async function toPaWithReturnNo(p,cands,title){
  if(!cands.length)return null;const [y]=await pickCards(p,title,"",cands,{ai:c=>c.slice(0,1)});
  if(!y)return null;toPartnerArea(p,y);return y}
DEF["1215"]={ // 「探偵はその跡を見て…」 B11049
  event:async p=>{if(!condOk("事件探偵VS怪盗",p)||!partnerIs(p,"白"))return noEff();
    drawN(p,2);await discard(p,2);await enterFromRm(p,y=>lvOf(y)<=7&&colorAny(y,"青","白"),"登場させる【青】か【白】のキャラ（レベル7以下）")},
  ai:p=>condOk("事件探偵VS怪盗",p)&&partnerIs(p,"白")};
DEF["1216"]={ // 漆黒の星 B11050（セット中の効果は FX.onContact → setContact）
  event:async(p,x)=>{
    const ups=p.ev.filter(e=>e.up);
    if(ups.length){const [e]=await pickCards(p,"裏向きにする表向きの証拠","",ups,{ai:c=>c.slice(0,1)});if(e){e.up=false;log(`　${p.name} は表向きの証拠を裏向きにした`,"n")}}
    const h=await setEventOn(p,x,y=>hasTrait(y,"鈴木財閥")||hasTrait(y,"怪盗"));if(h)apTurn(h,2000)},
  setContact:async(q,y,sc,ct)=>{
    if(!await yes(q,"漆黒の星","このイベントをパートナーエリアに移して、このコンタクトでリムーブされないようにしますか？",()=>true))return false;
    const i=y.set.findIndex(s=>s.c===sc);if(i>=0)y.set.splice(i,1);toPartnerArea(q,sc);return true},
  ai:p=>p.field.some(y=>hasTrait(y,"鈴木財閥")||hasTrait(y,"怪盗"))};
DEF["1223"]={ // 新出智明 B11058
  abilities:[{label:"スリープ: キャラをAP－2000",can:(p,x)=>x.st==="a"&&condOk("事件緑＆赤",p)&&partnerIs(p,"赤"),aiCan:p=>oppHas(p,y=>true),
    run:async(p,x)=>{const t=await chooseChar(p,"AP－2000するキャラ",y=>true);if(!t)return false;sleepCost(x);apTurn(t,-2000);return true}}]};
DEF["1226"]={ // ジェイムズ・ブラック B11061
  enter:async p=>{if(!condOk("事件緑＆赤",p)||!p.solved)return;await drawDiscard(p)}};
DEF["1230"]={ // 消毒と絆創膏 B11065
  event:async p=>{if(!partnerIs(p,"赤"))return noEff();
    const all=["宮野厚司","宮野エレーナ","宮野明美","宮野志保"].every(n=>p.field.some(exactName(n)));
    const steps=[()=>rmChar(p,apLe(8000),"リムーブするキャラ（AP8000以下）"),
      ()=>bottomChar(p,apLe(8000),"デッキの下に移すキャラ（AP8000以下）"),
      async()=>{if(p.field.some(y=>y.st==="x"))await stealEv(p)}];
    const idx=all?[0,1,2]:[await pickMode(p,"消毒と絆創膏",["AP8000以下をリムーブ","AP8000以下をデッキの下へ","相手の証拠を1つリムーブして証拠を得る"],oppHas(p,apLe(8000))?0:2)];
    for(const i of idx){await steps[i]();await runQueue()}},
  ai:p=>partnerIs(p,"赤")&&oppHas(p,apLe(8000))};
DEF["1232"]={ // 佐藤美和子 B11068
  enter:async(p,x)=>{if(!condOk("絆高木渉",p)||!p.solved||x.st!=="a")return;
    if(!p.field.some(exactName("高木渉")))return;
    if(!await yes(p,"佐藤美和子","このキャラをスリープさせて、［高木渉］に相手のアクティブ状態のキャラを指定してアクションできるようにしますか？",true))return;
    sleepC(x);const [t]=await pickCards(p,"アクティブ指定を与える［高木渉］","",p.field.filter(exactName("高木渉")),{min:1,max:1,ai:c=>c.slice(0,1)});if(t)giveKw(t,"アクティブ指定")}};
DEF["1238"]={ // 上原由衣 B11074
  gale:async p=>{await drawDiscard(p)}};
DEF["1243"]={ // 「うるさい!!これは警察の仕事だ!!」 B11079
  event:async p=>{if(!p.solved)return noEff();
    const n=new Set(p.field.flatMap(y=>colorsOf(C(y).c))).size;if(!n)return log("　現場にキャラがいないので効果なし","n");
    const labels=["キャラを1枚リムーブ","キャラを1枚スリープ","相手の裏向きの証拠を表向きに","自分の表向きの証拠を裏向きに","カードを1枚引く","相手は手札を1枚リムーブ"];
    const chosen=[];
    for(let k=0;k<n;k++){const rest=labels.map((l,i)=>i).filter(i=>!chosen.includes(i));if(!rest.length)break;
      if(p.cpu){const pref=[0,1,4,5,2,3].filter(i=>rest.includes(i));chosen.push(pref[0]);continue}
      const v=await ask(`${p.name}: 選択肢（あと${n-k}つまで）`,"選んだものは上から順に行います。",[...rest.map(i=>({label:labels[i],value:i,primary:i===rest[0]})),{label:"やめる",value:-1}]);
      if(v<0)break;chosen.push(v)}
    chosen.sort((a,b)=>a-b);
    for(const i of chosen){
      if(i===0)await rmChar(p,()=>true);
      else if(i===1){const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}
      else if(i===2){const o=opp(p),fd=o.ev.filter(e=>!e.up);if(fd.length){fd[fd.length-1].up=true;log(`　${o.name} の裏向きの証拠を表向きにした`,"n")}}
      else if(i===3){const u=p.ev.filter(e=>e.up);if(u.length){u[u.length-1].up=false;log(`　${p.name} の表向きの証拠を裏向きにした`,"n")}}
      else if(i===4)drawN(p,1);
      else if(i===5)await discard(opp(p),1);
      await runQueue()}},
  ai:p=>p.solved&&p.field.length>0};
DEF["1256"]={ // 「黒と黒が混ざっても…黒にしかならねぇよ…」 B11093
  event:async p=>{
    const both=p.field.some(exactName("ジン＆ベルモット"))||p.pa.some(exactName("ジン＆ベルモット"));
    const a=async()=>{const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);drawN(p,1)};
    const b=async()=>{const bl=p.field.filter(y=>hasColor(y,"黒"));if(!bl.length)return;
      if(!await yes(p,"黒と黒が混ざっても","現場の【黒】のキャラを1枚リムーブして、キャラ1枚とスリープ状態のキャラ1枚をリムーブしますか？",()=>oppHas(p,y=>y.st==="s")))return;
      const [c]=await pickCards(p,"リムーブする自分の【黒】のキャラ","",bl,{min:1,max:1,ai:cs=>cs.slice().sort((x,y)=>lvOf(x)-lvOf(y))});if(!c)return;
      removeCard(c,"効果",{by:p,effect:true});await runQueue();
      await rmChar(p,()=>true);await runQueue();await rmChar(p,y=>y.st==="s","リムーブするスリープ状態のキャラ");await runQueue()};
    if(both){await a();await b()}else{const i=await pickMode(p,"黒と黒が混ざっても",["キャラをスリープして1枚引く","【黒】を1枚リムーブして相手を2枚リムーブ"],0);await(i===0?a():b())}},
  ai:p=>oppHas(p,y=>y.st==="a")};
