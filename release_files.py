"""Explicit public source and report allowlist."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PUBLISH_FILES=['.gitignore', '.github/workflows/verify.yml', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'package-lock.json', 'provenance.json', 'run_checks.py', 'prepare_site.py', 'release_files.py', 'release_validation.json', 'v2.0/model.json', 'v2.0/default_results.json', 'v2.0/default_settings.json', 'v2.0/build.py', 'v2.0/verify.js', 'v2.0/test_browser.js', 'v2.0/audit_cases.js', 'v2.0/audit_independent.py', 'v2.0/source/engine.js', 'v2.0/source/app.js', 'v2.0/source/template.html', 'v2.0/source/style.css', 'v2.0/verification/engine_report.json', 'v2.0/verification/independent_audit.json', 'v2.0/verification/browser_report.json', 'v2.0/mu_valuation_v2_0.html', 'comparison/README.md', 'comparison/build.py', 'comparison/verify.py', 'comparison/test_browser.js', 'comparison/memory_valuation_comparison.html', 'comparison/results.json', 'comparison/inputs/mu.json', 'comparison/inputs/skhy.json', 'comparison/inputs/sndk.json', 'comparison/source/analyze.js', 'comparison/source/engine.js', 'comparison/source/app.js', 'comparison/source/template.html', 'comparison/source/style.css', 'comparison/reference/sndk_valuation_v1_5.js', 'comparison/verification/independent_audit.json', 'comparison/verification/browser_report.json']
def publishing_files():
 files=[ROOT/n for n in sorted(PUBLISH_FILES)]
 for p in files:assert p.is_file() and not p.is_symlink(),str(p)
 return files
