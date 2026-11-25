// 局面 → 每個曲的位置（瀏覽器與 node 共用）
(function(root){'use strict';
const GR=(typeof module!=='undefined'&&module.exports)?require('./rules.js'):root.GR;
const clone=o=>JSON.parse(JSON.stringify(o));
const QU='甲乙丙丁戊己庚辛壬癸'.split('');
const FL={甲:'L',乙:'L',丙:'L',丁:'M',戊:'M',己:'M',壬:'M',庚:'R',辛:'R',癸:'R'};
const CP0={戊:[0,0],己:[0,7],丁:[-8,6],壬:[8,6]},CP1={戊:[0,-15.2],丁:[-5.4,-14.6],壬:[5.4,-14.6],己:[0,-9.6]};
const WB0=[[14,12],[20,18],[26,24]],WB1=[[11,-8.6],[16.4,-2.6],[21.8,3.4]];
const WF=[[15.4,-28.6],[17.4,-23],[19.4,-17.4]],WCUT=[[16.2,-30],[22.8,-20],[29.4,-10]];
const WSLOT={丙:['L',0],乙:['L',1],甲:['L',2],癸:['R',0],庚:['R',1],辛:['R',2]};
const RESP={rear:[[-2.6,-43.5],[2.6,-43.5]],center:[[-2.6,-35.4],[2.6,-35.4]],flanks:[[-15.6,-38],[15.6,-38]]};
const RN={rear:'後方居中',center:'中央後方',flanks:'兩側後方'};
// 錐行：後曲集中之後，中部排成「前尖、身窄、縱深厚」的錐子（一、二、二、二……排）
const AWL_Z0=ct=>ct?-15.2:0;
function awlSlots(n,ct){const out=[],z0=AWL_Z0(ct);let r=0,left=n;while(left>0){const k=r===0?1:Math.min(2,left);for(let j=0;j<k;j++)out.push([k===1?0:(j?2.9:-2.9),z0+r*5.6]);left-=k;r++;}return out;}
// 接敵的位置：紅軍前壓時，紅軍整條戰線往藍軍那邊推進 rz；藍軍本陣跟著往後讓出距離 hs，兩軍不會疊在一起
const offs=ro=>{const rz=ro.rz||0;return{rz,hs:Math.max(0,rz-9.2)};};
function bluePos(s,ro,origSlots){const P0=bluePos0(s,ro,origSlots);const {rz,hs}=offs(ro);const ct=s.B.contact;
  for(const nm of Object.keys(P0)){const inWing=ro.L.includes(nm)||ro.R.includes(nm);const flank=inWing&&s.B.W[ro.L.includes(nm)?'L':'R'].pos==='flank';
    P0[nm]=[P0[nm][0],P0[nm][1]+(flank||ct?rz:hs)];}
  return P0;}
function bluePos0(s,ro,origSlots){const Pp={};const ct=s.B.contact;const CP=ct?CP1:CP0;
  const awl=!origSlots&&ro.D.length>0;
  if(awl){const order=['戊','丁','壬','己'].filter(nm=>ro.C.includes(nm)).concat(ro.D);const sl=awlSlots(order.length,ct);order.forEach((nm,i)=>Pp[nm]=sl[i]);}
  else{for(const nm of ro.C)Pp[nm]=CP[nm];
    const b=CP['己'][1];ro.D.forEach((nm,i)=>Pp[nm]=[i%2?2.9:-2.9,b+5.8*(1+Math.floor(i/2))]);}
  for(const k of['L','R']){const sg=k==='L'?-1:1,w=s.B.W[k];
    if(awl&&w.pos!=='flank'){const z0=AWL_Z0(ct);ro[k].forEach((nm,i)=>{Pp[nm]=[sg*(9.2+i*2.6),z0+(2+i)*5.6];});continue;}
    const tbl=w.pos==='flank'?(w.cut?WCUT:WF):(ct?WB1:WB0);
    ro[k].forEach((nm,i)=>{const t=tbl[origSlots&&w.pos!=='flank'?WSLOT[nm][1]:i];Pp[nm]=[sg*t[0],t[1]];});}
  return Pp;}
// 由命令紀錄重播出每一回合的局面，並追蹤每個曲在哪裡、何時陣亡
function timeline(hist){let s=GR.init();let ro={C:['戊','己','丁','壬'],D:[],L:['丙','乙','甲'],R:['癸','庚','辛'],dead:{},rz:0};const out=[{s,ro:clone(ro)}];
  for(const h of hist){const n=GR.step(s,h.bo,h.ro);ro=clone(ro);const bo=n.hist[n.hist.length-1].bo;
    // 新接敵：藍軍上前→在紅軍原來的戰線交戰；紅軍前壓→紅軍推進到藍軍本陣；雙方同時→在中間相遇
    if(!s.B.contact&&n.B.contact){const {rz,hs}=offs(ro);const target=Math.min(30,hs+17.6);const red=h.ro.f==='壓',blue=h.bo.c!=='待';
      if(red&&blue)ro.rz=rz+(target-rz)/2;else if(red)ro.rz=target;}
    if(bo.w==='集')for(const k of['L','R'])if(ro[k].length)ro.D.push(ro[k].shift());
    const pos=bluePos(n,ro);const kill=(nm,rout)=>{ro.dead[nm]={x:pos[nm][0],z:pos[nm][1],rout:!!rout};};
    for(const k of['L','R'])while(ro[k].length>n.B.W[k].n)kill(ro[k].pop());
    while(ro.D.length>n.B.D)kill(ro.D.pop());
    while(ro.C.length>n.B.M)kill(ro.C.pop(),n.B.M<=0);
    s=n;out.push({s,ro});}
  return out;}
const API={offs,QU,FL,CP0,CP1,WB0,WB1,WF,WCUT,WSLOT,RESP,RN,bluePos,timeline,awlSlots,AWL_Z0};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GL=API;
})(typeof window!=='undefined'?window:globalThis);
