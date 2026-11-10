"use strict";
// カード個別効果（MR とレベル8）。SeEdの方針(2026-11-10): イベント→事件→MR→レベル8 の順に進める（イベント・事件は priority.js）。
// 追加した仕組み（hooks.js・engine.js 側）:
//  - 【ターン2】: 能力に turn2:true（1ターンに2回まで）
//  - onAllyRemoved(p,self,info): 自分の現場のキャラがリムーブされたとき（info.st=リムーブ直前の状態、info.turn=誰のターンか）
//  - p.endQ: 宣言した「ターン終了時、…」の予約（{t:ターン番号, fn}）。カードが離れても発動する
//  - キーワード「終了時証拠」: ターン終了時、表向きのまま証拠として得る（鬼丸猛 B06018 が与える）
//  - noCase: 事件を指定してアクションできない（京極真 B05051）
//  - tauntT: 「相手のキャラがアクションするとき、このキャラを指定できる場合、必ず指定する」（横溝重悟 D11005）
//  - noEvRemove: 相手のイベントの効果によってリムーブされない（萩原千速 SP010）
//  - bondAll: 「このキャラの【絆】は指定のカード名のキャラが自分の現場にいるものとして扱う」（工藤有希子 PR328 → bondFor）

// --- 部品 ---
const ownPick=(p)=>cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1);
// このキャラの【絆】が成り立つか（工藤有希子 PR328 が与えた能力も見る）
const bondFor=(p,x,n)=>!!(x&&x.bondAll===G.turnNo&&p.field.includes(x))||condOk("絆"+n,p)===true;
// デッキの上に移す
function toDeckTop(x){const p=ownerOf(x);if(p.field.includes(x))dropSets(p,x);detach(x);resetMods(x);p.deck.unshift(x);log(`　${p.name} の ${C(x).nm} をデッキの上へ`,"n")}
// 現場のキャラを、持ち主が表向きのまま証拠として得る
function charToEvidence(x){const q=ownerOf(x);if(!q)return;dropSets(q,x);detach(x);resetMods(x);x.up=true;q.ev.push(x);log(`　${q.name} は ${C(x).nm} を表向きのまま証拠として得た（証拠${q.ev.length}）`)}
// 手札から1枚ずつリムーブして、リムーブしたカードを返す
async function discardEach(p,n){const out=[];for(let i=0;i<n;i++){const [y]=await discard(p,1);if(y)out.push(y)}return out}
const hasGale=y=>/【疾風】/.test(C(y).f||"");
const fileN=p=>p.file.length;
// 「AP8000以下のキャラを1枚まで選び、リムーブする」を相手に向けるか（CPU）
const oppAp8=p=>oppHas(p,apLe(8000));

// ================= MR（レベル9） =================
DEF["0584"]={ // 安室透＆降谷零 B05086
  onAction:async(p,self,actor)=>{if(!partnerIs(p,"黄")||!p.field.includes(actor)||!hasColor(actor,"黄")||turnCount(self,"amfu"))return;
    useTurn(self,"amfu");await rmChar(p,apLe(8000))},
  abilities:[{label:"【黄】のキャラを1枚ターン終了時までAP＋1000",turn1:true,partner:true,can:()=>allChars().some(y=>hasColor(y,"黄")),
    aiCan:p=>myTurn(p)&&p.field.some(y=>hasColor(y,"黄")&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"AP＋1000する【黄】のキャラ",y=>hasColor(y,"黄"),{ai:ownPick(p)});if(t)apTurn(t,1000);return true}}]};
DEF["0628"]={ // 毛利蘭＆江戸川コナン B06003
  abilities:[{label:"ターン終了時までLP－2: キャラを1枚スリープ",turn1:true,can:p=>partnerIs(p,"青")&&allChars().some(y=>y.st==="a"),
      aiCan:(p,x)=>lpOf(x)>=2&&opp(p).field.some(y=>y.st==="a"&&lvOf(y)>=6),
      run:async(p,x)=>{x.lpT-=2;log(`　コスト: ${C(x).nm} をターン終了時までLP－2`,"n");
        const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);return true}},
    {label:"1枚引く（手札が5枚以上なら1枚リムーブ）",turn1:true,partner:true,
      can:p=>p.field.length>=3&&p.field.reduce((n,y)=>n+lpOf(y),0)<=2,aiCan:()=>true,
      run:async p=>{drawN(p,1);if(p.hand.length>=5)await discard(p,1);return true}}]};
DEF["0660"]={ // 服部平次＆沖田総司 B06037
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||y===self||!hasTrait(y,"高校生")||turnCount(self,"hado"))return;useTurn(self,"hado");await rmChar(p,apLe(8000))},
  abilities:[{label:"手札を1枚リムーブ: 自分のキャラをAP＋1000し、相手のアクティブ状態のキャラを指定してアクションできる",turn1:true,partner:true,
    can:p=>p.hand.length>0&&p.field.length>0,aiCan:p=>myTurn(p)&&p.hand.length>=3&&p.field.some(y=>y.st==="a"&&!hitsActive(y,p))&&opp(p).field.some(y=>y.st==="a"),
    run:async p=>{await discard(p,1);const t=await chooseChar(p,"AP＋1000するキャラ",mine1(p,()=>true),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t){apTurn(t,1000);giveKw(t,"アクティブ指定")}return true}}]};
DEF["0694"]={ // 沖矢昴＆世良真純 B06074
  enter:async p=>{drawN(p,1);await playFromHand(p,y=>lvOf(y)<=7&&hasTrait(y,"赤井家"),"登場させる［赤井家］（レベル7以下）")},
  abilities:[{label:"FILEの上から2枚リムーブ: ターン終了時、FILEが5枚以下ならデッキの上から2枚をFILEに置く",turn1:true,partner:true,
    can:p=>p.file.filter(y=>y!==p.partner).length>=2,aiCan:p=>myTurn(p)&&!p.solved&&fileN(p)-2<=5&&fileN(p)>=4&&p.deck.length>6,
    run:async p=>{for(let i=0;i<2;i++){const y=takeFileTop(p);if(y){y.fu=false;p.rm.push(y);log(`　コスト: FILEの上の ${C(y).nm} をリムーブ`,"n")}}
      (p.endQ=p.endQ||[]).push({t:G.turnNo,label:"沖矢昴＆世良真純",fn:async()=>{if(fileN(p)>5)return;
        for(let i=0;i<2;i++)toFile(p,1);log(`　${p.name} はデッキの上から2枚を裏向きのままFILEの上に置いた（FILE${fileN(p)}）`,"n")}});return true}}]};
DEF["0733"]={ // 毛利蘭＆灰原哀 B07001
  abilities:[{label:"デッキの上から3枚リムーブ: ［少年探偵団］［毛利探偵事務所］1枚につきAP＋1000、突撃",turn1:true,can:p=>partnerIs(p,"青")&&p.deck.length>=3,
      aiCan:(p,x)=>myTurn(p)&&p.deck.length>10&&(x.fresh||x.st==="a"),
      run:async(p,x)=>{const n=millSelf(p,3).filter(y=>hasTrait(y,"少年探偵団")||hasTrait(y,"毛利探偵事務所")).length;
        if(n)apTurn(x,1000*n);giveKw(x,"突撃");return true}},
    {label:"自分の【青】のキャラをLP－1し、相手のアクティブ状態のキャラを指定してアクションできる",turn1:true,partner:true,
      can:p=>p.field.some(y=>hasColor(y,"青")),aiCan:p=>myTurn(p)&&opp(p).field.some(y=>y.st==="a")&&p.field.some(y=>hasColor(y,"青")&&y.st==="a"&&lpOf(y)>=2&&!hitsActive(y,p)),
      run:async p=>{const t=await chooseChar(p,"LP－1して能力を与える【青】のキャラ",mine1(p,y=>hasColor(y,"青")),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
        if(t){t.lpT-=1;log(`　${C(t).nm} をターン終了時までLP－1`,"n");giveKw(t,"アクティブ指定")}return true}}]};
DEF["0747"]={ // 遠山和葉＆大岡紅葉 B07015
  partnerToo:true,
  abilities:[{label:"スリープ: 手札からレベル5か6の【緑】のイベントを使用",turn1:true,
    can:(p,x)=>partnerIs(p,"緑")&&x.st==="a"&&evUsable(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0)).length>0,
    aiCan:p=>myTurn(p)&&evUsable(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0)&&FX.eventAi(p,y)).length>0,
    run:async(p,x)=>{sleepCost(x);await useEventByEffect(p,y=>hasColor(y,"緑")&&[5,6].includes(C(y).lv||0),"使用する【緑】のイベント（レベル5か6）");return true}}],
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||!exactName("服部平次")(y)||turnCount(self,"kazu"))return;useTurn(self,"kazu");
    const got=await lookToRm(p,4,z=>C(z).t==="イベント"&&hasColor(z,"緑"),"手札に加える【緑】のイベント");if(got.length)await discard(p,1)}};
DEF["0807"]={ // 佐藤美和子＆宮本由美 B07079
  abilities:[{label:"スリープ・レベル7以下の［警視庁］をデッキの下へ: AP8000以下をリムーブし、［警視庁］を登場か1枚引く",turn1:true,
      can:(p,x)=>x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"警視庁")&&lvOf(y)<=7),aiCan:p=>oppAp8(p),
      run:async(p,x)=>{const [c]=await pickCards(p,"コスト: デッキの下に移す［警視庁］（レベル7以下）","",p.field.filter(y=>y!==x&&hasTrait(y,"警視庁")&&lvOf(y)<=7),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});
        if(!c)return false;sleepCost(x);toDeckBottom(c);await runQueue();await rmChar(p,apLe(8000));
        const can=p.hand.some(y=>isChar(y)&&hasTrait(y,"警視庁")&&lvOf(y)<=4);
        const i=can?await pickMode(p,"佐藤美和子＆宮本由美",["手札からレベル4以下の［警視庁］を登場","カードを1枚引く"],0):1;
        if(i===0)await playFromHand(p,y=>hasTrait(y,"警視庁")&&lvOf(y)<=4,"登場させる［警視庁］（レベル4以下）");else drawN(p,1);return true}},
    {label:"手札を1枚リムーブ: ［警視庁］をAP＋3000（ターン終了時にデッキの下へ）",turn1:true,partner:true,
      can:p=>p.hand.length>0&&p.field.some(y=>hasTrait(y,"警視庁")),aiCan:p=>myTurn(p)&&p.hand.length>=3&&p.field.some(y=>hasTrait(y,"警視庁")&&y.st==="a"&&lvOf(y)<=6),
      run:async p=>{await discard(p,1);const t=await chooseChar(p,"AP＋3000する［警視庁］",mine1(p,y=>hasTrait(y,"警視庁")),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>lvOf(a)-lvOf(b)).slice(0,1)});
        if(t){apTurn(t,3000);giveKw(t,"終了時デッキの下")}return true}}]};
DEF["0843"]={ // 江戸川コナン＆灰原哀 B08002
  abilities:[{label:"キャラを1枚リムーブし、そのレベルと同じ枚数デッキの上からリムーブ",turn1:true,can:p=>partnerIs(p,"青")&&allChars().length>0,
      aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=Math.max(0,p.deck.length-6)),
      run:async p=>{const t=await chooseChar(p,"リムーブするキャラ",()=>true,{ai:cs=>cs.filter(y=>isOpp(p,y)&&lvOf(y)<=Math.max(0,p.deck.length-6)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
        if(!t)return true;const lv=lvOf(t);rmBy(p,t);await runQueue();millSelf(p,lv);return true}},
    {label:"リムーブエリアの［少年探偵団］のキャラを【青】のキャラの下に重ねる",turn1:true,partner:true,
      can:p=>p.rm.some(y=>isChar(y)&&hasTrait(y,"少年探偵団"))&&p.field.some(y=>hasColor(y,"青")),aiCan:()=>true,
      run:async p=>{const [y]=await pickCards(p,"重ねる［少年探偵団］","",p.rm.filter(y=>isChar(y)&&hasTrait(y,"少年探偵団")),{max:1,ai:c=>c.slice(0,1)});if(!y)return true;
        const t=await chooseChar(p,"下に重ねる先の【青】のキャラ",mine1(p,z=>hasColor(z,"青")),{min:1,ai:cs=>cs.slice().sort((a,b)=>underN(b)-underN(a)).slice(0,1)});
        if(t)stackUnder(t,[y]);return true}}]};
DEF["0871"]={ // 鈴木園子＆京極真 B08032
  abilities:[{label:"手札を1枚リムーブ: このキャラは相手のアクティブ状態のキャラを指定してアクションできる",
      can:(p,x)=>p.hand.length>0&&!hitsActive(x,p),aiCan:(p,x)=>myTurn(p)&&p.hand.length>=3&&(x.st==="a")&&opp(p).field.some(y=>y.st==="a"&&apOf(y)<=apOf(x))&&!opp(p).field.some(y=>y.st!=="a"),
      run:async(p,x)=>{await discard(p,1);giveKw(x,"アクティブ指定");return true}},
    {label:"［京極真］を1枚ターン終了時までAP＋1000",turn1:true,partner:true,can:p=>p.field.some(exactName("京極真")),aiCan:p=>myTurn(p)&&p.field.some(y=>exactName("京極真")(y)&&y.st==="a"),
      run:async p=>{const t=await chooseChar(p,"AP＋1000する［京極真］",mine1(p,exactName("京極真")),{ai:cs=>cs.slice(0,1)});if(t)apTurn(t,1000);return true}}]};

// ================= レベル8 =================
DEF["0022"]={ // 服部平次 B01028
  kwSelf:()=>["アクティブ指定"],
  onContact:async(p,self,ct)=>{if(ct.a!==self&&ct.d!==self)return;self.apC+=1000;log(`　${C(self).nm} をコンタクト中AP＋1000`,"n");
    if(partnerIs(p,"緑")&&myTurn(p)&&!turnCount(self,"hei")&&self.st!=="a"){useTurn(self,"hei");activateC(self)}}};
DEF["0036"]={ // 怪盗キッド B01044
  enter:async p=>{if(!partnerIs(p,"白")||p.deck.length<7)return;
    if(!await yes(p,"怪盗キッド","デッキの上から7枚をリムーブして、キャラを1枚デッキの下に移しますか？",()=>p.deck.length>=17&&oppHas(p,y=>lvOf(y)>=6)))return;
    millSelf(p,7);await bottomChar(p,()=>true)}};
DEF["0052"]={ // 赤井秀一 B01062
  onAction:async(p,self,actor,target)=>{if(target||!partnerIs(p,"赤")||!p.field.includes(actor)||turnCount(self,"aka"))return;useTurn(self,"aka");await rmChar(p,lvLe(7))},
  abilities:[{label:"【赤】のキャラを1枚ターン終了時までAP＋1000",turn1:true,can:()=>allChars().some(y=>hasColor(y,"赤")),aiCan:p=>myTurn(p)&&p.field.some(y=>hasColor(y,"赤")&&y.st==="a"),
    run:async p=>{const t=await chooseChar(p,"AP＋1000する【赤】のキャラ",y=>hasColor(y,"赤"),{ai:ownPick(p)});if(t)apTurn(t,1000);return true}}]};
DEF["0069"]={ // 安室透 B01081
  onAction:async(p,self,actor)=>{if(!partnerIs(p,"黄")||!p.field.includes(actor)||turnCount(self,"amu"))return;useTurn(self,"amu");
    const t=await chooseChar(p,"デッキの上か下に移すキャラ（レベル7以下）",lvLe(7));if(!t)return;
    const top=await pickMode(p,"安室透",["デッキの上に移す","デッキの下に移す"],isOpp(p,t)?1:0)===0;if(top)toDeckTop(t);else toDeckBottom(t)}};
DEF["0206"]={ // 工藤優作 B02039
  enter:async p=>{if(!partnerIs(p,"白"))return;drawN(p,2);await discard(p,2)},
  abilities:[{label:"スリープ: セットされたカードを持ち主の表向きの証拠にし、キャラを1枚リムーブ",turn1:true,
    can:(p,x)=>bondFor(p,x,"黒羽盗一")&&x.st==="a"&&allChars().some(y=>(y.set||[]).some(s=>!s.under)),aiCan:p=>allChars().some(y=>isOpp(p,y)&&(y.set||[]).some(s=>!s.under))&&opp(p).field.length>0,
    run:async(p,x)=>{const ss=[];for(const h of allChars())for(const s of h.set||[])if(!s.under)ss.push({h,s});
      const [c]=await pickCards(p,"証拠にするセットされたカード","",ss.map(e=>e.s.c),{min:1,max:1,ai:cs=>cs.filter(c=>isOpp(p,ss.find(e=>e.s.c===c).h))});
      const e=ss.find(e=>e.s.c===c);if(!e)return false;sleepCost(x);const q=ownerOf(e.h);
      e.h.set.splice(e.h.set.indexOf(e.s),1);c.up=true;q.ev.push(c);log(`　${q.name} は ${C(e.h).nm} にセットされていた ${C(c).nm} を表向きで証拠として得た（証拠${q.ev.length}）`);noteSetOff(q,e.h,c,!e.s.up);
      await rmChar(p,()=>true);return true}}]};
DEF["0207"]={ // 黒羽盗一 B02040
  enter:async p=>{if(partnerIs(p,"白"))await rmChar(p,lvLe(7))},
  abilities:[{label:"他の【白】のキャラにデッキの上から1枚を裏向きでセットし、AP＋2000",turn1:true,can:(p,x)=>p.deck.length>0&&p.field.some(y=>y!==x&&hasColor(y,"白")),
    aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&hasColor(y,"白")&&y.st==="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"セットする【白】のキャラ",mine1(p,y=>y!==x&&hasColor(y,"白")),{ai:cs=>cs.filter(y=>y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t){setTop(p,t);apTurn(t,2000)}return true}}]};
DEF["0261"]={ // 灰原哀 B03003
  abilities:[{label:"スリープ・デッキの上から3枚リムーブ: ［阿笠博士］か［少年探偵団］のキャラがあればレベル8以下をデッキの下へ",turn1:true,
    can:(p,x)=>x.st==="a"&&p.deck.length>=3,aiCan:p=>p.deck.length>10&&oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=8),
    run:async(p,x)=>{sleepCost(x);const xs=millSelf(p,3);if(xs.some(y=>isChar(y)&&(exactName("阿笠博士")(y)||hasTrait(y,"少年探偵団"))))await bottomChar(p,lvLe(8));return true}}]};
DEF["0285"]={ // 服部平次 B03028
  enter:async p=>{digToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"緑"))},
  onEventUse:async(p,self,e)=>{if(!myTurn(p)||!hasColor(e,"緑")||turnCount(self,"hei3")||!p.hand.length)return;
    if(!await yes(p,"服部平次","手札を1枚リムーブして、レベル7以下のキャラをリムーブしますか？",()=>p.hand.length>=2&&oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=7)))return;
    useTurn(self,"hei3");await discard(p,1);await rmChar(p,lvLe(7))}};
DEF["0302"]={ // 京極真 B03047
  apSelf:(p,x)=>bondFor(p,x,"鈴木園子")?1000:0,
  onGuarded:async(p,self,guard)=>{if(apOf(guard)>6000||turnCount(self,"kyo"))return;useTurn(self,"kyo");activateC(self)}};
DEF["0337"]={ // 降谷零 B03084
  enter:async p=>{if(!partnerIs(p,"黄"))return;const o=opp(p);
    if(o.ev.length){const [e]=await pickCards(p,"デッキの下に移す相手の証拠","",o.ev,{max:1,ai:c=>c.slice(-1)});
      if(e){o.ev.splice(o.ev.indexOf(e),1);e.up=false;o.deck.push(e);log(`　${o.name} の証拠を1つデッキの下に移した（証拠${o.ev.length}）`)}}
    const t=await chooseChar(p,"相手が証拠として得るキャラ（レベル7以下）",y=>isOpp(p,y)&&lvOf(y)<=7,{ai:cs=>cs.filter(y=>isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,o.ev.length+1>=o.level?0:1)});
    if(t)charToEvidence(t)},
  abilities:[{label:"〚捜査1〛: レベル5以上ならキャラをAP＋2000",turn1:true,can:p=>opp(p).deck.length>0,aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"),
    run:async p=>{const xs=investigate(p,1);if(xs.some(y=>(C(y).lv||0)>=5)){const t=await chooseChar(p,"AP＋2000するキャラ",()=>true,{ai:ownPick(p)});if(t)apTurn(t,2000)}return true}}]};
DEF["0359"]={ // ジン B03110
  endTurn:async(p,self)=>{if(!partnerIs(p,"黒")||p.file.filter(y=>y!==p.partner).length<2)return;
    const others=allChars().filter(y=>y!==self);const val=q=>others.filter(y=>ownerOf(y)===q).reduce((n,y)=>n+lvOf(y)+2,0);
    if(!await yes(p,"ジン","FILEの上から2枚を手札に加え、手札を2枚リムーブして、このキャラ以外のすべてのキャラをリムーブしますか？",()=>val(opp(p))>=val(p)+6))return;
    for(let i=0;i<2;i++){const y=takeFileTop(p);if(y){y.fu=false;p.hand.push(y);log(`　FILEの上の ${C(y).nm} を手札に`,"n")}}
    await discard(p,2);for(const y of allChars())if(y!==self)removeCard(y,"効果",{by:p,effect:true});await runQueue()}};
DEF["0418"]={ // 服部平次 B04017
  onAllyEnter:async(p,self,y)=>{if(!partnerIs(p,"緑")||!myTurn(p)||!exactName("遠山和葉")(y)||turnCount(self,"hk4"))return;useTurn(self,"hk4");await rmChar(p,apLe(8000))}};
DEF["0420"]={ // 服部平蔵 B04019
  abilities:[{label:"レベル7以上の［服部平次］か［警察］をデッキの下へ: AP8000以下をリムーブし、リムーブエリアのレベル5以下の［警察］をスリープで登場",turn1:true,
    can:(p,x)=>p.field.some(y=>lvOf(y)>=7&&(exactName("服部平次")(y)||y!==x&&hasTrait(y,"警察"))),aiCan:p=>oppAp8(p),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: デッキの下に移すキャラ","",p.field.filter(y=>lvOf(y)>=7&&(exactName("服部平次")(y)||y!==x&&hasTrait(y,"警察"))),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});
      if(!c)return false;toDeckBottom(c);await runQueue();await rmChar(p,apLe(8000));
      const cs=p.rm.filter(y=>isChar(y)&&hasTrait(y,"警察")&&lvOf(y)<=5);
      const [y]=await pickCards(p,"スリープ状態で登場させる［警察］（レベル5以下）","",cs,{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      if(y)await enterByEffect(p,y,"s");return true}}]};
DEF["0428"]={ // 黒羽快斗 B04030
  actionEnd:async(p,self)=>{const xs=p.deck.splice(0,4);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [hit]=await pickCards(p,"公開するレベル8以下の［怪盗キッド］","",xs.filter(y=>isChar(y)&&lvOf(y)<=8&&exactName("怪盗キッド")(y)),{max:1,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
    let rest=xs.filter(y=>y!==hit);if(!p.cpu&&rest.length>1&&typeof orderCards==="function")rest=await orderCards(`${p.name}: 残りを好きな順番でデッキの下へ`,rest);
    p.deck.push(...rest);checkDeck(p);if(!hit)return;log(`　${C(hit).nm} を公開`,"n");
    const enter=p.field.includes(self)&&await pickMode(p,"黒羽快斗",["登場させて、このキャラをリムーブ","手札に加える"],lvOf(hit)>=6?0:1)===0;
    if(enter){await enterByEffect(p,hit,"a");if(p.field.includes(self)){removeCard(self,"効果",{by:p,effect:true});await runQueue()}}
    else{p.hand.push(hit);log(`　${C(hit).nm} を手札に`,"n")}},
  leaveOppTurn:async p=>{const t=await chooseChar(p,"スタンさせるキャラ（レベル8以下）",lvLe(8));if(t)stunC(t)}};
DEF["0444"]={ // 諸星大 B04052
  enter:async p=>{if(partnerIs(p,"赤"))await rmChar(p,y=>lvOf(y)<=8&&y.st==="a")}};
DEF["0470"]={ // スコッチ B04088
  abilities:[{label:"スリープ・相手のキャラ1枚につきデッキの上から2枚リムーブ: AP8000以下をリムーブ",
    can:(p,x)=>partnerIs(p,"黒")&&x.st==="a"&&p.deck.length>=2*opp(p).field.length,aiCan:p=>oppAp8(p)&&p.deck.length-2*opp(p).field.length>=8,
    run:async(p,x)=>{sleepCost(x);millSelf(p,2*opp(p).field.length);await rmChar(p,apLe(8000));return true}}]};
DEF["0472"]={ // ライ B04090
  onCutinInContact:async p=>{await enterFromRm(p,y=>lvOf(y)<=3&&hasColor(y,"黒"),"登場させる【黒】のキャラ（レベル3以下）")}};
DEF["0548"]={ // 鈴木園子 B05046
  endTurn:async p=>{if(p.hand.length<=4)drawN(p,1)},
  enter:async p=>{await rmChar(p,lvLe(7))},
  abilities:[{label:"手札の［鈴木財閥］のキャラを1枚リムーブ: キャラを1枚スリープ",can:p=>p.hand.some(y=>isChar(y)&&hasTrait(y,"鈴木財閥")),
    aiCan:p=>myTurn(p)&&p.hand.filter(y=>isChar(y)&&hasTrait(y,"鈴木財閥")).length>=2&&opp(p).field.some(y=>y.st==="a"&&lvOf(y)>=6),
    run:async p=>{const r=await discard(p,1,"コスト: リムーブする［鈴木財閥］",p,y=>isChar(y)&&hasTrait(y,"鈴木財閥"));if(!r.length)return false;
      const t=await chooseChar(p,"スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t);return true}}]};
DEF["0553"]={ // 京極真 B05051
  noCase:true,
  endTurn:async(p,self)=>{if(bondFor(p,self,"鈴木園子"))drawN(p,1)}};
DEF["0561"]={ // 白馬探 B05059
  onAllyRemoved:async(p,self,info)=>{if(info.turn===p.idx||info.st!=="s"||turnCount(self,"hak"))return;
    if(info.x!==self&&!hasTrait(info.x,"探偵"))return;useTurn(self,"hak");drawN(p,1)},
  abilities:[{label:"他の［探偵］を1枚スリープ: AP8000以下をリムーブ",turn1:true,can:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"&&hasTrait(y,"探偵")),aiCan:p=>oppAp8(p),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: スリープさせる［探偵］","",p.field.filter(y=>y!==x&&y.st==="a"&&hasTrait(y,"探偵")),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});
      if(!c)return false;c.st="s";log(`　コスト: ${C(c).nm} をスリープ`,"n");await rmChar(p,apLe(8000));return true}}]};
DEF["0567"]={ // メアリー B05067
  endTurn:async p=>{if(fileN(p)>5)return;const t=await chooseChar(p,"アクティブにするキャラ（レベル7以下）",y=>lvOf(y)<=7&&y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(t)activateC(t)},
  abilities:[{label:"キャラを1枚リムーブ（FILEが5枚以下）",turn1:true,can:p=>partnerIs(p,"赤")&&fileN(p)<=5&&allChars().length>0,aiCan:p=>opp(p).field.length>0,
    run:async p=>{await rmChar(p,()=>true);return true}}]};
DEF["0590"]={ // 諸伏景光 B05092
  enter:async p=>{if(!p.hand.length)return;
    const xs=await pickCards(p,"デッキの下に移す手札（4枚まで）","移した枚数と同じ数のカードを引きます。",p.hand,{max:4,ai:c=>c.filter(y=>aiCardValue(p,y)<3).slice(0,4)});
    if(!xs.length)return;for(const y of xs){detach(y);p.deck.push(y)}shuffle(p.deck);log(`　${p.name} は手札を${xs.length}枚デッキの下に移し、シャッフル`,"n");drawN(p,xs.length)},
  onAction:async(p,self,actor)=>{if(!p.field.includes(actor)||!hasTrait(actor,"警察")||turnCount(self,"moro"))return;useTurn(self,"moro");
    const t=await chooseChar(p,"デッキの上に移すキャラ（AP7000以下）",apLe(7000));if(t)toDeckTop(t)}};
DEF["0641"]={ // 鬼丸猛 B06018
  enter:async p=>{if(condOk("事件YAIBA",p)!==true||!p.hand.length||!p.rm.some(y=>isChar(y)&&hasTrait(y,"YAIBA")&&lvOf(y)<=5))return;
    if(!await yes(p,"鬼丸猛","手札を1枚リムーブして、リムーブエリアのレベル5以下の［YAIBA］を登場させますか？",()=>p.hand.length>=2))return;
    await discard(p,1);const y=await enterFromRm(p,y=>hasTrait(y,"YAIBA")&&lvOf(y)<=5,"登場させる［YAIBA］（レベル5以下）");
    if(y&&p.field.includes(y)){giveKw(y,"突撃");giveKw(y,"終了時証拠")}}};
DEF["0688"]={ // 中森銀三 B06067
  onAllyContactWin:async(p,self,winner)=>{if(winner===self||!hasTrait(winner,"警察")||turnCount(self,"gin"))return;useTurn(self,"gin");drawN(p,1)},
  abilities:[{label:"手札を1枚リムーブ: ［警察］に相手のアクティブ状態のキャラを指定してアクションできる能力",turn1:true,can:p=>p.hand.length>0&&allChars().some(y=>hasTrait(y,"警察")),
    aiCan:p=>myTurn(p)&&p.hand.length>=3&&!opp(p).field.some(y=>y.st!=="a")&&p.field.some(y=>hasTrait(y,"警察")&&y.st==="a"&&opp(p).field.some(z=>apOf(z)<=apOf(y))),
    run:async p=>{await discard(p,1);const t=await chooseChar(p,"能力を与える［警察］",y=>hasTrait(y,"警察"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});
      if(t)giveKw(t,"アクティブ指定");return true}}]};
DEF["0693"]={ // かぐや B06072
  enter:async p=>{const n=p.rm.filter(y=>hasTrait(y,"YAIBA")).length;
    if(n<=14){await bottomChar(p,lvLe(7));return}
    const o=opp(p);const xs=p.rm.splice(0);p.deck.push(...xs);shuffle(p.deck);log(`　${p.name} はリムーブエリアの${xs.length}枚をデッキの下に移し、シャッフル`,"n");
    await bottomChar(p,()=>true);drawN(p,1);await discard(o,1);gainEv(o,1)}};
DEF["0734"]={ // 江戸川コナン B07002
  enter:async p=>{drawN(p,2);const xs=await discardEach(p,2);
    const det=xs.filter(y=>isChar(y)&&hasTrait(y,"探偵"));
    if(det.length===2&&!colorsOf(C(det[0]).c).some(ch=>hasColor(det[1],ch)))await rmChar(p,apLe(8000))},
  abilities:[{label:"このキャラか［探偵］を1枚スリープ: このターン、相手はカットインと変装を使用できない",
    can:(p,x)=>opp(p).noCiDis!==G.turnNo&&p.field.some(y=>y.st==="a"&&(y===x||hasTrait(y,"探偵"))),
    aiCan:p=>myTurn(p)&&opp(p).hand.length>=2&&p.field.some(y=>y.st==="a")&&p.field.some(y=>y.st==="a"&&hasTrait(y,"探偵")&&!canAct(y,p,"chara")&&!canAct(y,p,"case")),
    run:async(p,x)=>{const cs=p.field.filter(y=>y.st==="a"&&(y===x||hasTrait(y,"探偵")));
      const [c]=await pickCards(p,"コスト: スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>(canAct(a,p,"chara")||canAct(a,p,"case"))-(canAct(b,p,"chara")||canAct(b,p,"case"))||apOf(a)-apOf(b))});
      if(!c)return false;c.st="s";log(`　コスト: ${C(c).nm} をスリープ`,"n");opp(p).noCiDis=G.turnNo;log("　このターン、相手はカットインと変装を使用できない","n");return true}}]};
DEF["0748"]={ // 服部平次 B07016
  onEventUse:async(p,self,e)=>{if(!myTurn(p)||!hasColor(e,"緑")||turnCount(self,"hei7"))return;useTurn(self,"hei7");await rmChar(p,lvLe(8))},
  abilities:[{label:"他のレベル5以上のキャラを1枚スリープ: ターン終了時まで突撃［事件］",turn1:true,can:(p,x)=>partnerIs(p,"緑")&&p.field.some(y=>y!==x&&y.st==="a"&&lvOf(y)>=5),
    aiCan:(p,x)=>myTurn(p)&&x.fresh&&x.st==="a"&&opp(p).ev.length>0&&p.field.some(y=>y!==x&&y.st==="a"&&lvOf(y)>=5&&!canAct(y,p,"chara")&&!canAct(y,p,"case")),
    run:async(p,x)=>{const [c]=await pickCards(p,"コスト: スリープさせるキャラ（レベル5以上）","",p.field.filter(y=>y!==x&&y.st==="a"&&lvOf(y)>=5),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(a)-apOf(b))});
      if(!c)return false;c.st="s";log(`　コスト: ${C(c).nm} をスリープ`,"n");giveKw(x,"突撃［事件］");return true}}]};
DEF["0781"]={ // ルシュファー B07052
  enter:async p=>{digToHand(p,y=>C(y).t==="イベント"&&hasTrait(y,"赤魔術"))}};
DEF["0809"]={ // 安室透 B07081
  enter:async p=>{const y=await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"黄")&&(C(y).lv||0)<=1,"手札に加える【黄】のイベント（レベル1以下）");
    if(y&&p.hand.length>=6)await discard(p,1)},
  abilities:[{label:"スリープ: レベル8以下のキャラをリムーブ",turn1:true,can:(p,x)=>partnerIs(p,"黄")&&x.st==="a"&&p.field.some(y=>y!==x&&hasTrait(y,"喫茶ポアロ")),
    aiCan:p=>oppHas(p,y=>lvOf(y)<=8),run:async(p,x)=>{sleepCost(x);await rmChar(p,lvLe(8));return true}}]};
DEF["0848"]={ // 円谷光彦 B08007
  apSelf:(p,x)=>myTurn(p)&&underN(x)>=1?1000:0,
  kwSelf:(p,x)=>myTurn(p)&&underN(x)>=1?["突撃［キャラ］"]:[],
  abilities:[{label:"【FILE5】手札を1枚リムーブ: このキャラをアクティブに（下に3枚以上）",turn1:true,can:(p,x)=>underN(x)>=3&&condOk("FILE5",p)&&p.hand.length>0&&x.st!=="a",
    aiCan:p=>p.hand.length>=2,run:async(p,x)=>{await discard(p,1);activateC(x);return true}}]};
DEF["0862"]={ // 綾小路文麿 B08022
  enter:async p=>{if(!p.hand.length)return;
    if(!await yes(p,"綾小路文麿","手札を1枚リムーブして、AP8000以下のキャラをリムーブしますか？",()=>p.hand.length>=2&&oppAp8(p)))return;
    await discard(p,1);await rmChar(p,apLe(8000));await pickRmToHand(p,exactName("マロちゃん"),"手札に加える［マロちゃん］")}};
DEF["0969"]={ // 綾小路文麿 B09025
  abilities:[{label:"手札から［マロちゃん］を登場",turn2:true,can:p=>p.hand.some(y=>isChar(y)&&exactName("マロちゃん")(y)),aiCan:p=>myTurn(p)&&p.field.length<5,
    run:async p=>{await playFromHand(p,exactName("マロちゃん"),"登場させる［マロちゃん］");return true}}]};
DEF["1013"]={ // 萩原研二 B09073
  abilities:[{label:"スリープ: AP8000以下をリムーブ（【疾風】を持つキャラがいるとき）",can:(p,x)=>x.st==="a"&&p.field.some(hasGale),aiCan:p=>oppAp8(p),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,apLe(8000));return true}}],
  leaveOppTurn:async p=>{const got=await lookToRm(p,3,y=>isChar(y)&&hasGale(y),"手札に加える【疾風】を持つキャラ");if(got.some(y=>(C(y).lv||0)>=8))await discard(p,1)}};
DEF["1039"]={ // 犯人 B09100
  abilities:[{label:"スリープ: AP8000以下をリムーブ",turn1:true,can:(p,x)=>x.st==="a",aiCan:p=>oppAp8(p),run:async(p,x)=>{sleepCost(x);await rmChar(p,apLe(8000));return true}}]};
DEF["1127"]={ // 山村ミサオ B10071
  onOppAction:async(p,self,actor,target)=>{if(myTurn(p)||target||self.st==="a"||turnCount(self,"misa"))return;
    if(!await yes(p,"山村ミサオ","このキャラをアクティブにしますか？",true))return;useTurn(self,"misa");activateC(self)},
  abilities:[{label:"相手のレベル9以下のキャラを1枚手札に移す",turn1:true,can:(p,x)=>bondFor(p,x,"諸伏景光")&&oppHas(p,lvLe(9)),aiCan:p=>oppHas(p,y=>lvOf(y)>=5&&lvOf(y)<=9),
    run:async p=>{const t=await chooseChar(p,"手札に移す相手のキャラ（レベル9以下）",y=>isOpp(p,y)&&lvOf(y)<=9);if(t)toHandFromField(t);return true}}]};
DEF["0169"]={ // 怪盗キッド D06010
  onAction:async(p,self,actor)=>{if(actor!==self||!partnerIs(p,"白")||turnCount(self,"kid"))return;useTurn(self,"kid");drawN(p,1)}};
DEF["0937"]={ // 横溝重悟 D11005
  enter:async(p,x)=>{if(condOk("事件婚活パーティー",p)===true)await rmChar(p,y=>y!==x&&apOf(y)<=apOf(x))},
  abilities:[{label:"スリープ: 相手のターン終了時まで、相手のキャラはこのキャラを指定できるなら必ず指定してアクションする",can:(p,x)=>x.st==="a",
    aiCan:(p,x)=>myTurn(p)&&!canAct(x,p,"chara")&&!canAct(x,p,"case")&&p.field.some(y=>y!==x&&lvOf(y)>lvOf(x)&&y.st!=="a"),
    run:async(p,x)=>{sleepCost(x);x.tauntT=G.turnNo+1;log(`　相手のターン終了時まで、相手のキャラはアクションするとき ${C(x).nm} を指定できる場合、必ず指定する`,"n");return true}}]};
DEF["1058"]={ // 萩原千速 SP010
  noEvRemove:true,
  gale:async p=>{const o=opp(p);const fd=o.ev.filter(e=>!e.up);if(!fd.length)return;
    const [e]=await pickCards(p,"表向きにする相手の証拠","",fd,{max:1,faceUp:false,ai:c=>c.slice(0,1)});if(e){e.up=true;log(`　${o.name} の裏向きの証拠を1つ表向きにした: ${C(e).nm}`,"n")}}};
DEF["0484"]={ // 安室透 PR096
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||y===self||!hasTrait(y,"喫茶ポアロ")||turnCount(self,"am96"))return;useTurn(self,"am96");
    const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y));if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}},
  abilities:[{label:"スリープ・デッキの上から5枚リムーブ: ［探偵］のキャラがあればレベル8以下をリムーブ",can:(p,x)=>partnerIs(p,"黄")&&x.st==="a"&&p.deck.length>=5,
    aiCan:p=>p.deck.length>=15&&oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=8),
    run:async(p,x)=>{sleepCost(x);if(millSelf(p,5).some(y=>isChar(y)&&hasTrait(y,"探偵")))await rmChar(p,lvLe(8));return true}}]};
DEF["1166"]={ // 工藤有希子 PR328
  onAllyEnter:async(p,self,y)=>{if(!partnerIs(p,"白")||!myTurn(p)||!exactName("工藤優作")(y)||turnCount(self,"yuki"))return;useTurn(self,"yuki");await rmChar(p,apLe(8000))},
  abilities:[{label:"［工藤優作］の【絆】を、指定のカード名のキャラが現場にいるものとして扱う",turn1:true,
    can:(p,x)=>bondFor(p,x,"工藤優作")&&p.field.some(exactName("工藤優作")),aiCan:p=>myTurn(p)&&p.field.some(exactName("工藤優作")),
    run:async p=>{const t=await chooseChar(p,"能力を与える［工藤優作］",mine1(p,exactName("工藤優作")),{ai:cs=>cs.slice(0,1)});
      if(t){t.bondAll=G.turnNo;log(`　ターン終了時まで ${C(t).nm} の【絆】は、指定のカード名のキャラが現場にいるものとして扱う`,"n")}return true}}]};
