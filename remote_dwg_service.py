#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, shutil, subprocess, tempfile, os, re, secrets

HOST=os.environ.get("HOST","0.0.0.0")
PORT=int(os.environ.get("PORT","8765"))
MAX_MB=int(os.environ.get("MAX_DWG_MB","100"))
API_TOKEN=os.environ.get("DWG_API_TOKEN","").strip()

def converter_info():
    here=Path(__file__).resolve().parent
    bundled=here/"vendor"/"libredwg"/"dwg2dxf"
    if bundled.exists():
        return {"available":True,"name":"Bundled LibreDWG","path":str(bundled)}
    exe=shutil.which("dwg2dxf")
    if exe:
        return {"available":True,"name":"System LibreDWG","path":exe}
    return {"available":False,"name":None,"path":None}

def run_libredwg(src,dst,exe):
    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        tmp=td/src.name
        shutil.copy2(src,tmp)
        env=os.environ.copy()
        libdir=Path(exe).resolve().parent
        env["LD_LIBRARY_PATH"]=str(libdir)+((":"+env["LD_LIBRARY_PATH"]) if env.get("LD_LIBRARY_PATH") else "")
        p=subprocess.run([exe,"--overwrite",str(tmp)],cwd=td,capture_output=True,text=True,env=env,timeout=120)
        cand=list(td.glob("*.dxf"))
        if p.returncode!=0 or not cand:
            raise RuntimeError((p.stderr or p.stdout or "LibreDWG conversion failed").strip())
        shutil.copy2(cand[0],dst)

def parse_multipart(body,content_type):
    m=re.search(r'boundary="?([^";]+)',content_type or "")
    if not m: raise ValueError("multipart boundary missing")
    boundary=("--"+m.group(1)).encode()
    for part in body.split(boundary):
        if b'Content-Disposition:' not in part: continue
        head,sep,data=part.partition(b"\r\n\r\n")
        if not sep: continue
        nm=re.search(br'name="file";\s*filename="([^"]*)"',head)
        if not nm: continue
        filename=nm.group(1).decode("utf-8","replace")
        data=data.rstrip(b"\r\n-")
        return filename,data
    raise ValueError("file field missing")

class Handler(BaseHTTPRequestHandler):
    server_version="FireExecutiveDWG/1.1"
    def cors(self):
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type, Authorization, X-API-Token")
    def json(self,code,obj):
        data=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(code); self.cors()
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(data)))
        self.end_headers(); self.wfile.write(data)
    def auth_ok(self):
        if not API_TOKEN: return True
        got=self.headers.get("X-API-Token","").strip()
        if not got:
            auth=self.headers.get("Authorization","")
            if auth.lower().startswith("bearer "):got=auth[7:].strip()
        return secrets.compare_digest(got,API_TOKEN)
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_GET(self):
        if self.path.rstrip("/") not in ("/health","/dwg/health"):
            return self.json(404,{"error":"not found"})
        c=converter_info()
        return self.json(200,{"ok":True,"converter_available":c["available"],"converter":c["name"],"max_mb":MAX_MB})
    def do_POST(self):
        if self.path.rstrip("/") not in ("/convert","/dwg/convert"):
            return self.json(404,{"error":"not found"})
        if not self.auth_ok():
            return self.json(401,{"error":"unauthorized"})
        c=converter_info()
        if not c["available"]:
            return self.json(503,{"error":"DWG converter unavailable"})
        length=int(self.headers.get("Content-Length","0"))
        if length<=0 or length>MAX_MB*1024*1024:
            return self.json(400,{"error":"invalid file size"})
        try:
            name,data=parse_multipart(self.rfile.read(length),self.headers.get("Content-Type",""))
        except Exception as e:
            return self.json(400,{"error":str(e)})
        name=Path(name).name
        if not name.lower().endswith(".dwg"):
            return self.json(400,{"error":"input must be .dwg"})
        if data[:6].decode("ascii","ignore")[:4]!="AC10":
            return self.json(400,{"error":"invalid DWG signature"})
        with tempfile.TemporaryDirectory() as td:
            td=Path(td);src=td/name;dst=td/(src.stem+".dxf");src.write_bytes(data)
            try: run_libredwg(src,dst,c["path"])
            except Exception as e: return self.json(500,{"error":str(e)})
            result=dst.read_bytes()
            self.send_response(200); self.cors()
            self.send_header("Content-Type","text/plain; charset=utf-8")
            self.send_header("Content-Disposition",f'attachment; filename="{dst.name}"')
            self.send_header("Content-Length",str(len(result)))
            self.end_headers(); self.wfile.write(result)
    def log_message(self,fmt,*args):
        print("%s - %s" % (self.address_string(),fmt%args))

if __name__=="__main__":
    print(f"Fire Executive DWG Service listening on {HOST}:{PORT}")
    print("Converter:",converter_info()["name"] or "NOT INSTALLED")
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
