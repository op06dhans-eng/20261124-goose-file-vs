// 戰後檢討
(function(root){'use strict';

// 戰後檢討：依這一局實際的命令，自動產生解說（不是預先寫死的劇本）
const R=(typeof module!=='undefined'&&module.exports)?require('./rules.js'):root.GR;
const NM={c:{待:'中部待命',纏:'中部接戰牽制',攻:'中部猛攻'},w:{梯:'兩翼梯次在後',斜:'兩翼依序斜出',急:'兩翼急進包抄',收:'兩翼收攏側擊',集:'後曲向中部集中'},
  f:{頂:'前排頂住',壓:'前排前壓',探:'派人試探'},res:{rear:'預備隊居後',center:'預備隊調往中央',flanks:'預備隊守兩側'}};
const bName=o=>NM.c[o.c]+'、'+NM.w[o.w],rName=o=>NM.f[o.f]+'、'+NM.res[o.res];
function replay(hist){let s=R.init();const states=[s];for(const h of hist){s=R.step(s,h.bo,h.ro);states.push(s);}return states;}
// 對手照原本命令走時，自己從某一回合起能不能逼出勝利（回傳一條勝利路線）
function winPath(s,side,oppOrders,depth){if(s.over)return s.over.win===side?[]:null;const opp=oppOrders[s.r];if(!opp)return null;
  const mine=side==='藍'?R.blueLegal(s):R.redLegal(s);
  for(const o of mine){const n=side==='藍'?R.step(s,o,opp):R.step(s,opp,o);const p=winPath(n,side,oppOrders);if(p)return [o,...p];}return null;}
function review(hist){const st=replay(hist),fin=st[st.length-1],win=fin.over.win,lose=win==='藍'?'紅':win==='紅'?'藍':null;const out=[];
  // 一、這一局打成了什麼
  const firstSpread0=0;const atkD=hist.some((h,i)=>h.bo.c==='攻'&&st[i].B.D+(h.bo.w==='集'?2:0)>=2),strikes=hist.some(h=>h.bo.w==='收'||h.bo.w==='急');
  const firstSpread=hist.findIndex(h=>h.bo.w==='斜'||h.bo.w==='急');
  const pierce=fin.over&&fin.over.why.includes('突穿');let form=(atkD||pierce)&&strikes?'兩面並進（錐行與鴈行並用）':atkD?'錐行（後曲集中，由內向外撕開）':pierce?'中央突破（紅軍中區被消耗殆盡，不是錐行）':strikes?'鴈行（兩翼包抄，由外向內收攏）':'沒有成形（後曲既未集中，兩翼也沒有側擊）';
  out.push(`【結果】${win==='和'?'和局':win+'軍勝'}：${fin.over.why}（第 ${fin.r} 回合）。`);
  out.push(`【藍軍這一局打成了】${form}${firstSpread===0?'；而且第 1 回合就張開兩翼（牛角形太早出現）':''}。`);
  // 二、判斷檢討：逐回合找出有意義的判斷
  out.push('【判斷檢討】');
  hist.forEach((h,i)=>{const s=st[i],n=st[i+1],r=i+1;const tr=s.R.res,D=s.B.D;
    if(h.ro.res!==tr){const got=n.R.res,RN={rear:'後方居中',center:'中央',flanks:'兩側'};
      if(got!==h.ro.res)out.push(`第 ${r} 回合：紅軍下令把預備隊調往${RN[h.ro.res]}，但要先經過後方，這一回合只走到${RN[got]}。`);
      else if(got==='center')out.push(n.B.D>=2?`第 ${r} 回合：紅軍把預備隊調往中央，這個判斷有根據：藍軍中部後方確實已有 ${n.B.D} 個曲集中（錐行）。`
        :`第 ${r} 回合：紅軍把預備隊調往中央，但藍軍中部後方其實沒有集中兵力，中區並不危險，兩側反而變薄了。`);
      else if(got==='flanks')out.push(`第 ${r} 回合：紅軍把預備隊調往兩側${n.B.D>=2?'，但藍軍後陣已經集中，中區反而變薄了':''}。`);
      else out.push(`第 ${r} 回合：紅軍把預備隊撤回後方居中，兩邊都能接應。`);}
    if(h.bo.w==='斜'){const resNow=n.R.res;const intercepted=n.log[i].some(t=>t.includes('截擊'));
      if(intercepted)out.push(`第 ${r} 回合：藍軍兩翼斜出時，紅軍預備隊正守在兩側，兩翼在途中被截擊（行進中的部隊被打，叫「擊其未陣」）。`);
      else if(resNow==='center')out.push(`第 ${r} 回合：藍軍張開兩翼時，紅軍預備隊在中央，要兩個回合才趕得到兩側。兩翼這時才張開，紅軍預備隊趕不及（牛角形到決勝時刻才出現）。`);
      else if(r<=2)out.push(`第 ${r} 回合：藍軍很早就張開兩翼，紅軍預備隊還在後方，下一回合就能趕到兩側。曾瑞龍：牛角形太早出現，意圖就會暴露。`);
      else out.push(`第 ${r} 回合：藍軍張開兩翼時，紅軍預備隊在${resNow==='rear'?'後方居中，一回合就能趕到兩側':'兩側'}。`);}
    if(h.bo.w==='急')out.push(`第 ${r} 回合：藍軍兩翼急進包抄，陣線斷絕，側擊戰力打對折（《武經總要》「鴈行延斜，惡其斷絕」）。`);
    if(h.bo.c==='攻'&&n.log[i].some(t=>t.includes('藍軍受挫'))){const thin=(D+(h.bo.w==='集'?2:0))<2;
      out.push(thin?`第 ${r} 回合：藍軍中部以薄兵猛攻受挫：中部後方不夠厚（〈十陣〉「本不厚則不可以列陳」）。如果這是佯攻，目的在逼紅軍把預備隊調到中央。`
        :`第 ${r} 回合：藍軍中部猛攻受挫，${n.R.res==='center'?'紅軍預備隊在中央，錐行撞上最厚的地方':'紅軍中區頂住了'}。`);}
    if(h.ro.f==='探'){const atk=i>0&&hist[i-1].bo.c==='攻'||h.bo.c==='攻';out.push(`第 ${r} 回合：紅軍派人試探，得知藍軍中部後方有 ${n.B.D} 個曲。`+(n.B.D<2&&atk?'藍軍剛才猛攻，後方卻沒有兵：這是佯攻，紅軍不必把預備隊調往中央。':n.B.D>=2?'後陣厚，藍軍是真的要從中央撕開（錐行）。':''));}
  });
  // 三、勝負關鍵：從這一局實際發生的事，挑出決定勝負的那一步，並寫出當時雙方各知道什麼
  const spreadAt=hist.findIndex(h=>h.bo.w==='斜'&&true);const resAt=i=>st[i+1].R.res;
  const seenAt=i=>st[i].resHist[Math.max(0,st[i].resHist.length-2)];
  const RN={rear:'後方居中',center:'中央',flanks:'兩側'};const key=[],next=[];
  if(win==='藍'&&fin.over.why.includes('合圍')){const tf=hist.length-1,resF=st[tf+1].R.res,t=hist.findIndex((h,i)=>h.bo.w==='斜'&&!st[i+1].log[i].some(x=>x.includes('截擊')));
    if(t<0)key.push(`藍軍兩翼急進包抄，第 ${tf+1} 回合紅軍兩側沒有預備隊支援，三面夾擊之下兩側被擊潰。`);
    else if(resAt(t)==='center'){key.push(`藍軍在第 ${t+1} 回合張開兩翼。那時紅軍預備隊已經被吸到中央，要兩個回合才趕得到兩側，來不及了。藍軍下令時，斥候回報的是「${RN[seenAt(t)]}」（晚一回合的情報）。`);
      next.push('紅軍下一局可以想想：藍軍中部猛攻時，先試探它的後陣厚不厚，再決定預備隊要不要離開後方。');}
    else{key.push(`藍軍兩翼在第 ${t+1} 回合到達紅軍兩側；決勝的第 ${tf+1} 回合，紅軍預備隊在${RN[resF]}，沒有及時調往兩側，三面夾擊之下兩側被擊潰。`);
      next.push('紅軍下一局可以想想：藍軍兩翼一到側面就是明顯的訊號，預備隊要立刻往兩側移動；若平常就把預備隊放在中央，要兩回合才趕得到。');}}
  if(win==='藍'&&fin.over.why.includes('突穿')){const t=hist.length-1,d=st[t].B.D+(hist[t].bo.w==='集'?2:0);
    if(d>=2)key.push(`藍軍把 ${d} 個後曲集中到中部後方，猛攻時紅軍預備隊在${RN[resAt(t)]}，中區只靠前排，被由內向外撕開（〈威王問〉「錐行者，所以衝堅毀銳也」）。`);
    else key.push(`紅軍中區前排在幾個回合的交戰中逐漸耗盡，第 ${t+1} 回合中區失守；預備隊當時在${RN[resAt(t)]}。`);
    next.push(strikes?'紅軍下一局可以想想：藍軍兩翼出擊的同時，中部後方也可能在集中；預備隊離開中央之前，值得先試探一次。':'紅軍下一局可以想想：藍軍兩翼一直不動、中部卻越打越有力，後陣可能在集中，值得派人試探。');}
  if(win==='和')key.push(`第 ${fin.r} 回合雙方同時得手：藍軍完成了${fin.R.broken.C?'中區突穿':'兩側合圍'}，紅軍也在同一回合擊潰了藍軍中部。兩翼收攏的同時，中部必須頂得住（〈十陣〉「前行若有雍」）。`);
  else if(win==='紅'){
    if(firstSpread>=0&&firstSpread<=1){key.push(`藍軍在第 ${firstSpread+1} 回合就張開兩翼，紅軍預備隊還在後方，下一回合就趕到兩側，側擊只打成相持（曾瑞龍：牛角形太早出現，意圖就會暴露）。`);
      next.push('藍軍下一局可以想想：先讓中部正面施壓，等斥候回報預備隊離開後方，再張開兩翼。');}
    const feint=hist.findIndex((h,i)=>h.ro.f==='探'&&st[i+1].B.D<2&&hist.slice(0,i+1).some(x=>x.bo.c==='攻'));
    if(feint>=0){key.push(`紅軍在第 ${feint+1} 回合派人試探，發現藍軍中部猛攻卻後方無兵，判斷是佯攻，預備隊沒有被吸走。`);
      next.push('藍軍下一局可以想想：佯攻要像真的，後曲先集中到中部，讓中部真的有打穿的力量，紅軍才不得不把預備隊調到中央。');}
    const wall=hist.filter((h,i)=>h.bo.c==='攻'&&st[i].B.D>=2&&(st[i+1].R.res==='center')).length;
    if(wall>=1){key.push(`藍軍的錐行 ${wall} 次撞上預備隊在中央的方陣，中區太厚，打不穿。`);
      next.push('藍軍下一局可以想想：紅軍把兵力堆在中央時，兩側就變薄了；錐行與鴈行可以互相掩護。');}
    if(hist.some(h=>h.bo.w==='急')){key.push('藍軍兩翼急進包抄，陣線斷絕，側擊戰力只剩一半（《武經總要》「鴈行延斜，惡其斷絕」）。');}
    const icp=hist.findIndex((h,i)=>st[i+1].log[i].some(x=>x.includes('截擊')));
    if(icp>=0)key.push(`第 ${icp+1} 回合藍軍兩翼斜出時，紅軍預備隊正守在兩側，在半路被截擊。`);
    if(fin.over.why==='藍軍中部潰散')key.push('藍軍中部被紅軍前壓擊潰。中部是全陣的支點，兩翼還沒合圍之前，中部必須頂住（〈十陣〉「前行若有雍」）。');
    if(!key.length){key.push(`紅軍的預備隊始終在藍軍要打的地方附近：藍軍沒有讓它離開關鍵位置，方陣就守住了。`);
      next.push('藍軍下一局可以想想：怎麼讓紅軍「以為」你要打另一個地方？');}}
  out.push('【勝負關鍵】');key.forEach(k=>out.push(k));
  if(next.length){out.push('【下一局可以想想】（不是標準答案）');next.forEach(k=>out.push(k));}
  return out.join('\n');}

const API={review,NM};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GRV=API;
})(typeof window!=='undefined'?window:globalThis);
