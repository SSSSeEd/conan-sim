"use strict";
// コンボ表（CPUが使う）。node tools/combo_gate.js が、ツールありとなしで対戦させて有意に勝てたものだけをここに書き出す。手で書き足してもよい
// 1件: {parts:[{n:"カード番号",where:"現場"|"手札"},...], act:{kind:"hand",n}|{kind:"ab",n,label}, deck:"検証したデッキ名", wr:{n,on,off,p}}
// CPUは手番のはじめに、parts がそろっていて act が使えるなら、そのコンボの行動を先に行う（ai2(p,"combo2") がオンのときだけ）
const COMBO2=[];
