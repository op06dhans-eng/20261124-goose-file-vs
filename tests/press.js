const H=require('./h.js');
(async()=>{const {b,errs,mkctx,page}=await H.open();const ctx=await mkctx();const p=await page(ctx,'?selftest=1#ai-blue',null,'press');
const shots=[[[]],[[{bo:{c:'待',w:'梯'},ro:{f:'壓',res:'rear'}}]],[[{bo:{c:'纏',w:'梯'},ro:{f:'壓',res:'rear'}}]],[[{bo:{c:'待',w:'梯'},ro:{f:'壓',res:'rear'}},{bo:{c:'待',w:'梯'},ro:{f:'頂',res:'rear'}},{bo:{c:'待',w:'梯'},ro:{f:'壓',res:'rear'}}]]];
let i=0;for(const [h] of shots){await p.evaluate(h=>{const tl=__T.timeline(h);const e=tl[tl.length-1];const {rz,hs}=GL.offs(e.ro);W.setCenter(((-35+rz)+(20+hs))/2-.5);W.home();W.show(__T.sceneDesc(e,'truth'),false);},h);await p.waitForTimeout(1500);await p.screenshot({path:`P${i++}.png`,clip:{x:0,y:0,width:890,height:720}});}
console.log(errs);await b.close();})();
