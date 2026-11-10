"use strict";
// 新しい仕組みが要ったカード（PR #69・#70 で見送った17種、2026-11-10）。仕組みの本体は MECH_FX（hooks.js が FX に合わせる）。
// 仕組みの一覧（DEF に書くキー）:
//   setGuard(持ち主,セット先,種類,相手)  セットされたイベントが与える「相手の能力や効果で リムーブ(rm)／スリープ(sleep)／スタン(stun) されない」
//   guard(持ち主,このキャラ,種類,相手)   キャラ自身の同じ耐性（工藤新一 B10010: 相手のイベントでリムーブされない）
//   setSave                         セットされたイベントの置換「相手の能力・効果・コンタクトで現場から離れるとき、代わりにこのイベントをリムーブして残る」
//   setLeave(持ち主,セット先,イベント,info) セットされたイベントが与える「現場から離れたとき」（info.how: "rm"=リムーブ／"move"=手札・デッキ・パートナーエリアへ、info.turn）
//   setNegate                       セットされたイベントが与える「【ターン1】相手の能力や効果で選ばれたとき、無効にする」（chooseChar で判定）
//   setEndTurn(持ち主,セット先,イベント,自分のターンか) セットされたイベントのターン終了時（自分と相手の両方のターン終了時に呼ぶ）
//   tmpGrants                       効果で一時的に与える【宣言】（x.tmpAb=[{id,t}]、そのターンだけ）
//   protectLow                      このキャラがスリープ状態なら、相手は自分のレベル4以下のキャラを指定してアクションできない（noTarget）
//   noActUnless(p,x)                偽なら、このキャラはアクションできない（canAct）
//   noOwnCutin                      このキャラのコンタクト中、自分はカットインできない（FX.noCutin）
//   traitAura(p,self,x,t)           自分の現場のキャラ x に特徴 t を与える（hasTrait）
//   onAllyDeclare(p,self,x,ab)      自分の現場のキャラが【宣言】能力を使用したあと（hooks.js useAbility）
//   partnerColors / fieldMax        事件が変える「パートナーの色」と「現場に置けるキャラの上限」（探偵の目）
//   x.trA / x.trD                   効果で得た／失った特徴（現場を離れると消える）
// 「相手の能力や効果」は G.fxBy（効果を使っているプレイヤー。hooks.js の resolving が設定）で判定する。

const MECH_FX={
  guarded(x,kind,by){const q=ownerOf(x);if(!q||!by||by===q||!q.field.includes(x))return false;
    for(const s of setEvents(x)){const e=def(s);if(e&&e.setGuard&&e.setGuard(q,x,kind,by))return true}
    const d=def(x);return !!(d&&d.guard&&d.guard(q,x,kind,by))},
  // chooseChar の題名から「何をするための選択か」を読み、効かない相手を候補から外す
  guardedFor(p,y,title){const t=String(title||"");
    const kinds=[/リムーブする/.test(t)&&"rm",/スリープさせる/.test(t)&&"sleep",/スタンさせる/.test(t)&&"stun"].filter(Boolean);
    return kinds.length>0&&kinds.every(k=>MECH_FX.guarded(y,k,p))},
  saveLeave(p,x){const s=(x.set||[]).find(s=>s.up&&!s.under&&def(s.c)&&def(s.c).setSave);if(!s)return false;
    x.set.splice(x.set.indexOf(s),1);p.rm.push(s.c);log(`　${C(s.c).nm} をリムーブし、${C(x).nm} は代わりに現場に残る`,"n");
    noteSetOff(p,x,s.c,false);if(G.queue)G.queue.push({setRm:[s.c],p,turn:G.turn});return true},
  noteLeftSets(p,x,how){const cs=setEvents(x).filter(c=>DEF[idOf(c)]&&DEF[idOf(c)].setLeave);
    if(cs.length&&G&&G.queue)G.queue.push({leftSets:cs,x,p,how,turn:G.turn})},
  negateBySet(p,y){const q=ownerOf(y);if(!q||q===p||!q.field.includes(y)||turnCount(y,"setNeg"))return false;
    const c=setEvents(y).find(c=>def(c)&&def(c).setNegate);if(!c)return false;
    useTurn(y,"setNeg");log(`　${C(y).nm}（${C(c).nm}）: 選ばれた効果を無効にした`,"n");return true},
  noAct(x,p){const d=def(x);return !!(d&&d.noActUnless&&p.field.includes(x)&&!d.noActUnless(p,x))},
  noTarget(p,y){const q=ownerOf(y);if(!q||q===p||!q.field.includes(y)||lvOf(y)>4)return false;
    return q.field.some(z=>z.st==="s"&&def(z)&&def(z).protectLow)},
  // 相手の証拠がリムーブされたとき（トッ: このターン次に1回）
  async onEvRemoved(o){const p=opp(o);
    for(const y of p.field.slice()){const d=def(y);if(d&&d.onOppEvRemoved&&p.field.includes(y))await fxIf(p,y,"相手の証拠がリムーブされたとき",()=>d.onOppEvRemoved(p,y))} // 世良真純 B02062
    if(p.tohT!==G.turnNo)return;p.tohT=0;
    await resolving(async()=>{log("　トッ: 相手の証拠がリムーブされたので、スリープ状態のキャラを1枚までスタン","n");
      const t=await chooseChar(p,"スタンさせるキャラ（スリープ状態）",y=>y.st==="s");if(t)stunC(t)},p)},
  partnerColor(p){const d=def(p.caseC);return d&&d.partnerColors||C(p.partner).c},
  fieldMax(p){const d=G&&p&&def(p.caseC);return d&&d.fieldMax||5},
  traitAura(p,x,t){for(const y of p.field){const d=def(y);if(d&&d.traitAura&&d.traitAura(p,y,x,t))return true}return false},
};

// ===== 小さな部品 =====
// セット先 h からセットされているカード s をリムーブエリアへ（表向きのイベントは「リムーブエリアに置かれたとき」も予約）
function rmSetEntry(p,h,s){const i=(h.set||[]).indexOf(s);if(i<0)return false;h.set.splice(i,1);p.rm.push(s.c);
  log(`　${C(h).nm} にセットされている${s.up?C(s.c).nm:"裏向きのカード"}をリムーブ`,"n");noteSetOff(p,h,s.c,!s.up);
  if(s.up&&G.queue)G.queue.push({setRm:[s.c],p,turn:G.turn});return true}
const setEntries=h=>(h.set||[]).filter(s=>!s.under);
async function enterFromRmSleep(p,f,title){const cs=p.rm.filter(y=>isChar(y)&&f(y));
  const [y]=await pickCards(p,title,"",cs,{ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});if(y)await enterByEffect(p,y,"s");return y}

// ===== イベント（PR #70 で見送ったもの） =====
DEF["0033"]={ // 「かっ…和葉ァ!!!」: セット。相手の能力・効果・コンタクトで現場から離れるとき、代わりにこのイベントをリムーブして残る（置換）
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"緑"))},
  setSave:true,
  ai:p=>p.field.some(y=>hasColor(y,"緑")&&lvOf(y)>=5)};
DEF["0049"]={ // 「最も出会いたくない…恋人ってトコロかな？」: セット先が「【相手ターン中】【現場リムーブ時】手札からレベル7以下の【白】を登場」を持つ
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"白"))},
  setLeave:async(p,h,c,info)=>{if(info.how!=="rm"||info.turn===p.idx)return;
    log(`　【現場リムーブ時】${C(h).nm}（${C(c).nm} が与えた能力）`,"n");await playFromHand(p,y=>lvOf(y)<=7&&hasColor(y,"白"),"登場させる【白】のキャラ（レベル7以下）")},
  hirameki:async o=>{drawN(o,1)},
  ai:p=>p.field.some(y=>hasColor(y,"白"))&&p.hand.some(y=>isChar(y)&&hasColor(y,"白")&&lvOf(y)<=7)};
DEF["0613"]={ // コンコン: セット先が「【相手ターン中】現場から離れたとき、自分の現場が0体なら、キャラを1枚までリムーブし、リムーブエリアの【カットイン】持ちレベル6以下を2枚まで登場」を持つ
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"黒"))},
  setLeave:async(p,h,c,info)=>{if(info.turn===p.idx||p.field.length)return;
    log(`　${C(h).nm}（${C(c).nm} が与えた能力）: 現場から離れたとき`,"n");
    await rmChar(p,()=>true);await runQueue();
    for(let i=0;i<2;i++)if(!await enterFromRm(p,y=>!!C(y).ci&&lvOf(y)<=6,`登場させる【カットイン】を持つキャラ（レベル6以下・${i+1}枚目）`))break},
  ai:p=>p.field.some(y=>hasColor(y,"黒"))};
DEF["0050"]={ // トッ: 【白】に突撃［事件］。このターン、次に相手の証拠がリムーブされたとき、スリープ状態のキャラを1枚までスタン（MECH_FX.onEvRemoved）
  event:async(p,x)=>{const t=await chooseChar(p,"突撃［事件］を与える【白】のキャラ",y=>!isOpp(p,y)&&hasColor(y,"白"),{ai:cs=>cs.filter(y=>y.fresh).concat(cs).slice(0,1)});
    if(t)giveKw(t,"突撃［事件］");p.tohT=G.turnNo},
  ai:p=>opp(p).ev.length>0&&p.field.some(y=>hasColor(y,"白")&&y.fresh&&y.st==="a")};
DEF["0203"]={ // 死力を尽くして: 自分の現場のキャラにセットされているカードを合わせて2枚リムーブしてもよい。そうしたらキャラを1枚までリムーブ
  event:async(p,x)=>{const hosts=()=>p.field.filter(y=>setEntries(y).length);
    if(hosts().reduce((n,y)=>n+setEntries(y).length,0)<2)return;
    if(!await yes(p,C(x).nm,"自分のキャラにセットされているカードを合わせて2枚リムーブして、キャラを1枚までリムーブしますか？",()=>oppHas(p,y=>lvOf(y)>=4)))return;
    for(let i=0;i<2;i++){const [h]=await pickCards(p,`セットされているカードをリムーブするキャラ（${i+1}枚目）`,"",hosts(),{min:1,max:1,
        ai:c=>c.slice().sort((a,b)=>setEntries(b).length-setEntries(a).length)});
      if(!h)return;const es=setEntries(h);
      // 裏向きと表向きのイベントの両方があれば、人はどちらを外すか選ぶ（CPUは裏向きから）
      let s=es.find(s=>!s.up)||es[0];
      if(!p.cpu&&es.some(s=>s.up)&&es.some(s=>!s.up)&&await yes(p,C(h).nm,"表向きのイベントをリムーブしますか？（いいえ: 裏向きのカード）",false))s=es.find(s=>s.up);
      rmSetEntry(p,h,s)}
    await runQueue();await rmChar(p,()=>true)},
  ai:p=>p.field.reduce((n,y)=>n+setEntries(y).length,0)>=2&&oppHas(p,y=>lvOf(y)>=5)};
const kaito=y=>hasTrait(y,"怪盗");
DEF["0217"]={ // トランプ銃: ［怪盗］にセット。「自分のターン終了時、デッキの上から3枚リムーブしてもよい→キャラを1枚までスタン」を与える。
  // 【相手ターン中】【ターン1】セットされているこのイベントがリムーブエリアに置かれるとき、代わりに自分の［怪盗］にセットしてもよい（setToRm で、置かれた直後に移す）
  event:async(p,x)=>{await setEventOn(p,x,kaito)},
  setEndTurn:async(p,h,c,own)=>{if(!own||!p.deck.length)return;
    if(!await yes(p,"トランプ銃",`${C(h).nm}: デッキの上から3枚リムーブして、キャラを1枚までスタンさせますか？`,()=>p.deck.length>=10&&oppHas(p,y=>y.st!=="x")))return;
    millSelf(p,3);const t=await chooseChar(p,"スタンさせるキャラ",y=>y.st!=="x");if(t)stunC(t)},
  setToRm:async(p,c,info)=>{if(info.turn===p.idx||turnCount(c,"trump"))return;const cs=p.field.filter(kaito);if(!cs.length)return;
    if(!await yes(p,"トランプ銃","リムーブエリアに置く代わりに、自分の［怪盗］にセットしますか？",true))return;
    const [h]=await pickCards(p,"トランプ銃をセットする［怪盗］","",cs,{min:1,max:1,ai:c=>c.slice().sort((a,b)=>apOf(b)-apOf(a))});if(!h)return;
    useTurn(c,"trump");detach(c);h.set=h.set||[];h.set.push({c,up:true});log(`　トランプ銃を ${C(h).nm} にセットし直した`,"n");noteSetOn(p,h);await FX.onSet(p,h,c)},
  ai:p=>p.field.some(kaito)};
DEF["0230"]={ // チョーカー型変声機: 【赤】にセット。「【ターン1】相手の能力や効果で選ばれたとき、無効にする」を与える（MECH_FX.negateBySet）
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"赤"))},
  setNegate:true,
  ai:p=>p.field.some(y=>hasColor(y,"赤")&&lvOf(y)>=5)};
DEF["0545"]={ // 「オレのそばから離れんなや…」: 【緑】にセット。相手の能力や効果でリムーブ・スリープ・スタンされない
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"緑"))},
  setGuard:(q,h,kind)=>["rm","sleep","stun"].includes(kind),
  hirameki:async(o,e)=>{if(o.rm.includes(e)){detach(e);o.hand.push(e);log(`　${o.name} は ${C(e).nm} を手札に加えた`,"n")}},
  ai:p=>p.field.some(y=>hasColor(y,"緑")&&lvOf(y)>=6)};
DEF["0637"]={ // 石川五右衛門人形: 【青】にセット。［少年探偵団］はコンタクト中AP＋2000。自分か相手のターン終了時、リムーブしてもよい→リムーブエリアのレベル8以下の［阿笠博士］をスリープ状態で登場
  event:async(p,x)=>{await setEventOn(p,x,y=>hasColor(y,"青"))},
  setAp:(p,h)=>G.contact&&(G.contact.a===h||G.contact.d===h)&&hasTrait(h,"少年探偵団")?2000:0,
  setEndTurn:async(p,h,c)=>{const f=y=>named("阿笠博士")(y)&&lvOf(y)<=8;if(!p.rm.some(y=>isChar(y)&&f(y)))return;
    if(!await yes(p,"石川五右衛門人形","セットされているこのイベントをリムーブして、リムーブエリアの［阿笠博士］をスリープ状態で登場させますか？",()=>p.field.length<fieldMax(p)))return;
    const s=(h.set||[]).find(s=>s.c===c);if(!s||!rmSetEntry(p,h,s))return;await runQueue();await enterFromRmSleep(p,f,"登場させる［阿笠博士］（レベル8以下）")},
  ai:p=>p.field.some(y=>hasColor(y,"青"))};
DEF["0665"]={ // ここで会うたが百年目: 自分のキャラを1枚までAP＋1000し、「【宣言】【ターン1】相手のキャラを1枚までコンタクトを発生させる」を与える（ターン終了時まで）
  event:async(p,x)=>{const t=await chooseChar(p,"AP＋1000とコンタクトの能力を与えるキャラ",y=>!isOpp(p,y),{ai:cs=>cs.slice().sort((a,b)=>apOf(b)-apOf(a)).slice(0,1)});if(!t)return;
    apTurn(t,1000);t.tmpAb=(t.tmpAb||[]).filter(a=>a.t===G.turnNo).concat({id:"0665",t:G.turnNo})},
  tmpGrants:[{label:"コンタクトを発生させる（ここで会うたが百年目）",turn1:true,
    can:(p,x)=>p.field.includes(x)&&opp(p).field.some(y=>!immune(p,y)),
    aiCan:(p,x)=>oppHas(p,y=>apOf(y)<=apOf(x)),
    run:async(p,x)=>{const t=await chooseChar(p,"コンタクトする相手のキャラ",y=>isOpp(p,y),{ai:cs=>cs.filter(y=>apOf(y)<=apOf(x)).sort((a,b)=>lvOf(b)-lvOf(a)).slice(0,1)});
      if(t&&p.field.includes(x))await contact(p,x,t);return true}}],
  hirameki:async o=>{drawN(o,1)},
  ai:p=>p.field.length>0&&oppHas(p,y=>p.field.some(x=>apOf(x)+1000>=apOf(y)))};
DEF["0407"]={ // 探偵の目（事件）: パートナーの色は6色、現場は最大4枚。「指定されたイベントでのみ使用できる」はデッキ構築の制限なので扱わない
  partnerColors:"青緑白赤黄黒",fieldMax:4};

// ===== 主要キャラ（PR #69 で見送ったもの） =====
// 江戸川コナン B07002（0734）は js/effects/mr8.js 側の定義を使う
DEF["0260"]={ // 江戸川コナン B03002
  onHintUse:async(p,self)=>{if(turnCount(self,"hint"))return;useTurn(self,"hint");
    await lookTop(p,3,y=>isChar(y)&&hasTrait(y,"少年探偵団"),{title:"手札に加える［少年探偵団］のキャラ"})},
  onAllyDeclare:async(p,self,x)=>{if(!hasTrait(x,"少年探偵団")||!p.field.includes(x)||turnCount(self,"decl"))return;useTurn(self,"decl");giveKw(self,"突撃")}};
DEF["1072"]={ // 工藤新一 B10010
  guard:(q,x,kind,by)=>kind==="rm"&&G.evtBy===by&&condOk("絆毛利蘭",q), // 【絆毛利蘭】相手のイベントの効果によってリムーブされない
  enter:async(p,x)=>{const got=await lookTop(p,4,named("工藤新一","毛利蘭"),{title:"手札に加える［工藤新一］か［毛利蘭］"});if(got.length)await discard(p,1)}};
DEF["0737"]={ // 毛利小五郎 B07005（【絆妃英理】〚突撃〛は本文から）
  noActUnless:p=>p.field.some(named("妃英理")),noOwnCutin:true};
DEF["1077"]={ // 毛利小五郎 B10015
  traitAura:(p,self,x,t)=>t==="毛利探偵事務所"&&named("妃英理")(x),
  kwSelf:p=>new Set(p.field.filter(y=>hasTrait(y,"毛利探偵事務所")).map(nameOf)).size>=4?["迅速"]:[],
  hirameki:async o=>{await pickRmToHand(o,y=>named("妃英理")(y),"手札に加える［妃英理］")}};
DEF["0016"]={ // 毛利小五郎 B01020: スリープ状態なら、相手は自分のレベル4以下を指定してアクションできない（MECH_FX.noTarget）
  protectLow:true,
  hirameki:async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}};
DEF["0599"]={ // 毛利小五郎 B05101
  leaveOppTurn:async(p,x)=>{if(!p.rm.includes(x)||!hasTrait(x,"警察"))return; // リムーブエリアに来た時点（特徴は元に戻っている）で判定
    if(!await yes(p,C(x).nm,"リムーブエリアからスリープ状態で登場させて1枚引きますか？（［警察］［警視庁］を失い［探偵］になる）",true))return;
    if(!await enterByEffect(p,x,"s"))return;drawN(p,1);x.trA=["探偵"];x.trD=["警察","警視庁"];log(`　${C(x).nm} は［警察］と［警視庁］を失い、［探偵］を持つ`,"n")}};
