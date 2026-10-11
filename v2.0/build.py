"""Build one standalone, offline, company-specific model from local inputs."""
from pathlib import Path
import argparse,json,hashlib,subprocess
p=argparse.ArgumentParser();p.add_argument("--check",action="store_true");args=p.parse_args()
root=Path(__file__).resolve().parent
c=json.loads((root/'model.json').read_text())
html=(root/'source/template.html').read_text()
for key,val in {'COMPANY':c['company'],'NAME':c['name'],'STYLE':(root/'source/style.css').read_text(),'MODEL':json.dumps(c,ensure_ascii=False).replace('</','<\\/'),'ENGINE':(root/'source/engine.js').read_text(),'APP':(root/'source/app.js').read_text()}.items():html=html.replace('__'+key+'__',val)
name=c['company'].lower()+'_valuation_v2_0.html'
if args.check:
 assert (root/name).read_text()==html,"Generated HTML is stale"
else:
 (root/name).write_text(html)
script="const fs=require('fs'),e=require('./source/engine.js'),c=require('./model.json');fs.writeFileSync('default_results.json',JSON.stringify(e.all(c),null,2));fs.writeFileSync('default_settings.json',JSON.stringify(e.session(c,'central'),null,2));"
if not args.check:subprocess.run(['node','-e',script],cwd=root,check=True)
print(name,hashlib.sha256((root/name).read_bytes()).hexdigest())
