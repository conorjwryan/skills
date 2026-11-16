"""Normal-path retest. Run: python3 this.py /tmp/unique-new-evidence [snapshot-parent].
Copies and hash-checks uncommitted snapshot; explicit pinned temp npm/Docker setup.
No candidate PATH/NODE_PATH/network bypass. Baseline ONLY uses documented workaround.
All commands/logs/timings and inventories retained in evidence directory.
"""
import http.server,threading,subprocess,sys,os,json,time,pathlib,shlex,shutil,hashlib,tarfile,io,tempfile
root=pathlib.Path(sys.argv[1]); root.mkdir(parents=True,exist_ok=False); results=[]
snapshot=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/vv-fixed-candidate-wljc4hza')
shutil.copytree(snapshot/'visual-verify',root/'candidate/visual-verify',ignore=shutil.ignore_patterns('node_modules'))
def hashes():
 return {str(p.relative_to(root/'candidate/visual-verify')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'candidate/visual-verify').rglob('*') if p.is_file() and 'node_modules' not in p.parts}
expected=json.loads((snapshot/'source-manifest.json').read_text())
assert hashes()==expected
(root/'source-before.json').write_text(json.dumps(hashes(),indent=2))
(root/'baseline').mkdir()
archive=subprocess.check_output(['git','-C','/home/conor/code/skills','archive','7ca3164'])
tarfile.open(fileobj=io.BytesIO(archive)).extractall(root/'baseline',filter='data')
subprocess.run(['docker','ps','-a','--no-trunc','--format','{{json .}}'],stdout=(root/'containers-before.jsonl').open('w'),check=True)
(root/'git-before.txt').write_text(subprocess.check_output(['git','-C','/home/conor/code/skills','status','--porcelain=v1'],text=True))

html='''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:20px sans-serif;margin:20px;background:#eef2ff}button{padding:16px}#state{padding:16px;background:#fff;margin:12px 0}#panel{height:100px;overflow:auto;border:2px solid}#handle{touch-action:none;background:#164e63;color:white;width:110px;height:70px;display:grid;place-items:center}#anim{width:40px;height:30px;background:#ca8a04;transition:transform .5s linear}</style><h2>Readiness fixture</h2><button onclick="later('CLICK READY')">Update</button><div id="state">INITIAL</div><div id="anim"></div><div id="handle">DRAG</div><div id="panel"><div style="height:450px">Scroll panel</div></div><script>
window.done=false; window.events=[];
window.later=(text)=>{window.done=false;setTimeout(()=>{state.textContent=text;state.dataset.ready='yes';window.done=true;anim.style.transform='translateX(120px)'},900)};
panel.onscroll=()=>{panel.onscroll=null;later('SCROLL READY')};
handle.onpointerdown=e=>{window.events.push(e.pointerType);handle.setPointerCapture(e.pointerId)};
handle.onpointerup=e=>later('DRAG READY '+e.pointerType);
</script>'''
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode())
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
env=dict(os.environ); env.pop('NODE_PATH',None); env['npm_config_cache']=str(root/'npm-cache')
def run(name,args,customenv=None):
 start=time.monotonic(); p=subprocess.run(args,env=customenv or env,capture_output=True,text=True,timeout=85)
 (root/(name+'.stdout')).write_text(p.stdout);(root/(name+'.stderr')).write_text(p.stderr)
 row=dict(name=name,command=shlex.join(args),duration=round(time.monotonic()-start,3),exit=p.returncode,stdout=str(root/(name+'.stdout')),stderr=str(root/(name+'.stderr')))
 row['success_json']=bool(p.stdout.strip().startswith('{') and 'saved' in p.stdout); row['png_exists']=(root/(name+'.png')).exists(); row['containers']=subprocess.check_output(['/usr/bin/docker','ps','--no-trunc','--format','{{.ID}} {{.Names}}'],text=True)
 results.append(row);(root/'results.json').write_text(json.dumps(results,indent=2));print(name,p.returncode,row['duration'],flush=True)
 return p
scripts=root/'candidate/visual-verify/scripts'
def shot(name,extra=[],script='screenshot.mjs'):
 return run(name,['node',str(scripts/script),'--url',url,'--out',str(root/(name+'.png'))]+extra)
try:
 run('setup',['bash',str(scripts/'install.sh'),'docker'])
 run('doctor',['node',str(scripts/'doctor.mjs')])
 api=root/'api.mjs'
 api.write_text("import {launchBrowser} from "+json.dumps(str(scripts/'load-playwright.mjs'))+"; const {browser,where}=await launchBrowser('chromium',{backend:'docker',timeout:15000}); try {const page=await browser.newPage();await page.goto("+json.dumps(url)+");console.log(JSON.stringify({where,text:await page.locator('h2').innerText()}));}finally{await browser.close()}")
 run('supported-api',['node',str(api)])
 shot('click-desktop' ,['--width','1000','--height','650','--dpr','1','--click','Update','--ready-selector','[data-ready=yes]','--ready-js','new Promise(r=>setTimeout(()=>r(window.done),100))','--settle','600'])
 shot('scroll-mobile',['--mobile','--width','390','--height','700','--dpr','1','--scroll-bottom','#panel','--ready-js','window.done'])
 shot('async-eval',['--dpr','1','--eval',"new Promise(r=>setTimeout(()=>{state.textContent='EVAL READY';r()},700))",'--ready-js',"state.textContent==='EVAL READY'"])
 for name,flags in [('false',['--ready-js','false']),('never',['--ready-js','new Promise(()=>{})']),('missing',['--ready-selector','#absent']),('eval-never',['--eval','new Promise(()=>{})']),('both-false',['--eval',"state.dataset.ready='yes'",'--ready-selector','[data-ready=yes]','--ready-js','false']),('budget',['--click','Update','--ready-selector','[data-ready=yes]','--ready-js','new Promise(()=>{})'])]:
  shot(name,flags+['--ready-timeout','1100'])
 for value in ['0','-1','NaN','Infinity','oops']:
  shot('invalid-'+value,['--ready-timeout',value])
 shot('tap-android',['--device','android','--tap','Update','--ready-selector','[data-ready=yes]','--report',"state.textContent"], 'touch.mjs')
 for device in ['android','iphone']:
  shot('drag-'+device,['--device',device,'--drag','#handle','--by','70,0','--ready-js','window.done','--settle','600','--report',"({text:state.textContent,events:window.events})"],'touch.mjs')
 for flags,name in [(['--ready-selector','#state','--ready-js','false'],'touch-false'),(['--ready-selector','#absent'],'touch-missing'),(['--ready-js','new Promise(()=>{})'],'touch-predicate-never')]:
  shot(name,['--device','android','--ready-timeout','350']+flags,'touch.mjs')
 for key in ['--ready-timeout','--settle']:
  for value in ['0','-1','NaN','Infinity','oops']:
   if key=='--settle' and value=='0': continue
   shot('touch-invalid-'+key[2:]+'-'+value,['--device','android',key,value],'touch.mjs')
 shot('touch-report-async',['--device','android','--report',"new Promise(r=>setTimeout(()=>r('ASYNC REPORT'),200))"],'touch.mjs')
 shot('touch-never' ,['--device','android','--report','new Promise(()=>{})','--ready-timeout','350'],'touch.mjs')
 # Baseline workaround ONLY: local CLI in owned image, NODE_PATH mounted runtime.
 # Baseline's original CLI is run local INSIDE a fresh owned container. No baseline Docker launcher.
 baseline=['/usr/bin/docker','run','--rm','--name','vv-retest-'+root.name+'','--network','host','--ipc=host','-e','VISUAL_VERIFY_DOCKER=0','-e','NODE_PATH=/runtime','--mount',f'type=bind,source={root}/candidate/visual-verify/node_modules,target=/runtime,readonly','--mount',f'type=bind,source={root},target=/evidence','mcr.microsoft.com/playwright:v1.65.1-noble','node','/evidence/baseline/visual-verify/scripts/screenshot.mjs','--url',url,'--out','/evidence/baseline-click.png','--width','1000','--height','650','--dpr','1','--click','Update']
 run('baseline-click',baseline,os.environ.copy())
 run('composite',['node',str(scripts/'composite.mjs'),'--before',str(root/'baseline-click.png'),'--after',str(root/'click-desktop.png'),'--out',str(root/'composite.png'),'--title','Timing regression: baseline versus fixed candidate','--before-label','BASELINE: fixed 400ms','--after-label','CANDIDATE: readiness + settle'])
finally:
 # Only our uniquely named baseline container may be explicitly removed.
 owned_baseline='vv-retest-'+root.name
 if subprocess.run(['docker','inspect',owned_baseline],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
  subprocess.run(['docker','rm','-f',owned_baseline],check=True)
 (root/'source-after.json').write_text(json.dumps(hashes(),indent=2))
 assert hashes()==expected
 server.shutdown();server.server_close()
 import socket
 with socket.socket() as probe: (root/'fixture-closed.txt').write_text(str(probe.connect_ex(('127.0.0.1',server.server_port))!=0))
 (root/'fixture.html').write_text(html);(root/'fixture-url.txt').write_text(url)
 subprocess.run(['/usr/bin/docker','ps','-a','--no-trunc','--format','{{json .}}'],stdout=(root/'containers-after.jsonl').open('w'))
