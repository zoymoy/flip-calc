# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlipCalc Romania is a **pure static web app** — no build system, no package manager, no dependencies to install. It runs directly in a browser by opening `index.html`. There is no compilation step.

## Running the App

Open `index.html` directly in a browser, or serve locally:

```bash
# Python
python3 -m http.server 8080

# Node (if available)
npx serve .
```

## Deployment

Push to `main` — GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to GitHub Pages. The entire repo root is served as the static site.

## Architecture

All JS modules are global `window` objects loaded via `<script>` tags in `index.html`. **Script loading order matters:**

```
data/assumptions.js   → window.ASSUMPTIONS  (cost constants, data sources)
js/translations.js    → window.TRANSLATIONS  (EN / RO / HE strings)
js/calculator.js      → window.Calculator   (pure calculation engine)
js/storage.js         → window.Storage      (localStorage CRUD)
js/charts.js          → window.Charts       (Chart.js wrappers)
js/app.js             → window.App          (UI, state, event binding)
```

### Key Data Flow

1. User changes a slider/select → `app.js` updates the `params` object
2. `recalc()` calls `window.Calculator.calcAll(params)` → returns `{ equity, partnership, loan }`
3. Results are passed to `renderResults()`, `renderSummaries()`, and `renderCharts()`
4. Charts rendered via Chart.js through `window.Charts`

### The Three Scenarios

- **Equity** (`calcEquity`): 100% own capital, no leverage
- **Partnership** (`calcPartnership`): splits capital/profit with a partner; adds management fee and profit share logic
- **Loan** (`calcLoan`): Romanian mortgage with LTV, interest calculation over project duration

All three share acquisition, holding, and sale cost calculations from `calculator.js`.

### Internationalization

- Language strings live in `js/translations.js` as `window.TRANSLATIONS.en / .ro / .he`
- Hebrew (`he`) is RTL — toggled via `document.body.classList.toggle('rtl', ...)`
- HTML elements use `data-i18n="key"` for text and `data-i18n-ph="key"` for placeholders
- Some translation values are **functions** (e.g., `summaryEquityExplain(r)`, `months(n)`) that generate dynamic strings

### Scenario Persistence

Scenarios are stored in `localStorage` under key `flipcalc_scenarios` as a JSON object keyed by name. `window.Storage` handles all CRUD. The Compare page re-runs `Calculator.calcAll()` on saved params to generate comparison charts.

### Cost Assumptions

All financial constants (notary fees, CGT rates, renovation costs, BNR rates) are centralized in `data/assumptions.js` as `window.ASSUMPTIONS`. When updating rates or adding new cost items, change them here only — `calculator.js` and `app.js` read from this object.
