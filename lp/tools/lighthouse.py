"""Google Lighthouse (the engine behind PageSpeed Insights) on the built site, phone and desktop, every page.
Run after the build: python3 tools/lighthouse.py [page ...]        (default: every page in build.PAGES)
Needs: npm i -g lighthouse, and Chromium (Playwright's works: set CHROME_PATH, or it finds /opt/pw-browsers).
Serves dist/ with gzip and caching (tools/perf/serve.py) so the numbers match normal hosting, and saves each report in .lighthouse/.
Scores to hold: performance 80+ on phones and 95+ on desktop, accessibility 95+, best practices 95+. SEO stays low on the
prototype because it is set to noindex; that's on purpose. Run PageSpeed Insights on staging and live too (real network, real data)."""
import json,os,pathlib,subprocess,sys,time,glob
R=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(R/'tools'))
import build
HOLD={'performance':(80,95),'accessibility':(95,95),'best-practices':(95,95)}
def chrome():
    if os.environ.get('CHROME_PATH'):return os.environ['CHROME_PATH']
    c=sorted(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome'))
    return c[-1] if c else None
def main(pages):
    out=R/'.lighthouse';out.mkdir(exist_ok=True);port='8833'
    srv=subprocess.Popen([sys.executable,str(R/'tools/perf/serve.py'),port,str(R/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(1.5);env=dict(os.environ);c=chrome()
    if c:env['CHROME_PATH']=c
    low=0
    try:
        print(f"{'page':12} {'device':8} perf a11y best seo   LCP     TBT     weight")
        for pg in pages:
            for dev in ('phone','desktop'):
                f=out/f'{pg}-{dev}.json'
                cmd=['lighthouse',f'http://localhost:{port}/{pg}.html','--quiet','--chrome-flags=--headless=new --no-sandbox','--output=json',f'--output-path={f}',
                     '--only-categories=performance,accessibility,best-practices,seo']+(['--preset=desktop'] if dev=='desktop' else [])
                subprocess.run(cmd,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=180)
                j=json.loads(f.read_text());c_=j['categories'];a=j['audits']
                s={k:round((v['score'] or 0)*100) for k,v in c_.items()}
                flag=[k for k,(ph,dk) in HOLD.items() if s.get(k,100)<(ph if dev=='phone' else dk)];low+=len(flag)
                print(f"{pg:12} {dev:8} {s['performance']:4} {s['accessibility']:4} {s['best-practices']:4} {s['seo']:3}   {a['largest-contentful-paint'].get('displayValue',''):7} {a['total-blocking-time'].get('displayValue',''):7} {a['total-byte-weight'].get('displayValue','').replace('Total size was ','')}"+('   LOW: '+', '.join(flag) if flag else ''))
                for k in ('accessibility','best-practices'):
                    for r in c_[k]['auditRefs']:
                        if r.get('weight',0)>0 and a[r['id']]['score'] not in (None,1):print(f"{'':22}{k}: {a[r['id']]['title']}")
    finally:srv.terminate()
    print('lighthouse:', 'all scores held' if not low else f'{low} scores below the line (see above); reports in .lighthouse/')
if __name__=='__main__':main(sys.argv[1:] or list(build.PAGES))
