// 首頁、和電腦對打（藍、紅；手機直式、橫式、電腦）、教學模式載入
const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const fail=m=>errs.push('流程: '+m);const note=[];
const VP={直式:{width:390,height:844},橫式:{width:667,height:375},電腦:{width:1280,height:720}};
// 首頁
for(const [vn,vp] of Object.entries(VP)){const ctx=await mkctx(vp);const p=await page(ctx,'',null,'首頁'+vn);
  const t=await p.innerText('#page');for(const w of['教學模式','對戰模式','和電腦對打','加入已開的推演'])if(!t.includes(w))fail('首頁缺 '+w);
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(sw>1)fail('首頁橫向超出 '+vn);
  // 沒輸入房號就按加入：不應離開首頁
  await p.click('[data-r="blue"]');await p.waitForTimeout(200);if(!(await p.$('#mCode')))fail('沒輸入房號卻離開了首頁');
  // 開新一局 → QR 頁
  await p.click('#mNew');await p.waitForTimeout(1200);const u=p.url();if(!/role=qr&room=[A-Z0-9]{4}/.test(u))fail('開新一局沒有進到 QR 頁：'+u);
  if(!(await p.$('.qrbox svg'))&&!process.env.SINGLE)note.push('（網頁版 QR 頁需連線資料庫，這裡的離線環境不檢查）');
  await ctx.close();}
// 和電腦對打
let games=0;const wins={};
for(const side of['blue','red'])for(const [vn,vp] of Object.entries(VP)){const ctx=await mkctx(vp);const p=await page(ctx,'#ai-'+side,null,`對電腦 ${side} ${vn}`);
  for(let g=0;g<(vn==='電腦'?3:2);g++){let r=0;
    while(!(await p.$('#bReveal'))&&r<6){const gs=side==='red'?['f','res']:['c','w'];
      for(const k of gs){const bs=await p.$$(`.o[data-g="${k}"]`);if(!bs.length){fail('沒有選項 '+k);break;}await bs[Math.floor(Math.random()*bs.length)].click();
        // 每個選項都要有示意圖
        const n=await p.$$eval(`.o[data-g="${k}"]`,els=>els.filter(e=>!e.querySelector('svg.osv')).length);if(n)fail('有選項沒有示意圖 '+k);}
      const on=await p.$$eval('.o.on',e=>e.length);if(on!==2)fail('選中的選項不是兩個：'+on);
      await p.click('#bSend');await p.waitForTimeout(2300);
      if((await p.innerText('#side')).includes('決戰中')){if(await p.$('#bReveal'))fail('動畫中就出現結果');await p.waitForSelector('#bReveal',{timeout:30000}).catch(()=>fail('動畫後沒有結果'));}await H.layout(p,`對電腦 ${side} ${vn} 第${r+1}回合`,errs);r++;
      if(!(await p.$('#bReveal'))){const t=await p.innerText('#side');if(!t.includes('回合戰報'))fail('結算後沒有戰報');if(!t.includes('電腦（'))fail('沒有顯示電腦這回合看得到的動作');}}
    if(!(await p.$('#bReveal'))){fail('對電腦打了六回合還沒結束');break;}
    const res=await p.innerText('.res');wins[res.slice(0,3)]=(wins[res.slice(0,3)]||0)+1;games++;
    await p.click('#bReveal');await p.waitForTimeout(200);const tx=await p.innerText('#page');if(!tx.includes('坎尼會戰'))fail('揭曉頁不完整');await p.click('#revClose');
    if(g===0){await p.click('#bSty');await p.waitForTimeout(500);await H.layout(p,`對電腦 ${side} ${vn} 推演室畫風`,errs);}
    await p.click('#bAgain');await p.waitForTimeout(600);const rr=await p.innerText('.round');if(!rr.includes('第 1 '))fail('再打一局後不是第 1 回合');}
  // 主畫面按鈕
  await p.click('#bMenu');await p.waitForTimeout(900);if(!(await p.$('#mNew')))fail('按主畫面沒有回到首頁');
  await ctx.close();}
note.push(`和電腦對打 ${games} 局：${JSON.stringify(wins)}`);
// 教學模式
{const ctx=await mkctx(VP.電腦);const p=await page(ctx,'',null,'教學模式');await p.click('a.mbtn');await p.waitForTimeout(2500);
  const u=p.url();if(!/teach\.html|^blob:/.test(u))fail('教學模式沒有開啟：'+u);const t=await p.evaluate(()=>document.body.innerText.length);if(t<50)fail('教學模式畫面是空的');
  const cv=await p.evaluate(()=>!!document.querySelector('canvas'));if(!cv)fail('教學模式沒有立體畫面');note.push('教學模式已開啟（'+(u.startsWith('blob:')?'內嵌':'teach.html')+'），畫面文字 '+t+' 字');
  // 點掉開場並按幾個按鈕，確認沒有程式錯誤
  for(let i=0;i<4;i++){const bs=await p.$$('button:visible');if(!bs.length)break;await bs[0].click().catch(()=>{});await p.waitForTimeout(700);}
  await ctx.close();}
console.log(note.join('\n'));console.log('問題',errs.length);errs.slice(0,20).forEach(e=>console.log('  -',e));await b.close();process.exit(errs.length?1:0);})().catch(e=>{console.log('測試程式本身出錯',e.message.slice(0,600));process.exit(2);});
