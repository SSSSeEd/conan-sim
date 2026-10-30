"use strict";
// カード個別効果（青）。DEF["カードID"]={...} を足す。共通の部品は core.js。

// --- 青単SOSアグロ（毛利蘭） ---
DEF["0530"]={ // 妃弁護士SOS
  solvedTrigger:async p=>{await discard(p,1,"解決編になったとき: 手札をリムーブ")},
  abilities:[{label:"証拠3つを表に: 毛利小五郎に突撃［キャラ］とブレット",turn1:true,
    can:p=>p.solved&&p.ev.filter(e=>!e.up).length>=3&&p.field.some(y=>C(y).nm.includes("毛利小五郎")&&lvOf(y)>=5),
    run:async p=>{if(!flipEvidence(p,3))return false;const cs=p.field.filter(y=>C(y).nm.includes("毛利小五郎")&&lvOf(y)>=5);
      const [y]=await pickCards(p,"突撃［キャラ］とブレットを与える毛利小五郎","",cs,{min:1,max:1});if(y){y.kw.push("突撃","ブレット");log(`　${C(y).nm} に突撃［キャラ］とブレット`,"n")}return true},
    aiCan:p=>opp(p).field.some(y=>y.st!=="a")}]};
DEF["0005"]={ // 工藤新一 B01009
  handLevel:(p,x)=>partnerIs(p,"青")&&allChars().length>=6?4:null,
  abilities:[{label:"デッキの下に移す: LP0以下の【青】のキャラをアクティブ",
    can:(p,x)=>allChars().some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)<=0&&y.st!=="a"),
    run:async(p,x)=>{toDeckBottom(x);const t=await chooseChar(p,"アクティブにするキャラ",y=>hasColor(y,"青")&&lpOf(y)<=0&&y.st!=="a",{ai:cs=>cs.filter(y=>!isOpp(p,y)).sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)activateC(t);return true},
    aiCan:(p,x)=>p.field.some(y=>y!==x&&hasColor(y,"青")&&lpOf(y)<=0&&y.st==="s"&&apOf(y)>=5000)&&opp(p).field.some(y=>y.st!=="a")}]};
DEF["0006"]={ // 毛利小五郎 B01010
  contactWin:async(p,x,victim)=>{if(!p.hand.length)return;
    if(!await yes(p,"毛利小五郎","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=2))return;
    await discard(p,1);gainEv(p,1)}};
DEF["0273"]={ // 津川秀治
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ（AP5000以下）",y=>y.st==="a"&&apOf(y)<=5000);if(t)sleepC(t)},
  cutin:async(p,card,mine)=>{const t=await chooseChar(p,"カットイン: スリープさせるキャラ（AP5000以下）",y=>y.st==="a"&&apOf(y)<=5000);if(t)sleepC(t)}};
DEF["0101"]={ // 灰原哀 D01012
  leaveOppTurn:async(p,x)=>{await lookTop(p,3,y=>C(y).t==="キャラ"&&hasColor(y,"青")&&lvOf(y)<=4,{toField:"s",title:"レベル4以下の【青】のキャラを1枚までスリープ状態で登場"})}};
DEF["0092"]={ // 江戸川コナン D01003
  abilities:[{label:"他のキャラを1枚スリープ: 1枚引いて1枚リムーブ、LP＋1",turn1:true,
    can:(p,x)=>p.field.some(y=>y!==x&&y.st==="a"),
    run:async(p,x)=>{const cs=p.field.filter(y=>y!==x&&y.st==="a");
      const [c]=await pickCards(p,"コスト: スリープさせるキャラ","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;c.st="s";
      drawN(p,1);await discard(p,1);x.lpT+=1;log(`　${C(x).nm} をターン終了時までLP＋1`,"n");return true},
    aiCan:(p,x)=>x.st==="a"&&!x.fresh&&p.field.some(y=>y!==x&&y.st==="a"&&lpOf(y)<=0&&(y.fresh||apOf(y)<3000))}]};
DEF["0415"]={ // 本堂瑛祐
  leaveOppTurn:async(p,x)=>{const t=await chooseChar(p,"スリープさせるキャラ（レベル4以下）",y=>y.st==="a"&&lvOf(y)<=4);if(t)sleepC(t)}};
DEF["0516"]={cutin:async(p,card,mine)=>{if(partnerIs(p,"青")&&colorsOf(C(p.caseC).c).every(ch=>ch==="青"))drawN(p,1)}}; // 江戸川コナン B05010

// --- 青（新一・蘭・小五郎） ---
DEF["0409"]={ // 毛利蘭 B04004
  contactWin:async(p,x)=>{if(turnCount(x,"ran")||!p.hand.length)return;if(!await yes(p,"毛利蘭","手札を1枚リムーブして、証拠を1つ得ますか？",()=>p.hand.length>=2))return;useTurn(x,"ran");await discard(p,1);gainEv(p,1)},
  onOppAction:async(q,self,actor,target)=>{if(!target||!q.field.includes(target)||!named("工藤新一")(target)||!condOk("絆工藤新一",q)||turnCount(self,"ran2"))return;useTurn(self,"ran2");activateC(self)}};
DEF["1073"]={}; // 毛利蘭 B10011（相手のイベントで選ばれない: immune、カットイン: ownCutinAp）
DEF["0735"]={ // 工藤新一 B07003（手札の【青】にカットインを与える: FX.grantedCutin）
  enter:async(p,x)=>{if(!partnerIs(p,"青"))return;const o=opp(p);const t=await chooseChar(p,"デッキの下に移す相手のキャラ（レベル8以下）",y=>isOpp(p,y)&&lvOf(y)<=8);if(!t)return;
    const nm=C(t).nm;toDeckBottom(t);const cs=o.rm.filter(y=>C(y).nm===nm);
    if(cs.length){const [y]=await pickCards(p,"相手のリムーブエリアから同じカード名のキャラをデッキの下へ","",cs,{max:1,ai:c=>c.slice(0,1)});if(y){detach(y);o.deck.push(y);log(`　${o.name} の ${C(y).nm} をデッキの下へ`,"n")}}}};
DEF["0949"]={ // 毛利蘭 B09004
  onReveal:async(p,self,y)=>{if(!condOk("絆工藤新一",p)||!myTurn(p)||turnCount(self,"ran3")||!named("工藤新一","毛利蘭")(y)||!oppHas(p,lvLe(7)))return;
    if(!await yes(p,"毛利蘭","手札を1枚リムーブして、レベル7以下のキャラをリムーブしますか？",()=>p.hand.length>=2))return;useTurn(self,"ran3");await discard(p,1);await rmChar(p,lvLe(7))}};
DEF["0727"]={ // 毛利小五郎 PR174
  enter:async p=>{if(p.solved)return;const f=y=>hasTrait(y,"毛利探偵事務所");if(!p.hand.some(f))return;
    if(!await yes(p,"登場時","手札の［毛利探偵事務所］を1枚リムーブして、2枚引きますか？",true))return;await discard(p,1,"リムーブする［毛利探偵事務所］",p,f);drawN(p,2)},
  apSelf:p=>p.solved&&myTurn(p)&&p.field.filter(y=>hasTrait(y,"毛利探偵事務所")).length>=3?2000:0};
DEF["0408"]={ // 工藤新一 B04003（選ばれたときの無効: negateChosen）
  abilities:[{label:"【スリープ】［毛利蘭］を公開: AP8000以下のキャラをデッキの下へ",turn1:true,can:(p,x)=>x.st==="a"&&p.hand.some(named("毛利蘭")),aiCan:p=>oppHas(p,y=>apOf(y)<=8000&&lvOf(y)>=5),
    run:async(p,x)=>{if(!await revealFromHand(p,named("毛利蘭"),"公開する［毛利蘭］",{must:true}))return false;sleepCost(x);await bottomChar(p,y=>y!==x&&apLe(8000)(y));return true}}]};
DEF["1057"]={ // 工藤新一 PR274
  apAura:(q,self,y)=>G.turn===q.idx&&y!==self&&q.field.includes(y)&&colorsOf(C(q.caseC).c).some(ch=>ch!=="青")?1000:0,
  abilities:[{label:"【スリープ】: レベル9以下のキャラをリムーブ",can:(p,x)=>x.st==="a"&&allChars().some(y=>y!==x&&lvOf(y)<=9),aiCan:p=>oppHas(p,y=>lvOf(y)>=6&&lvOf(y)<=9),
    run:async(p,x)=>{sleepCost(x);await rmChar(p,y=>y!==x&&lvLe(9)(y));return true}}]};
DEF["1071"]={ // 工藤新一 B10009
  enter:async(p,x)=>{if(x.viaAb)apTurn(x,1000);
    if(partnerIs(p,"青")&&await revealFromHand(p,named("毛利蘭"),"公開する［毛利蘭］",{ai:c=>myTurn(p)?c.slice(0,1):[]}))giveKw(x,"突撃")}};
DEF["0947"]={ // 工藤新一&毛利蘭 B09002
  onAllyEnter:async(p,self,y)=>{if(y===self||!myTurn(p)||turnCount(self,"sr")||!named("工藤新一","毛利蘭")(y))return;if(!oppHas(p,lvLe(9)))return;useTurn(self,"sr");
    const t=await chooseChar(p,"リムーブかデッキの下に移す相手のキャラ（レベル9以下）",z=>isOpp(p,z)&&lvOf(z)<=9);if(!t)return;
    const v=p.cpu?"rm":await ask(`${p.name}: 工藤新一&毛利蘭`,`${C(t).nm} をどうしますか？`,[{label:"リムーブ",value:"rm",primary:true},{label:"デッキの下へ",value:"bottom"}]);
    if(v==="rm")rmBy(p,t);else toDeckBottom(t)},
  endTurn:async(p,self)=>{const f=y=>lvOf(y)>=8&&y.st!=="a"&&named("工藤新一","毛利蘭")(y);if(!p.field.some(f))return;
    if(!await revealFromHand(p,named("工藤新一","毛利蘭"),"ターン終了時: 公開する［工藤新一］か［毛利蘭］"))return;
    const t=await chooseChar(p,"アクティブにするキャラ",y=>!isOpp(p,y)&&f(y),{ai:cs=>cs.slice(0,1)});if(t)activateC(t)},
  partnerToo:true};
DEF["0512"]={ // 毛利小五郎 B05006
  abilities:[{label:"アクティブなら突撃／スリープかスタンならAP8000以下をリムーブして1枚引く",turn1:true,
    can:(p,x)=>partnerIs(p,"青")&&p.field.some(y=>C(y).nm.includes("妃英理")||y!==x&&hasTrait(y,"毛利探偵事務所")),aiCan:(p,x)=>x.st==="a"?x.fresh&&!canAct(x,p,"chara"):oppHas(p,apLe(8000)),
    run:async(p,x)=>{if(x.st==="a")giveKw(x,"突撃");else{await rmChar(p,y=>y!==x&&apLe(8000)(y));drawN(p,1)}return true}}]};
DEF["0631"]={ // 江戸川コナン B06006
  apSelf:(p,x)=>myTurn(p)?1000*(x.set||[]).filter(s=>s.under).length:0,
  enter:async(p,x)=>{millSelf(p,1);const cs=p.rm.filter(y=>isChar(y)&&(hasTrait(y,"探偵")||hasTrait(y,"少年探偵団")));
    const got=await pickCards(p,"このキャラの下に重ねるキャラ（2枚まで）","",cs,{max:2,ai:c=>c.slice(0,2)});
    for(const y of got){detach(y);x.set.push({c:y,up:true,under:true})}if(got.length)log(`　${C(x).nm} の下に${got.length}枚重ねた`,"n")}};

// --- 青単少年探偵団 ---
const DBOYS=y=>isChar(y)&&hasTrait(y,"少年探偵団");
const underN=x=>(x.set||[]).filter(s=>s.under).length;
function stackUnder(x,ys){for(const y of ys){detach(y);x.set=x.set||[];x.set.push({c:y,up:true,under:true})}if(ys.length)log(`　${C(x).nm} の下に${ys.length}枚重ねた（${underN(x)}枚）`,"n")}
DEF["0002"]={ // 灰原哀 B01006（選ばれない: immune）
  abilities:[{label:"【スリープ】: 手札からレベル5以下の［少年探偵団］を登場",can:(p,x)=>x.st==="a"&&p.field.length<5&&p.hand.some(y=>DBOYS(y)&&lvOf(y)<=5),
    run:async(p,x)=>{sleepCost(x);const y=await playFromHand(p,y=>DBOYS(y)&&lvOf(y)<=5);if(y&&C(y).nm.includes("江戸川コナン"))drawN(p,1);return true}}]};
DEF["0514"]={ // 灰原哀 B05008（選ばれない: immune）
  abilities:[{label:"他の［少年探偵団］に突撃［キャラ］",turn1:true,can:(p,x)=>p.solved&&p.field.some(y=>y!==x&&DBOYS(y)),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&DBOYS(y)&&y.fresh&&y.st==="a"&&!canAct(y,p,"chara"))&&opp(p).field.some(y=>y.st!=="a"),
    run:async(p,x)=>{const t=await chooseChar(p,"突撃［キャラ］を与える［少年探偵団］",y=>y!==x&&!isOpp(p,y)&&DBOYS(y),{ai:cs=>cs.filter(y=>y.fresh).slice(0,1)});if(t)giveKw(t,"突撃［キャラ］");return true}}]};
DEF["0264"]={ // 結成 少年探偵団 B03006
  enter:async(p,x)=>{const cs=[],seen=new Set;for(const y of p.rm)if(DBOYS(y)&&!seen.has(C(y).nm)){seen.add(C(y).nm);cs.push(y)}
    let got=await pickCards(p,"このキャラの下に重ねるキャラ（カード名が異なるものを5枚まで）","",p.rm.filter(DBOYS),{max:5,ai:()=>cs.slice(0,5)});
    const names=new Set;got=got.filter(y=>!names.has(C(y).nm)&&names.add(C(y).nm));stackUnder(x,got)},
  kwSelf:(p,x)=>underN(x)>=1?["突撃"]:[],
  onAction:async(p,self,actor)=>{if(actor!==self)return;if(underN(self)>=3)drawN(p,1);if(underN(self)>=5)gainEv(p,1)}};
DEF["0489"]={ // 江戸川コナン D08003
  enter:async(p,x)=>{if(!partnerIs(p,"青")||!p.hand.some(DBOYS)||!oppHas(p,apLe(8000)))return;
    if(!await yes(p,"登場時","手札の［少年探偵団］を1枚リムーブして、AP8000以下のキャラをリムーブしますか？",true))return;await discard(p,1,"リムーブする［少年探偵団］",p,DBOYS);await rmChar(p,y=>y!==x&&apLe(8000)(y))},
  endTurn:async p=>{if(p.field.filter(DBOYS).length>=3)drawN(p,1)}};
DEF["0511"]={...DEF["0511"],partial:false, // 江戸川コナン＆工藤新一 B05005
  abilities:DEF["0511"].abilities.map(a=>({...a,partner:true})),
  onHintUse:async(p,self,y)=>{if(!partnerIs(p,"青")||!hasColor(y,"青")||turnCount(self,"ch"))return;useTurn(self,"ch");await bottomChar(p,z=>z!==self&&apLe(8000)(z))}};
DEF["0630"]={ // 阿笠博士 B06005
  enter:async(p,x)=>{const got=await pickCards(p,"このキャラの下に重ねる［少年探偵団］（2枚まで）","",p.rm.filter(DBOYS),{max:2,ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,2)});
    if(!got.length)return;const s=got.reduce((n,y)=>n+(C(y).lv||0),0);stackUnder(x,got);await rmChar(p,y=>y!==x&&lvOf(y)<=s,`リムーブするキャラ（レベル${s}以下）`)},
  abilities:[{label:"【スリープ】: 下に重なっているカードを2枚まで他のキャラの下へ",turn1:true,noAi:true,can:(p,x)=>x.st==="a"&&underN(x)>0&&p.field.some(y=>y!==x),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"重ねる先のキャラ",y=>y!==x&&!isOpp(p,y));if(!t)return true;
      const us=x.set.filter(s=>s.under);const got=await pickCards(p,"移すカード（2枚まで）","",us.map(s=>s.c),{max:2});
      for(const c of got){const s=x.set.find(s=>s.c===c);x.set.splice(x.set.indexOf(s),1);t.set=t.set||[];t.set.push(s)}log(`　${got.length}枚を ${C(t).nm} の下に移した`,"n");return true}}]};
DEF["0632"]={ // 灰原哀 B06007
  enter:async(p,x)=>{if(!partnerIs(p,"青"))return;const f=y=>isOpp(p,y)&&lvOf(y)<=7;
    const v=p.cpu?(oppHas(p,f)?2:myTurn(p)?1:3):await ask(`${p.name}: 灰原哀 登場時`,"1つ選んで行います",[{label:"突撃を得る",value:1,primary:true},{label:"相手のレベル7以下を手札に移す",value:2},{label:"2枚引く",value:3}]);
    if(v===1)giveKw(x,"突撃");else if(v===2){const t=await chooseChar(p,"手札に移す相手のキャラ（レベル7以下）",f);if(t)toHandFromField(t)}else drawN(p,2)}};
DEF["0740"]={ // 小嶋元太 B07008
  handLevel:(p,x)=>partnerIs(p,"青")&&p.solved&&myTurn(p)?Math.max(0,(C(x).lv||0)-p.field.filter(y=>DBOYS(y)||C(y).nm.includes("阿笠博士")).length):null,
  enter:async(p,x)=>{const f=y=>isOpp(p,y)&&lvOf(y)<=8;if(p.file.length<5||!oppHas(p,f)||!await yes(p,"登場時","このキャラをスリープさせて、相手のレベル8以下を手札に移しますか？",true))return;
    sleepC(x);const t=await chooseChar(p,"手札に移す相手のキャラ（レベル8以下）",f);if(t)toHandFromField(t)}};
DEF["0742"]={ // 円谷光彦 B07010
  enter:async p=>{const xs=p.deck.slice(0,2);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [y]=await pickCards(p,"手札に加える［少年探偵団］（1枚まで）","残りはリムーブエリアへ",xs.filter(DBOYS),{max:1,ai:c=>c.slice(0,1)});
    for(const z of xs){detach(z);if(z===y){p.hand.push(z);log(`　${C(z).nm} を手札に`)}else p.rm.push(z)}checkDeck(p);if(y&&p.solved)await discard(p,1)},
  abilities:[{label:"【スリープ】: ［少年探偵団］をAP＋3000",can:(p,x)=>x.st==="a"&&allChars().some(DBOYS),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&DBOYS(y)&&y.st==="a"&&canAct(y,p,"chara")),
    run:async(p,x)=>{sleepCost(x);const t=await chooseChar(p,"AP＋3000する［少年探偵団］",DBOYS,{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").slice(0,1)});if(t)apTurn(t,3000);return true}}]};
