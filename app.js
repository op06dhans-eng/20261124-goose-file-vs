// 鴈行對戰：介面、連線與畫面（老師裁判／藍軍／紅軍／投影／QR 碼頁／與電腦練習）
(async function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const Q=new URLSearchParams(location.search);
const HR=(location.hash.match(/^#ai-(blue|red)$/)||[])[1];
const role=Q.get('role')||(HR?'ai':'');
let room=(Q.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
const LOCAL=Q.get('local')==='1',LQ=LOCAL?'&local=1':'';
const P=GR.P;
const base=location.href.split('?')[0].split('#')[0];
const link=r=>`${base}?role=${r}&room=${room}${LQ}`;
// 從電腦硬碟開啟單一檔案時，手機掃不到硬碟上的檔案：QR 碼改指向網頁版（同一個房號、同一個資料庫）
const PUBLIC='https://op06dhans-eng.github.io/20261124-goose-file-vs/';
const FILE=location.protocol==='file:';
const qrLink=r=>FILE&&!LOCAL?`${PUBLIC}?role=${r}&room=${room}`:link(r);
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
function toast(t,ms=2400){const d=$('#toast');d.textContent=t;d.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>d.hidden=true,ms);}
const myId=(()=>{let v=null;try{v=sessionStorage.getItem('goose-id');}catch(e){}if(!v){v=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('goose-id',v);}catch(e){}}return v;})();
// 依房號固定的亂序：同一局裡選項順序不變，不同局不同
function seeded(str){let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return((h^=h>>>16)>>>0)/4294967296;};}
function shuffle(a,key){const r=seeded(key),b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

/* ====================== 同步層 ====================== */
function setNet(st,msg){const d=$('#net');if(!d)return;d.hidden=false;d.className=st;d.textContent=st==='ok'?'● 已連線':st==='off'?'● 連線中斷，正在重連…':'● 連線錯誤：'+(msg||'');clearTimeout(setNet._t);if(st==='ok')setNet._t=setTimeout(()=>d.classList.add('fade'),2500);}
async function makeBackend(){
  const cfg=LOCAL?null:window.FIREBASE_CONFIG;
  if(cfg){try{
    const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const {getDatabase,ref,onValue,set}=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const db=getDatabase(initializeApp(cfg));
    onValue(ref(db,'.info/connected'),s=>setNet(s.val()?'ok':'off'));
    return{mode:'firebase',set:(p,v)=>set(ref(db,`goose/${room}/${p}`),v??null).catch(e=>setNet('err',e.message)),on:(p,cb)=>onValue(ref(db,`goose/${room}/${p}`),s=>cb(s.val()),e=>setNet('err',e.message))};
  }catch(e){setNet('err','無法載入連線程式：'+e.message);return null;}}
  const mem={};const st={get:k=>{try{return localStorage.getItem(k);}catch(e){return k in mem?mem[k]:null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){mem[k]=v;}}};
  let bc=null;try{bc=new BroadcastChannel('goose-vs');}catch(e){}
  const key=p=>`goose:${room}:${p}`,subs={};
  const read=p=>{const v=st.get(key(p));if(v==null)return null;try{return JSON.parse(v);}catch(e){return null;}};
  const fire=p=>(subs[p]||[]).forEach(cb=>cb(read(p)));
  if(bc)bc.onmessage=e=>{if(e.data&&e.data.room===room)fire(e.data.p);};
  addEventListener('storage',e=>{const pre=`goose:${room}:`;if(e.key&&e.key.startsWith(pre))fire(e.key.slice(pre.length));});
  setNet('ok');
  return{mode:'local',set:(p,v)=>{st.set(key(p),JSON.stringify(v??null));try{bc&&bc.postMessage({room,p});}catch(e){}fire(p);return Promise.resolve();},on:(p,cb)=>{(subs[p]||(subs[p]=[])).push(cb);cb(read(p));}};
}
const parse=v=>v==null?null:typeof v==='string'?JSON.parse(v):v;

/* ====================== 局面 → 部隊位置 ====================== */
const {QU,FL,CP0,CP1,WB0,WB1,WF,WCUT,WSLOT,RESP,RN,bluePos,timeline,awlSlots,AWL_Z0}=GL;
const secName=(k,view)=>view==='red'?{L:'右',C:'中',R:'左'}[k]:{L:'左',C:'中',R:'右'}[k];
// view：truth（老師、結束後）、blue、red、proj（投影：雙方都不洩漏）
function sceneDesc(e,view){const s=e.s,ro=e.ro;if(s.over)view='truth';const g={};
  const seenNow=s.seenDAt===s.r&&s.r>0;
  const hideD=(view==='red'||view==='proj')&&!seenNow;
  const pos=bluePos(s,ro,hideD);
  for(const nm of QU){const d={x:0,z:0,flag:{t:nm,c:FL[nm]}};
    if(ro.dead[nm]){Object.assign(d,{x:ro.dead[nm].x,z:ro.dead[nm].z,dead:true,flag:null});}
    else if(ro.D.includes(nm)&&hideD){const w=s.B.W.L.pos;if(w==='back'){const [k,i]=WSLOT[nm];const t=(s.B.contact?WB1:WB0)[i];d.x=(k==='L'?-1:1)*t[0];d.z=t[1];}else{const p=pos[nm];d.x=p[0];d.z=p[1];d.hidden=true;}}
    else{const p=pos[nm];d.x=p[0];d.z=p[1];}
    g[nm]=d;}
  const lead=ro.C[0];if(lead&&s.B.shake>0&&s.B.M>0)g[lead].tag={t:'中部動搖',c:'rgba(200,110,20,.95)'};
  for(const k of['L','R']){const w=s.B.W[k];if(w.cut&&ro[k][0])g[ro[k][0]].tag={t:'陣線斷絕',c:'rgba(200,110,20,.95)'};}
  if(seenNow&&ro.D[0]&&(view==='red'||view==='truth'))g[ro.D[0]].tag={t:`紅軍試探：後陣 ${s.B.D} 曲`,c:'rgba(160,30,20,.92)'};
  g['將']={x:-4.6,z:s.B.contact?-2:15,ry:Math.PI,flag:{t:'將',c:'gen',h:6.5}};
  g['紅將']={x:9.4,z:-33.8,ry:0,flag:{t:'將',c:'red',h:6.5}};
  for(const k of['L','C','R']){const F=s.R.F[k],br=s.R.broken[k];const d={x:{L:-7.2,C:0,R:7.2}[k],z:-25,ry:Math.PI,alive:Math.max(0,Math.round(F*16)),flag:{t:secName(k,view),c:'red',h:4.6}};
    if(br){d.rout=true;d.tag={t:'潰',c:'rgba(170,20,20,.95)'};}else if(s.R.shake[k]>0)d.tag={t:'動搖',c:'rgba(200,110,20,.95)'};g['F'+k]=d;}
  const resLoc=(view==='blue'||view==='proj')?s.resHist[Math.max(0,s.resHist.length-2)]:s.R.res;
  const rp=RESP[resLoc];const ra=Math.max(0,Math.round(s.R.resN*8));
  g.resA={x:rp[0][0],z:rp[0][1],ry:Math.PI,alive:ra,dead:s.R.resN<=0,flag:{t:'預',c:'res',h:3.8}};
  g.resB={x:rp[1][0],z:rp[1][1],ry:Math.PI,alive:ra,dead:s.R.resN<=0,flag:{t:'預',c:'res',h:3.8}};
  if((view==='blue'||view==='proj')&&s.r>0)g.resA.tag={t:'斥候回報（上回合位置）',c:'rgba(30,60,120,.92)'};
  return{groups:g};}
// 草擬中的命令畫成地上的箭頭
function orderArrows(e,side,o){const s=e.s,ro=e.ro,A=[];if(!o)return A;
  if(side==='blue'){const ct=s.B.contact;
    if(o.c&&o.c!=='待'&&!ct)A.push({from:[0,-1],to:[0,-13],color:o.c==='攻'?0xff6040:0xffd24a});
    if(o.c==='攻'&&ct)A.push({from:[0,-11],to:[0,-20],color:0xff6040});
    if(o.c==='待'&&ct)A.push({from:[0,-12],to:[0,-1],color:0xd8d8d8});
    const pos=bluePos(s,ro);
    for(const k of['L','R']){const sg=k==='L'?-1:1,nm=ro[k][0];if(!nm||s.B.W[k].n<=0)continue;const p=pos[nm];
      if(o.w==='斜')A.push({from:p,to:[sg*WF[1][0],WF[1][1]],color:0xffd24a});
      if(o.w==='急')A.push({from:p,to:[sg*WCUT[1][0],WCUT[1][1]],color:0xff9a3a});
      if(o.w==='收')A.push({from:[sg*25,-21],to:[sg*11.4,-25],color:0xffb030});
      if(o.w==='集'){const sl=awlSlots(4+ro.D.length+2,ct);const t=sl[Math.min(sl.length-1,ro.C.length+ro.D.length+(k==='L'?0:1))];A.push({from:p,to:[t[0],t[1]],color:0x6fe0ff});}}}
  else{if(o.f==='壓')A.push({from:[0,-21],to:[0,-12],color:0xff6040});
    if(o.f==='探')A.push({from:[3,-21],to:[3,12],color:0xe8e8e8,w:.5});
    const to=o.res?moveRes(s.R.res,o.res):s.R.res;if(to!==s.R.res){const a=RESP[s.R.res],b=RESP[to];A.push({from:a[0],to:b[0],color:0xffb040});A.push({from:a[1],to:b[1],color:0xffb040});}}
  return A;}
function moveRes(from,to){if(from===to)return to;if(from==='rear')return to;return 'rear';}
function fxOf(prev,next){const h=next.s.hist[next.s.hist.length-1],L=next.s.log[next.s.log.length-1]||[];const fx=[];
  if(h.bo.c==='攻'||h.ro.f==='壓')fx.push({x:0,z:-19});
  if(h.bo.w==='收'||h.bo.w==='急')for(const k of['L','R'])if(prev.s.B.W[k].n>0)fx.push({x:(k==='L'?-1:1)*11.4,z:-25});
  if(L.some(t=>t.includes('截擊')))fx.push({x:-15.5,z:-32},{x:15.5,z:-32});
  return fx;}

/* ====================== 文字 ====================== */
const OPT={
  c:{待:['待命','中部不接敵；已經接敵的話，就退回本陣。'],
     纏:['接戰牽制','中部上前和敵軍交戰，把敵軍拖住，但不求打穿。已經接敵之後，防守力多四分之一。'],
     攻:['猛攻',`中部全力進攻。中部後方集中的後曲不到 2 個時，攻擊力只剩七成（後陣不厚）。猛攻的那一回合，紅軍會看到你後陣有多厚。`]},
  w:{梯:['梯次在後','兩翼留在中部後方兩側，掩護中部。陣線斷絕時，用這個命令補位。'],
     斜:['依序斜出','兩翼一曲接一曲斜出，回合結束時到達敵陣兩側：陣形開始變成鴈行（兩翼張開的牛角形）。若紅軍預備隊正守在兩側，途中會被截擊：損 1，退回原位。'],
     急:['急進包抄',`這一回合就衝到敵陣兩側並立刻側擊，但陣線斷絕，側擊力只剩一半，直到補位。`],
     收:['收攏側擊',`兩翼從側面向內打，側擊力多一半。中部同時接敵時（接戰牽制或猛攻）就是三面夾擊，側擊力再多三分之一。`],
     集:['向中部集中','兩翼各抽一曲補到中部後方：後陣厚度 +2，兩翼各 −1。陣形會變成錐行（又尖又厚，準備從中央突破）。紅軍看不到這個調動。']},
  f:{頂:['頂住','中區防守力多四分之一。'],
     壓:['前壓',`中區向前攻擊藍軍中部（邊走邊打，攻擊力少兩成）。預備隊在中央時一起壓上。`],
     探:['試探','派人摸清藍軍後陣：回合結束時，得知藍軍中部後方集中了幾個曲。']},
  res:{rear:['後方居中',`預備隊在方陣後方正中：中區防守 +${P.RES/4}（依預備隊剩下的兵力），兩邊都能接應。`],
       center:['調往中央','預備隊頂在中區後面：中區防守與前壓加上預備隊全部的兵力。'],
       flanks:['守兩側','預備隊分到兩側：左右兩區各加一半兵力，並會截擊斜出的藍軍兩翼。']}};
const ONAME=(side,o)=>side==='blue'?`中部${OPT.c[o.c][0]}、兩翼${OPT.w[o.w][0]}`:`前排${OPT.f[o.f][0]}、預備隊${OPT.res[o.res][0]}`;
// 紅軍畫面一律用紅軍自己的左右
function forRed(t){return t.replace(/紅軍左側/g,'＠').replace(/紅軍右側/g,'我軍左區').replace(/＠/g,'我軍右區').replace(/紅軍中區/g,'我軍中區')
  .replace(/^左翼/,'藍軍左翼（我軍右方）').replace(/^右翼/,'藍軍右翼（我軍左方）').replace(/紅軍預備隊/g,'我軍預備隊');}
function linesFor(st,i,view){const L=st.log[i]||[],V=(st.vis&&st.vis[i])||[];return L.filter((t,j)=>view==='truth'||view==='red'||(V[j]||'both')==='both').map(t=>view==='red'?forRed(t):t);}
const WHY_RED={'中區被突穿（錐行）':'我軍中區被突穿（錐行）','兩側被擊潰（鴈行合圍）':'我軍兩側被擊潰（鴈行合圍）'};
function resultText(o,view){if(!o)return'';const w=o.win==='和'?'和局':o.win+'軍勝';return `${w}：${view==='red'&&WHY_RED[o.why]?WHY_RED[o.why]:o.why}`;}

function situation(e,view){const s=e.s,B=s.B,R=s.R,out=[];
  const sec=k=>`${R.F[k]}${R.broken[k]?'（潰）':R.shake[k]?'（動搖）':''}`;
  if(view==='blue'){const seen=s.resHist[Math.max(0,s.resHist.length-2)];
    out.push(s.r===0?'紅軍預備隊開局在方陣後方居中。之後斥候每回合回報一次，但回報的是上一回合的位置。':`斥候回報（晚一回合）：紅軍預備隊在${RN[seen]}。`);
    out.push(`紅軍前排：左區 ${sec('L')}、中區 ${sec('C')}、右區 ${sec('R')}。`);
    out.push(`我軍中部：前列 ${B.M} 曲，${B.contact?'已經接敵':'在本陣'}${B.shake?'，動搖過 '+B.shake+' 次（再動搖一次就潰散）':''}；中部後方集中了 ${B.D} 曲（紅軍看不到，除非你猛攻或對方試探）。`);
    const w=B.W.L;out.push(`兩翼：左 ${B.W.L.n} 曲、右 ${B.W.R.n} 曲，${w.pos==='flank'?'已到敵陣兩側':'在中部後方梯次排開'}${w.cut?'；陣線斷絕，用「梯次在後」補位':''}。`);}
  else if(view==='red'){
    out.push(`藍軍中部：${B.contact?'已經接敵':'在本陣，還沒接敵'}，前列 ${B.M} 曲。`);
    const w=B.W.L;out.push(`藍軍兩翼：${w.pos==='flank'?'已經到了我軍兩側':'在中部後方，梯次排開'}${w.cut?'，陣線斷絕':''}。`);
    out.push(s.seenD==null?'藍軍後陣（中部後方）有多厚：還不知道。派人「試探」，或等藍軍猛攻時就看得到。':`藍軍後陣：第 ${s.seenDAt} 回合看到集中了 ${s.seenD} 曲。之後有沒有再增加，要再看一次才知道。`);
    out.push(`我軍：右區 ${sec('L')}、中區 ${sec('C')}、左區 ${sec('R')}；預備隊 ${R.resN} 在${RN[R.res]}。`);}
  else{out.push(`藍軍中部${B.contact?'已經接敵':'在本陣'}；兩翼${B.W.L.pos==='flank'?'在紅軍兩側':'在中部後方'}${B.W.L.cut?'（陣線斷絕）':''}。`);
    out.push(`紅軍前排：左區 ${sec('L')}、中區 ${sec('C')}、右區 ${sec('R')}。`);}
  return out;}
function helpHtml(side){
  const win=`<b>勝負</b><ul><li>藍軍勝：紅軍中區被突穿，或紅軍左右兩區都被擊潰。</li><li>紅軍勝：藍軍中部潰散、藍軍兵力剩 ${P.collapseTotal} 以下，或第 ${P.ROUNDS} 回合結束時方陣還在。</li><li>同一回合雙方都達成：和局。</li></ul>`;
  const fight=`<b>交戰怎麼算</b><ul><li>比雙方的戰力：攻方是守方的 2 倍以上，守方這一處被擊潰；1.5 到 2 倍，守方動搖並損 1（同一處動搖兩次就潰）；1 到 1.5 倍，雙方各損 1；比守方弱，攻方受挫損 1。</li><li>命令會讓戰力變多或變少，例如「多四分之一」「只剩七成」，選項說明裡都有寫。</li><li>規則裡沒有擲骰子：結果只由雙方的命令決定。</li></ul>`;
  if(side==='blue')return `<p>你是<b>藍軍（攻方）</b>，指揮鴈行陣的十個曲：中部前列戊、己、丁、壬共 ${P.M} 曲，左翼丙乙甲、右翼癸庚辛各 ${P.NW} 曲。對面是紅軍方陣：前排左、中、右各 ${P.F}，後面還有一支預備隊 ${P.RES}。</p>
    <p>每回合同時下兩個命令：<b>中部</b>怎麼打、<b>兩翼</b>怎麼動。錐行還是鴈行，不用先決定：後曲往哪裡去，就打成哪一種。</p>
    <b>你看得到、看不到什麼</b><ul><li>紅軍前排的命令與各區損傷：看得到。</li><li>紅軍預備隊：斥候回報，但<b>晚一回合</b>。</li></ul>
    <b>紅軍看得到、看不到你什麼</b><ul><li>你的中部與兩翼在哪裡：看得到。</li><li>「向中部集中」：看不到，除非你猛攻，或紅軍派人試探。</li></ul>${fight}${win}`;
  return `<p>你是<b>紅軍（守方）</b>，指揮一個方陣：前排右、中、左三區各 ${P.F}，後方一支預備隊 ${P.RES}。對面是藍軍：中部前列 ${P.M} 曲、兩翼各 ${P.NW} 曲。畫面上的左右，是你自己面向敵軍時的左右。</p>
    <p>每回合同時下兩個命令：<b>前排</b>怎麼做、<b>預備隊</b>去哪裡。</p>
    <b>預備隊一回合只能走一步</b><ul><li>後方居中 ↔ 調往中央、後方居中 ↔ 守兩側。</li><li>從中央到兩側（或反過來）要先回到後方，共兩回合。</li></ul>
    <b>你看得到、看不到什麼</b><ul><li>藍軍中部在不在接敵、兩翼在後方還是到了你兩側：看得到。</li><li>藍軍中部後方集中了幾個曲：看不到。派人「試探」，或藍軍猛攻時，才看得到那一回合的厚度。</li></ul>
    <b>藍軍看得到你什麼</b><ul><li>前排的命令與各區損傷：看得到。</li><li>預備隊：藍軍斥候回報，但晚一回合。</li></ul>${fight}${win}`;}

/* ====================== 揭曉與討論 ====================== */
const BOOK=[
  ['錐行者，所以衝堅毀銳也；鴈行者，所以觸側應［變］也。','錐行陣用來衝破堅陣；鴈行陣用來衝擊敵人側翼、應付變化。（竹簡缺字，「變」為補字。曾瑞龍據此說：錐行由內向外撕裂，鴈行由外向內收攏）','《孫臏兵法・威王問》'],
  ['前行若有雍，後列若貍。','前排像猛獸般正面衝撞，後列像狸貓伏低、等時機再撲。（「雍」字竹簡難讀，字義未定）','《孫臏兵法・十陣》'],
  ['鴈行前銳後張，延斜而行，便于左右，利於周旋。','鴈行陣前端尖、後方張開，斜斜地延伸前進，方便向左右包抄。','《武經總要》卷七'],
  ['鴈行延斜，惡其斷絕，故可以勝鴈行。','鴈行陣斜向拉得太長，最怕中間斷開，所以罘罝陣能勝過鴈行陣。（曾瑞龍提醒：八陣互相剋制的說法，可能只是五行相剋觀念的投射）','《武經總要》卷七，論罘罝陣'],
  ['中部前曲進，前出為首，其後曲次之，與前部前曲、後部前曲並前。前部後曲左斜……後部後曲右斜……','從方陣變成鴈行陣：中部前曲先出當前鋒，前部、後部的前曲一起前進；其餘各曲向左右斜出，一個接一個跟隨。','《武經總要》卷八，裴子法'],
  ['三……闕羅以自存。','兩種讀法：一說「從三面進攻，別讓敵人逃出你的網」；一說「突破敵人的網，以保全自己」。竹簡殘缺，讀法未定。遊戲裡的「三面夾擊」採前一種讀法。','《孫臏兵法・十陣》'],
];
function revealHtml(fin,view){const rv=GRV.review(fin.s.hist);
  return `<div class="wrap rev">
  <div class="row"><h2 class="grow">揭曉與討論</h2><button type="button" class="btn" id="revClose">回到戰場</button></div>
  <section><h3 class="res">${esc(resultText(fin.s.over,'truth'))}（第 ${fin.s.r} 回合）</h3>${reviewHtml(rv)}</section>
  <section><h3>同一個陣，不同的時刻</h3>
    <p>《武經總要》的鴈行陣圖是<b>楔形</b>：中部在前，兩翼梯次在後。藍永蔚說鴈行陣是兩端在前的<b>牛角形</b>。曾瑞龍認為，兩種說法描述的是同一個陣的不同時刻：</p>
    <div class="stages"><div><b>開局：藏</b>楔形。外形分不出要打中央還是要包兩側。</div><div><b>接敵：牽制</b>中部上前拖住敵人，兩翼梯次在後掩護。</div><div><b>轉換：張</b>兩翼依序斜出，不能斷開。</div><div><b>決勝：收</b>兩翼收攏，這時才出現牛角形。</div></div>
    <p>牛角形太早出現，意圖就會暴露，敵人會跟著調整陣線。這一局裡，紅軍預備隊的位置就是「敵人跟著調整」。</p>
    <p class="mini">提醒：「決勝時才出現牛角形」是曾瑞龍的推論，他的用詞是兩翼「可能最終包抄」，史料沒有直接寫到。</p></section>
  <section><h3>西方對照：坎尼會戰（前 216 年）</h3><p>漢尼拔開局時中央向羅馬軍凸出，看起來不像要包圍；接戰後中央慢慢後退，最後兩翼合圍。曾瑞龍在文章開頭就用這一仗說明「初始階段」與「決勝時刻」的陣形不同。</p></section>
  <section><h3>兵書</h3>${BOOK.map(b=>`<blockquote><b>${esc(b[0])}</b><br>${esc(b[1])}<small>${esc(b[2])}</small></blockquote>`).join('')}</section>
  <section><h3>討論</h3><ol>
    <li>這一局藍軍在哪一回合露出了意圖？紅軍是從哪個跡象看出來的，還是沒有看出來？</li>
    <li>開局的楔形與決勝時的牛角形，各自要達成什麼？為什麼不一開始就擺成牛角形？</li>
    <li>紅軍預備隊放在後方居中，「兩邊都能接應」也「兩邊都不夠快」。換作是你，會怎麼放？</li>
    <li>《武經總要》說罘罝勝鴈行。這一局如果出現「陣線斷絕」，能不能當作這句話有戰術道理的證據？還是只能說明規則這樣寫？</li>
    <li>遊戲規則（倍數、回合、兵力）是簡化的。你覺得哪一條最不像真實的戰場？改了之後，這一局的結論會不會不同？</li></ol></section>
  <p class="mini">文獻：曾瑞龍〈鴈行陣是什麼樣子？〉（"Goose File" Formation: What Does It Look Like?，2008）。</p></div>`;}
function reviewHtml(txt){const parts=txt.split('\n');let h='';for(const p of parts){const m=p.match(/^【(.+?)】(.*)$/);if(m){h+=`<h4>${esc(m[1])}</h4>`;if(m[2])h+=`<p>${esc(m[2])}</p>`;}else h+=`<p>${esc(p)}</p>`;}return `<div class="rv">${h}</div>`;}
function showReveal(fin){const pg=$('#page');pg.innerHTML=revealHtml(fin);pg.hidden=false;pg.scrollTop=0;$('#revClose').onclick=()=>{pg.hidden=true;};}

const openSet=new Set();let lastSide=null;
function paintSide(h,toTop){const el=$('#side');if(h===lastSide)return false;lastSide=h;const st=el.scrollTop;el.innerHTML=h;
  el.querySelectorAll('details[data-k]').forEach(d=>{const k=d.dataset.k;if(k==='help')return;if(openSet.has(k))d.open=true;d.addEventListener('toggle',()=>{if(d.open)openSet.add(k);else openSet.delete(k);});});
  el.scrollTop=toTop?0:st;return true;}
const waitHtml=who=>`<div class="head"><span class="who ${who}">${{blue:'你是藍軍・攻方',red:'你是紅軍・守方',proj:'投影',ref:'老師裁判'}[who]}</span><span class="grow"></span><span class="mini">房號 ${room}</span></div><div class="card"><h3>等待老師開局</h3><p>老師打開裁判畫面之後，這裡會自動開始，不用重新整理。</p></div>`;
if(Q.get('selftest')==='1')window.__T={sceneDesc,orderArrows,optSvg,orderCard,situation,linesFor,reviewHtml,revealHtml,helpHtml,timeline,fxOf,resultText,fullLog,reportCard,sitCard,endCard,forRed};
/* ====================== 首頁 ====================== */
$('#loading').remove();
if(!role){
  const pg=$('#page');pg.hidden=false;
  pg.innerHTML=`<div class="wrap">
    <div class="title">鴈行</div>
    <div class="subt">曾瑞龍〈鴈行陣是什麼樣子？〉：陣形要分「開局」與「決勝」，兩個時刻的邏輯不同。</div>
    <div class="menu">
      <a class="mbtn" href="teach.html" style="text-decoration:none"><b>教學模式</b><span>一個人玩，約 5～8 分鐘。你是鴈行陣的主將，面對八個抉擇。</span></a>
      <button type="button" class="mbtn hi" id="mNew"><b>對戰模式：開一局新推演</b><span>老師用。全班分成藍軍（鴈行陣）與紅軍（方陣）兩隊，各派一人掃 QR 碼下令。</span></button>
      <button type="button" class="mbtn" id="mAI"><b>練習：和電腦對打</b><span>一個人先熟悉規則。選一方，電腦扮演另一方。</span></button>
      <div class="mbtn"><b>加入已開的推演</b><span>輸入老師畫面上的房號：</span>
        <div class="row"><input class="code" id="mCode" maxlength="6" placeholder="房號" autocapitalize="characters"><button type="button" class="btn blue" data-r="blue">加入藍軍</button><button type="button" class="btn red" data-r="red">加入紅軍</button><button type="button" class="btn" data-r="proj">投影畫面</button></div></div>
    </div></div>`;
  if(window.TEACH_HTML)pg.querySelector('a.mbtn').onclick=ev=>{ev.preventDefault();location.href=URL.createObjectURL(new Blob([window.TEACH_HTML],{type:'text/html'}));};
  $('#mNew').onclick=()=>{const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const r=Array.from({length:4},()=>abc[Math.floor(Math.random()*abc.length)]).join('');location.search=`?role=qr&room=${r}${LQ}`;};
  $('#mAI').onclick=()=>{pg.querySelector('.menu').innerHTML=`<div class="mbtn"><b>選擇你要扮演的一方</b><span>電腦會依看得到的跡象推測你的打法，再出手。</span>
    <div class="row"><button type="button" class="btn blue" id="aB">藍軍（攻方・鴈行陣）</button><button type="button" class="btn red" id="aR">紅軍（守方・方陣）</button></div></div><button type="button" class="btn" id="aBack">回上一頁</button>`;
    const goAI=sd=>{location.hash='ai-'+sd;location.reload();};$('#aB').onclick=()=>goAI('blue');$('#aR').onclick=()=>goAI('red');$('#aBack').onclick=()=>{location.href=base;};};
  pg.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const c=$('#mCode').value.trim().toUpperCase();if(!c){$('#mCode').focus();$('#mCode').placeholder='先輸入房號';return;}location.search=`?role=${b.dataset.r}&room=${c}${LQ}`;});
  return;}
if(role!=='ai'&&!room){location.search='';return;}

/* ====================== QR 碼頁（全螢幕） ====================== */
const be=role==='ai'?null:await makeBackend();
if(role!=='ai'&&!be){document.body.insertAdjacentHTML('beforeend',`<div class="page"><div class="wrap"><h2>連不上網路資料庫</h2><p class="subt">這台裝置載入不了連線程式，可能是網路不通，或學校網路擋住了 Google 的服務（gstatic.com、firebasedatabase.app）。可以改用手機網路再試一次。</p></div></div>`);return;}
const qrSvg=txt=>{const q=qrcode(0,'M');q.addData(txt);q.make();return q.createSvgTag({cellSize:8,margin:2,scalable:true});};
if(role==='qr'){
  const pg=$('#page');pg.hidden=false;let tab='blue';const cmd={blue:null,red:null},seen={blue:0,red:0};let projSeen=0;
  const draw=()=>{const now=Date.now(),alive=sd=>!!cmd[sd]&&now-seen[sd]<30000;
    const L={blue:['藍軍','攻方・鴈行陣'],red:['紅軍','守方・方陣'],proj:['投影畫面','開在教室的大螢幕']};
    const html=`<div class="wrap">
      <div class="row"><div class="title grow" style="font-size:30px">鴈行對戰</div><div class="round">房號 ${room}</div></div>
      <div class="qrtabs">${['blue','red','proj'].map(k=>`<button type="button" data-t="${k}" class="${k} ${tab===k?'on':''}">${L[k][0]}</button>`).join('')}</div>
      <div class="qrbox"><div class="lab" style="color:${tab==='blue'?'#1f4e9c':tab==='red'?'#a8261a':'#333'}">${L[tab][0]}・${L[tab][1]}</div>${qrSvg(qrLink(tab))}<div class="url">${esc(qrLink(tab))}</div></div>
      <div class="joins"><div>藍軍指揮：${alive('blue')?'<span class="okc">已加入 ✓</span>':'<span class="waitc">等待掃碼</span>'}</div><div>紅軍指揮：${alive('red')?'<span class="okc">已加入 ✓</span>':'<span class="waitc">等待掃碼</span>'}</div><div>投影畫面：${projSeen&&now-projSeen<30000?'<span class="okc">已開啟 ✓</span>':'<span class="waitc">尚未開啟</span>'}</div></div>
      <div class="row"><a class="btn main" href="${esc(link('ref'))}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">開啟老師裁判畫面（新分頁）</a><a class="btn" href="${esc(link('proj'))}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">開啟投影畫面（新分頁）</a></div>
      <p class="subt">一次顯示一隊的 QR 碼，請兩隊輪流掃。每隊第一位掃碼的人是指揮官，可以下令；同隊其他人掃碼只能觀看。裁判畫面看得到雙方全部部署，請不要投影。</p></div>`;
    if(html===draw.last)return;draw.last=html;pg.innerHTML=html;
    pg.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw();});};
  for(const sd of['blue','red'])be.on('cmd/'+sd,v=>{const c=parse(v);if(c&&(!cmd[sd]||c.t!==cmd[sd].t||c.id!==cmd[sd].id))seen[sd]=Date.now();cmd[sd]=c;draw();});let pv=null;be.on('seen/proj',v=>{if(v&&v!==pv)projSeen=Date.now();pv=v;draw();});
  setInterval(draw,5000);draw();return;}

/* ====================== 戰場畫面（共用） ====================== */
$('#stage').hidden=false;$('#side').hidden=false;
W.init($('#gl'),$('#stage'));
let sty=store.get('goose-style')||'甲';if(sty!=='甲'&&sty!=='戊')sty='甲';W.setTheme(sty);
$('#bSty').onclick=()=>{sty=sty==='甲'?'戊':'甲';W.setTheme(sty);store.set('goose-style',sty);if(lastDesc)W.show(lastDesc,false);};
$('#bHome').onclick=()=>W.home();
const side=role==='blue'||role==='red'?role:role==='ai'?((Q.get('side')||HR)==='red'?'red':'blue'):null;
document.body.classList.add('side-'+(side||role));
if(side==='red')W.setFacing(Math.PI);
let lastDesc=null;
/* ---------- 勝負動畫：依勝負方式演出決戰，播完才顯示結果與檢討 ---------- */
let finaleEnd=0,finaleKey=null,finaleT=[];
const FINALE_MS=7600;
function finaleRunning(){return Date.now()<finaleEnd;}
function stopFinale(){finaleT.forEach(clearTimeout);finaleT=[];finaleEnd=0;finaleKey=null;}
function finaleSteps(fin){const s=fin.s,ro=fin.ro,why=s.over.why,win=s.over.win;const base=sceneDesc(fin,'truth').groups;for(const k of Object.keys(base))if(!k.startsWith('F'))delete base[k].tag;
  const G=()=>JSON.parse(JSON.stringify(base));const live=[...ro.C,...ro.D,...ro.L,...ro.R];const steps=[];
  const routRed=(g,ks)=>ks.forEach(k=>{g['F'+k].rout=true;g['F'+k].tag={t:'潰',c:'rgba(170,20,20,.95)'};});
  const routRes=g=>{for(const q of['resA','resB']){g[q].rout=true;}};
  const redGenFlee=g=>{g['紅將'].z-=24;g['紅將'].dur=2600;};
  const blueRetreat=(g,dz)=>{for(const nm of live){g[nm].z+=dz;g[nm].dur=2600;}g['將'].z+=dz;g['將'].dur=2600;};
  if(win==='和'){const g=G();routRed(g,['C','L','R']);for(const nm of ro.C)g[nm]&&(g[nm].rout=true);steps.push({g,fx:[{x:0,z:-22},{x:-11,z:-25},{x:11,z:-25}],focus:[0,-22,60],cap:'雙方同時崩潰'});return steps;}
  if(why.includes('突穿')){
    const sl=awlSlots(ro.C.length+ro.D.length,true);const order=['戊','丁','壬','己'].filter(nm=>ro.C.includes(nm)).concat(ro.D);
    const g1=G();order.forEach((nm,i)=>{g1[nm].x=sl[i][0];g1[nm].z=sl[i][1]-10;g1[nm].dur=2000;});routRed(g1,['C']);
    steps.push({g:g1,fx:[{x:0,z:-24},{x:-2,z:-27},{x:2,z:-22}],focus:[0,-24,60],cap:'錐行衝進紅軍中區'});
    const g2=JSON.parse(JSON.stringify(g1));order.forEach(nm=>{g2[nm].z-=14;g2[nm].dur=2400;});routRed(g2,['L','R']);routRes(g2);redGenFlee(g2);
    steps.push({g:g2,fx:[{x:-7,z:-30},{x:7,z:-30},{x:0,z:-36}],cap:'中區被突穿，方陣從中間裂開'});return steps;}
  if(why.includes('合圍')){
    const g1=G();for(const k of['L','R']){const sg=k==='L'?-1:1;ro[k].forEach((nm,i)=>{g1[nm].x=sg*(12.2+i*0.6);g1[nm].z=-30+i*5;g1[nm].dur=2000;});}routRed(g1,['L','R']);
    steps.push({g:g1,fx:[{x:-10.5,z:-27},{x:10.5,z:-27},{x:-10.5,z:-22},{x:10.5,z:-22}],focus:[0,-25,58],cap:'兩翼從側面收攏'});
    const g2=JSON.parse(JSON.stringify(g1));for(const nm of[...ro.C,...ro.D]){g2[nm].z-=5;g2[nm].dur=2000;}for(const k of['L','R']){const sg=k==='L'?-1:1;ro[k].forEach(nm=>{g2[nm].x=sg*9.6;g2[nm].dur=2000;});}
    routRed(g2,['C']);routRes(g2);redGenFlee(g2);steps.push({g:g2,fx:[{x:0,z:-25},{x:0,z:-30}],cap:'三面合圍，方陣被夾碎'});return steps;}
  if(why.includes('中部潰散')){
    const g1=G();for(const k of['L','C','R']){g1['F'+k].z+=6;g1['F'+k].dur=2000;}
    steps.push({g:g1,fx:[{x:0,z:-16},{x:-3,z:-13},{x:3,z:-13}],focus:[0,-12,60],cap:'紅軍前壓，藍軍中部潰散'});
    const g2=JSON.parse(JSON.stringify(g1));for(const nm of live){g2[nm].z+=18;g2[nm].dur=2600;}g2['將'].z+=18;g2['將'].dur=2600;
    steps.push({g:g2,fx:[],cap:'失去中部的支點，藍軍全線後撤'});return steps;}
  // 方陣守住、兵力耗盡：藍軍鳴金後撤，紅軍原地不動
  const g1=G();blueRetreat(g1,20);steps.push({g:g1,fx:[],focus:[0,-10,62],cap:why.includes('守住')?'方陣守住，藍軍鳴金收兵':'藍軍兵力耗盡，鳴金後撤'});
  const g2=JSON.parse(JSON.stringify(g1));for(const k of['L','C','R']){g2['F'+k].tag=g2['F'+k].tag||{t:'守住',c:'rgba(160,30,20,.92)'};}steps.push({g:g2,fx:[],cap:''});return steps;}
function playFinale(fin){stopFinale();finaleCap='';const steps=finaleSteps(fin);finaleEnd=Date.now()+FINALE_MS;finaleKey=fin.s.hist.length+':'+fin.s.over.why;
  let t=1700;steps.forEach((st,i)=>{finaleT.push(setTimeout(()=>{if(st.focus)W.focus(st.focus[0],st.focus[1],st.focus[2]);const d={groups:st.g,arrows:[],fx:st.fx.map(f=>({...f}))};lastDesc=d;W.show(d,true);if(st.cap)toastStage(st.cap);},t));t+=i===0?2600:3000;});
  finaleT.push(setTimeout(()=>{finaleEnd=0;W.home();if(window.__redraw)window.__redraw();},FINALE_MS));}
// 決戰的字幕寫在側欄的「決戰中」卡片裡，不蓋戰場
let finaleCap='';function toastStage(t){finaleCap=t;const d=document.getElementById('fcap');if(d)d.textContent=t;}
function render3D(tl,view,arrows,animate,prevEntry){const e=tl[tl.length-1];
  if(animate&&prevEntry){W.command('blue');W.command('red');}   // 結算：兩軍主將舉刀下令
  if(e.s.over&&animate&&prevEntry&&!prevEntry.s.over){const d=sceneDesc(e,'truth');d.arrows=[];d.fx=fxOf(prevEntry,e);lastDesc=d;W.show(d,true);playFinale(e);return;}
  if(e.s.over&&finaleKey===e.s.hist.length+':'+e.s.over.why)return;   // 動畫播過了：保留決戰後的畫面
  if(!e.s.over)stopFinale();const d=sceneDesc(e,view);d.arrows=arrows||[];if(animate&&prevEntry)d.fx=fxOf(prevEntry,e);lastDesc=d;W.show(d,animate);}

// 命令卡（藍、紅、與電腦練習共用）
function orderCard(e,sd,draft,sent,canOrder,key){const s=e.s;
  if(sd==='blue'){const L=GR.blueLegal(s);const ws=[...new Set(L.map(o=>o.w))];
    const cs=shuffle(['待','纏','攻'],key+'c'),wl=shuffle(ws,key+'w');
    let note='';if(s.B.W.L.pos==='flank')note='兩翼已到敵陣兩側：可以收攏側擊，或梯次在後（補位、停在原地）。';else if(s.B.W.L.n<=0||s.B.W.R.n<=0)note='有一翼已經沒有兵力，兩翼只能留在原地。';
    else if(!ws.includes('集'))note='「向中部集中」只能再做到後陣 4 曲、且兩翼各至少還有 2 曲。';
    return `<div class="card"><p class="kick">第 ${s.r+1} 回合・藍軍下令</p>
      <div class="grp"><b>中部（戊己丁壬）</b><div class="opts">${cs.map(k=>`<button type="button" class="o dg ${draft.c===k?'on':''}" data-g="c" data-v="${k}">${optSvg(e,sd,'c',k)}<div class="ot"><b>${OPT.c[k][0]}</b><span>${esc(OPT.c[k][1])}</span></div></button>`).join('')}</div></div>
      <div class="grp"><b>兩翼（左：丙乙甲　右：癸庚辛）</b><div class="opts">${wl.map(k=>`<button type="button" class="o dg ${draft.w===k?'on':''}" data-g="w" data-v="${k}">${optSvg(e,sd,'w',k)}<div class="ot"><b>${OPT.w[k][0]}</b><span>${esc(OPT.w[k][1])}</span></div></button>`).join('')}</div>${note?`<p class="note">${note}</p>`:''}</div>
      ${sendBtn(draft.c&&draft.w,sent,canOrder)}</div>`;}
  const fs=shuffle(['頂','壓','探'],key+'f'),rs=shuffle(['rear','center','flanks'],key+'r');
  let note='';if(draft.res&&moveRes(s.R.res,draft.res)!==draft.res)note=`預備隊現在在${RN[s.R.res]}，要先回到後方：這一回合只會走到後方居中，下一回合才到${RN[draft.res]}。`;
  return `<div class="card"><p class="kick">第 ${s.r+1} 回合・紅軍下令</p>
    <div class="grp"><b>前排</b><div class="opts">${fs.map(k=>`<button type="button" class="o dg ${draft.f===k?'on':''}" data-g="f" data-v="${k}">${optSvg(e,sd,'f',k)}<div class="ot"><b>${OPT.f[k][0]}</b><span>${esc(OPT.f[k][1])}</span></div></button>`).join('')}</div></div>
    <div class="grp"><b>預備隊（現在在${RN[s.R.res]}，剩 ${s.R.resN}）</b><div class="opts">${rs.map(k=>`<button type="button" class="o dg ${draft.res===k?'on':''}" data-g="res" data-v="${k}">${optSvg(e,sd,'res',k)}<div class="ot"><b>${OPT.res[k][0]}${k===s.R.res?'（原地不動）':''}</b><span>${esc(OPT.res[k][1])}</span></div></button>`).join('')}</div>${note?`<p class="note">${note}</p>`:''}</div>
    ${sendBtn(draft.f&&draft.res,sent,canOrder)}</div>`;}

// 選項示意圖：俯視的小圖，畫出現在的陣形與這個命令會怎麼動（藍軍在下；紅軍畫面轉 180 度，紅軍在下）
const hexc=n=>'#'+(n>>>0).toString(16).padStart(6,'0');
function optSvg(e,sd,g,k){const s=e.s,d=sceneDesc(e,sd).groups;let h='';
  const rect=(x,z,w,l,c,op)=>h+=`<rect x="${(x-w/2).toFixed(1)}" y="${(z-l/2).toFixed(1)}" width="${w}" height="${l}" fill="${c}" opacity="${op||1}"/>`;
  for(const nm of QU){const u=d[nm];if(u.hidden)continue;rect(u.x,u.z,5,5,u.dead?'#5a5048':'#4f86d8',u.dead?.6:1);}
  for(const q of['L','C','R']){const u=d['F'+q];rect(u.x,u.z,7,9.4,u.rout?'#6a3a30':'#c8452f',u.alive>0?1:.4);}
  for(const q of['resA','resB']){const u=d[q];rect(u.x,u.z,4.6,9.4,'#9a3a24',u.dead?.4:.9);}
  const o={[g]:k};let A=orderArrows(e,sd,o);const lab=(x,z,t)=>h+=`<text x="${x}" y="${z}" class="sl" ${sd==='red'?`transform="rotate(180 ${x} ${z})"`:''}>${t}</text>`;
  if(g==='c'&&k==='纏'&&s.B.contact)h+=`<path d="M-6 -19.5 L-3 -17.5 L0 -19.5 L3 -17.5 L6 -19.5" stroke="#ffd24a" stroke-width="1.3" fill="none"/>`;
  if(g==='c'&&k==='待'&&!s.B.contact)lab(0,24,'原地');
  if(g==='w'&&k==='梯')lab(0,24,s.B.W.L.cut?'補位':'原地');
  if(g==='f'&&k==='頂')h+=`<rect x="-7" y="-19.6" width="14" height="1.6" fill="#ffd24a"/>`;
  if(g==='res'&&moveRes(s.R.res,k)===s.R.res)lab(0,-44,'不動');
  for(const a of A){const [x0,z0]=a.from,[x1,z1]=a.to,L=Math.hypot(x1-x0,z1-z0);if(L<1)continue;const ux=(x1-x0)/L,uz=(z1-z0)/L,c=hexc(a.color);
    const bx=x1-ux*4.6,bz=z1-uz*4.6;h+=`<line x1="${x0.toFixed(1)}" y1="${z0.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${bz.toFixed(1)}" stroke="${c}" stroke-width="2.4" ${a.w?'stroke-dasharray="2 1.5"':''}/>`;
    h+=`<polygon points="${x1.toFixed(1)},${z1.toFixed(1)} ${(bx-uz*3.2).toFixed(1)},${(bz+ux*3.2).toFixed(1)} ${(bx+uz*3.2).toFixed(1)},${(bz-ux*3.2).toFixed(1)}" fill="${c}"/>`;}
  return `<svg class="osv" viewBox="-31 -46 62 72" aria-hidden="true"><rect x="-31" y="-46" width="62" height="72" fill="#1a130d"/><g ${sd==='red'?'transform="rotate(180 0 -9)"':''}>${h}</g></svg>`;}
function sendBtn(ready,sent,canOrder){if(!canOrder)return '<p class="note">同隊已有指揮官在下令，你在觀看。</p>';
  if(sent)return '<button type="button" class="send ok" id="bSend" disabled>✓ 命令已送出・等待結算</button><p class="mini">結算之前，點別的選項可以改命令，改完要再送出一次。</p>';
  return `<button type="button" class="send" id="bSend" ${ready?'':'disabled'}>${ready?'送出命令':'兩個命令都選好才能送出'}</button>`;}
function reportCard(st,i,view,title,pre){const lines=linesFor(st,i,view);return `<div class="card report"><p class="kick">${title||'第 '+(i+1)+' 回合戰報'}</p>${pre?`<p><b>${esc(pre)}</b></p>`:''}${lines.length?`<ol>${lines.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:'<p>這一回合雙方沒有交戰。</p>'}${st.over&&i===st.log.length-1?`<p class="res">${esc(resultText(st.over,view))}</p>`:''}</div>`;}
// 目前陣形：依各方看得到的資訊說明藍軍陣形正往哪裡變
function formNow(e,view){const s=e.s,B=s.B,fl=B.W.L.pos==='flank',cut=B.W.L.cut;
  if(view==='blue'||view==='truth'){
    if(fl&&B.D>=2)return ['兩面並進','後陣集中了 '+B.D+' 曲（錐行），兩翼也已到敵陣兩側（鴈行）。中央與兩側同時施壓。'];
    if(fl)return [cut?'鴈行（陣線斷絕）':'鴈行展開',cut?'兩翼衝得太快，和中部之間斷開了；用「梯次在後」補位。':'兩翼已到敵陣兩側，牛角形出現了。下一步可以收攏側擊。'];
    if(B.D>=2)return ['錐行','後陣集中了 '+B.D+' 曲，中部又尖又厚，準備從中央突破。紅軍看不到這個變化，除非你猛攻或對方試探。'];
    if(B.D>0)return ['正在變成錐行','後陣集中了 '+B.D+' 曲。'];
    return ['楔形（還看不出是哪一種）','中部在前、兩翼梯次在後。這個外形，對手分不出你要打中央還是要包兩側。'];}
  // 紅軍與投影：只看得到兩翼在哪裡，後陣要靠試探
  if(fl)return [cut?'藍軍：鴈行（陣線斷絕）':'藍軍：鴈行展開',cut?'藍軍兩翼衝到我軍兩側，但和中部斷開了。':'藍軍兩翼已到我軍兩側，牛角形出現了，兩側會被夾擊。'];
  if(view==='red'&&s.seenD!=null&&s.seenD>=2)return ['藍軍：可能是錐行',`第 ${s.seenDAt} 回合看到藍軍後陣集中了 ${s.seenD} 曲，中央可能會被突破。`];
  return ['藍軍：楔形（還看不出來）','中部在前、兩翼在後。分不出藍軍要打中央還是要包兩側。'];}
function formCard(e,view){let [t,d]=formNow(e,view);if(view==='proj')d=d.replace(/我軍/g,'紅軍');return `<div class="card form"><p class="kick">目前陣形</p><p class="fn">${esc(t)}</p><p class="mini">${esc(d)}</p></div>`;}
function sitCard(e,view){return formCard(e,view)+`<div class="card"><p class="kick">戰場態勢</p><div class="sit">${situation(e,view).map(t=>`<div>${esc(t)}</div>`).join('')}</div></div>`;}
function endCard(tl,view,extra){const fin=tl[tl.length-1];if(finaleRunning())return `<div class="card report"><p class="kick">第 ${fin.s.r} 回合</p><p class="res">決戰中……</p><p id="fcap" class="fn">${esc(finaleCap)}</p><p class="mini">看戰場：勝負動畫播完後，這裡會出現結果與戰後檢討。</p></div>`;return `<div class="card report"><p class="kick">推演結束</p><p class="res">${esc(resultText(fin.s.over,view))}（第 ${fin.s.r} 回合）</p>
  <div class="row"><button type="button" class="btn main" id="bReveal">揭曉與討論</button>${extra||''}</div></div><div class="card"><h3>戰後檢討</h3>${reviewHtml(GRV.review(fin.s.hist))}</div>`;}
function helpCard(sd,open){return `<details class="card" data-k="help" ${open?'open':''}><summary>${sd==='blue'?'藍軍':'紅軍'}須知（點開／收合）</summary>${helpHtml(sd)}</details>`;}
function fullLog(st,view){let h='';for(let i=st.log.length-1;i>=0;i--){const L=linesFor(st,i,view);const o=st.hist[i];h+=`<div><b>第 ${i+1} 回合</b>${view==='truth'?`<div class="mini">藍：${esc(ONAME('blue',o.bo))}；紅：${esc(ONAME('red',o.ro))}</div>`:''}${L.map(t=>`<div>${esc(t)}</div>`).join('')}</div>`;}return h?`<details class="card" data-k="log"><summary>歷次戰報</summary><div class="log">${h}</div></details>`:'';}

/* ====================== 與電腦對打（單機，不連線） ====================== */
if(role==='ai'){
  const me=side,cpu=me==='blue'?'red':'blue';let cpuSaid='',hist=[],tl=timeline(hist),draft={},showRep=-1,helpOpen=true,busy=false,gid=Math.random().toString(36).slice(2);
  const sideEl=$('#side');
  function draw(animate,prev){const e=tl[tl.length-1],s=e.s;
    render3D(tl,s.over?'truth':me,s.over?[]:orderArrows(e,me,draft),animate,prev);
    let h=`<div class="head"><span class="who ${me}">${me==='blue'?'你是藍軍・攻方':'你是紅軍・守方'}</span><span class="round">第 ${s.over?s.r:Math.min(s.r+1,P.ROUNDS)} / ${P.ROUNDS} 回合</span><span class="grow"></span><button type="button" class="tbtn" id="bMenu">主畫面</button></div>
      <p class="mini">練習模式：電腦扮演${cpu==='blue'?'藍軍':'紅軍'}，依看得到的跡象推測你的打法。</p>`;
    if(s.over)h+=endCard(tl,me,'<button type="button" class="btn" id="bAgain">再打一局</button>');
    if(showRep>=0&&!s.over)h+=reportCard(s,showRep,me,null,cpuSaid);
    if(!s.over){h+=sitCard(e,me)+orderCard(e,me,draft,false,true,gid);}
    h+=helpCard(me,helpOpen&&s.r===0)+fullLog(s,s.over?'truth':me);
    paintSide(h,animate);bind();}
  function bind(){const s=tl[tl.length-1].s;
    $('#side').querySelectorAll('.o').forEach(b=>b.onclick=()=>{draft[b.dataset.g]=b.dataset.v;helpOpen=false;draw(false);});
    const sb=$('#bSend');if(sb)sb.onclick=()=>{if(busy)return;busy=true;sb.disabled=true;sb.textContent='電腦思考中…';
      setTimeout(()=>{const cur=tl[tl.length-1];const so=clone(cur.s);const co=cpu==='blue'?GAI.informedB(so):GAI.informedR(so);
        cpuSaid=cpu==='red'?`電腦（紅軍）這一回合：前排${OPT.f[co.f][0]}（預備隊的動向你看不到）`:`電腦（藍軍）這一回合：中部${OPT.c[co.c][0]}、兩翼${OPT.w[co.w==='集'?'梯':co.w][0]}（看得到的動作）`;const h={bo:me==='blue'?draft:co,ro:me==='red'?draft:co};hist.push(h);const prev=cur;tl=timeline(hist);showRep=hist.length-1;draft={};busy=false;draw(true,prev);
},60);};
    const rv=$('#bReveal');if(rv)rv.onclick=()=>showReveal(tl[tl.length-1]);
    $('#bMenu').onclick=()=>{location.href=base;};
    const ag=$('#bAgain');if(ag)ag.onclick=()=>{stopFinale();hist=[];tl=timeline(hist);draft={};showRep=-1;gid=Math.random().toString(36).slice(2);draw(false);W.home();};}
  window.__redraw=()=>draw(false);draw(false);return;}

/* ====================== 連線局：共用資料 ====================== */
let hist=null,tl=null,orders={blue:null,red:null},cmd={blue:null,red:null},cfg={ai:{blue:false,red:false}};
const onState=[];let firstHist;const histReady=new Promise(r=>firstHist=r);be.on('hist',v=>{firstHist();const h=parse(v);const prev=tl?tl[tl.length-1]:null;const changed=JSON.stringify(h)!==JSON.stringify(hist);hist=h;
  if(h){tl=timeline(h);onState.forEach(f=>f(prev,changed));}});
be.on('orders/blue',v=>{orders.blue=parse(v);onState.forEach(f=>f(null,false));});
be.on('orders/red',v=>{orders.red=parse(v);onState.forEach(f=>f(null,false));});
const cmdSeen={blue:0,red:0};
for(const sd of['blue','red'])be.on('cmd/'+sd,v=>{const c=parse(v);if(c&&(!cmd[sd]||c.t!==cmd[sd].t||c.id!==cmd[sd].id))cmdSeen[sd]=Date.now();cmd[sd]=c;onState.forEach(f=>f(null,false));});
setInterval(()=>onState.forEach(f=>f(null,false)),5000);
be.on('cfg',v=>{const c=parse(v)||{};cfg={ai:{blue:!!(c.ai&&c.ai.blue),red:!!(c.ai&&c.ai.red)}};onState.forEach(f=>f(null,false));});
const curOrder=sd=>{const o=orders[sd];return o&&tl&&o.r===tl[tl.length-1].s.r?o:null;};
const aliveS=sd=>!!cmd[sd]&&Date.now()-cmdSeen[sd]<30000;

/* ====================== 老師裁判 ====================== */
if(role==='ref'){
  let busy=false,autoRes=store.get('goose-auto')==='1',autoT=0,showRep=-1,lastLen=-1;
  await histReady;if(hist==null){await be.set('hist',JSON.stringify([]));}
  async function settle(){if(busy||!tl)return;const e=tl[tl.length-1];if(e.s.over)return;busy=true;clearTimeout(autoT);autoT=0;
    try{const so=clone(e.s);const ob=cfg.ai.blue?GAI.informedB(clone(so)):curOrder('blue')?.o,or=cfg.ai.red?GAI.informedR(clone(so)):curOrder('red')?.o;
      if(!ob||!or){toast('還有一方沒有下令');busy=false;return;}
      await be.set('hist',JSON.stringify([...hist,{bo:{c:ob.c,w:ob.w},ro:{f:or.f,res:or.res}}]));}
    catch(err){toast('結算失敗：'+err.message,5000);}busy=false;}
  async function restart(){clearTimeout(autoT);autoT=0;await be.set('orders/blue',null);await be.set('orders/red',null);await be.set('hist',JSON.stringify([]));showRep=-1;toast('已重新開局');W.home();}
  function draw(prev,changed){if(!tl){paintSide(waitHtml('ref'));return;}const e=tl[tl.length-1],s=e.s;
    if(changed&&hist.length>lastLen&&lastLen>=0)showRep=hist.length-1;const anim=changed&&prev&&hist.length===prev.s.hist.length+1;lastLen=hist.length;
    const arrows=s.over?[]:[...orderArrows(e,'blue',curOrder('blue')?.o),...orderArrows(e,'red',curOrder('red')?.o)];
    if(changed||!lastDesc)render3D(tl,'truth',arrows,anim,prev);else{lastDesc.arrows=arrows;W.arrows(arrows);}
    const ready=sd=>cfg.ai[sd]||!!curOrder(sd);const both=ready('blue')&&ready('red');
    const st=sd=>{const o=curOrder(sd);return cfg.ai[sd]?'<span class="okc">電腦代下令</span>':o?`<span class="okc">已下令 ✓</span> <span class="mini">${esc(ONAME(sd,o.o))}</span>`:'<span class="waitc">還沒下令</span>';};
    let h=`<div class="head"><span class="who ref">老師裁判</span><span class="round">第 ${s.over?s.r:Math.min(s.r+1,P.ROUNDS)} / ${P.ROUNDS} 回合</span><span class="grow"></span><span class="mini">房號 ${room}</span></div>
      <p class="note">這個畫面看得到雙方全部部署與命令，請不要投影。</p>
      <div class="row"><a class="btn" href="${esc(link('qr'))}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">QR 碼頁</a><a class="btn" href="${esc(link('proj'))}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">投影畫面</a></div>`;
    if(s.over)h+=endCard(tl,'truth','<button type="button" class="btn" id="bRestart">再開一局</button>');
    else{h+=`<div class="card"><p class="kick">第 ${s.r+1} 回合</p><div class="stat"><span class="k">藍軍</span><span>${st('blue')}<br><span class="mini">指揮官${aliveS('blue')?'在線上':'不在線上'}</span></span><span class="k">紅軍</span><span>${st('red')}<br><span class="mini">指揮官${aliveS('red')?'在線上':'不在線上'}</span></span></div>
        <button type="button" class="send ${both?'':''}" id="bSettle" ${both?'':'disabled'}>${both?'結算本回合':'等雙方都下令'}</button>
        <label class="mini"><input type="checkbox" id="cAuto" ${autoRes?'checked':''}> 雙方都送出後 3 秒自動結算</label>
        <label class="mini"><input type="checkbox" id="cAiB" ${cfg.ai.blue?'checked':''}> 藍軍由電腦下令</label><label class="mini"><input type="checkbox" id="cAiR" ${cfg.ai.red?'checked':''}> 紅軍由電腦下令</label>
        <button type="button" class="btn" id="bRestart">重新開局</button></div>`;}
    if(showRep>=0)h+=reportCard(s,showRep,'truth');
    h+=`<div class="card"><p class="kick">實際兵力（只有老師看得到）</p><div class="sit"><div>藍軍：中部 ${s.B.M}、後陣 ${s.B.D}、左翼 ${s.B.W.L.n}、右翼 ${s.B.W.R.n}；兩翼${s.B.W.L.pos==='flank'?'在敵陣兩側':'在後方'}${s.B.W.L.cut?'（斷絕）':''}</div><div>紅軍：左區 ${s.R.F.L}、中區 ${s.R.F.C}、右區 ${s.R.F.R}；預備隊 ${s.R.resN} 在${RN[s.R.res]}</div></div></div>`;
    h+=fullLog(s,'truth');
    paintSide(h,!!anim);
    const b=$('#bSettle');if(b)b.onclick=settle;
    const ca=$('#cAuto');if(ca)ca.onchange=()=>{autoRes=ca.checked;store.set('goose-auto',autoRes?'1':'0');draw(null,false);};
    const setAI=(k,v)=>be.set('cfg',{...cfg,ai:{...cfg.ai,[k]:v}});
    const cb=$('#cAiB');if(cb)cb.onchange=()=>setAI('blue',cb.checked);const cr=$('#cAiR');if(cr)cr.onchange=()=>setAI('red',cr.checked);
    $('#side').querySelectorAll('#bRestart').forEach(x=>x.onclick=()=>{if(x.dataset.sure){restart();}else{x.dataset.sure='1';x.textContent='確定重新開局？再按一次';}});
    const rv=$('#bReveal');if(rv)rv.onclick=()=>showReveal(tl[tl.length-1]);
    // 自動結算：條件成立後倒數 3 秒；倒數中畫面重畫不會重新計時
    if(autoRes&&both&&!s.over){if(!autoT)autoT=setTimeout(()=>{autoT=0;settle();},3000);}else{clearTimeout(autoT);autoT=0;}}
  window.__redraw=()=>draw(null,false);onState.push(draw);draw(null,true);return;}

/* ====================== 投影 ====================== */
if(role==='proj'){
  let showRep=-1,lastLen=-1;setInterval(()=>be.set('seen/proj',Date.now()),10000);be.set('seen/proj',Date.now());
  function draw(prev,changed){if(!tl){paintSide(waitHtml('proj'));return;}const e=tl[tl.length-1],s=e.s;
    if(changed&&hist.length>lastLen&&lastLen>=0)showRep=hist.length-1;if(changed&&hist.length===0)showRep=-1;const anim=changed&&prev&&hist.length===prev.s.hist.length+1;lastLen=hist.length;
    if(changed||!lastDesc)render3D(tl,'proj',[],anim,prev);
    const st=sd=>curOrder(sd)||cfg.ai[sd]?'<span class="okc">已下令 ✓</span>':'<span class="waitc">思考中…</span>';
    let h=`<div class="head"><span class="who proj">投影</span><span class="round">第 ${s.over?s.r:Math.min(s.r+1,P.ROUNDS)} / ${P.ROUNDS} 回合</span><span class="grow"></span><span class="mini">房號 ${room}</span></div>`;
    if(s.over)h+=endCard(tl,'truth');
    else h+=`<div class="card"><div class="stat" style="font-size:16px"><span class="k">藍軍（攻方）</span><span>${st('blue')}</span><span class="k">紅軍（守方）</span><span>${st('red')}</span></div></div>`;
    if(showRep>=0&&!s.over)h+=reportCard(s,showRep,'proj');
    if(!s.over)h+=sitCard(e,'proj')+`<p class="mini">投影畫面只顯示雙方都知道的事：藍軍集中到中部後方的曲不顯示；紅軍預備隊顯示的是藍軍斥候回報的位置（晚一回合）。結束後全部揭曉。</p>`;
    h+=fullLog(s,s.over?'truth':'proj');
    paintSide(h,!!anim);const rv=$('#bReveal');if(rv)rv.onclick=()=>showReveal(tl[tl.length-1]);}
  window.__redraw=()=>draw(null,false);onState.push(draw);draw(null,true);return;}

/* ====================== 藍軍／紅軍指揮 ====================== */
if(side){
  let draft={},showRep=-1,lastLen=-1,helpOpen=false,sentR=-1;
  try{if(!sessionStorage.getItem('goose-help-'+side+room)){sessionStorage.setItem('goose-help-'+side+room,'1');helpOpen=true;}}catch(e){helpOpen=true;}
  const isCmd=()=>cmd[side]&&cmd[side].id===myId;
  const claim=()=>be.set('cmd/'+side,{id:myId,t:Date.now()});
  setTimeout(()=>{if(!aliveS(side))claim();},600);
  setInterval(()=>{if(isCmd())claim();else if(!aliveS(side))claim();},10000);
  function draw(prev,changed){if(!tl){paintSide(waitHtml(side));return;}const e=tl[tl.length-1],s=e.s;
    if(changed&&hist.length>lastLen&&lastLen>=0){showRep=hist.length-1;draft={};}if(changed&&hist.length===0){showRep=-1;draft={};}
    const anim=changed&&prev&&hist.length===prev.s.hist.length+1;lastLen=hist.length;
    const mine=curOrder(side);if(mine&&!draft.__touched&&!draft.c&&!draft.f){draft={...mine.o};}
    const sent=!!mine&&JSON.stringify(stripD(draft))===JSON.stringify(mine.o);
    const arrows=s.over?[]:orderArrows(e,side,stripD(draft));
    if(changed||!lastDesc)render3D(tl,side,arrows,anim,prev);else{lastDesc.arrows=arrows;W.arrows(arrows);}
    const can=isCmd();
    let h=`<div class="head"><span class="who ${side}">${side==='blue'?'你是藍軍・攻方':'你是紅軍・守方'}</span><span class="round">第 ${s.over?s.r:Math.min(s.r+1,P.ROUNDS)} / ${P.ROUNDS} 回合</span><span class="grow"></span><span class="mini">房號 ${room}</span></div>`;
    if(!can)h+=`<div class="card"><p>${aliveS(side)?'同隊已經有指揮官在下令，你在觀看。':'目前沒有指揮官。'}</p><button type="button" class="btn" id="bClaim">改由我指揮</button></div>`;
    if(s.over)h+=endCard(tl,side);
    if(showRep>=0&&!s.over)h+=reportCard(s,showRep,side);
    if(!s.over)h+=sitCard(e,side)+orderCard(e,side,stripD(draft),sent,can,room+side);
    h+=helpCard(side,helpOpen)+fullLog(s,s.over?'truth':side);
    paintSide(h,!!anim);
    $('#side').querySelectorAll('.o').forEach(b=>b.onclick=()=>{if(!isCmd())return;draft[b.dataset.g]=b.dataset.v;draft.__touched=1;helpOpen=false;draw(null,false);});
    const sb=$('#bSend');if(sb&&!sb.disabled)sb.onclick=async()=>{const o=stripD(draft);await be.set('orders/'+side,{r:s.r,o,id:myId,t:Date.now()});W.command(side);toast('命令已送出');};
    const bc=$('#bClaim');if(bc)bc.onclick=()=>{claim();toast('現在由你指揮');};
    const rv=$('#bReveal');if(rv)rv.onclick=()=>showReveal(tl[tl.length-1]);
    $('#side').querySelectorAll('details').forEach(d=>d.ontoggle=()=>{if(d.querySelector('summary').textContent.includes('須知'))helpOpen=d.open;});}
  function stripD(d){const o={};for(const k of['c','w','f','res'])if(d[k])o[k]=d[k];return o;}
  window.__redraw=()=>draw(null,false);onState.push(draw);draw(null,true);return;}
})();
