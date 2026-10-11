# SNDK, MU and SKHY comparison

[Open the comparison](https://zhipengmeng.github.io/mu-value-lab/comparison/). Snapshot: October 9, 2026. Each company retains its own operating drivers, cash requirements, share accounting and currency assumptions. Separate model links appear at the top and in the methods section.

Common calendar-2027 EPS proxies month-weight annual MU and SNDK estimates; SKHY uses CY2027 EPS converted to USD per ADS. This assumes uniform earnings within fiscal years. These proxies are not reported calendar consensus or verified next-twelve-month forecasts. Common terminal controls do not establish identical business risk.

The saved `inputs/` are frozen snapshots from the separate v2.0 models. `source/analyze.js` rebuilds `results.json`, including the 240-case common sensitivity grid, explicit cash stresses, SKHY FX/return sensitivities and the historical SNDK terminal-margin audit. `reference/sndk_valuation_v1_5.js` preserves the author's public legacy engine for that audit. `build.py` produces the self-contained offline comparison.

`verify.py` independently recalculates all company scenarios, calendar earnings and the common grid in Python. `test_browser.js` checks the actual page at desktop/mobile widths. Reports describe software validation, not probability estimates or verified future outcomes. The standalone company's financial engine and input snapshots are preserved; linked models are not fetched at runtime. A separate shared price feed reprices P/E, upside and market-dependent comparisons; the saved business inputs remain frozen. Future fundamental model updates require an explicit refresh of these snapshots. See [automatic price behavior](../market/README.md).

Run checks from the repository root as documented in the main README. Private holdings, allocations, tax information and portfolio recommendations are not part of this publication.
