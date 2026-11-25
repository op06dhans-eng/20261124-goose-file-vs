const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();const p=await page(ctx,'#ai-blue',null,'look');
await p.evaluate(()=>W.focus(-4.6,15,11,Math.PI/2,1.25));await p.waitForTimeout(1500);await p.screenshot({path:'M0.png'});
await p.evaluate(()=>W.command('blue'));await p.waitForTimeout(700);await p.screenshot({path:'M1.png'});
// 側面看行走：第一回合接戰牽制，中部向前
await p.click('.o[data-g="c"][data-v="纏"]');await p.click('.o[data-g="w"][data-v="梯"]');
await p.evaluate(()=>W.focus(0,-6,16,Math.PI/2,1.3));await p.waitForTimeout(1300);
await p.click('#bSend');await p.waitForTimeout(450);await p.screenshot({path:'M2.png'});await p.waitForTimeout(250);await p.screenshot({path:'M3.png'});
await p.evaluate(()=>W.home());await p.waitForTimeout(2500);await p.screenshot({path:'M4.png'});
console.log(errs);await b.close();})();
