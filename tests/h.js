const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SP='/tmp/claude-0/-home-claude/a4533160-6b0f-597e-b303-f910e9edaba8/scratchpad';
const SITE=process.env.SITE||'/home/claude/goosevs/site';const SINGLE=process.env.SINGLE||'';
exports.URL0=SINGLE?('file://'+SINGLE):'http://x/';
exports.open=async function(){const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']});
  const errs=[];
  const mkctx=async vp=>{const ctx=await b.newContext({viewport:vp||{width:1280,height:720}});
    await ctx.route('**/*',r=>{const u=r.request().url();
      if(u.startsWith('file://')||u.startsWith('blob:'))return r.continue();
      if(SINGLE)return r.abort();   // 單一檔：完全不給網路
      if(u.includes('three.min.js'))return r.fulfill({body:fs.readFileSync(SP+'/three.min.js'),contentType:'application/javascript'});
      if(u.includes('qrcode.js')&&u.includes('jsdelivr'))return r.fulfill({body:fs.readFileSync(SP+'/qrcode.js'),contentType:'application/javascript'});
      if(u.startsWith('http://x/')){let p=new URL(u).pathname;if(p==='/')p='/index.html';const f=path.join(SITE,decodeURIComponent(p));if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});}
      return r.abort();});
    return ctx;};
  const page=async(ctx,q,vp,name)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);const nm=name||q;
    p.on('pageerror',e=>errs.push(nm+' 程式錯誤: '+e.message));
    p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_FAILED|net::/.test(m.text()))errs.push(nm+' console: '+m.text());});
    await p.goto(exports.URL0+q);await p.waitForTimeout(900);return p;};
  return{b,errs,mkctx,page};};
// 版面檢查：側欄不蓋戰場、沒有橫向捲動、文字沒有 undefined/NaN
exports.layout=async function(p,name,errs){const r=await p.evaluate(()=>{const st=document.querySelector('#stage'),sd=document.querySelector('#side');const out=[];
  if(st.hidden||sd.hidden)return out;const a=st.getBoundingClientRect(),b=sd.getBoundingClientRect();
  const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>1&&oy>1)out.push('側欄蓋到戰場 '+ox+'x'+oy);
  if(document.documentElement.scrollWidth>innerWidth+1)out.push('頁面出現橫向捲動');
  if(sd.scrollWidth>sd.clientWidth+1)out.push('側欄內容超出寬度');
  const t=sd.innerText;for(const w of['undefined','NaN','[object','null'])if(t.includes(w))out.push('文字出現 '+w);
  // 戰場上除了右下兩個按鈕與連線燈，不應有其他蓋住戰場的東西
  for(const el of document.querySelectorAll('body > *')){if(el.hidden||['stage','side','page','toast','loading'].includes(el.id)||el.tagName==='SCRIPT')continue;const q=el.getBoundingClientRect();if(q.width*q.height>0)out.push('多餘的浮動元素 '+el.tagName+'#'+el.id);}
  const tt=document.querySelector('#toast');if(tt&&!tt.hidden){const q=tt.getBoundingClientRect();const ix=Math.min(a.right,q.right)-Math.max(a.left,q.left),iy=Math.min(a.bottom,q.bottom)-Math.max(a.top,q.top);if(ix>1&&iy>1)out.push('提示訊息蓋到戰場');}
  return out;});
  r.forEach(x=>errs.push(name+' 版面: '+x));};
