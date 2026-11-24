// 局面 → 每個曲的位置（瀏覽器與 node 共用）
(function(root){'use strict';
const GR=(typeof module!=='undefined'&&module.exports)?require('./rules.js'):root.GR;
const clone=o=>JSON.parse(JSON.stringify(o));
const QU='甲乙丙丁戊己庚辛壬癸'.split('');
const FL={甲:'L',乙:'L',丙:'L',丁:'M',戊:'M',己:'M',壬:'M',庚:'R',辛:'R',癸:'R'};
const CP0={戊:[0,0],己:[0,7],丁:[-8,6],壬:[8,6]},CP1={戊:[0,-15.2],丁:[-5.4,-14.6],壬:[5.4,-14.6],己:[0,-9.6]};
const WB0=[[14,12],[20,18],[26,24]],WB1=[[11,-8.6],[16.4,-2.6],[21.8,3.4]];
const WF=[[11.6,-28.6],[13.6,-23],[15.6,-17.4]],WCUT=[[12.4,-30],[19,-20],[25.6,-10]];
const WSLOT={丙:['L',0],乙:['L',1],甲:['L',2],癸:['R',0],庚:['R',1],辛:['R',2]};
const RESP={rear:[[-2.1,-41],[2.1,-41]],center:[[-2.1,-34.4],[2.1,-34.4]],flanks:[[-11.8,-36.5],[11.8,-36.5]]};
const RN={rear:'後方居中',center:'中央後方',flanks:'兩側後方'};
function bluePos(s,ro,origSlots){const Pp={};const ct=s.B.contact;const CP=ct?CP1:CP0;
  for(const nm of ro.C)Pp[nm]=CP[nm];
  const b=CP['己'][1];ro.D.forEach((nm,i)=>Pp[nm]=[i%2?2.9:-2.9,b+5.8*(1+Math.floor(i/2))]);
  for(const k of['L','R']){const sg=k==='L'?-1:1,w=s.B.W[k];const tbl=w.pos==='flank'?(w.cut?WCUT:WF):(ct?WB1:WB0);
    ro[k].forEach((nm,i)=>{const t=tbl[origSlots&&w.pos!=='flank'?WSLOT[nm][1]:i];Pp[nm]=[sg*t[0],t[1]];});}
  return Pp;}
// 由命令紀錄重播出每一回合的局面，並追蹤每個曲在哪裡、何時陣亡
function timeline(hist){let s=GR.init();let ro={C:['戊','己','丁','壬'],D:[],L:['丙','乙','甲'],R:['癸','庚','辛'],dead:{}};const out=[{s,ro:clone(ro)}];
  for(const h of hist){const n=GR.step(s,h.bo,h.ro);ro=clone(ro);const bo=n.hist[n.hist.length-1].bo;
    if(bo.w==='集')for(const k of['L','R'])if(ro[k].length)ro.D.push(ro[k].shift());
    const pos=bluePos(n,ro);const kill=(nm,rout)=>{ro.dead[nm]={x:pos[nm][0],z:pos[nm][1],rout:!!rout};};
    for(const k of['L','R'])while(ro[k].length>n.B.W[k].n)kill(ro[k].pop());
    while(ro.D.length>n.B.D)kill(ro.D.pop());
    while(ro.C.length>n.B.M)kill(ro.C.pop(),n.B.M<=0);
    s=n;out.push({s,ro});}
  return out;}
const API={QU,FL,CP0,CP1,WB0,WB1,WF,WCUT,WSLOT,RESP,RN,bluePos,timeline};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GL=API;
})(typeof window!=='undefined'?window:globalThis);
