"use strict";
// カード個別効果（効果文から自動で組み立てる）手書きの DEF が無いカードを、効果文の書き方から DEF にする。DEF の手書きがすべて読み込まれたあとに読む。

// ================= 効果文から自動で組み立てる（同じ書き方のカードはまとめて処理） =================
// 1行ずつ型に当てはめる。全部の行が分かったカードだけ「自動」にする（分からない行があれば手動のまま）
const COLS="青|赤|黄|緑|白|黒";
const PRE=`(?:【パートナー(${COLS})】(?:（[^）]*）)?)?`; // 先頭の【パートナー色】
const needPartner=(p,col)=>!col||partnerIs(p,col);
const bySet=(kind,v)=>kind==="レベル"?y=>lvOf(y)<=v:y=>apOf(y)<=v;
const traitOf=t=>y=>hasTrait(y,t);
const searchTop=async(p,n,filter,max,title,dis)=>{const got=await lookTop(p,n,filter,{max,title});if(got.length&&dis)await discard(p,dis);return got};
// 除去（キャラを1枚まで選び、リムーブ／デッキの下／スタン）。行頭の条件タグは condOk で判定する
const TAGS=`((?:【(?!登場時|宣言|自分ターン中|相手ターン中|ターン\\d)[^】]+】(?:（[^）]*）)?)*)`;
const tagsOk=(p,s)=>[...(s||"").matchAll(/【([^】]+)】/g)].every(m=>condOk(m[1],p)===true);
const RM_TARGET=`(?:(レベル|AP)(\\d+)以下の)?(スリープ状態の|スリープ状態かスタン状態の)?キャラを1枚まで選び、(リムーブする|デッキの下に移す|スタンさせる)。(?:（[^）]*）)?`;
const rmFilter=(m,i)=>{const lim=m[i]?bySet(m[i],+m[i+1]):()=>true;const st=m[i+2]?(m[i+2]==="スリープ状態の"?y=>y.st==="s":y=>y.st!=="a"):()=>true;return y=>lim(y)&&st(y)};
async function rmOne(p,m,i,src){const how=m[i+3];const t=await chooseChar(p,`${src}: ${how.replace("する","").replace("させる","")}するキャラ`,rmFilter(m,i));if(!t)return;
  if(how==="リムーブする")removeCard(t,"効果",{by:p,effect:true});else if(how==="デッキの下に移す")toDeckBottom(t);else stunC(t)}
const rmAi=(m,i)=>p=>opp(p).field.some(rmFilter(m,i));
// [正規表現, (一致, カード) => {フック名: 処理}, 他の行が分からなくてもこの行だけ自動にしてよいか]
const LINE_RULES=[
  [new RegExp(`^${TAGS}【登場時】${RM_TARGET}(?:カードを(\\d)枚引く。)?$`),m=>({enter:async p=>{if(!tagsOk(p,m[1]))return;await rmOne(p,m,2,"登場時");if(m[6])drawN(p,+m[6])}}),true],
  [new RegExp(`^${TAGS}${RM_TARGET}$`),m=>({event:async p=>{if(!tagsOk(p,m[1])){log("　条件を満たさないので効果なし","n");return}await rmOne(p,m,2,"イベント")},ai:p=>tagsOk(p,m[1])&&rmAi(m,2)(p)}),true],
  [/^【登場時】カードを(\d)枚引き、手札を(\d)枚リムーブする。$/,m=>({enter:async p=>{drawN(p,+m[1]);await discard(p,+m[2])}})],
  [/^【登場時】カードを(\d)枚引く。$/,m=>({enter:async p=>drawN(p,+m[1])})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚見る。その中から【(${COLS})】のカードを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。(?:カードを手札に加えた場合、手札を(\\d)枚リムーブする。)?$`),
    m=>({enter:async p=>{if(needPartner(p,m[1]))await searchTop(p,+m[2],lookFilterColor(m[3]),+m[4],`【${m[3]}】のカードを${m[4]}枚まで手札に`,+(m[5]||0))}})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚見る。その中から〚特徴［([^］]+)］〛のキャラを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。(?:カードを手札に加えた場合、手札を(\\d)枚リムーブする。)?$`),
    m=>({enter:async p=>{if(needPartner(p,m[1]))await searchTop(p,+m[2],y=>C(y).t==="キャラ"&&hasTrait(y,m[3]),+m[4],`［${m[3]}］のキャラを${m[4]}枚まで手札に`,+(m[5]||0))}})],
  [new RegExp(`^自分のデッキのカードを上から(\\d)枚見る。その中から【(${COLS})】のキャラを(\\d)枚まで公開して手札に加え、残りを好きな順番でデッキの下に移す。手札から自分のFILEエリアの枚数以下のレベルの【(${COLS})】のキャラを(\\d)枚まで登場させる。$`),
    m=>({event:async p=>{await lookTop(p,+m[1],y=>C(y).t==="キャラ"&&hasColor(y,m[2]),{max:+m[3],title:`【${m[2]}】のキャラを${m[3]}枚まで手札に`});
      await playFromHand(p,y=>hasColor(y,m[4])&&lvOf(y)<=p.file.length,`FILE${p.file.length}以下の【${m[4]}】のキャラを登場`)},ai:p=>true})],
  [new RegExp(`^${PRE}(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({event:async p=>{if(!needPartner(p,m[1])){log("　パートナーの色が条件を満たさないので効果なし","n");return}
      const t=await chooseChar(p,`リムーブするキャラ（${m[2]}${m[3]}以下）`,bySet(m[2],+m[3]));if(t)removeCard(t,"効果",{by:p,effect:true})},
      ai:p=>needPartner(p,m[1])&&opp(p).field.some(bySet(m[2],+m[3]))})],
  [new RegExp(`^${PRE}【登場時】(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({enter:async(p,x)=>{if(!needPartner(p,m[1]))return;const t=await chooseChar(p,`登場時: リムーブするキャラ（${m[2]}${m[3]}以下）`,y=>y!==x&&bySet(m[2],+m[3])(y));if(t)removeCard(t,"効果",{by:p,effect:true})}})],
  [new RegExp(`^${PRE}【登場時】手札を(\\d)枚リムーブしてもよい。そうした場合、(レベル|AP)(\\d+)以下のキャラを(\\d)枚まで選び、リムーブする。$`),
    m=>({enter:async(p,x)=>{if(!needPartner(p,m[1])||p.hand.length<+m[2])return;const f=y=>y!==x&&bySet(m[3],+m[4])(y);
      if(!await yes(p,"登場時",`手札を${m[2]}枚リムーブして、${m[3]}${m[4]}以下のキャラをリムーブしますか？`,()=>opp(p).field.some(f)&&p.hand.length>=2))return;
      await discard(p,+m[2]);const t=await chooseChar(p,`リムーブするキャラ（${m[3]}${m[4]}以下）`,f);if(t)removeCard(t,"効果",{by:p,effect:true})}})],
  [/^【相手ターン中】【現場リムーブ時】カードを(\d)枚引く。$/,m=>({leaveOppTurn:async p=>drawN(p,+m[1])})],
  [/^【相手ターン中】【現場リムーブ時】カードを(\d)枚引き、手札を(\d)枚リムーブする。$/,m=>({leaveOppTurn:async p=>{drawN(p,+m[1]);await discard(p,+m[2])}})],
  [new RegExp(`^${PRE}【登場時】自分のデッキのカードを上から(\\d)枚裏向きでこのキャラにセットする。$`),
    m=>({enter:async(p,x)=>{if(needPartner(p,m[1]))for(let i=0;i<+m[2];i++)setTop(p,x)}})],
  [/^カードを(\d)枚引く。$/,m=>({event:async p=>drawN(p,+m[1]),ai:p=>true})],
  [/^相手の現場にいるキャラがこのキャラとのコンタクトによってリムーブされたとき、カードを(\d)枚引く。$/,m=>({contactWin:async p=>drawN(p,+m[1])})],
  [/^この事件が解決編に(?:なった|移行した)とき、自分は手札を(\d)枚リムーブする。$/,m=>({solvedTrigger:async p=>{await discard(p,+m[1],"解決編になったとき: 手札をリムーブ")}})],
  [/^この事件が解決編に(?:なった|移行した)とき、相手はカードを(\d)枚引く。$/,m=>({solvedTrigger:async p=>drawN(opp(p),+m[1])})],
];
// 本体で処理している行（キーワード・パートナーの能力・スリープ登場）
const CORE_LINE=/^(?:【[^】]+】)*(?:〚(?:突撃|迅速|ブレット|ミスリード\d)|【解決編】【事件解決】|【アシスト】|このキャラはスリープ状態で登場する。$|このキャラは(?:スリープ状態でも)?ガードできない。$|このキャラはスリープ状態でもガードできる。$|[^［]+［ID：\d+］はデッキに何枚でも入れることができる。$)/;
// カットイン（本体の ownCutinAp がAPを足す）。AP＋N のあとに続く効果は cutin フックにする
const CI_CORE=/^(?:AP[＋+]\d+|自分のリムーブエリアにある〚カード名［[^］]+］〛1枚につき、AP[＋+]\d+(?:（このカードも含める）)?|自分の現場にいる〚特徴［[^］]+］〛のキャラ1枚につき、AP[＋+]\d+|AP[＋+]\d+、自分の手札が\d枚以下の場合、代わりにAP[＋+]\d+|(?:〚(?:カード名|特徴)?［[^］]+］〛か?)+(?:のキャラ)?に【カットイン】する場合、AP[＋+]\d+)$/;
const CI_RULES=[
  [new RegExp(`^AP[＋+]\\d+、自分の事件が【(${COLS})】以外の色を持たない場合、カードを(\\d)枚引く。$`),m=>({cutin:async p=>{if(colorsOf(C(p.caseC).c).every(ch=>ch===m[1]))drawN(p,+m[2])}})],
  [/^AP[＋+]\d+、〚特徴［([^］]+)］〛のキャラに【カットイン】した場合、カードを(\d)枚引く。$/,m=>({cutin:async(p,card,mine)=>{if(mine&&hasTrait(mine,m[1]))drawN(p,+m[2])}})],
];
const HR_RULES=[
  [/^カードを(\d)枚引く。$/,m=>async o=>drawN(o,+m[1])],
  [/^キャラを(\d)枚まで選び、スリープさせる。$/,m=>async o=>{const t=await chooseChar(o,"ヒラメキ: スリープさせるキャラ",y=>y.st==="a");if(t)sleepC(t)}],
  [/^自分のリムーブエリアにある(?:〚カード名［([^］]+)］〛|〚特徴［([^］]+)］〛のキャラ)を(\d)枚まで選び、手札に加える。$/,m=>async o=>{
    const f=m[1]?y=>C(y).nm.includes(m[1]):y=>C(y).t==="キャラ"&&hasTrait(y,m[2]);
    const got=await pickCards(o,"ヒラメキ: 手札に加えるカード","",o.rm.filter(f),{max:+m[3],ai:c=>c.slice().sort((a,b)=>lvOf(b)-lvOf(a))});
    for(const y of got){detach(y);o.hand.push(y);log(`　${C(y).nm} を手札に`)}}],
  [/^このカードを手札に加える。$/,m=>async(o,e)=>{if(e&&o.rm.includes(e)){detach(e);o.hand.push(e);log(`　${C(e).nm} を手札に`)}}],
  [/^自分は証拠を(\d)つ得る。$/,m=>async o=>gainEv(o,+m[1])],
  [/^相手は手札を(\d)枚リムーブする。$/,m=>async o=>{const q=opp(o);await discard(q,+m[1],"ヒラメキ: 手札をリムーブ",q)}],
];
const merge=(a,b)=>{const out={...a};for(const k in b){if(typeof b[k]==="function"&&typeof out[k]==="function"&&k!=="ai"){const f=out[k],g=b[k];out[k]=async(...q)=>{await f(...q);await g(...q)}}else out[k]=b[k]}return out};
function autoDef(c){
  let d={},alone={},ok=true,any=false;
  for(const raw of (c.f||"").split("\n")){const line=raw.trim();if(!line||CORE_LINE.test(line))continue;
    const r=LINE_RULES.find(([re])=>re.test(line));if(!r){ok=false;continue}
    const h=r[1](line.match(r[0]),c);d=merge(d,h);if(r[2])alone=merge(alone,h);any=true}
  for(const raw of (c.ci||"").split("\n")){const line=raw.trim();if(!line.startsWith("【カットイン】"))continue;
    const body=line.replace(/^【カットイン】(?:【[^】]+】)*/,"").replace(/（[^）]*）$/,"");
    if(CI_CORE.test(body))continue;const r=CI_RULES.find(([re])=>re.test(body));if(!r){ok=false;continue}
    d=merge(d,r[1](body.match(r[0]),c));any=true}
  if(!ok)d=alone; // 分からない行があるカードは、単独で動く行（除去など）だけ自動にする
  if(c.t==="イベント"&&!ok)delete d.event; // イベントは全文が分かるときだけ
  const hr=(c.hr||"").trim().replace(/^【ヒラメキ】(?:（[^）]*）)?/,"");
  if(hr){const r=HR_RULES.find(([re])=>re.test(hr));if(r){d.hirameki=r[1](hr.match(r[0]));any=true}else if(ok&&any)d.partial=true}
  if(!ok&&any)d.partial=true;
  return any||ok?d:null; // 本体だけで処理できるカード（突撃だけ、カットインのAPだけなど）は空の定義で「自動」にする
}
for(const c of window.CARD_DB){const d=autoDef(c);if(!d)continue;
  if(DEF[c.i]){if(!DEF[c.i].hirameki&&d.hirameki)DEF[c.i].hirameki=d.hirameki}else DEF[c.i]=d} // 手書きの定義にもヒラメキを補う
