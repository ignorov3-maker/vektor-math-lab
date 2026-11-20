"""CX-25. Только тестовый стенд. Python stdlib; локальному стенду нужны psql, Bun и PostgreSQL.

VEKTOR_PG='host=127.0.0.1 user=postgres ...' python tests/load_test.py --local
Удалённый стенд: --base URL --accounts-file demo.json; обязательна серверная test-marker проверка.
"""
import argparse, asyncio, concurrent.futures, datetime, http.server, json, math, os, pathlib, secrets, socket
import statistics, subprocess, threading, time, urllib.error, urllib.parse, urllib.request

ROOT=pathlib.Path(__file__).resolve().parent.parent
SQL_FILES=['schema.sql','test.sql','admin.sql','teacher.sql','pulse.sql','ai.sql','guard.sql','accounts.sql','plans.sql','parent.sql','tutor_cabinet.sql','audit.sql','pilot_report.sql','security_fix.sql','pilot_adults.sql','login_keys.sql','sandbox.sql','teacher_card.sql','teacher_labels.sql']
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
HTTP=urllib.request.build_opener(NoRedirect)
def request(url,body=None,headers=None):
    req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
    with HTTP.open(req,timeout=20) as r:
        text=r.read().decode();return json.loads(text) if r.headers.get('Content-Type','').startswith('application/json') else text
def free_port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def percentile(rows,p=.95):return sorted(rows)[max(0,math.ceil(len(rows)*p)-1)] if rows else None
def summary(rows):return {'count':len(rows),'median_seconds':statistics.median(rows) if rows else None,'p95_seconds':percentile(rows)}

class LocalStand:
    def __init__(self):
        self.pg=os.environ.get('VEKTOR_PG','');self.db='vk_load_'+secrets.token_hex(5);self.srv=None;self.fn=None
        # Создание стенда на боевом сервере даже с отдельной БД не разрешается этим режимом.
        host=urllib.parse.urlparse(self.pg).hostname if self.pg.startswith(('postgres://','postgresql://')) else next((x.split('=',1)[1] for x in self.pg.split() if x.startswith('host=')),None)
        if host not in ('127.0.0.1','localhost','::1'):raise ValueError('--local requires an explicitly configured loopback VEKTOR_PG')
    def sql(self,query,db=None):
        conn=self.pg
        if conn.startswith(('postgres://','postgresql://')):
            u=urllib.parse.urlsplit(conn);conn=urllib.parse.urlunsplit((u.scheme,u.netloc,'/'+(db or self.db),u.query,''))
        else:conn+=' dbname='+(db or self.db)
        r=subprocess.run(['psql',conn,'-X','-qtA','-v','ON_ERROR_STOP=1','-f','-'],input=query,capture_output=True,encoding='utf-8',env={**os.environ,'PGCLIENTENCODING':'UTF8'})
        if r.returncode:raise RuntimeError('Local test SQL failed: '+r.stderr.strip())
        return r.stdout.strip()
    def start(self):
        self.sql('create database '+self.db,'postgres')
        self.sql("do $$begin create role anon nologin;exception when duplicate_object then null;end$$;do $$begin create role authenticated nologin;exception when duplicate_object then null;end$$;do $$begin create role service_role nologin;exception when duplicate_object then null;end$$;")
        for name in SQL_FILES:self.sql((ROOT/'supabase'/name).read_text(encoding='utf-8'))
        accounts=json.loads(self.sql("select coalesce(jsonb_agg(to_jsonb(s)),'[]') from vk_seed(100) s"))
        stand=self
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def send(self,code,data,content='application/json'):
                b=(json.dumps(data) if content=='application/json' else data).encode();self.send_response(code);self.send_header('Content-Type',content);self.end_headers();self.wfile.write(b)
            def do_GET(self):
                if self.path=='/__vektor_load_test__':self.send(200,{'test':True,'database':stand.db,'model':'stub','anon_key':'anon-test'} )
                else:self.send(404,{'error':'not_found'})
            def do_POST(self):
                body=self.rfile.read(min(int(self.headers.get('Content-Length',0)),1000000))
                if self.path=='/functions/v1/tutor':
                    try:
                        req=urllib.request.Request(f'http://127.0.0.1:{stand.fn_port}',data=body,headers={'Content-Type':'application/json','Origin':stand.base})
                        with HTTP.open(req,timeout=20) as r:self.send(r.status,r.read().decode(),r.headers.get('Content-Type','text/event-stream'))
                    except urllib.error.HTTPError as e:self.send(e.code,{'error':'tutor'})
                    return
                fn=self.path.rsplit('/',1)[-1]
                public={'vektor_login','vektor_sync'};service={'vk_ai_take','vk_ai_spend','vk_ai_cache_get','vk_ai_cache_put'}
                key=self.headers.get('apikey');allowed=fn in public and key=='anon-test' or fn in service and key=='service-test'
                if not self.path.startswith('/rest/v1/rpc/') or not allowed:self.send(403,{'error':'forbidden'});return
                try:
                    data=json.loads(body);parts=[]
                    for k,v in data.items():
                        if not k.startswith('p_') or not k.replace('_','').isalnum():raise ValueError('argument')
                        value=json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else str(v)
                        tag='$v'+secrets.token_hex(6)+'$'
                        literal='null' if v is None else tag+value+tag
                        cast='::jsonb' if isinstance(v,(dict,list)) else '::boolean' if isinstance(v,bool) else '::numeric' if isinstance(v,(int,float)) else ''
                        # int-аргументы RPC не должны выбираться как numeric-перегрузка.
                        if k in ('p_student','p_in','p_out'):cast='::int'
                        parts.append(k+'=>'+literal+cast)
                    out=stand.sql("set request.headers='{"+'"x-forwarded-for":"127.0.0.1"'+"}';"+('set role anon;' if fn in public else '')+'select '+fn+'('+','.join(parts)+')')
                    self.send(200,json.loads(out) if out and out!='null' else None)
                except Exception:self.send(500,{'error':'test_rpc_failed'})
        class Server(http.server.ThreadingHTTPServer):request_queue_size=128;daemon_threads=True
        self.srv=Server(('127.0.0.1',0),H);self.base=f'http://127.0.0.1:{self.srv.server_port}'
        threading.Thread(target=self.srv.serve_forever,daemon=True).start();self.fn_port=free_port();fake=free_port()
        self.fn=subprocess.Popen(['bun',str(ROOT/'tests/tutor_fn_shim.ts')],env={**os.environ,'FN_PORT':str(self.fn_port),'FAKE_PORT':str(fake),'SB_URL':self.base},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:request(f'http://127.0.0.1:{self.fn_port}')
            except urllib.error.HTTPError:break
            except (OSError,urllib.error.URLError):
                if self.fn.poll() is not None:raise RuntimeError('Bun model stub failed to start')
                time.sleep(.05)
        else:raise RuntimeError('Bun model stub timeout')
        return self.base,accounts
    def close(self):
        if self.fn:self.fn.terminate();self.fn.wait(timeout=10)
        if self.srv:self.srv.shutdown();self.srv.server_close()
        self.sql('drop database if exists '+self.db+' with (force)','postgres')

async def run(base,accounts,duration):
    marker=await asyncio.to_thread(request,base+'/__vektor_load_test__')
    if marker.get('test') is not True or marker.get('model')!='stub' or not str(marker.get('database','')).startswith(('vk_load_','vk_test_')):raise ValueError('Refusing a target without an explicit test database and stub-model marker')
    if len(accounts)!=100:raise ValueError('Exactly 100 demo accounts are required')
    timings={'login':[],'sync':[],'ai':[]};errors=[];started=time.perf_counter();key=marker['anon_key']
    async def call(kind,endpoint,body):
        at=time.perf_counter()
        try:
            out=await asyncio.to_thread(request,base+endpoint,body,{'apikey':key,'Authorization':'Bearer '+key,'Origin':base})
            if isinstance(out,dict) and out.get('error'):raise ValueError('rpc_error')
            return out
        except Exception as e:errors.append({'operation':kind,'error':type(e).__name__});return None
        finally:timings[kind].append(time.perf_counter()-at)
    async def student(i,account):
        await asyncio.sleep(i*duration*.7/100)
        result=await call('login','/rest/v1/rpc/vektor_login',{'p_login':account['login'],'p_password':account['password'],'p_device':'load-'+str(i)})
        if not result or not result.get('token'):return
        token=result['token']
        for n in range(10):
            a=n+1;b=i%9+1;answer=a+b
            event={'id':'load-'+secrets.token_hex(12),'type':'attempt','data':{'topic':'concept','question':f'{a}+{b}','answer':str(answer),'ok':answer==a+b,'sec':1},'ts':int(time.time()*1000)}
            await call('sync','/rest/v1/rpc/vektor_sync',{'p_token':token,'p_state':{'answers':n+1,'meta':{}},'p_events':[event]})
            if i<20 and n==4:await call('ai','/functions/v1/tutor',{'token':token,'mode':'lesson','topic':'concept','history':[{'role':'user','content':'Объясни сложение 1/2 и 1/3'}]})
            await asyncio.sleep(duration*.2/10)
    await asyncio.gather(*(student(i,a) for i,a in enumerate(accounts)))
    report={'test_only':True,'model':'stub','students':100,'tasks_per_student':10,'duration_target_seconds':duration,'elapsed_seconds':time.perf_counter()-started,
      'operations':{k:summary(v) for k,v in timings.items()},'errors':errors,'error_count':len(errors),'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    report['passed']=not errors and report['elapsed_seconds']<=duration and len(timings['login'])==100 and len(timings['sync'])==1000 and len(timings['ai'])==20 and all(percentile(timings[k])<1 for k in ('login','sync'))
    if not report['passed']:report['diagnostics']='Проверьте p95 по RPC login/sync. Логин использует PK/unique индексы login и token_hash; синхронизация — PK event_id и vk_events(student_id,ts_server). Не добавляйте индекс без EXPLAIN. Локальный мост включает запуск psql и не заменяет замер PostgREST на целевом хостинге.'
    return report

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--local',action='store_true');parser.add_argument('--base');parser.add_argument('--accounts-file',type=pathlib.Path);parser.add_argument('--duration',type=float,default=120);parser.add_argument('--report',type=pathlib.Path)
    args=parser.parse_args()
    if args.duration<=0:parser.error('duration must be positive')
    stand=None
    try:
        if args.local:stand=LocalStand();base,accounts=stand.start()
        else:
            if not args.base or not args.accounts_file:parser.error('Use --local or --base and --accounts-file')
            base=args.base.rstrip('/');accounts=json.loads(args.accounts_file.read_text(encoding='utf-8'))
        async def execute():
            asyncio.get_running_loop().set_default_executor(concurrent.futures.ThreadPoolExecutor(max_workers=100));return await run(base,accounts,args.duration)
        report=asyncio.run(execute());text=json.dumps(report,ensure_ascii=False,indent=2)
        if args.report:args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(text,encoding='utf-8')
        print(text);return 0 if report['passed'] else 1
    finally:
        if stand:stand.close()
if __name__=='__main__':raise SystemExit(main())
