// 規則與畫面位置的測試：node test.js
const R=require('./rules.js'),A=require('./ai.js'),V=require('./review.js'),L=require('./layout.js');
let n=0,bad=[];const N=+process.argv[2]||20000;
for(let g=0;g<N;g++){let s=R.init();const hist=[];
  while(!s.over){const bo=A.randB(s),ro=A.randR(s);hist.push({bo,ro});s=R.step(s,bo,ro);n++;}
  const tl=L.timeline(hist);const e=tl[tl.length-1];const ro=e.ro,B=e.s.B;
  const alive=[...ro.C,...ro.D,...ro.L,...ro.R],dead=Object.keys(ro.dead);
  if(alive.length+dead.length!==10)bad.push(['曲數不守恆',g,hist]);
  if(new Set([...alive,...dead]).size!==10)bad.push(['曲重複',g]);
  if(ro.C.length!==B.M||ro.D.length!==B.D||ro.L.length!==B.W.L.n||ro.R.length!==B.W.R.n)bad.push(['名冊與兵力不符',g,JSON.stringify(ro),JSON.stringify(B)]);
  if(JSON.stringify(e.s)!==JSON.stringify(s))bad.push(['重播結果不同',g]);
  if(s.log.flat().some(t=>/Infinity|NaN|undefined/.test(t)))bad.push(['戰報有異常字樣',g,JSON.stringify(s.log)]);
  try{V.review(hist);}catch(err){bad.push(['檢討出錯',g,err.message]);}
  if(bad.length>5)break;}
console.log(`隨機對局 ${N} 局、${n} 個回合；問題 ${bad.length} 件`);bad.slice(0,5).forEach(b=>console.log(JSON.stringify(b).slice(0,400)));
// 會判斷的電腦對打
let w={藍:0,紅:0,和:0};for(let g=0;g<40;g++){let s=R.init();while(!s.over)s=R.step(s,A.informedB(s),A.informedR(s));w[s.over.win]++;}
console.log('會判斷的電腦對打 40 局：',JSON.stringify(w));
process.exit(bad.length?1:0);
