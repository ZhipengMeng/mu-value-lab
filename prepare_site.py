"""Stage only tested standalone HTML for GitHub Pages."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parent
c=json.loads((ROOT/'v2.0/model.json').read_text());name=c['company'].lower()+'_valuation_v2_0.html'
html=(ROOT/'v2.0'/name).read_bytes();r=json.loads((ROOT/'release_validation.json').read_text())
assert r['browserHtmlMatches'] and r['appSha256']==hashlib.sha256(html).hexdigest()
outputs={'index.html':html,name:html,'.nojekyll':b''}
if (ROOT/'comparison').is_dir():
 data=(ROOT/'comparison/memory_valuation_comparison.html').read_bytes();c=r['comparison']
 assert c['browserHtmlMatches'] and c['appSha256']==hashlib.sha256(data).hexdigest()
 outputs['comparison/index.html']=data;outputs['comparison/memory_valuation_comparison.html']=data
out=ROOT/'_site';out.mkdir(exist_ok=True);assert not out.is_symlink()
assert {p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()}<=set(outputs),'Unexpected website output'
for name,data in outputs.items():
 p=out/name;p.parent.mkdir(parents=True,exist_ok=True);assert not p.is_symlink();assert not p.parent.is_symlink();p.write_bytes(data)
print(json.dumps({'websiteFiles':sorted(outputs),'testedFilesOnly':True}))
