// 鴈行對戰：規則（純邏輯，瀏覽器與 node 共用）
(function(root){'use strict';
// 鴈行對戰：規則（純邏輯）。藍軍＝攻方（十個曲），紅軍＝方陣（守方）。

const P={ // 可調參數
  M:4, NW:3, F:3, RES:4, ROUNDS:5,
  resCenter:4, resRear:1, resFlank:2,      // 預備隊對中區／後方居中／兩側的支援
  hold:1.25, guard:1.25,                   // 紅軍「頂住」、藍軍「纏住」防守加成
  side:1.5, cut:0.5, thin:0.7, arrive:0.8, // 側擊、斷絕、錐行本不厚、先移動再接敵
  intercept:1.5, pincer:4/3,  // 三面夾擊（中部接敵、兩翼同時側擊）
                            // 預備隊截擊行進中的兩翼（擊其未陣）
  collapseTotal:4, exposed:0.8 /* 兩翼離開後，中部兩側失去掩護 */
};
function init(){return{r:0,
  B:{M:P.M,D:0,W:{L:{n:P.NW,pos:'back',cut:false},R:{n:P.NW,pos:'back',cut:false}},contact:false,shake:0},
  R:{F:{L:P.F,C:P.F,R:P.F},shake:{L:0,C:0,R:0},broken:{L:false,C:false,R:false},res:'rear',resN:P.RES},
  resHist:['rear'],hist:[],over:null,log:[],vis:[]};}
const clone=s=>JSON.parse(JSON.stringify(s));
const wingPos=s=>s.B.W.L.pos; // 兩翼同令，位置相同
function blueLegal(s){const out=[];const pos=wingPos(s);const W=s.B.W;
  const ws=['梯'];const alive=W.L.n>0&&W.R.n>0;if(pos==='back'&&alive){ws.push('斜','急');if(W.L.n>=2&&W.R.n>=2&&s.B.D<4)ws.push('集');}if(pos==='flank'&&alive)ws.push('收');
  for(const c of['待','纏','攻'])for(const w of ws)out.push({c,w});return out;}
function redLegal(s){const out=[];for(const f of['頂','壓','探'])for(const res of['rear','center','flanks'])out.push({f,res});return out;}
function moveRes(from,to){if(from===to)return to;if(from==='rear')return to;if(to==='rear')return 'rear';return 'rear';} // 中央↔兩側要經過後方
// 比值：對方這一處已經沒有兵力時記為 99（一定擊潰），戰報寫「對方已無兵力」而不是數字
const ratio=(a,d)=>d>0?a/d:99;const qtxt=(q,a,b)=>q>=99?b+'這一處已無兵力':a+'戰力是'+b+'的 '+q.toFixed(2)+' 倍';
function outcome(q){return q>=2?'潰':q>=1.5?'退':q>=1?'損':'挫';}
function step(s0,bo,ro){const s=clone(s0);
  if(!blueLegal(s).some(o=>o.c===bo.c&&o.w===bo.w))bo={c:bo.c,w:'梯'};   // 不合法的兩翼命令一律當作「梯次在後」
  s.r++;const B=s.B,R=s.R,L=[];const V=[];const say=(t,vis)=>{L.push(t);V.push(vis||'both');};
  // 1. 預備隊移動
  const prev=R.res;R.res=moveRes(R.res,ro.res);if(R.res!==prev)say(`紅軍預備隊移到${{rear:'後方居中',center:'中央後方',flanks:'兩側後方'}[R.res]}`,'red');
  // 預備隊的支援隨它剩下的兵力而定：中央＝全部、兩側＝各一半、後方居中＝四分之一（只限中區防守）
  const supC=()=>R.res==='center'?R.resN:R.res==='rear'?R.resN/4:0,supF=()=>R.res==='flanks'?R.resN/2:0;
  const inC=()=>R.res==='center'?R.resN:0;
  const loseRed=k=>{if(R.F[k]>0)R.F[k]--;else if((k==='C'&&R.res==='center')||(k!=='C'&&R.res==='flanks'))R.resN=Math.max(0,R.resN-1);};
  const loseBlueC=()=>{if(B.D>0)B.D--;else B.M=Math.max(0,B.M-1);};
  const resF=supF();
  // 2. 兩翼行動
  const strike=[];
  for(const k of['L','R']){const w=B.W[k];
    if(bo.w==='集'){w.n-=1;B.D+=1;}
    else if(bo.w==='斜'){if(resF>0){w.n=Math.max(0,w.n-1);say(`${k==='L'?'左':'右'}翼斜出途中被紅軍預備隊截擊（行進中遇敵），損 1，退回原位`);continue;}w.pos='flank';say(`${k==='L'?'左':'右'}翼斜出，到達敵陣側面`);}
    else if(bo.w==='急'){w.pos='flank';w.cut=true;strike.push(k);}
    else if(bo.w==='收')strike.push(k);
    else if(bo.w==='梯'&&w.cut){w.cut=false;say(`${k==='L'?'左':'右'}翼停下補位，陣線重新連上`);}}
  // 3. 中區
  const arriving=(bo.c!=='待')&&!B.contact;
  if(bo.c==='待'){if(B.contact)say('藍軍中部退回本陣');B.contact=false;}else{if(!B.contact)say('藍軍中部上前接敵');B.contact=true;}
  const exposed=wingPos(s)==='flank';   // 兩翼已離開：中部兩側沒有梯次掩護
  const bDef=(B.M+B.D)*(bo.c==='纏'&&!arriving?P.guard:1)*(exposed?P.exposed:1);
  const bAtt=(B.M+B.D)*(B.D>=2?1:P.thin)*(arriving?P.arrive:1);
  const rAtt=(R.F.C+inC())*P.arrive;
  if(bo.c==='攻'){s.seenD=B.D;s.seenDAt=s.r;}s.lastBlueAtk=bo.c==='攻';s.lastRedPress=ro.f==='壓';
  const hitBlue=(q,why)=>{const o=outcome(q);say(`${why}：${o==='挫'?'紅軍受挫':'藍軍中部'+{潰:'潰散',退:'動搖',損:'受損'}[o]}（${qtxt(q,'紅軍','藍軍')}）`);
    if(o==='潰')B.M=0;else if(o==='退'){B.shake++;loseBlueC();if(B.shake>=2)B.M=0;}else if(o==='損'){loseBlueC();loseRed('C');}else loseRed('C');};
  const hitRedC=(q,why)=>{const o=outcome(q);say(`${why}：${o==='挫'?'藍軍受挫':'紅軍中區'+{潰:'被突穿',退:'動搖',損:'受損'}[o]}（${qtxt(q,'藍軍','紅軍')}）`);
    if(o==='潰')R.broken.C=true;else if(o==='退'){R.shake.C++;loseRed('C');if(R.shake.C>=2)R.broken.C=true;}else if(o==='損'){loseRed('C');loseBlueC();}else loseBlueC();};
  if(bo.c==='攻'&&ro.f==='壓'){const q=ratio(bAtt,rAtt);if(q>=1)hitRedC(q,'雙方中部對衝');else hitBlue(ratio(rAtt,bAtt),'雙方中部對衝');}
  else if(bo.c==='攻')hitRedC(ratio(bAtt,(R.F.C+supC())*(ro.f==='頂'?P.hold:1)),'藍軍中部猛攻');
  else if(ro.f==='壓'){if(B.contact)hitBlue(ratio(rAtt,bDef),'紅軍前壓');else{B.contact=true;hitBlue(ratio(rAtt,(B.M+B.D)*(exposed?P.exposed:1)),'紅軍前壓到藍軍本陣');}}
  // 4. 側擊
  const live=strike.filter(k=>B.W[k].n>0);
  const three=live.length===2&&B.contact&&bo.c!=='待';if(three)say('三面夾擊');
  for(const k of live){const w=B.W[k];const att=w.n*P.side*(w.cut?P.cut:1)*(three?P.pincer:1),def=R.F[k]+supF();const q=def>0?att/def:99,o=outcome(q);const nm=k==='L'?'左':'右';
    say(`${nm}翼側擊${w.cut?'（陣線斷絕）':''}：${o==='挫'?nm+'翼受挫':'紅軍'+nm+'側'+{潰:'被擊潰',退:'動搖',損:'受損'}[o]}（側擊戰力 ${att.toFixed(1)} 對 ${def}，${qtxt(q,'藍軍','紅軍')}）`);
    if(o==='潰')R.broken[k]=true;else if(o==='退'){R.shake[k]++;loseRed(k);if(R.shake[k]>=2)R.broken[k]=true;}else if(o==='損'){loseRed(k);w.n--;}else w.n--;}
  // 某一區連預備隊在內都打光了，而且攻方在那裡還有兵，才算被擊潰
  if(R.F.C+inC()<=0&&!R.broken.C&&B.contact&&B.M>0){R.broken.C=true;say('紅軍中區兵力耗盡');}
  for(const k of['L','R'])if(R.F[k]+supF()<=0&&!R.broken[k]&&B.W[k].pos==='flank'&&B.W[k].n>0){R.broken[k]=true;say(`紅軍${k==='L'?'左側':'右側'}兵力耗盡`);}
  // 5. 試探
  if(ro.f==='探'){s.seenD=B.D;s.seenDAt=s.r;say('紅軍派人試探藍軍後陣','red');}
  s.resHist.push(R.res);s.hist.push({bo:{c:bo.c,w:bo.w},ro:{f:ro.f,res:ro.res}});
  // 6. 勝負
  if(!s.over){const brk=['L','R'].filter(k=>R.broken[k]).length;
    const redLose=R.broken.C||brk>=2,blueLose=B.M<=0;
    if(redLose&&blueLose)s.over={win:'和',why:'同一回合兩敗俱傷'};
    else if(blueLose)s.over={win:'紅',why:'藍軍中部潰散'};
    else if(R.broken.C)s.over={win:'藍',why:'中區被突穿（錐行）'};
    else if(brk>=2)s.over={win:'藍',why:'兩側被擊潰（鴈行合圍）'};
    else if(B.M+B.D+B.W.L.n+B.W.R.n<=P.collapseTotal)s.over={win:'紅',why:'藍軍兵力耗盡'};
    else if(B.W.L.n+B.W.R.n<=0&&B.D<2)s.over={win:'紅',why:'藍軍兵力耗盡'};
    else if(s.r>=P.ROUNDS)s.over={win:'紅',why:'方陣守住'};}
  s.log.push(L);(s.vis=s.vis||[]).push(V);return s;}
// 各方可見資訊
function viewRed(s){return{r:s.r,contact:s.B.contact,pos:wingPos(s),cut:s.B.W.L.cut,M:s.B.M,D:s.seenD===undefined?null:s.seenD,res:s.R.res,R:s.R};}
function viewBlue(s){return{r:s.r,B:s.B,resSeen:s.resHist[Math.max(0,s.resHist.length-2)],R:{F:s.R.F,shake:s.R.shake,broken:s.R.broken}};}
const API={P,init,step,blueLegal,redLegal,viewRed,viewBlue,clone,wingPos};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GR=API;

})(typeof window!=='undefined'?window:globalThis);
