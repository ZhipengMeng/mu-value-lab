from pathlib import Path
import json,subprocess
P=Path(__file__).resolve().parent
subprocess.run(['node','source/analyze.js'],cwd=P,check=True,stdout=(P/'verification/calculation_log.json').open('w'))
models={c:json.loads((P/f'inputs/{c.lower()}.json').read_text()) for c in ['SNDK','MU','SKHY']}
report=json.loads((P/'results.json').read_text());report.pop('results')
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SNDK · MU · SKHY comparison</title><style>'+((P/'source/style.css').read_text()+(P.parent/'market/quotes.css').read_text())+'</style></head><body><main>'+(P/'source/template.html').read_text()+'</main>'
for s in ['const MODELS='+json.dumps(models)+';const REPORT='+json.dumps(report)+';',(P/'source/engine.js').read_text(),(P.parent/'market/quotes.js').read_text(),(P/'source/app.js').read_text()]:html+='<script>'+s.replace('</script','<\\/script')+'</script>'
(P/'memory_valuation_comparison.html').write_text(html+'</body></html>')
print('Built consistent comparison HTML and results')
