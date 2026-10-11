"""Build, validate, and package this separate company model and optional comparison."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,sys,zipfile
from release_files import ROOT,publishing_files
p=argparse.ArgumentParser();p.add_argument('--browser',action='store_true');p.add_argument('--package',action='store_true');args=p.parse_args()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
provenance=json.loads((ROOT/'provenance.json').read_text())
assert sha(ROOT/'v2.0/model.json')==provenance['modelSha256'],'Input snapshot differs from version provenance'
assert sha(ROOT/'v2.0/source/engine.js')==provenance['engineSha256'],'Engine differs from version provenance'
commands=[[sys.executable,'v2.0/build.py'],['node','--check','v2.0/source/engine.js'],['node','--check','v2.0/source/app.js'],['node','v2.0/verify.js'],['node','v2.0/audit_cases.js'],[sys.executable,'v2.0/audit_independent.py']]
if (ROOT/'comparison').is_dir():commands += [[sys.executable,'comparison/build.py'],[sys.executable,'comparison/verify.py']]
if args.browser:
 commands += [['node','v2.0/test_browser.js']]
 if (ROOT/'comparison').is_dir():commands += [['node','comparison/test_browser.js']]
commands += [[sys.executable,'v2.0/build.py','--check']]
for cmd in commands:subprocess.run(cmd,cwd=ROOT,check=True)
company=provenance['company'];app=ROOT/'v2.0'/f'{company.lower()}_valuation_v2_0.html'
browser_path=ROOT/'v2.0/verification/browser_report.json';browser=json.loads(browser_path.read_text()) if browser_path.exists() else {}
matched=browser.get('htmlSha256')==sha(app)
if args.package:assert matched,'Current HTML must pass browser tests before packaging'
report={'company':company,'version':'2.0','status':'pass','appSha256':sha(app),'browserHtmlMatches':matched,'browserChecks':browser.get('checks') if matched else None,'engine':json.loads((ROOT/'v2.0/verification/engine_report.json').read_text()),'independent':json.loads((ROOT/'v2.0/verification/independent_audit.json').read_text())}
if (ROOT/'comparison').is_dir():
 c=ROOT/'comparison';cbpath=c/'verification/browser_report.json';cb=json.loads(cbpath.read_text()) if cbpath.exists() else {}
 cmatch=cb.get('htmlSha256')==sha(c/'memory_valuation_comparison.html')
 if args.package:assert cmatch,'Current comparison must pass browser tests before packaging'
 report['comparison']={'appSha256':sha(c/'memory_valuation_comparison.html'),'browserHtmlMatches':cmatch,'browserChecks':cb.get('checks') if cmatch else None,'independent':json.loads((c/'verification/independent_audit.json').read_text())}
(ROOT/'release_validation.json').write_text(json.dumps(report,indent=2)+'\n')
if args.package:
 files=publishing_files()
 patterns=['/'+r'Users/[^/\s]+/','/'+r'home/[^/\s]+/',r'gh'+r'[opusr]_[A-Za-z0-9]{30,}',r'github_'+r'pat_[A-Za-z0-9_]{30,}',r'-----BEGIN '+r'(?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
 for f in files:
  text=f.read_text();assert not any(re.search(x,text) for x in patterns),'Private-path or credential pattern: '+f.name
 manifest={'company':company,'version':'2.0','files':{f.relative_to(ROOT).as_posix():sha(f) for f in files}}
 (ROOT/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
 out=ROOT/'dist'/f'{company.lower()}_value_lab_v2_0.zip';out.parent.mkdir(exist_ok=True)
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for f in [*files,ROOT/'MANIFEST.json']:z.write(f,f.relative_to(ROOT).as_posix())
 with zipfile.ZipFile(out) as z:
  assert z.testzip() is None
  for name,digest in manifest['files'].items():assert hashlib.sha256(z.read(name)).hexdigest()==digest,name
 print('PASS manifest, publication allowlist and ZIP:',len(files)+1,'files')
print('PASS',company,'release checks')
