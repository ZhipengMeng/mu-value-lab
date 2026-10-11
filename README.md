# MU Value Lab v2.0

Micron's standalone, company-specific valuation model. **Financial snapshot: October 9, 2026.** Published October 11, 2026. Financial inputs and the calculation engine are preserved from the audited local v2.0 model.

**[Open the MU model](https://zhipengmeng.github.io/mu-value-lab/)** · [Download the standalone model](https://zhipengmeng.github.io/mu-value-lab/mu_valuation_v2_0.html) · [Compare SNDK, MU and SKHY](https://zhipengmeng.github.io/mu-value-lab/comparison/)

## Separate models, linked comparison

- [SNDK model](https://zhipengmeng.github.io/sndk-value-lab/) · [SNDK source](https://github.com/ZhipengMeng/sndk-value-lab)
- [MU model](https://zhipengmeng.github.io/mu-value-lab/) · [MU source](https://github.com/ZhipengMeng/mu-value-lab)
- [SKHY model](https://zhipengmeng.github.io/skhy-value-lab/) · [SKHY source](https://github.com/ZhipengMeng/skhy-value-lab)

The comparison lives in `comparison/`, with its own HTML, saved inputs, calculations and verification. It retains separate business assumptions while applying common valuation controls and calendar-2027 EPS proxies. It does not combine the three into a portfolio model. See [comparison documentation](comparison/README.md).

## Company-specific assumptions

Micron uses its Cloud Memory, Core Data Center, Mobile/Client, and Automotive/Embedded business units. HBM is included in Cloud Memory, and NAND/SSDs in Core Data Center. The model has separate shipment, price/mix and cost paths with explicit manufacturing capex, depreciation and economic SBC.

HBM economics are not separately disclosed. Annual capex, subsidy timing, SBC and future costs are assumptions; FY2027/28 revenue is consensus anchored. The FY2027 earnings reconciliation retains differences between model EPS, analyst estimates and guided diluted shares.

Reported facts, company guidance, external estimates, assumptions and calculated results are labeled separately. The full [model input and source register](v2.0/model.json) includes dates and source locators. The [unrounded default results](v2.0/default_results.json) show the earnings and cash bridges.

## Conditional model values

| Scenario | USD per quoted share |
|---|---:|
| Downside | $449.85 |
| Central | $1,418.63 |
| Upside | $3,007.40 |

Reference close: $1,029.00. The central case uses 12% required return, 2% perpetual growth, 25% incremental after-tax return on capital and 50% terminal economic operating margin. Eight explicit years are followed by four normalization years. These are assumptions-based present values, not probabilities, confidence intervals, future market prices or downside floors. Annual company P/Es have named fiscal/calendar periods; the comparison separately calendarizes earnings.

## Use and reproducibility

Select a scenario, edit company drivers or valuation assumptions, and save or load a company-specific JSON session. Imports reject other companies and altered reported facts. Invalid inputs clear results. Reset restores the original assumptions. Downloads work offline; there are no live-price requests, analytics or accounts.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
python3 run_checks.py --browser --package
python3 prepare_site.py
```

Node.js 18+ and Python 3.9+ are required. Playwright is pinned; no new runtime dependency is embedded in the app. Checks cover financial identities, independent Python calculations from input assumptions, desktop/mobile controls, invalid inputs, save/load isolation, and tested HTML identity. The MU release also verifies the comparison's calendar EPS, common sensitivity grid and interactive controls.

`provenance.json` records original model/engine hashes and baseline values. `MANIFEST.json` records the public-file checksums. `release_files.py` is the explicit publication allowlist; `dist/` contains a local verified ZIP. Original local versions and raw source documents remain unchanged. Full source documents, personal information, temporary outputs, screenshots and browser exports are excluded from publication.

GitHub Actions tests each push and pull request with read-only source permissions. Only successful `main` builds in this repository publish through a separate Pages job. The site contains only the tested standalone HTML files. Software checks establish implementation consistency, not financial forecast accuracy; Firefox, Safari and physical mobile devices are not covered.

## Rights

Copyright is reserved; no open-source license is granted. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Company disclosures and selected estimates are attributed inputs, not a redistributed data service. The model is independent of the company and is not individualized investment advice. GitHub hosts the site under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
