// 電腦對手：典型打法與「會判斷」的電腦
(function(root){'use strict';
const R=(typeof module!=='undefined'&&module.exports)?require('./rules.js'):root.GR;
const {blueLegal,redLegal,viewRed,viewBlue}=R;
const pick=a=>a[Math.random()*a.length|0];
const has=(L,o)=>L.some(x=>x.c===o.c&&x.w===o.w);
function fixB(seq){return s=>{const L=blueLegal(s);const o=seq[Math.min(s.r,seq.length-1)];if(has(L,o))return o;
  const alt=L.find(x=>x.c===o.c&&x.w==='收')||L.find(x=>x.c===o.c&&x.w==='梯');return alt;};}
const parse=str=>str.split(' ').map(t=>({c:t[0],w:t[1]}));
const BLUE={
  '鴈行・依時張翼':fixB(parse('纏梯 纏梯 纏斜 纏收 纏收')),
  '鴈行・佯攻再張翼':fixB(parse('纏梯 攻梯 纏斜 纏收 纏收')),
  '鴈行・開局即張':fixB(parse('纏斜 纏收 纏收 纏收 纏收')),
  '鴈行・急進包抄':fixB(parse('纏梯 纏急 纏收 纏收 纏收')),
  '錐行・早聚':fixB(parse('纏集 纏集 攻梯 攻梯 攻梯')),
  '錐行・晚聚':fixB(parse('纏梯 纏集 攻梯 攻梯 攻梯')),
  '兩面並進':fixB(parse('纏集 纏斜 攻收 攻收 攻收')),
  '全線強攻':fixB(parse('攻急 攻收 攻收 攻收 攻收')),
  '應變（看預備隊）':smartB,
};
function smartB(s){const v=viewBlue(s),B=v.B,L=blueLegal(s),pos=B.W.L.pos;
  const can=o=>has(L,o);
  if(pos==='flank')return {c:'纏',w:'收'};
  if(v.resSeen==='center'||s.lastRedPress)return can({c:'纏',w:'斜'})?{c:'纏',w:'斜'}:{c:'纏',w:'梯'};
  if(v.resSeen==='flanks'){if(B.D<4&&can({c:'纏',w:'集'}))return {c:'纏',w:'集'};return {c:'攻',w:'梯'};}
  if(s.r===0)return {c:'纏',w:'梯'};
  if(s.r===1)return {c:'攻',w:'梯'};
  const x=Math.random();return x<.4?{c:'纏',w:'斜'}:x<.7?{c:'攻',w:'梯'}:{c:'纏',w:'梯'};}
function randB(s){return pick(blueLegal(s));}
function fixR(seq){return s=>seq[Math.min(s.r,seq.length-1)];}
const pr=str=>str.split(' ').map(t=>({f:t[0],res:{中:'center',後:'rear',翼:'flanks'}[t[1]]}));
const RED={
  '預備隊守中央':fixR(pr('頂中 頂中 頂中 頂中 頂中')),
  '預備隊守兩側':fixR(pr('頂翼 頂翼 頂翼 頂翼 頂翼')),
  '預備隊居後不動':fixR(pr('頂後 頂後 頂後 頂後 頂後')),
  '全力前壓':fixR(pr('壓中 壓中 壓中 壓中 壓中')),
  '居後・見形而應':reactR(false),
  '試探・再應':reactR(true),
  '識破佯攻':wiseR,
};
function reactR(probe){return s=>{const v=viewRed(s);
  if(v.pos==='flank')return {f:'頂',res:'flanks'};
  if((v.D!==null&&v.D>=2)||s.lastBlueAtk)return {f:'頂',res:'center'};
  if(probe&&v.D===null&&s.r>=1&&!s.probed){s.probed=1;return {f:'探',res:'rear'};}
  if(probe&&v.D===0&&s.r>=2)return {f:'壓',res:'center'};
  return {f:'頂',res:'rear'};};}
function wiseR(s){const v=viewRed(s);
  if(v.pos==='flank')return {f:'頂',res:'flanks'};
  if(v.D!==null&&v.D>=2)return {f:'頂',res:'center'};          // 後陣厚：是真錐行
  if(v.D===null&&s.r>=1&&!s.probed){s.probed=1;return {f:'探',res:'rear'};}
  return {f:'頂',res:'rear'};}                                  // 中部薄而猛攻：多半是佯攻，不動預備隊
function randR(s){return pick(redLegal(s));}



// 「會判斷」的電腦：依看得到的跡象，推測對手屬於哪一種打法，再選最有機會贏的命令
const A={BLUE,RED};
const RD=Object.entries(A.RED);            // 紅方的典型打法（皆為確定性）
const BD=Object.entries(A.BLUE).filter(([k])=>!k.startsWith('應變'));
function replay(bfOrders,rf){let s=R.init();for(const bo of bfOrders){const ro=rf(s);s=R.step(s,bo,ro);if(s.over)break;}return s;}
function replayR(roOrders,bf){let s=R.init();for(const ro of roOrders){const bo=bf(s);s=R.step(s,bo,ro);if(s.over)break;}return s;}
function blueCanWin(s,rf,depth){if(s.over)return s.over.win==='藍';const ro=rf(s);for(const bo of R.blueLegal(s)){if(blueCanWin(R.step(s,bo,ro),rf))return true;}return false;}
function redCanWin(s,bf){if(s.over)return s.over.win==='紅';const bo=bf(s);for(const ro of R.redLegal(s)){if(redCanWin(R.step(s,bo,ro),bf))return true;}return false;}
const RO_ALL=R.redLegal(R.init());
// 同分的命令裡，依「說得通」的程度加權抽選：已經接敵就不無故退回本陣再衝上去（以前純隨機，看起來莫名其妙）；
// 仍保留隨機，對手才不會一眼看穿
function wpick(cands,wt){const ws=cands.map(wt),T=ws.reduce((a,b)=>a+b,0);let r=Math.random()*T;for(let i=0;i<cands.length;i++){r-=ws[i];if(r<=0)return cands[i];}return cands[cands.length-1];}
function pickB(s,cands){const ct=s.B.contact;const nonWait=cands.some(o=>o.c!=='待');
  return wpick(cands,o=>o.c==='待'?(ct&&nonWait?0:(nonWait?.6:1)):1);}
function pickR(s,cands){return wpick(cands,()=>1);}
function informedB(s){const myOrders=s.hist.map(h=>h.bo);const seenRes=s.resHist.slice(0,Math.max(1,s.resHist.length-1));const seenF=s.hist.map(h=>h.ro.f);
  let cons=RD.filter(([,rf])=>{const t=replay(myOrders,rf);if(t.hist.length!==s.hist.length)return false;
    for(let i=0;i<t.hist.length;i++)if(t.hist[i].ro.f!==seenF[i])return false;
    for(let i=0;i<seenRes.length;i++)if(t.resHist[i]!==seenRes[i])return false;return true;});
  if(!cons.length)cons=RD;
  let best=-1,cands=[];for(const bo of R.blueLegal(s)){let sc=0;for(const [,rf] of cons){const t=replay(myOrders,rf);const ro=rf(t);const n=R.step(t,bo,ro);if(blueCanWin(n,rf))sc++;}
    if(sc>best){best=sc;cands=[bo];}else if(sc===best)cands.push(bo);}
  return pickB(s,cands);}
function informedR(s){const myOrders=s.hist.map(h=>h.ro);
  const vis=s.hist.map(h=>h.bo.c);const posHist=[];// 紅方看得到：藍軍中部動作、兩翼位置；看不到「集」
  let cons=BD.filter(([,bf])=>{const t=replayR(myOrders,bf);if(t.hist.length!==s.hist.length)return false;
    for(let i=0;i<t.hist.length;i++){if(t.hist[i].bo.c!==vis[i])return false;const a=t.hist[i].bo.w,b=s.hist[i].bo.w;const va=(a==='集'?'梯':a),vb=(b==='集'?'梯':b);if(va!==vb)return false;}
    return true;});
  if(!cons.length)cons=BD;
  let best=-1,cands=[];for(const ro of RO_ALL){let sc=0;for(const [,bf] of cons){const t=replayR(myOrders,bf);const bo=bf(t);const n=R.step(t,bo,ro);if(redCanWin(n,bf))sc++;}
    if(sc>best){best=sc;cands=[ro];}else if(sc===best)cands.push(ro);}
  return pickR(s,cands);}

const API={BLUE,RED,randB,randR,informedB,informedR};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GAI=API;
})(typeof window!=='undefined'?window:globalThis);
