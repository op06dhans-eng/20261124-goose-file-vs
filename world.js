// 鴈行對戰：立體戰場（畫風甲＝黃昏平原、戊＝全息推演室；周邊地形＝疏林草甸）
// 只負責畫：部隊位置與狀態由 app.js 依局面算好後交給 W.show()。
(function(){
'use strict';
const PI=Math.PI,TAU=PI*2;
let seed=20261124;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const rand=(a,b)=>a+rnd()*(b-a);const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const BOX=new THREE.BoxGeometry(1,1,1);
const m4=new THREE.Matrix4(),q4=new THREE.Quaternion(),e4=new THREE.Euler(),p4=new THREE.Vector3(),s4=new THREE.Vector3(),PM=new THREE.Matrix4(),CM=new THREE.Matrix4();

const TH={
  甲:{top:0x56577f,hor:0xe2a46a,low:0xb98058,fog:[90,230],ground:'#8f8a52',patch:['#7f6244','#a3a24e','#b89466'],hemi:[0xffe6c4,0x6a5040,.8],sun:[0xffcf98,.95,[-30,45,22]],
     blue:0x3f6bb0,bHelm:0x2b3d5c,red:0xa83a28,rHelm:0x5a2318,res:0x8e3020,skin:0xe0b48a,leg:0x2c2a30,dead:0x4a4038,tree:[0x4a3220,0x4a6338],mount:0x6a6a7a,
     hill:[0x8e9852,0x6f8446,0x5f7040,0x7a6e58,0x948e86],rock:0x8a847a,grass:0x7c9448},
  戊:{top:0x04070d,hor:0x04070d,low:0x04070d,fog:[120,400],holo:true,hemi:[0xffffff,0xffffff,1],sun:[0xffffff,0,[0,1,0]],
     blue:0x43c6ff,bHelm:0x9be2ff,red:0xff5a4a,rHelm:0xffb0a4,res:0xff9a3a,skin:0xd8f4ff,leg:0x1e6f96,dead:0x24485a,
     hill:[0x0a2236,0x0c3550,0x10496c,0x165f8a,0x1f7aa8],rock:0x2a7fa8,grass:0x125a78}
};

/* ---------- 地形：疏林草甸（戰場本身是平地） ---------- */
const dOut=(x,z)=>Math.hypot(Math.max(0,Math.abs(x)-48),Math.max(0,-62-z,z-42));
const nz=(x,z)=>.55*Math.sin(x*.07+1.3)*Math.cos(z*.06)+.35*Math.sin(x*.13-z*.09+2)+.25*Math.cos(x*.21+z*.17);
const PONDS=[[-68,-28,13,8],[64,34,10,7],[-30,-92,12,7]];
const pondE=(x,z)=>Math.min(...PONDS.map(([px,pz,rx,rz])=>((x-px)/rx)**2+((z-pz)/rz)**2));
function H(x,z){const d=dOut(x,z);if(d<24)return 0;const n=nz(x,z);let h=Math.min(5,(d-24)*.1)*(.6+.6*n);if(pondE(x,z)<2)h=0;return Math.max(0,h);}
const CELL=4;const topAt=(x,z)=>{const cx=Math.floor(x/CELL)*CELL+CELL/2,cz=Math.floor(z/CELL)*CELL+CELL/2;const h=H(cx,cz);return h<.75?0:Math.round(h/1.5)*1.5;};
function treeSpots(){seed=777;const out=[];const ok=(x,z)=>dOut(x,z)>2&&pondE(x,z)>=1.3;
  for(let c=0;c<18;c++){let cx,cz,g=0;do{cx=rand(-150,150);cz=rand(-160,80);}while(!ok(cx,cz)&&g++<50);
    for(let i=0;i<12;i++){const x=cx+rand(-7,7),z=cz+rand(-7,7);if(ok(x,z))out.push({x,z,y:topAt(x,z),ry:rand(0,TAU),s:rand(.8,1.3)});}}
  return out;}

let renderer,scene,camera,canvas,stage,world=null,units=null,fxG=null,tick=[],T=TH.甲,themeKey='甲';
function noiseTex(base,amt,size,dots){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,size,size);
  for(let i=0;i<dots;i++){const v=rnd()-.5,s=rnd()<.15?4:2;g.fillStyle=v>0?`rgba(255,240,210,${v*amt})`:`rgba(20,14,8,${-v*amt})`;g.fillRect(rnd()*size|0,rnd()*size|0,s,s);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;return t;}
const inst=(grp,list,mat)=>{const im=new THREE.InstancedMesh(BOX,mat,Math.max(1,list.length));im.count=list.length;list.forEach((o,i)=>{e4.set(o[7]||0,o[6]||0,0,'YXZ');q4.setFromEuler(e4);p4.set(o[0],o[1],o[2]);s4.set(o[3],o[4],o[5]);m4.compose(p4,q4,s4);im.setMatrixAt(i,m4);});grp.add(im);return im;};

function buildWorld(){
  if(world){scene.remove(world);world.traverse(o=>{if(o.geometry&&o.geometry!==BOX)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}
  world=new THREE.Group();scene.add(world);tick=[];seed=20261124;const holo=!!T.holo;
  scene.background=new THREE.Color(T.hor);scene.fog=new THREE.Fog(T.hor,T.fog[0],T.fog[1]);
  const Mat=holo?(c=>new THREE.MeshBasicMaterial({color:c})):(c=>new THREE.MeshLambertMaterial({color:c}));
  if(!holo){const g=new THREE.SphereGeometry(300,24,14),p=g.attributes.position,cols=[];const top=new THREE.Color(T.top),hor=new THREE.Color(T.hor),low=new THREE.Color(T.low),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const y=p.getY(i)/300;if(y>=0)c.copy(hor).lerp(top,Math.pow(y,.55));else c.copy(hor).lerp(low,Math.min(1,-y*3));cols.push(c.r,c.g,c.b);}
    g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));world.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false})));}
  world.add(new THREE.HemisphereLight(T.hemi[0],T.hemi[1],T.hemi[2]));const sun=new THREE.DirectionalLight(T.sun[0],T.sun[1]);sun.position.set(...T.sun[2]);world.add(sun);
  if(holo){const gm=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshBasicMaterial({color:0x060b14}));gm.rotation.x=-PI/2;world.add(gm);
    const g1=new THREE.GridHelper(240,48,0x1fd0ff,0x0f4a66);g1.position.y=.02;world.add(g1);const g2=new THREE.GridHelper(240,12,0x39e0ff,0x1c88b0);g2.position.y=.03;world.add(g2);
  }else{const t=noiseTex(T.ground,.28,128,2600);t.repeat.set(60,40);const g=new THREE.Mesh(new THREE.PlaneGeometry(460,340),new THREE.MeshLambertMaterial({map:t}));g.rotation.x=-PI/2;g.position.z=-35;world.add(g);
    const pt=T.patch.map(c=>noiseTex(c,.45,64,800));for(let i=0;i<60;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(rand(6,18),rand(6,20)),new THREE.MeshLambertMaterial({map:pt[i%3],transparent:true,opacity:.4}));m.rotation.x=-PI/2;m.rotation.z=rand(0,TAU);m.position.set(rand(-150,150),.006+i*.0002,rand(-140,50));world.add(m);}
    // 遠山（只在遠處，鏡頭後方的壓低，不擋視線）
    const ms=[];const mount=(x,z,w,h)=>{ms.push([x,h*.22,z,w,h*.44,w],[x,h*.5,z,w*.7,h*.34,w*.65],[x+rand(-3,3),h*.74,z,w*.42,h*.3,w*.4]);};
    for(let x=-240;x<=240;x+=11)mount(x+rand(-3,3),-185+rand(-10,10),rand(22,36),rand(26,52));for(let x=-240;x<=240;x+=14)mount(x+rand(-3,3),125+rand(-8,8),rand(20,30),rand(8,14));
    const mm=inst(world,ms,new THREE.MeshLambertMaterial({color:0xffffff}));const col=new THREE.Color();ms.forEach((o,i)=>{col.setHex(T.mount);col.offsetHSL(0,0,rand(-.03,.06)+(i%3)*.03);mm.setColorAt(i,col);});}
  // 緩丘
  {const cells=[];for(let x=-172;x<172;x+=CELL)for(let z=-178;z<112;z+=CELL){const h=topAt(x+.1,z+.1);if(h>0)cells.push([x+CELL/2,h/2,z+CELL/2,CELL,h,CELL]);}
   const im=inst(world,cells,holo?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshLambertMaterial({color:0xffffff}));const c=new THREE.Color();
   cells.forEach((o,i)=>{const h=o[4];c.setHex(T.hill[h<2?0:h<3.5?1:h<5?2:3]);if(!holo)c.offsetHSL(0,0,rand(-.03,.03));im.setColorAt(i,c);});}
  // 池塘
  {const water=[];PONDS.forEach(([px,pz,rx,rz])=>{for(let x=px-rx;x<px+rx;x+=1.5)for(let z=pz-rz;z<pz+rz;z+=1.5){if(((x-px)/rx)**2+((z-pz)/rz)**2<1)water.push([x,.1,z,1.52,.14,1.52]);}});
   let m;if(holo){m=new THREE.MeshBasicMaterial({color:0x39e0ff,transparent:true,opacity:.45});tick.push(t=>m.opacity=.35+.15*Math.sin(t*2));}
   else{m=new THREE.MeshLambertMaterial({color:0x5f8aa6,emissive:0x1c3040});tick.push(t=>m.emissive.setHSL(.56,.35,.1+.03*Math.sin(t*1.5)));}inst(world,water,m);}
  // 岩石、草叢
  {const rk=[];for(let i=0;i<70;i++){const x=rand(-160,160),z=rand(-160,90);if(dOut(x,z)<6||pondE(x,z)<1.4)continue;const y=topAt(x,z),w=rand(1,3);rk.push([x,y+w*.3,z,w,w*rand(.5,.8),w*rand(.7,1.2),rand(0,TAU)]);}inst(world,rk,Mat(T.rock));
   const gr=[];for(let i=0;i<400;i++){const x=rand(-160,160),z=rand(-160,90);if(dOut(x,z)<3||pondE(x,z)<1.2)continue;gr.push([x,topAt(x,z)+.2,z,rand(.8,1.6),.4,rand(.8,1.6),rand(0,TAU)]);}inst(world,gr,Mat(T.grass));}
  // 樹叢
  {const sp=treeSpots();
   if(holo){const tr=[],cr=[];sp.forEach(o=>{tr.push([o.x,o.y+1*o.s,o.z,.25,2*o.s,.25]);cr.push([o.x,o.y+2.8*o.s,o.z,1.6*o.s,1.8*o.s,1.6*o.s,o.ry]);});inst(world,tr,new THREE.MeshBasicMaterial({color:0x2a7fa8}));inst(world,cr,new THREE.MeshBasicMaterial({color:0x1d8fb8,transparent:true,opacity:.75}));}
   else{const tp=[{w:.26,h:2.2,d:.26,y:1.1,c:T.tree[0]},{w:2,h:.75,d:2,y:2.1,c:T.tree[1]},{w:1.5,h:.7,d:1.5,y:2.7,ry:.78,c:T.tree[1]},{w:1,h:.65,d:1,y:3.25,c:T.tree[1]},{w:.5,h:.6,d:.5,y:3.8,ry:.78,c:T.tree[1]}];
     const col=new THREE.Color();for(const pt of tp){const im=new THREE.InstancedMesh(BOX,new THREE.MeshLambertMaterial({color:0xffffff}),sp.length);sp.forEach((pl,i)=>{e4.set(0,pl.ry,0,'YXZ');q4.setFromEuler(e4);p4.set(pl.x,pl.y,pl.z);s4.setScalar(pl.s);PM.compose(p4,q4,s4);e4.set(0,pt.ry||0,0);q4.setFromEuler(e4);p4.set(0,pt.y,0);s4.set(pt.w,pt.h,pt.d);CM.compose(p4,q4,s4);m4.multiplyMatrices(PM,CM);im.setMatrixAt(i,m4);col.setHex(pt.c);col.offsetHSL(0,0,rand(-.04,.04));im.setColorAt(i,col);});world.add(im);}}}
  if(holo){// 戰場範圍的淡圈
    const ring=(x,z,r,c)=>{const m=new THREE.Mesh(new THREE.RingGeometry(r-.25,r,64),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.5,side:THREE.DoubleSide}));m.rotation.x=-PI/2;m.position.set(x,.06,z);world.add(m);};
    ring(0,-28,14,0xff5a4a);ring(0,4,34,0x43c6ff);}
}

/* ---------- 部隊 ---------- */
// 一個 group＝一個曲（16 人）或紅軍方陣的一區（32 人）或一支預備隊（12 人）
const PARTS=[{k:'leg',w:.5,h:.74,d:.26,y:.37},{k:'torso',w:.56,h:.62,d:.34,y:1.05},{k:'head',w:.36,h:.36,d:.36,y:1.56},{k:'helm',w:.42,h:.2,d:.42,y:1.8},{k:'spear',w:.06,h:2.4,d:.06,x:.36,y:1.4}];
const G={};let MAXN=0,meshes=[],flagSpr={},tagSpr={};
function flagTex(txt,bg,fg,glow){const c=document.createElement('canvas');c.width=128;c.height=160;const g=c.getContext('2d');
  g.fillStyle=bg;g.beginPath();g.moveTo(0,0);g.lineTo(128,0);g.lineTo(128,150);g.lineTo(104,134);g.lineTo(84,150);g.lineTo(64,134);g.lineTo(44,150);g.lineTo(24,134);g.lineTo(0,150);g.closePath();g.fill();
  g.strokeStyle=glow||'rgba(0,0,0,.35)';g.lineWidth=5;g.stroke();g.fillStyle=fg;g.font='900 84px "Noto Serif TC","Songti TC","PMingLiU",serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,64,68);return new THREE.CanvasTexture(c);}
function tagTex(txt,bg){const c=document.createElement('canvas');const g=c.getContext('2d');const f='900 44px "Noto Serif TC","Songti TC","PMingLiU",serif';g.font=f;const w=Math.ceil(g.measureText(txt).width)+36;c.width=w;c.height=68;
  g.font=f;g.fillStyle=bg;g.beginPath();g.roundRect?g.roundRect(0,0,w,68,14):g.rect(0,0,w,68);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,w/2,36);const t=new THREE.CanvasTexture(c);t.userData={w,h:68};return t;}
function defineGroups(){ // 固定的部隊清單（位置由 show() 決定）
  const add=(id,side,cols,rows,sp)=>{G[id]={id,side,cols,rows,n:cols*rows,sp,base:MAXN,x:0,z:0,fx:0,fz:0,tx:0,tz:0,ry:0,alive:cols*rows,dead:false,rout:false,hidden:false,flag:null,tag:null,t0:0,dur:1,jit:[]};
    for(let i=0;i<cols*rows;i++)G[id].jit.push([rand(-.1,.1),rand(-.1,.1),rand(0,TAU),rand(-2,2),rand(4,14)]);MAXN+=cols*rows;};
  '甲乙丙丁戊己庚辛壬癸'.split('').forEach(k=>add(k,'b',4,4,1.3));
  ['L','C','R'].forEach(k=>add('F'+k,'r',4,8,1.2));
  add('resA','res',3,4,1.2);add('resB','res',3,4,1.2);
  add('將','gen',1,1,1);}
function buildUnits(){
  if(units){scene.remove(units);units.traverse(o=>{if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});}
  units=new THREE.Group();scene.add(units);meshes=[];flagSpr={};tagSpr={};const holo=!!T.holo;
  const col=new THREE.Color();
  for(const pt of PARTS){const im=new THREE.InstancedMesh(BOX,holo?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshLambertMaterial({color:0xffffff}),MAXN);im.frustumCulled=false;
    for(const g of Object.values(G))for(let i=0;i<g.n;i++){const k=pt.k;const side=g.side;
      const hx=k==='torso'?(side==='b'||side==='gen'?T.blue:side==='r'?T.red:T.res):k==='helm'?(side==='b'||side==='gen'?T.bHelm:T.rHelm):k==='head'?T.skin:k==='leg'?T.leg:(holo?(side==='b'?T.blue:T.red):0x4a3020);
      col.setHex(hx);col.offsetHSL(0,0,rand(-.04,.04));im.setColorAt(g.base+i,col);}
    units.add(im);meshes.push(im);}
  fxG=new THREE.Group();units.add(fxG);arrowG=new THREE.Group();units.add(arrowG);
  for(const g of Object.values(G)){if(g.flag)setFlag(g.id,g.flag,true);if(g.tag)setTag(g.id,g.tag,true);}
}
const FLAGC={L:['#ece6d6','#2a1a10'],M:['#d8aa2a','#2a1a10'],R:['#2f7f7a','#f2e7d1'],red:['#a8261a','#ffe3c8'],res:['#7a2018','#ffe3c8'],gen:['#1d3560','#e8c870']};
function setFlag(id,f,force){const g=G[id];const key=f?f.t+f.c:'';if(!force&&g._fk===key)return;g._fk=key;g.flag=f;
  if(flagSpr[id]){units.remove(flagSpr[id].pole);units.remove(flagSpr[id].sp);flagSpr[id].sp.material.map.dispose();flagSpr[id].sp.material.dispose();}delete flagSpr[id];if(!f)return;
  const holo=!!T.holo;const [bg,fg]=FLAGC[f.c]||FLAGC.red;
  const pole=new THREE.Mesh(BOX,holo?new THREE.MeshBasicMaterial({color:0x7fdcff}):new THREE.MeshLambertMaterial({color:0x4a3020}));const h=f.h||4.2;pole.scale.set(.09,h,.09);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:flagTex(f.t,holo?(f.c==='red'||f.c==='res'?'#6a140e':'#0a3f5c'):bg,holo?'#e8f8ff':fg,holo?'rgba(255,255,255,.8)':null),depthWrite:false,fog:!holo}));sp.scale.set(1.6,2,1);
  units.add(pole);units.add(sp);flagSpr[id]={pole,sp,h};}
function setTag(id,t,force){const g=G[id];const key=t?t.t+t.c:'';if(!force&&g._tk===key)return;g._tk=key;g.tag=t;
  if(tagSpr[id]){units.remove(tagSpr[id]);tagSpr[id].material.map.dispose();tagSpr[id].material.dispose();}delete tagSpr[id];if(!t)return;
  const tex=tagTex(t.t,t.c||'rgba(160,30,20,.92)');const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,depthWrite:false,fog:false}));const s=.045;sp.scale.set(tex.userData.w*s,tex.userData.h*s,1);sp.renderOrder=10;units.add(sp);tagSpr[id]=sp;}

// 依各組現在位置更新每個士兵
function layoutUnits(now){
  const walk=(now/1000)*7;
  for(const g of Object.values(G)){
    const k=clamp((now-g.t0)/g.dur,0,1),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const moving=k<1&&(Math.abs(g.tx-g.fx)+Math.abs(g.tz-g.fz)>.1);
    g.x=g.fx+(g.tx-g.fx)*e;g.z=g.fz+(g.tz-g.fz)*e;
    const c=Math.cos(g.ry),s=Math.sin(g.ry);
    for(let i=0;i<g.n;i++){const r=Math.floor(i/g.cols),cc=i%g.cols;const lx=(cc-(g.cols-1)/2)*g.sp+g.jit[i][0],lz=(r-(g.rows-1)/2)*g.sp+g.jit[i][1];
      let x=g.x+lx*c+lz*s,z=g.z-lx*s+lz*c,ry=g.ry,lying=false,hide=g.hidden;
      if(g.dead||i>=g.alive){lying=true;}
      if(g.rout&&!lying){const j=g.jit[i];if(i%3===0)lying=true;else{x+=Math.cos(j[2])*j[3];z+=(g.side==='b'?1:-1)*j[4]*Math.min(1,k*1.2);ry=g.ry+PI;}}
      const bob=moving&&!lying?Math.abs(Math.sin(walk+i))*.18:0;
      e4.set(lying?PI/2:0,ry,0,'YXZ');q4.setFromEuler(e4);p4.set(x,(lying?.25:0)+bob,z);s4.setScalar(hide?0:1);PM.compose(p4,q4,s4);
      for(let pi=0;pi<PARTS.length;pi++){const pt=PARTS[pi];q4.identity();p4.set(pt.x||0,lying?pt.y*.9-0.1:pt.y,0);s4.set(pt.w,pt.h,pt.d);CM.compose(p4,q4,s4);m4.multiplyMatrices(PM,CM);meshes[pi].setMatrixAt(g.base+i,m4);
        if(lying&&pt.k==='torso'&&!g._deadCol?.[i]){}}
    }
    const fs=flagSpr[g.id];if(fs){const show=!g.hidden&&!g.dead;fs.pole.visible=fs.sp.visible=show;const hw=(g.cols-1)/2*g.sp+1.2;fs.pole.position.set(g.x+hw,fs.h/2,g.z-1);fs.sp.position.set(g.x+hw+.85,fs.h-.8,g.z-1);}
    const ts=tagSpr[g.id];if(ts){ts.visible=!g.hidden;ts.position.set(g.x,6.6,g.z);}
  }
  meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);
}

/* ---------- 箭頭與交戰火花 ---------- */
let arrowG=null;
function setArrows(list){if(!arrowG)return;while(arrowG.children.length){const o=arrowG.children.pop();o.material.dispose();}
  for(const a of list||[]){const [x0,z0]=a.from,[x1,z1]=a.to;const dx=x1-x0,dz=z1-z0,L=Math.hypot(dx,dz);if(L<1)continue;const ang=Math.atan2(dx,dz);
    const mat=new THREE.MeshBasicMaterial({color:a.color||0xffd24a,transparent:true,opacity:.85,depthWrite:false});
    const body=new THREE.Mesh(BOX,mat);body.scale.set(a.w||.9,.08,L-2.2);body.rotation.y=ang;body.position.set(x0+dx*(L-2.2)/2/L,.25,z0+dz*(L-2.2)/2/L);arrowG.add(body);
    for(const sgn of[-1,1]){const h=new THREE.Mesh(BOX,mat.clone());h.scale.set(.9,.08,2.6);h.rotation.y=ang+sgn*.6;h.position.set(x1-Math.sin(ang+sgn*.6)*1.1,.26,z1-Math.cos(ang+sgn*.6)*1.1);arrowG.add(h);}
    if(a.dash){body.material.opacity=.55;}}
}
function burst(x,z,color){if(!fxG)return;const n=14,mat=new THREE.MeshBasicMaterial({color:color||0xffd070,transparent:true,opacity:1});const parts=[];
  for(let i=0;i<n;i++){const m=new THREE.Mesh(BOX,mat);m.scale.setScalar(rand(.3,.6));m.position.set(x+rand(-2,2),rand(.5,2),z+rand(-2,2));m.userData.v=[rand(-4,4),rand(4,9),rand(-4,4)];fxG.add(m);parts.push(m);}
  const t0=performance.now();const f=(t,dt)=>{const k=(performance.now()-t0)/900;parts.forEach(m=>{m.position.x+=m.userData.v[0]*dt;m.position.y+=m.userData.v[1]*dt;m.position.z+=m.userData.v[2]*dt;m.userData.v[1]-=18*dt;});mat.opacity=Math.max(0,1-k);
    if(k>=1){parts.forEach(m=>fxG.remove(m));mat.dispose();tick.splice(tick.indexOf(f),1);}};tick.push(f);}

/* ---------- 鏡頭：拖曳旋轉、滾輪／雙指縮放、右鍵或雙指平移 ---------- */
let HOME={th:0,ph:.98,r:80,tx:0,tz:-8},cam={...HOME},goal={...HOME};
function place(){const sp=Math.sin(cam.ph),cp=Math.cos(cam.ph);camera.position.set(cam.tx+cam.r*sp*Math.sin(cam.th),cam.r*cp,cam.tz+cam.r*sp*Math.cos(cam.th));camera.lookAt(cam.tx,0,cam.tz);}
function homeR(){return camera.aspect<1.15?90:78;}
function bindControls(){const pts=new Map();let pinch=0,mid=null;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button});if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}});
  const pan=(dx,dy)=>{const k=goal.r/700;const c=Math.cos(goal.th),s=Math.sin(goal.th);goal.tx=clamp(goal.tx-(dx*c+dy*s)*k,-60,60);goal.tz=clamp(goal.tz-(-dx*s+dy*c)*k,-80,50);};
  canvas.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(pts.size===1){if(p.b===2||e.shiftKey)pan(dx,dy);else{goal.th-=dx*.006;goal.ph=clamp(goal.ph-dy*.005,.12,1.42);}}
    else if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)goal.r=clamp(goal.r*pinch/d,22,160);pinch=d;const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(mid)pan(m.x-mid.x,m.y-mid.y);mid=m;}});
  const up=e=>{pts.delete(e.pointerId);pinch=0;mid=null;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{e.preventDefault();goal.r=clamp(goal.r*(e.deltaY>0?1.1:.9),22,160);},{passive:false});}

function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1.15?58:50;camera.updateProjectionMatrix();}

let last=performance.now();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
  for(const k of['th','ph','r','tx','tz'])cam[k]+=(goal[k]-cam[k])*Math.min(1,dt*9);place();
  layoutUnits(now);const t=now/1000;tick.slice().forEach(f=>f(t,dt));renderer.render(scene,camera);}

window.W={
  init(cv,st){canvas=cv;stage=st;renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,1,.8,500);defineGroups();buildWorld();buildUnits();bindControls();resize();
    cam.r=goal.r=homeR();addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);requestAnimationFrame(loop);},
  setTheme(k){if(!TH[k])return;themeKey=k;T=TH[k];buildWorld();buildUnits();},
  get theme(){return themeKey;},
  setFacing(th){HOME.th=th;cam.th=goal.th=th;},
  home(){goal={...HOME,r:homeR()};},
  resize,
  // desc.groups: {id:{x,z,ry,alive,dead,rout,hidden,flag:{t,c,h},tag:{t,c}}}
  show(desc,animate){const now=performance.now();
    for(const [id,d] of Object.entries(desc.groups)){const g=G[id];if(!g)continue;
      const moved=Math.abs(d.x-g.tx)+Math.abs(d.z-g.tz)>.05;
      if(animate&&moved&&!g.hidden&&!d.hidden){g.fx=g.x;g.fz=g.z;g.t0=now;g.dur=d.dur||1600;}else{g.fx=d.x;g.fz=d.z;g.t0=now-1;g.dur=1;g.x=d.x;g.z=d.z;}
      g.tx=d.x;g.tz=d.z;g.ry=d.ry||0;g.alive=d.alive==null?g.n:d.alive;g.dead=!!d.dead;g.rout=!!d.rout;g.hidden=!!d.hidden;
      setFlag(id,d.flag||null);setTag(id,d.tag||null);}
    setArrows(desc.arrows||[]);
    if(animate&&desc.fx)desc.fx.forEach((f,i)=>setTimeout(()=>burst(f.x,f.z,f.color),900+i*180));},
  arrows:setArrows
};
})();
