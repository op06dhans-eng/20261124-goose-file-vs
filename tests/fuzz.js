// 在瀏覽器裡跑：隨機與典型打法的每一個局面，把所有畫面文字、示意圖、立體位置都產生一次
const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();const p=await page(ctx,'?selftest=1#ai-blue',null,'fuzz');
const N=+process.argv[2]||600;
const res=await p.evaluate(async N=>{const T=window.__T,bad=[];let states=0,strings=0;
  const chk=(str,where)=>{strings++;if(typeof str!=='string'){bad.push(where+' 不是字串');return;}for(const w of['undefined','NaN','[object','>null<',' null','Infinity'])if(str.includes(w)){bad.push(where+' 出現 '+w+'：'+str.slice(Math.max(0,str.indexOf(w)-60),str.indexOf(w)+30));break;}};
  const pick=a=>a[Math.random()*a.length|0];
  const docB=Object.values(GAI.BLUE),docR=Object.values(GAI.RED);
  for(let g=0;g<N&&bad.length<8;g++){let s=GR.init();const hist=[];const bf=g%3===0?pick(docB):GAI.randB,rf=g%3===1?pick(docR):GAI.randR;
    while(!s.over){const bo=bf(s),ro=rf(s);hist.push({bo:{c:bo.c,w:bo.w},ro:{f:ro.f,res:ro.res}});s=GR.step(s,bo,ro);}
    try{for(let k=0;k<=hist.length;k++){const tl=T.timeline(hist.slice(0,k)),e=tl[tl.length-1],st=e.s;states++;
        for(const v of['truth','blue','red','proj']){const d=T.sceneDesc(e,v);
          for(const [id,u] of Object.entries(d.groups)){if(!isFinite(u.x)||!isFinite(u.z))bad.push(`位置不是數字 ${id} ${v}`);if(u.alive!=null&&(!isFinite(u.alive)||u.alive<0))bad.push(`人數不對 ${id}`);}
          // 兩個活著、看得見的曲不應站在同一點
          const seen={};for(const nm of '甲乙丙丁戊己庚辛壬癸'){const u=d.groups[nm];if(u.hidden||u.dead)continue;const key=u.x.toFixed(1)+','+u.z.toFixed(1);if(seen[key])bad.push(`兩個曲重疊 ${seen[key]}${nm} 視角${v} 第${k}回合 ${JSON.stringify(hist.slice(0,k))}`);seen[key]=nm;}
          // 藍軍的曲不能壓在紅軍方陣上
          {const rz=GL.offs(e.ro).rz;for(const nm of '甲乙丙丁戊己庚辛壬癸'){const u=d.groups[nm];if(u.hidden||u.dead)continue;if(Math.abs(u.x)<13.4&&u.z>-31.8+rz&&u.z<-18.2+rz)bad.push(`藍軍 ${nm} 壓在紅軍方陣上 視角${v} ${JSON.stringify(hist.slice(0,k))}`);}}
          if(v!=='truth'){chk(T.sitCard(e,v),'態勢 '+v);if(k>0){chk(T.reportCard(st,k-1,v),'戰報 '+v);chk(T.fullLog(st,v),'歷次戰報 '+v);}}
          if(k===0)W.show(d,false);}
        if(k>0){T.fxOf(tl[tl.length-2],e);chk(T.reportCard(st,k-1,'truth'),'戰報 老師');}
        if(!st.over){for(const sd of['blue','red']){const opts=sd==='blue'?GR.blueLegal(st):GR.redLegal(st);
            for(const o of opts){chk(T.orderCard(e,sd,o,false,true,'k'+g),'命令卡 '+sd);T.orderArrows(e,sd,o).forEach(a=>{if(![...a.from,...a.to].every(isFinite))bad.push('箭頭座標 '+sd+JSON.stringify(o));});}
            chk(T.orderCard(e,sd,{},false,true,'k'),'空白命令卡');chk(T.orderCard(e,sd,opts[0],true,true,'k'),'已送出');chk(T.orderCard(e,sd,{},false,false,'k'),'觀看');
            // 資訊不外洩：紅軍命令卡與態勢不應出現藍軍後陣的真實數字（未被看見時）；藍軍不應看到預備隊本回合位置的字樣以外資訊
          }
          // 紅軍視角：沒被看見時，集中到後方的曲不能出現在中部後方
          const dr=T.sceneDesc(e,'red');const seenNow=st.seenDAt===st.r&&st.r>0;if(!seenNow)for(const nm of e.ro.D){const u=dr.groups[nm];if(!u.dead&&!u.hidden&&Math.abs(u.x)<6)bad.push('紅軍看得到藍軍後陣的曲 '+nm);}
          // 藍軍視角：預備隊畫在上一回合的位置
          const db=T.sceneDesc(e,'blue');const want=GL.RESP[st.resHist[Math.max(0,st.resHist.length-2)]];if(db.groups.resA.x!==want[0][0]||Math.abs(db.groups.resA.z-(want[0][1]+GL.offs(e.ro).rz))>1e-9)bad.push('藍軍看到的預備隊位置不是上一回合的');}
        else{for(const v of['truth','blue','red'])chk(T.endCard(tl,v),'結束 '+v);chk(T.revealHtml(e),'揭曉頁');
          const d=T.sceneDesc(e,'red');W.show(d,true);}
      }}catch(err){bad.push('丟出錯誤：'+err.message+' @ '+JSON.stringify(hist)+' '+(err.stack||'').split('\n')[1]);}
    if(g%50===0)await new Promise(r=>setTimeout(r,0));}
  chk(T.helpHtml('blue'),'須知');chk(T.helpHtml('red'),'須知');
  return{states,strings,bad};},N);
console.log(`瀏覽器內檢查：${N} 局、${res.states} 個局面、${res.strings} 段畫面文字；問題 ${res.bad.length} 件`);res.bad.slice(0,8).forEach(x=>console.log('  -',x.slice(0,500)));
console.log('程式錯誤',errs.length,errs.slice(0,5));await b.close();process.exit(res.bad.length||errs.length?1:0);})();
