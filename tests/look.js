const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();const p=await page(ctx,'#ai-blue',null,'look');
await p.screenshot({path:'L0.png'});
await p.click('.o[data-g="c"][data-v="纏"]');await p.click('.o[data-g="w"][data-v="斜"]');
await p.evaluate(()=>W.focus(-4.6,10,16,0.7,1.05));await p.waitForTimeout(1200);
await p.click('#bSend');await p.waitForTimeout(700);await p.screenshot({path:'L1.png'});
await p.waitForTimeout(500);await p.screenshot({path:'L2.png'});
await p.evaluate(()=>W.focus(-12,4,20,1.2,1.15));await p.waitForTimeout(900);
// 再下一回合，看兩翼收攏行走
await p.click('.o[data-g="c"][data-v="纏"]');const w=await p.$('.o[data-g="w"][data-v="收"]');if(w)await w.click();else await p.click('.o[data-g="w"]');await p.click('#bSend');await p.waitForTimeout(900);await p.screenshot({path:'L3.png'});
await p.evaluate(()=>W.home());await p.waitForTimeout(3000);await p.screenshot({path:'L4.png'});
console.log(errs);await b.close();})();
