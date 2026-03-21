# FlipCalc Romania 🇷🇴

**Fix & Flip Investment Simulator for the Bucharest Real Estate Market**

A free, open-source web app that helps investors compare three financing strategies side-by-side:

| Scenario | Description |
|---|---|
| 🟢 **100% Self** | Full equity — no loans, no partners |
| 🟣 **Partnership** | Split capital & profit with a business partner |
| 🔵 **With Loan** | Leverage a Romanian mortgage (BNR rates) |

---

## Features

- **3-way side-by-side comparison** with realistic Romanian cost items
- **Realistic cost model**: notary fees, agent commissions (APAIR), land registry, holding costs, capital gains tax
- **Save & name scenarios** (stored in browser localStorage)
- **Multi-scenario comparison** on the Compare page (4 chart metrics)
- **Visual charts**: ROI bar, Capital vs Profit, Cost Waterfall
- **3 languages**: English (default), Romanian, Hebrew (RTL)
- **Official data sources**: UNNPR, ANAF Fiscal Code, APAIR, INS, BNR, imobiliare.ro

---

## Live Demo

👉 **[https://YOUR-USERNAME.github.io/flipcalc-romania](https://YOUR-USERNAME.github.io/flipcalc-romania)**

---

## Deploy to GitHub Pages (5 minutes)

### Option A — Fork & Enable Pages

1. **Fork** this repository
2. Go to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. Push any commit to `main` — the workflow auto-deploys

### Option B — New Repo

```bash
git clone https://github.com/YOUR-USERNAME/flipcalc-romania.git
cd flipcalc-romania
# make changes
git add .
git commit -m "deploy"
git push origin main
```

Then enable Pages under **Settings → Pages → Source: GitHub Actions**.

### Option C — Netlify Drop (instant, no account)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the entire project folder
3. Done — you get a live URL immediately

---

## File Structure

```
flipcalc-romania/
├── index.html              # Main app shell
├── css/
│   └── style.css           # All styles
├── js/
│   ├── app.js              # UI logic, state management
│   ├── calculator.js       # Calculation engine
│   ├── charts.js           # Chart.js wrappers
│   ├── storage.js          # localStorage scenario persistence
│   └── translations.js     # EN / RO / HE strings
├── data/
│   └── assumptions.js      # All cost assumptions + sources
└── .github/
    └── workflows/
        └── deploy.yml      # Auto-deploy to GitHub Pages
```

---

## Data Sources

| Source | What it covers |
|---|---|
| [Romanian Notary Union (UNNPR)](https://www.notariat.ro/) | Notary fee schedule |
| [Romanian Fiscal Code (ANAF)](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.pdf) | Transfer tax, CGT (Art. 111) |
| [APAIR](https://www.apair.ro/) | Agent commission standards |
| [INS – Construction Price Index](https://insse.ro/cms/ro/content/indicii-preturilor-lucrarilor-de-constructii) | Renovation costs/m² |
| [BNR – National Bank of Romania](https://www.bnr.ro/Rapoarte-periodice-2504.aspx) | Mortgage interest rates |
| [imobiliare.ro Market Report 2026](https://www.imobiliare.ro/stiri/) | Market prices, yields, days on market |

---

## Disclaimer

> ⚠️ **For planning purposes only.** This tool does not constitute financial, legal, or investment advice. Always consult a licensed investment advisor, accountant, and local attorney before making any investment decision.

---

## License

MIT — free to use, modify, and share.
