"use strict";
// カード個別効果（レベル4、2026-11-10）。部品は lv5.js・lv7.js・mr8.js・main.js のものを使う。
// 追加した仕組み:
//  - DEF の leaveAny(p,x,info)（相手ターンでなくても【現場リムーブ時】。info.why==="コンタクト" でコンタクトによるリムーブを判定）・noLeaveOnContact（白馬探 B10039）
//  - onOppReason(p,self,x)（相手のキャラが推理したとき）・onOppCutDis(p,self,ct,q)（相手がカットインか変装を使用したとき）・onMisread(p,self)（ミスリードしたとき）
//  - DEF の forceByEvt（相手はイベントの効果で選べるなら必ず選ぶ。core.js chooseChar）・noOppCutin は関数も可（q,y）
//  - x.entSrc（能力・効果で登場させたカードのレベルと種類。FX.event も G.fxSrc を設定）・ALIAS の水無怜奈（本堂瑛海としても扱う）

// --- 部品 ---
const shonen4=y=>isChar(y)&&hasTrait(y,"少年探偵団")&&(C(y).lv||0)===4;
const revealTopYes=async(p,okF,title)=>{const y=p.deck.shift();if(!y)return null;checkDeck(p);log(`　デッキの上: ${C(y).nm} を公開`,"n");
  if(okF(y)){p.hand.push(y);log(`　${C(y).nm} を手札に`,"n")}else{p.deck.push(y);log("　デッキの下に移した","n")}return y};
const lookTop2=(p,n,f,title,{max=1,pay=0}={})=>lookTop(p,n,f,{max,title}).then(async got=>{if(got.length&&pay)await discard(p,pay);return got});
const faceDownSetOf=q=>q.field.filter(y=>faceDownSet(y).length);
const oppTop=(p)=>{const o=opp(p);return o.deck[0]};

// ================= 青 =================
DEF["0009"]={enter:async p=>{await lookTop(p,2,y=>isChar(y)&&hasColor(y,"青")&&lpOf(y)===0&&(C(y).lp||0)===0,{max:1,title:"手札に加えるLP0の【青】のキャラ"})}}; // 妃英理 B01009
DEF["0010"]={ // 小嶋元太 B01014
  enter:async(p,x)=>{const s=x.entSrc;if(!s||s.lv<3||!(s.t==="キャラ"||s.t==="イベント"))return;await rmChar(p,y=>lvOf(y)<=5)}};
DEF["0013"]={ // 本堂瑛祐 B01017
  onReason:async(p,self,x)=>{if(x===self)await lookTop(p,2,y=>isChar(y)&&hasTrait(y,"探偵"),{max:1,title:"手札に加える［探偵］"})},
  hirameki:async o=>{drawN(o,1)}};
DEF["0181"]={ // 小林澄子 B02009
  enter:async p=>{const t=await chooseChar(p,"AP＋1000する［少年探偵団］",y=>hasTrait(y,"少年探偵団"),{ai:cs=>cs.filter(y=>!isOpp(p,y)&&y.st==="a").sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(t)apTurn(t,1000)},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"少年探偵団"),"手札に加える［少年探偵団］")}};
DEF["0265"]={ // 赤木英雄 B03007
  enter:async p=>{if((await lookTop(p,4,y=>C(y).t==="イベント",{max:1,title:"手札に加えるイベント"})).length)await discard(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0267"]={enter:async p=>{if(opp(p).field.filter(y=>y.st!=="a").length>=3)drawN(p,1)}}; // 栗山緑 B03009（ミスリードは state.js）
DEF["0274"]={ // 円谷光彦 B03016
  abilities:[{label:"スリープ: デッキの上を公開し、［阿笠博士］か［少年探偵団］なら手札、それ以外はデッキの下",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:(p,x)=>p.deck.length>5&&(!myTurn(p)||!canAct(x,p,"chara")),
    run:async(p,x)=>{sleepCost(x);await revealTopYes(p,y=>isChar(y)&&(exactName("阿笠博士")(y)||hasTrait(y,"少年探偵団")));return true}}]};
DEF["0280"]={apSelf:(p,x)=>p.field.length===1&&p.field[0]===x?2000:0}; // 若狭留美 B03022
DEF["0281"]={ // 脇田兼則 B03023
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||!hasTrait(y,"毛利探偵事務所")||turnCount(self,"waki4"))return;useTurn(self,"waki4");const o=opp(p);const t=o.deck[0];if(t)log(`　${o.name} のデッキの上: ${C(t).nm} を公開`,"n")},hirameki:async o=>{drawN(o,1)}};
DEF["0959"]={ // 小嶋元太 B09014
  onAllyGuard:async(p,self,guard)=>{if(guard!==self||myTurn(p)||turnCount(self,"gen4")||!p.field.some(y=>y!==self&&!exactName("小嶋元太")(y)&&shonen4(y)))return;useTurn(self,"gen4");apTurn(self,2000)}};
DEF["0956"]={ // 灰原哀 B09011
  abilities:[{label:"元のLPが0でレベル4の［少年探偵団］全員を、ターン終了時まで元のLP1にする",turn1:true,can:p=>p.field.some(y=>(C(y).lp||0)===0&&shonen4(y)),aiCan:p=>myTurn(p)&&p.field.some(y=>(C(y).lp||0)===0&&shonen4(y)&&y.st==="a"),
    run:async p=>{for(const y of p.field.filter(y=>(C(y).lp||0)===0&&shonen4(y))){y.lpT+=1;log(`　${C(y).nm} をターン終了時までLP1に`,"n")}return true}}],
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&(C(y).lp||0)===0&&hasTrait(y,"少年探偵団"),"手札に加えるLP0の［少年探偵団］")}};
DEF["0961"]={ // 円谷光彦 B09016
  onMisread:async(o,self)=>{if(turnCount(self,"mits4")||!o.field.some(y=>y!==self&&!exactName("円谷光彦")(y)&&shonen4(y)))return;useTurn(self,"mits4");activateC(self)}};
DEF["0962"]={ // 吉田歩美 B09017
  noOppCutin:(q,y)=>G.turn!==q.idx&&q.field.some(z=>z!==y&&!exactName("吉田歩美")(z)&&shonen4(z))};
DEF["0494"]={ // 吉田歩美 D08013
  enter:async p=>{gainEv(p,1);if(p.ev.length){const [e]=await pickCards(p,"手札に加える自分の証拠","",p.ev,{min:1,max:1,faceUp:false,ai:c=>c.slice(0,1)});if(e){p.ev.splice(p.ev.indexOf(e),1);e.up=false;p.hand.push(e);log("　証拠を1つ手札に加えた","n")}}await discard(p,1)},
  hirameki:async o=>{drawN(o,1)}};
DEF["0525"]={ // 中道和志 B05019
  onReason:async(p,self,x)=>{if(!exactName("毛利小五郎")(x)||!p.field.includes(self))return;
    if(!await yes(p,"中道和志","このキャラをリムーブして、LP0のキャラをLP＋1しますか？",()=>p.field.some(y=>lpOf(y)===0&&y.st==="a")))return;
    removeCard(self,"効果",{by:p,effect:true});await runQueue();const t=await chooseChar(p,"LP＋1するLP0のキャラ",y=>lpOf(y)===0,{ai:cs=>cs.filter(y=>!isOpp(p,y)).slice(0,1)});if(t){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}}};

// ================= 赤 =================
DEF["0059"]={enter:async p=>{const o=opp(p);if(await yes(p,"赤井務武","相手に証拠を1つ与えて、1枚引きますか？",()=>o.ev.length+1<o.level-1)){gainEv(o,1);drawN(p,1)}}}; // 赤井務武 B01069
DEF["0064"]={ // 羽田秀𠮷 B01074
  onReason:async(p,self,x)=>{if(x!==self)return;const o=opp(p);log(`　${o.name} の手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`,"n")},hirameki:async o=>{drawN(o,1)}};
DEF["0223"]={enter:async p=>{const t=await chooseChar(p,"AP－1000するキャラ");if(t)apTurn(t,-1000)}}; // ジョディ・スターリング B02060
DEF["0330"]={ // 世良真純 B03076
  enter:async p=>{const o=opp(p);const e=[...o.ev].reverse().find(e=>!e.up);if(e)flipUp(o,e)},hirameki:async o=>{drawN(o,1)}};
DEF["0331"]={ // 水無怜奈 B03077
  enter:async p=>{if(!p.ev.length)return;if(!await yes(p,"水無怜奈","自分の証拠を1つ手札に加えて、手札を1枚裏向きで証拠にしますか？",()=>false))return;
    const e=p.ev.pop();e.up=false;p.hand.push(e);log("　証拠を1つ手札に加えた","n");const [h]=await pickCards(p,"裏向きで証拠にする手札","",p.hand,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b))});
    if(h){p.hand.splice(p.hand.indexOf(h),1);h.up=false;p.ev.push(h);log("　手札を裏向きで証拠にした","n")}},hirameki:async o=>{drawN(o,1)}};
DEF["0450"]={leaveOppTurn:async p=>{const t=await chooseChar(p,"スリープさせるキャラ（レベル5以下）",y=>lvOf(y)<=5&&y.st==="a");if(t)sleepC(t)}}; // 水無怜奈 B04059
DEF["0573"]={ // 大橋彩代 B05073
  abilities:[{label:"他の【青】か【赤】のキャラをAP＋1000",turn1:true,can:(p,x)=>allChars().some(y=>y!==x&&(hasColor(y,"青")||hasColor(y,"赤"))),aiCan:(p,x)=>myTurn(p)&&p.field.some(y=>y!==x&&y.st==="a"&&(hasColor(y,"青")||hasColor(y,"赤"))),
    run:async(p,x)=>{const t=await chooseChar(p,"AP＋1000するキャラ",y=>y!==x&&(hasColor(y,"青")||hasColor(y,"赤")),{ai:ownPick(p)});if(t)apTurn(t,1000);return true}}]};
DEF["0576"]={oppEndTurn:async(q,self)=>{if(!q.solved||q.field.length>2)return;const o=opp(q);await discard(o,1)}}; // ジョディ・スターリング B05076（自分の現場2枚以下で、相手＝ターンの人が手札リムーブ）
DEF["0578"]={ // 世良真純 B05078
  enter:async p=>{if((await lookTop(p,4,y=>isChar(y)&&(hasTrait(y,"赤井家")||hasTrait(y,"探偵")),{max:1,title:"手札に加える［赤井家］か［探偵］"})).length)await discard(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0580"]={ // 羽田秀𠮷 B05080
  onOppReason:async(p,self,x)=>{if(turnCount(self,"hada4")||!p.hand.length||!allChars().includes(x))return;
    if(!await yes(p,"羽田秀𠮷",`手札を1枚リムーブして、${C(x).nm} をターン終了時までLP－1しますか？`,()=>p.hand.length>=3))return;useTurn(self,"hada4");await discard(p,1);x.lpT-=1;log(`　${C(x).nm} をターン終了時までLP－1`,"n")}};
DEF["0803"]={ // ジョディ・スターリング B07074
  enter:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"手札を1枚リムーブ: キャラをAP＋1000",can:p=>p.hand.length>0,aiCan:p=>myTurn(p)&&p.hand.length>=3&&p.field.some(y=>y.st==="a"),
    run:async p=>{await discard(p,1);await ownAp(p,1000,"AP＋1000するキャラ");return true}}]};
DEF["0890"]={ // イーサン・本堂 B08052
  abilities:[{label:"このキャラをデッキの下へ: レベル5以下の【黒】をリムーブ、または［本堂瑛海］か［本堂瑛祐］を手札に",can:(p,x)=>oppHas(p,y=>hasColor(y,"黒")&&lvOf(y)<=5)||p.rm.some(anyExact("本堂瑛海","本堂瑛祐")),aiCan:p=>oppHas(p,y=>hasColor(y,"黒")&&lvOf(y)<=5),
    run:async(p,x)=>{toDeckBottom(x);await runQueue();const a=oppHas(p,y=>hasColor(y,"黒")&&lvOf(y)<=5),b=p.rm.some(anyExact("本堂瑛海","本堂瑛祐"));
      const i=a&&b?await pickMode(p,"イーサン・本堂",["レベル5以下の【黒】をリムーブ","［本堂瑛海］か［本堂瑛祐］を手札に"],0):a?0:1;
      if(i===0)await rmChar(p,y=>hasColor(y,"黒")&&lvOf(y)<=5);else await pickRmToHand(p,anyExact("本堂瑛海","本堂瑛祐"),"手札に加える［本堂瑛海］か［本堂瑛祐］");return true}}]};
DEF["1002"]={ // 沖矢昴 B09060
  abilities:[{label:"手札のキャラをリムーブ: ［FBI］ならAP＋1000と突撃［事件］、［赤井家］なら…（FILE7）",turn1:true,can:p=>condOk("FILE7",p)&&p.hand.some(isChar),aiCan:()=>false,
    run:async(p,x)=>{const [h]=await discard(p,1,"コスト: リムーブする手札のキャラ",p,isChar);if(!h)return false;
      if(hasTrait(h,"FBI")){apTurn(x,1000);giveKw(x,"突撃［事件］")}
      if(hasTrait(h,"赤井家")){x.lpT+=1;log(`　${C(x).nm} をターン終了時までLP＋1`,"n")}return true}}]};
DEF["1003"]={ // ジェイムズ・ブラック B09061
  enter:async p=>{const cs=p.hand.filter(y=>isChar(y)&&hasTrait(y,"FBI"));if(cs.length<3)return;if(!await yes(p,"ジェイムズ・ブラック","手札の［FBI］を3枚公開して、1枚引きますか？",true))return;
    const xs=await pickCards(p,"公開する［FBI］（3枚）","",cs,{min:3,max:3,ai:c=>c.slice(0,3)});for(const y of xs){log(`　${p.name} は手札の ${C(y).nm} を公開`,"n");await FX.onReveal(p,y)}drawN(p,1)},
  hirameki:async o=>{if(await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"FBI"),"手札に加える［FBI］"))await discard(o,1)}};
DEF["1005"]={ // 谷森棋士 B09063
  onAllyEnter:async(p,self,y)=>{if(!myTurn(p)||lvOf(y)!==8||turnCount(self,"tani4")||opp(p).field.some(z=>lvOf(z)===7))return;useTurn(self,"tani4");drawN(p,1)}};
DEF["1115"]={ // 勝又水菜 B10056
  apAura:(q,self,y)=>G.turn===q.idx&&q.field.includes(y)&&y!==self&&(hasTrait(y,"女流棋士")||hasTrait(y,"棋士"))?1000:0,
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&(hasTrait(y,"女流棋士")||hasTrait(y,"棋士")),"手札に加える［女流棋士］か［棋士］")}};

// ================= 黄 =================
DEF["0081"]={ // 目暮十三 B01093（ミスリードは state.js）
  enter:async p=>{const o=opp(p);const t=o.deck[0];if(!t)return;log(`　${o.name} のデッキの上: ${C(t).nm} を公開`,"n");
    const down=await pickMode(p,"目暮十三",["デッキの上のまま","デッキの下に移す"],(C(t).lv||0)>=6?0:1)===1;if(down){o.deck.shift();o.deck.push(t);log("　デッキの下に移した","n")}},hirameki:async o=>{drawN(o,1)}};
DEF["0241"]={ // 三池苗子 B02080
  onAllyCutin:async(p,self,mine)=>{if(!myTurn(p)||!mine||!hasTrait(mine,"警察")||turnCount(self,"miike")||!p.field.includes(self))return;useTurn(self,"miike");mine.apC+=1000;log(`　${C(mine).nm} をコンタクト中AP＋1000`,"n")}};
DEF["0349"]={ // 目暮十三 B03096
  onReason:async(p,self,x)=>{if(turnCount(self,"megu4")||!p.field.includes(x))return;useTurn(self,"megu4");const xs=investigate(p,1);if(xs.some(y=>(C(y).lv||0)>=8))drawN(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0256"]={ // 白鳥任三郎 B04075
  onOppCutDis:async(p,self,ct)=>{if(turnCount(self,"shira4")||!G.contact)return;useTurn(self,"shira4");
    const t=await chooseChar(p,"AP－1000するコンタクト中のキャラ",y=>y===G.contact.a||y===G.contact.d,{ai:cs=>cs.filter(y=>isOpp(p,y))});if(t){t.apC-=1000;log(`　${C(t).nm} をコンタクト中AP－1000`,"n")}},hirameki:async o=>{drawN(o,1)}};
DEF["0466"]={ // 横溝重悟 B04081
  abilities:[{label:"デッキの下へ: LP0の［警察］をLP＋1かAP＋2000",can:p=>p.field.some(y=>lpOf(y)===0&&hasTrait(y,"警察")),aiCan:p=>myTurn(p)&&p.field.some(y=>lpOf(y)===0&&hasTrait(y,"警察")&&y.st==="a"),
    run:async(p,x)=>{toDeckBottom(x);await runQueue();const t=await chooseChar(p,"対象のLP0の［警察］",mine1(p,y=>lpOf(y)===0&&hasTrait(y,"警察")),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(!t)return true;
      if(await pickMode(p,"横溝重悟",["LP＋1","AP＋2000"],1)===0){t.lpT+=1;log(`　${C(t).nm} をターン終了時までLP＋1`,"n")}else apTurn(t,2000);return true}}],
  hirameki:async o=>{await pickRmToHand(o,exactName("萩原千速"),"手札に加える［萩原千速］")}};
DEF["0467"]={ // 米原桜子 B04082
  onAction:async(p,self,actor)=>{if(!exactName("千葉和伸")(actor)||turnCount(self,"yone4"))return;useTurn(self,"yone4");await pickRmToHand(p,exactName("三池苗子"),"手札に加える［三池苗子］")}};
DEF["0591"]={ // 榎本梓 B05093
  enter:async p=>{const xs=p.deck.splice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を公開: ${xs.map(y=>C(y).nm).join("、")}`,"n");
    const ok=xs.filter(y=>C(y).t==="イベント"||isChar(y)&&hasTrait(y,"喫茶ポアロ"));const o=opp(p);
    const [c]=await pickCards(o,"相手の手札に加わるカードを選ぶ（イベントか［喫茶ポアロ］）","",ok,{max:1,ai:c=>c.slice().sort((a,b)=>aiCardValue(p,a)-aiCardValue(p,b)).slice(0,1)});
    if(c){p.hand.push(c);log(`　${C(c).nm} を手札に`,"n")}let rest=xs.filter(y=>y!==c);if(!p.cpu&&rest.length>1&&typeof orderCards==="function")rest=await orderCards(`${p.name}: 残りを好きな順番でデッキの下へ`,rest);p.deck.push(...rest);checkDeck(p)}};
DEF["0592"]={leaveOppTurn:async p=>{digToHand(p,y=>isChar(y)&&hasTrait(y,"長野県警"))},hirameki:async o=>{drawN(o,1)}}; // 甲斐玄人 B05094
DEF["0830"]={ // バーボン B07103
  enter:async p=>{drawN(p,1);await discard(p,1)},
  abilities:[{label:"【解決編】相手のキャラをターン終了時までレベル－1",turn1:true,can:p=>p.solved&&opp(p).field.length>0,aiCan:p=>myTurn(p)&&oppHas(p,y=>lvOf(y)>=5),
    run:async p=>{const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y));if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}return true}}]};
DEF["1018"]={ // 榎本梓 B09078
  enter:async p=>{if(p.solved)return;const xs=p.deck.splice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const wy=y=>hasColor(y,"白")||hasColor(y,"黄");const [c]=await pickCards(p,"手札に加える【白】か【黄】のキャラ","",xs.filter(y=>isChar(y)&&wy(y)),{max:1,ai:c=>c.slice(0,1)});
    const [e]=await pickCards(p,"手札に加える【白】か【黄】のイベント","",xs.filter(y=>C(y).t==="イベント"&&wy(y)),{max:1,ai:c=>c.slice(0,1)});
    const got=[c,e].filter(Boolean);for(const y of got)p.hand.push(y);for(const y of xs)if(!got.includes(y))p.rm.push(y);log(`　手札に${got.length}枚、リムーブエリアに${xs.length-got.length}枚`,"n");checkDeck(p);if(got.length===2)await discard(p,1)},
  onAllyEnter:async(p,self,y)=>{if(!p.solved||!myTurn(p)||turnCount(self,"enm9")||!(y===self||anyExact("安室透","怪盗キッド")(y)))return;useTurn(self,"enm9");
    const t=await chooseChar(p,"レベル－1する相手のキャラ",y=>isOpp(p,y));if(t){t.lvT=(t.lvT||0)-1;log(`　${C(t).nm} をターン終了時までレベル－1`,"n")}}};
DEF["1023"]={ // 千葉和伸 B09083
  abilities:[{label:"このキャラをリムーブエリアへ: ［佐藤美和子］か［高木渉］をAP＋2000",can:p=>p.field.some(anyExact("佐藤美和子","高木渉")),aiCan:p=>myTurn(p)&&p.field.some(y=>anyExact("佐藤美和子","高木渉")(y)&&y.st==="a"),
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});await runQueue();const t=await chooseChar(p,"AP＋2000する［佐藤美和子］か［高木渉］",mine1(p,anyExact("佐藤美和子","高木渉")),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(t)apTurn(t,2000);return true}}]};
DEF["1024"]={ // 羽鳥警部 B09084
  gale:async(p,x)=>{if(!p.solved)giveKw(x,"突撃［事件］")},
  enter:async(p,x)=>{if(!p.solved||!await yes(p,"羽鳥警部","このキャラをリムーブして、2枚引き、手札を1枚リムーブしますか？",()=>p.hand.length<=3))return;removeCard(x,"効果",{by:p,effect:true});await runQueue();drawN(p,2);await discard(p,1)}};
DEF["1028"]={ // 横溝参悟 B09088
  abilities:[{label:"【青】か【黄】のキャラをAP＋1000",turn1:true,can:()=>allChars().some(y=>hasColor(y,"青")||hasColor(y,"黄")),aiCan:p=>myTurn(p)&&p.field.some(y=>y.st==="a"&&(hasColor(y,"青")||hasColor(y,"黄"))),
    run:async p=>{const t=await chooseChar(p,"AP＋1000する【青】か【黄】のキャラ",y=>hasColor(y,"青")||hasColor(y,"黄"),{ai:ownPick(p)});if(t)apTurn(t,1000);return true}}],
  hirameki:async o=>{await pickRmToHand(o,anyExact("横溝重悟","毛利小五郎"),"手札に加える［横溝重悟］か［毛利小五郎］")}};
DEF["0149"]={ // 降谷零 D05004
  enter:async p=>{const o=opp(p);log(`　${o.name} の手札を公開: ${o.hand.map(y=>C(y).nm).join("、")||"なし"}`,"n")},hirameki:async o=>{drawN(o,1)}};
DEF["0506"]={ // 諸伏高明 D09016
  onAction:async(p,self,actor)=>{if(actor!==self||!condOk("FILE6",p))return;drawN(p,1);const [h]=await discard(p,1);if(h&&hasTrait(h,"長野県警"))apTurn(self,1000)},hirameki:async o=>{drawN(o,1)}};

// ================= 緑 =================
DEF["0029"]={leaveAny:async(p,x,info)=>{if(info.why!=="コンタクト")return;await sleepOne(p)},hirameki:async o=>{drawN(o,1)}}; // 大滝悟郎 B01035
DEF["0536"]={leaveAny:async(p,x,info)=>{if(info.why!=="コンタクト")return;const t=await chooseChar(p,"スタンさせるキャラ（スリープ状態）",y=>y.st==="s");if(t)stunC(t)},hirameki:hiStunActor}; // 大滝悟郎 B05032
DEF["0195"]={ // 遠山和葉 B02025
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>hasColor(y,"緑")&&!!C(y).ci,"手札に加える【カットイン】を持つ【緑】のカード")},
  hirameki:async o=>{await pickRmToHand(o,y=>hasColor(y,"緑")&&!!C(y).ci,"手札に加える【カットイン】を持つ【緑】のカード")}};
DEF["0290"]={apAura:(q,self,y)=>G.turn===q.idx&&ownerOf(y)!==q&&faceDownSet(y).length?-1000:0,hirameki:async o=>{drawN(o,1)}}; // 遠山和葉 B03033
DEF["0296"]={ // 長島茂雄 B03039（基本のAP＋1000は state.js）
  cutin:async(p,card,mine)=>{if(!G.contact)return;const ss=faceDownSetOf(opp(p));if(!ss.length)return;
    if(!await yes(p,"長島茂雄","相手のキャラのセットされた裏向きのカードを1枚リムーブして、AP＋3000にしますか？",true))return;
    const h=ss[0];const s=faceDownSet(h)[0];h.set.splice(h.set.indexOf(s),1);opp(p).rm.push(s.c);noteSetOff(opp(p),h,s.c,true);log(`　${C(h).nm} のセットを1枚リムーブ`,"n");mine.apC+=2000;log(`　${C(mine).nm} をコンタクト中AP＋2000（合計＋3000）`,"n")}};
DEF["0538"]={ // 国末照明 B05034
  leaveOppTurn:async p=>{await pickRmToHand(p,y=>C(y).t==="イベント"&&hasColor(y,"緑"),"手札に加える【緑】のイベント")},
  hirameki:async o=>{await pickRmToHand(o,y=>C(y).t==="イベント"&&hasColor(y,"緑"),"手札に加える【緑】のイベント")}};
DEF["0542"]={apSelf:p=>!myTurn(p)?2000:0,hirameki:hiSleep}; // 魔犬 B05038
DEF["0543"]={ // 松田左文字 B05039
  onReason:async(p,self,x)=>{if(x!==self)return;const a=await pickCards(p,"AP＋1000するレベル5のキャラ（2枚まで）","",p.field.filter(y=>lvOf(y)===5),{max:2,ai:c=>c});for(const y of a)apTurn(y,1000);
    const [b]=await pickCards(p,"AP＋1000するレベル7のキャラ","",p.field.filter(y=>lvOf(y)===7),{max:1,ai:c=>c.slice(0,1)});if(b)apTurn(b,1000)},
  cutin:async(p,card,mine)=>{if(myTurn(p)&&mine&&hasTrait(mine,"探偵"))drawN(p,1)}};
DEF["0642"]={ // クモ男 B06019
  enter:async p=>{if(p.solved)return;const cs=p.hand.filter(y=>hasColor(y,"緑")&&hasTrait(y,"YAIBA"));if(!cs.length)return;
    if(!await yes(p,"クモ男","手札の【緑】の［YAIBA］を1枚リムーブして、2枚引きますか？",true))return;await discard(p,1,"リムーブする【緑】の［YAIBA］",p,y=>hasColor(y,"緑")&&hasTrait(y,"YAIBA"));drawN(p,2)},
  hirameki:async o=>{await flipDown(o,1)}};
DEF["0756"]={ // ハチ B07024
  onOppEnter:async(o,y,x)=>{if(!myTurn(opp(o))||lvOf(x)!==8)return;if(!await yes(o,"ハチ","1枚引いて、1枚捨てますか？",true))return;drawN(o,1);await discard(o,1)},
  hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"高校生"),"手札に加える［高校生］")}};
DEF["0864"]={ // 服部静華 B08024
  enter:async(p,x)=>{setTop(p,x)},
  abilities:[{label:"【ターン2】セットされたカードを1枚リムーブしてもよい: デッキの上から3枚見て【緑】を手札に",turn2:true,can:()=>true,aiCan:p=>setCardsAll().some(y=>isOpp(p,y))||setCardsAll().length>0,
    run:async p=>{if(!setCardsAll().length)return true;if(!await yes(p,"服部静華","裏向きでセットされているカードを1枚リムーブしますか？",()=>true))return true;
      if(!await removeAnySet(p,"リムーブする裏向きのカード"))return true;if((await lookTop(p,3,y=>hasColor(y,"緑"),{max:1,title:"手札に加える【緑】のカード"})).length)await discard(p,1);return true}}]};
DEF["0868"]={ // 日向幸 B08028
  abilities:[{label:"他のキャラをリムーブエリアへ: 自分の裏向きの証拠を好きな数表向きにし、同じ数まで相手の裏向きの証拠も表向きに",can:(p,x)=>p.field.some(y=>y!==x)&&p.ev.some(e=>!e.up),aiCan:p=>p.ev.some(e=>!e.up)&&opp(p).ev.some(e=>!e.up),
    run:async(p,x)=>{sleepCost(x);const [c]=await pickCards(p,"コスト: リムーブエリアに移すキャラ","",p.field.filter(y=>y!==x),{min:1,max:1,ai:c=>c.slice().sort((a,b)=>lvOf(a)-lvOf(b))});if(!c)return false;removeCard(c,"コスト",{by:p});await runQueue();
      const fd=p.ev.filter(e=>!e.up);const xs=await pickCards(p,"表向きにする自分の裏向きの証拠（好きな数）","",fd,{max:fd.length,faceUp:false,ai:c=>c.slice(0,2)});for(const e of xs)flipUp(p,e);
      const of=opp(p).ev.filter(e=>!e.up);const ys=await pickCards(p,`表向きにする相手の裏向きの証拠（${xs.length}つまで）`,"",of,{max:xs.length,faceUp:false,ai:c=>c.slice(0,xs.length)});for(const e of ys)flipUp(opp(p),e);return true}}],
  hirameki:async o=>{drawN(o,1)}};
DEF["0973"]={ // 新名香保里 B09029
  enter:async p=>{await pickRmToHand(p,y=>isChar(y)&&hasTrait(y,"探偵"),"手札に加える［探偵］")},hirameki:async o=>{await pickRmToHand(o,y=>isChar(y)&&hasTrait(y,"探偵"),"手札に加える［探偵］")}};
DEF["0399"]={ // 大岡紅葉 PR041
  enter:async p=>{const f=y=>C(y).t==="イベント"&&hasColor(y,"緑");if(!p.hand.some(f))return;if(!await yes(p,"大岡紅葉","手札の【緑】のイベントを1枚リムーブして、2枚引きますか？",()=>p.hand.filter(f).length>=2))return;await discard(p,1,"リムーブする【緑】のイベント",p,f);drawN(p,2)}};

// ================= 白 =================
DEF["0045"]={enter:async p=>{await lookTop(p,2,y=>isChar(y)&&hasColor(y,"白")&&(C(y).lp||0)>=2,{max:1,title:"手札に加えるLP2以上の【白】のキャラ"})}}; // 工藤有希子 B01053
DEF["0316"]={ // ルパン B03061
  enter:async(p,x)=>{setTop(p,x)},
  abilities:[{label:"スリープ・このキャラのセットを1枚リムーブ: 1枚引く",can:(p,x)=>x.st==="a"&&faceDownSet(x).length>0,aiCan:()=>true,
    run:async(p,x)=>{const s=faceDownSet(x)[0];x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);noteSetOff(p,x,s.c,true);sleepCost(x);drawN(p,1);return true}}]};
DEF["0377"]={enter:async p=>{await lookTop(p,2,y=>!!C(y).ci&&hasColor(y,"黒"),{max:1,title:"手札に加える【カットイン】を持つ【黒】のカード"})}}; // ヘルエンジェル B03128
DEF["0433"]={apSelf:(p,x)=>p.field.some(y=>y!==x&&hasTrait(y,"マジシャン"))?1000:0}; // 真田一三 B04035
DEF["0562"]={enter:async p=>{await lookTop(p,2,y=>isChar(y)&&(hasTrait(y,"怪盗")||hasTrait(y,"マジシャン")),{max:1,title:"手札に加える［怪盗］か［マジシャン］"})}}; // ファントム・レディ B05060
DEF["0678"]={ // ゲロ田ゲロ左エ門 B06057
  onEventUse:async(p,self,e)=>{if(!myTurn(p)||!hasColor(e,"白")||!hasTrait(e,"YAIBA")||turnCount(self,"gero4"))return;useTurn(self,"gero4");drawN(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0764"]={ // 古畑恵 B07035
  enter:async p=>{const xs=p.deck.splice(0,3);if(!xs.length)return;log(`　${p.name} はデッキの上から${xs.length}枚を見た`,"n");
    const [c]=await pickCards(p,"手札に加えるカード（［怪盗キッド］［黒羽快斗］［ビッグジュエル］）","",xs.filter(y=>anyExact("怪盗キッド","黒羽快斗")(y)||hasTrait(y,"ビッグジュエル")),{max:1,ai:c=>c.slice(0,1)});
    for(const y of xs){if(y===c)p.hand.push(y);else p.rm.push(y)}checkDeck(p);if(c&&p.solved)await discard(p,1)}};
DEF["0779"]={onAllyEnter:async(p,self,y)=>{if(!exactName("小泉紅子")(y)||turnCount(self,"fuji4"))return;useTurn(self,"fuji4");drawN(p,1)}}; // 藤江 B07050（カットインは state.js）
DEF["0780"]={ // 桃井恵子 B07051
  abilities:[{label:"スリープ: デッキの上を公開し、［怪盗キッド］か［高校生］なら手札、それ以外はデッキの下",can:(p,x)=>x.st==="a"&&p.deck.length>0,aiCan:(p,x)=>p.deck.length>5&&(!myTurn(p)||!canAct(x,p,"chara")),
    run:async(p,x)=>{sleepCost(x);await revealTopYes(p,y=>isChar(y)&&(exactName("怪盗キッド")(y)||hasTrait(y,"高校生")));return true}}]};
DEF["0877"]={ // 京極真 B08038
  onContact:async(p,self,ct)=>{if(!myTurn(p)||ct.a!==self||p.deck.length<2)return;if(!await yes(p,"京極真","デッキの上から2枚をリムーブしますか？（［高校生］か［鈴木財閥］があればAP＋1000）",()=>p.deck.length>12))return;
    if(millSelf(p,2).some(y=>isChar(y)&&(hasTrait(y,"高校生")||hasTrait(y,"鈴木財閥")))){self.apC+=1000;log(`　${C(self).nm} をコンタクト中AP＋1000`,"n")}}};
DEF["0923"]={forceByEvt:true,leaveOppTurn:async p=>{await flipDown(p,1)}}; // 吞口重彦 B08087
DEF["1099"]={ // 白馬探 B10039
  noLeaveOnContact:true,
  enter:async p=>{if(condOk("事件緑＆白",p)===true&&(await lookTop(p,4,y=>hasColor(y,"緑")||hasColor(y,"白"),{max:1,title:"手札に加える【緑】か【白】のカード"})).length)await discard(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["1100"]={ // 織田國友 B10040
  enter:async p=>{const ss=faceDownSetOf(opp(p));if(!ss.length||!await yes(p,"織田國友","相手のキャラの裏向きのセットを1枚リムーブして、1枚引きますか？",true))return;
    const h=ss[0],s=faceDownSet(h)[0],o=opp(p);h.set.splice(h.set.indexOf(s),1);o.rm.push(s.c);noteSetOff(o,h,s.c,true);log(`　${C(h).nm} のセットを1枚リムーブ`,"n");drawN(p,1)}};
DEF["1102"]={ // 工藤有希子 B10042
  enter:async(p,x)=>{if(!p.deck.length)return;const t=await chooseChar(p,"セットする【白】のキャラ",mine1(p,y=>y!==x&&hasColor(y,"白")),{ai:cs=>cs.filter(y=>y.st==="a").slice(0,1)});if(t){setTop(p,t);apTurn(t,1000)}},
  disguise:async(p,x)=>{if(bondFor(p,x,"工藤優作"))apTurn(x,2000)}};
DEF["1106"]={ // 山本萌奈 B10046
  endTurn:async p=>{if(!p.field.some(exactName("怪盗キッド")))return;const cs=p.rm.filter(y=>C(y).t==="イベント"&&hasTrait(y,"ビッグジュエル"));if(!cs.length)return;
    const [e]=await pickCards(p,"パートナーエリアに移すか手札に加える［ビッグジュエル］のイベント","",cs,{max:1,ai:c=>c.slice(0,1)});if(!e)return;
    const i=await pickMode(p,"山本萌奈",["パートナーエリアに移す","手札に加える"],0);detach(e);if(i===0){p.pa.push(e);log(`　${C(e).nm} をパートナーエリアに移した`,"n")}else{p.hand.push(e);log(`　${C(e).nm} を手札に`,"n")}}};
DEF["0405"]={ // 中森銀三 PR061
  enter:async p=>{if((await lookTop(p,4,y=>isChar(y)&&(hasTrait(y,"警察")||hasTrait(y,"怪盗")),{max:1,title:"手札に加える［警察］か［怪盗］"})).length)await discard(p,1)},hirameki:async o=>{drawN(o,1)}};
DEF["0730"]={ // 京極真 PR179
  abilities:[{label:"手札の［高校生］を1枚公開: AP＋2000と突撃",turn1:true,can:p=>condOk("FILE7",p)&&p.hand.some(y=>isChar(y)&&hasTrait(y,"高校生")),aiCan:(p,x)=>myTurn(p)&&(x.fresh||x.st==="a"),
    run:async(p,x)=>{if(!await revealFromHand(p,y=>isChar(y)&&hasTrait(y,"高校生"),"コスト: 公開する［高校生］",{must:true}))return false;apTurn(x,2000);giveKw(x,"突撃");return true}}]};

// ================= 黒 =================
DEF["0474"]={ // キャンティ B04092
  onContact:async(p,self,ct)=>{const y=[ct.a,ct.d].find(z=>p.field.includes(z)&&z!==self);if(!y||self.st!=="a"||!p.field.includes(self))return;
    if(!await yes(p,"キャンティ",`このキャラをスリープさせて、${C(y).nm} のコンタクト中AP＋2000しますか？`,()=>apOf(ct.a===y?ct.d:ct.a)>=apOf(y)&&apOf(ct.a===y?ct.d:ct.a)<apOf(y)+2000))return;
    sleepC(self);y.apC+=2000;log(`　${C(y).nm} をコンタクト中AP＋2000`,"n")}};
DEF["1149"]={ // 犯人 B10094（証拠エリア・FILEエリアにあるときの宣言は未対応）
  partial:true,
  abilities:[{label:"このカードをリムーブエリアへ: 相手のパートナーエリアのキャラかイベントを1枚リムーブ",can:p=>opp(p).pa.length>0,aiCan:p=>opp(p).pa.length>0,
    run:async(p,x)=>{removeCard(x,"コスト",{by:p});await runQueue();const o=opp(p);const [y]=await pickCards(p,"リムーブする相手のパートナーエリアのカード","",o.pa,{min:1,max:1,ai:c=>c.slice(0,1)});if(y){detach(y);resetMods(y);o.rm.push(y);log(`　${o.name} のパートナーエリアの ${C(y).nm} をリムーブ`,"n")}return true}}]};
