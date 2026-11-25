const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();
const plans={encircle:[['纏','梯'],['纏','梯'],['纏','斜'],['纏','收'],['纏','收']],awl:[['攻','集'],['攻','集'],['攻','梯'],['攻','梯'],['攻','梯']],goose:[['纏','梯'],['攻','梯'],['纏','斜'],['纏','收'],['纏','收']]};
for(const [nm,plan] of Object.entries(plans)){const p=await page(ctx,'?selftest=1#ai-blue',null,nm);
  for(let i=0;i<5;i++){if(await p.$('#bReveal')||(await p.innerText('#side')).includes('決戰中'))break;
    await p.click(`.o[data-g="c"][data-v="${plan[i][0]}"]`);const w=await p.$(`.o[data-g="w"][data-v="${plan[i][1]}"]`);await (w||await p.$('.o[data-g="w"][data-v="梯"]')).click();
    await p.click('#bSend');await p.waitForTimeout(1900);await p.screenshot({path:`f_${nm}_${i+1}.png`});
    if((await p.innerText('#side')).includes('決戰中')){for(const t of[2200,2800,3000]){await p.waitForTimeout(t);await p.screenshot({path:`f_${nm}_fin${t}.png`});}
      await p.waitForTimeout(1500);console.log(nm,(await p.innerText('.res')),'| 有檢討',(await p.innerText('#side')).includes('戰後檢討'));break;}}
  console.log(nm,'目前陣形卡：',(await p.$$eval('.card.form .fn',e=>e.map(x=>x.textContent))).join());}
console.log('ERR',errs);await b.close();})();
