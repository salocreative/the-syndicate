# Static server that behaves like normal hosting: gzip for text files and an hour of browser caching.
# Run: python3 tools/perf/serve.py <port> <folder>
import http.server,gzip,os,sys
TEXT=('.html','.css','.js','.svg','.json')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def end_headers(self):
        self.send_header('Cache-Control','max-age=3600');super().end_headers()
    def do_GET(self):
        p=self.translate_path(self.path.split('?')[0])
        if os.path.isfile(p) and p.endswith(TEXT) and 'gzip' in self.headers.get('Accept-Encoding',''):
            data=gzip.compress(open(p,'rb').read(),6)
            self.send_response(200);self.send_header('Content-Type',self.guess_type(p));self.send_header('Content-Encoding','gzip');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        return super().do_GET()
os.chdir(sys.argv[2]);http.server.ThreadingHTTPServer(('',int(sys.argv[1])),H).serve_forever()
