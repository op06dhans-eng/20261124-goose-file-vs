// 單機模式：QR 頁、裁判、藍軍、紅軍、投影同時開，照劇本打；途中測試各種操作
const H=require('./h.js');
const RES={後:'rear',中:'center',翼:'flanks'};
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();const room='T'+Math.random().toString(36).slice(2,6).toUpperCase();
const q=r=>`?role=${r}&room=${room}&local=1`;const note=[];const T0=Date.now();const log=m=>console.log(((Date.now()-T0)/1000).toFixed(0)+'s',m);const fail=m=>{errs.push('流程: '+m);log('✗ '+m);};
// 1. 學生比老師早進來：要看到「等待老師開局」
const blue=await page(ctx,q('blue'),{width:390,height:844},'藍軍(手機直式)');
const red=await page(ctx,q('red'),{width:844,height:390},'紅軍(手機橫式)');
const proj=await page(ctx,q('proj'),{width:1280,height:720},'投影');
for(const [n,p] of [['藍',blue],['紅',red],['投影',proj]]){const t=await p.innerText('#side');if(!t.includes('等待老師開局'))fail(n+' 沒有顯示等待老師開局');}
const qr=await page(ctx,q('qr'),{width:1280,height:720},'QR頁');
const ref=await page(ctx,q('ref'),{width:1280,height:720},'裁判');
log('五個畫面已開');await ref.waitForTimeout(1200);
for(const [n,p] of [['藍',blue],['紅',red]]){const t=await p.innerText('#side');if(!t.includes('第 1 回合'))fail(n+' 老師開局後沒有自動開始');}
// QR 頁：三個分頁、加入狀態
let t=await qr.innerText('#page');if(!(t.match(/已加入/g)||[]).length===2)fail('QR 頁沒有顯示雙方已加入');if(!t.includes('已開啟'))fail('QR 頁沒有顯示投影已開啟');
for(const k of['red','proj','blue']){await qr.click(`[data-t="${k}"]`);const svg=await qr.$('.qrbox svg');if(!svg)fail('QR 碼沒畫出來 '+k);const u=await qr.innerText('.qrbox .url');if(!u.includes('role='+k))fail('QR 網址不對 '+k);}
const qb=await qr.evaluate(()=>{const s=document.querySelector('.qrbox svg').getBoundingClientRect();return [s.width,s.height,innerHeight];});note.push('QR 碼大小 '+Math.round(qb[0])+'px（視窗高 '+qb[2]+'）');if(qb[0]<300)fail('QR 碼太小');
// 2. 同隊第二支手機：只能觀看；可接手指揮
const blue2=await page(ctx,q('blue'),{width:390,height:844},'藍軍第二支手機');
await blue2.waitForTimeout(900);t=await blue2.innerText('#side');if(!t.includes('你在觀看'))fail('第二支手機沒有顯示觀看');
if(await blue2.$('#bSend'))fail('觀看者不應有送出按鈕');
await blue2.click('#bClaim');await blue2.waitForTimeout(500);if(!(await blue2.$('#bSend')))fail('接手指揮後沒有送出按鈕');
t=await blue.innerText('#side');if(!t.includes('你在觀看'))fail('原指揮官被接手後沒有變成觀看');
await blue.click('#bClaim');await blue.waitForTimeout(500);await blue2.close();
const order=async(p,side,o)=>{const gs=side==='blue'?[['c',o[0]],['w',o[1]]]:[['f',o[0]],['res',RES[o[1]]]];
  for(const [g,v] of gs){let el=await p.$(`.o[data-g="${g}"][data-v="${v}"]`);if(!el){if(g==='w')el=await p.$(`.o[data-g="w"][data-v="梯"]`);else fail('找不到選項 '+g+v);}await el.click();}
  const sb=await p.$('#bSend');if(await sb.isDisabled())fail(side+' 選好兩個命令後送出鈕仍不能按');await sb.click();await p.waitForTimeout(250);
  const tx=await p.innerText('#bSend');if(!tx.includes('命令已送出'))fail(side+' 送出後按鈕沒有變成已送出：'+tx);
  const cls=await p.getAttribute('#bSend','class');if(!cls.includes('ok'))fail(side+' 送出後按鈕沒有轉綠');};
const settle=async()=>{await ref.waitForTimeout(250);const d=await ref.isDisabled('#bSettle');if(d){fail('雙方下令後結算鈕不能按');return;}await ref.click('#bSettle');await ref.waitForTimeout(2300);};
const over=async()=>!!(await ref.$('#bReveal'));
const check=async tag=>{for(const [n,p] of [['藍軍',blue],['紅軍',red],['投影',proj],['裁判',ref]])await H.layout(p,n+' '+tag,errs);};
const roundOf=async p=>((await p.innerText('.round')).match(/第 (\d+)/)||[])[1];
async function game(seqB,seqR,opts={}){let i=0;log('開始一局');
  while(!(await over())&&i<5){const r0=await roundOf(ref);
    // 結算鈕在只有一方下令時不能按
    await order(blue,'blue',seqB[i]);if(!(await ref.isDisabled('#bSettle'))&&!opts.aiRed)fail('只有藍軍下令時結算鈕就能按');
    if(i===0&&opts.change){ // 改命令：送出後改選，按鈕要回到未送出；再送一次
      await blue.click('.o[data-g="c"][data-v="待"]');let tx=await blue.innerText('#bSend');if(tx.includes('已送出'))fail('改了選項後仍顯示已送出');await blue.click('#bSend');await blue.waitForTimeout(200);
      const rt=await ref.innerText('#side');if(!rt.includes('中部待命'))fail('裁判沒看到更新後的命令');
      await blue.click(`.o[data-g="c"][data-v="${seqB[i][0]}"]`);await blue.click('#bSend');await blue.waitForTimeout(200);}
    if(i===1&&opts.reload){ // 藍軍手機重新整理：命令與局面都要還在
      await blue.reload();await blue.waitForTimeout(1300);const tx=await blue.innerText('#side');if(!tx.includes('命令已送出'))fail('重新整理後已送出的命令不見了');if((await roundOf(blue))!==r0)fail('重新整理後回合數不對');}
    if(!opts.aiRed)await order(red,'red',seqR[i]);
    // 投影：不洩漏命令內容
    const pt=await proj.innerText('#side');if(/中部(待命|接戰牽制|猛攻)、兩翼|前排(頂住|前壓|試探)、預備隊/.test(pt)&&!(await over()))fail('投影畫面出現命令內容');
    if(opts.auto&&i===0){await ref.check('#cAuto');await ref.waitForTimeout(3000+2500);await ref.uncheck('#cAuto').catch(()=>{});}
    else await settle();
    const r1=await roundOf(ref);const ov=await over();
    if(!ov&&+r1!==+r0+1)fail(`結算後回合沒有前進：${r0}→${r1}`);
    // 四個畫面回合數一致
    for(const [n,p] of [['藍',blue],['紅',red],['投影',proj]]){const rr=await roundOf(p);if(rr!==r1)fail(`${n} 的回合數 ${rr} 和裁判 ${r1} 不同`);}
    // 戰報：藍軍看不到只給紅軍的句子
    const bt=await blue.innerText('#side');if(!ov&&/預備隊移到|派人試探藍軍後陣/.test(bt.split('歷次戰報')[0]))fail('藍軍戰報出現紅軍才知道的事');
    const ptx=await proj.innerText('#side');if(!ov&&/預備隊移到|派人試探藍軍後陣/.test(ptx))fail('投影戰報出現紅軍才知道的事');
    await check(`第${i+1}回合後`);i++;}
  if(!(await over())){fail('五回合後沒有結束');return;}
  const res=[];for(const [n,p] of [['裁判',ref],['藍',blue],['紅',red],['投影',proj]]){const tx=await p.innerText('.res');res.push(tx);if(!(await p.$('#bReveal')))fail(n+' 結束後沒有揭曉按鈕');const sd=await p.innerText('#side');if(!sd.includes('戰後檢討')||!sd.includes('勝負關鍵'))fail(n+' 沒有戰後檢討');}
  const core=x=>x.replace('我軍','').replace(/\s/g,'');if(new Set([core(res[0]),core(res[1]),core(res[3])]).size!==1)fail('各畫面結果不一致 '+res.join(' / '));
  note.push('結果：'+res[0]);log('結果：'+res[0]);
  // 揭曉頁開得起來、關得掉
  for(const [n,p] of [['藍',blue],['紅',red],['投影',proj],['裁判',ref]]){await p.click('#bReveal');await p.waitForTimeout(200);const tx=await p.innerText('#page');if(!tx.includes('坎尼會戰')||!tx.includes('討論'))fail(n+' 揭曉頁內容不完整');for(const w of['undefined','NaN'])if(tx.includes(w))fail(n+' 揭曉頁出現 '+w);
    const sw=await p.evaluate(()=>document.querySelector('#page').scrollWidth-document.querySelector('#page').clientWidth);if(sw>1)fail(n+' 揭曉頁橫向超出');await p.click('#revClose');await p.waitForTimeout(100);if(!(await p.evaluate(()=>document.querySelector('#page').hidden)))fail(n+' 揭曉頁關不掉');}
  await check('結束畫面');}
const restart=async()=>{const bs=await ref.$$('#bRestart');const bt=bs[bs.length-1];await bt.click();await ref.waitForTimeout(150);const b2=(await ref.$$('#bRestart')).pop();await b2.click();await ref.waitForTimeout(1200);
  for(const [n,p] of [['裁判',ref],['藍',blue],['紅',red],['投影',proj]]){if((await roundOf(p))!=='1')fail(n+' 重新開局後不是第 1 回合');}
  const bt2=await blue.innerText('#side');if(bt2.includes('回合戰報'))fail('重新開局後藍軍還留著上一局戰報');};
const P=str=>str.split(' ').map(x=>[x[0],x[1]]);
// 第一局：佯攻再張翼 對 被吸到中央（含改命令、重新整理）
await game(P('纏梯 攻梯 纏斜 纏收 纏收'),P('頂後 頂中 頂中 頂中 頂中'),{change:true,reload:true});await restart();
// 第二局：錐行（集中兩次再猛攻）對 試探後守中央
await game(P('纏集 纏集 攻梯 攻梯 攻梯'),P('探後 頂中 頂中 頂中 壓中'));await restart();
// 第三局：開局即張 對 守兩側（截擊）、自動結算
await game(P('纏斜 纏斜 纏梯 攻梯 待梯'),P('頂翼 頂翼 壓後 壓中 壓中'),{auto:true});await restart();
// 第四局：急進包抄（斷絕、補位）對 前壓
await game(P('纏梯 纏急 纏梯 纏收 攻收'),P('頂後 壓翼 頂翼 頂翼 頂翼'));await restart();
// 第五局：打到一半重新開局，再由電腦代紅軍下令打完
await order(blue,'blue',['纏','梯']);await order(red,'red',['頂','後']);await settle();await restart();
await ref.check('#cAiR');await ref.waitForTimeout(400);
await game(P('纏梯 攻梯 纏斜 纏收 纏收'),null,{aiRed:true});
// 換畫風、回到全局：四個畫面都按一次
for(const [n,p] of [['藍',blue],['紅',red],['投影',proj],['裁判',ref]]){await p.click('#bSty');await p.waitForTimeout(500);await p.click('#bHome');await p.click('#bSty');await p.waitForTimeout(300);}
// 視角操作：拖曳、滾輪
await ref.mouse.move(300,300);await ref.mouse.down();await ref.mouse.move(420,260,{steps:6});await ref.mouse.up();await ref.mouse.wheel(0,300);await ref.waitForTimeout(400);
console.log(note.join('\n'));console.log('問題',errs.length);errs.slice(0,20).forEach(e=>console.log('  -',e));
await blue.screenshot({path:'r_blue.png'});await red.screenshot({path:'r_red.png'});await ref.screenshot({path:'r_ref.png'});
await b.close();process.exit(errs.length?1:0);})().catch(e=>{console.log('測試程式本身出錯',e.message.slice(0,600));process.exit(2);});
