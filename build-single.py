# 產生單一 HTML 檔：python3 build-single.py <three.min.js> <qrcode.js> <輸出檔>
import sys,json,re
three=open(sys.argv[1],encoding='utf8').read();qr=open(sys.argv[2],encoding='utf8').read()
assert '</script' not in three and '</script' not in qr
rd=lambda f:open(f,encoding='utf8').read()
teach=rd('teach.html')
m=re.search(r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/three\.js/r128/three\.min\.js"></script>',teach);assert m
teach=teach[:m.start()]+'<script>'+three+'</script>'+teach[m.end():]
h=rd('index.html')
def inline(h,tag,code):
    assert h.count(tag)==1,tag
    assert '</script' not in code,tag
    return h.replace(tag,'<script>\n'+code+'\n</script>')
h=inline(h,'<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',three)
h=inline(h,'<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>',qr)
tj=json.dumps(teach,ensure_ascii=False).replace('</','<\\/').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
h=inline(h,'<script src="config.js?v=1"></script>',rd('config.js')+'\nwindow.TEACH_HTML='+tj+';')
for f in ['rules','ai','review','layout','world','app']:
    h=inline(h,f'<script src="{f}.js?v=1"></script>',rd(f+'.js'))
assert 'src="' not in re.sub(r'<script>.*?</script>','',h,flags=re.S)
open(sys.argv[3],'w',encoding='utf8').write(h);print(len(h))
