/**
 * ROMANIA REAL ESTATE — COST ASSUMPTIONS
 * Sources:
 *  - Notary fees: Romanian Notary Union (UNNPR) official fee schedule
 *    https://www.notariat.ro/
 *  - Transfer tax (stamp duty): Romanian Fiscal Code Art. 111
 *    https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.pdf
 *  - Agent commission: APAIR (Romanian Real Estate Agents Association)
 *    https://www.apair.ro/ — typically 2–3% per side
 *  - Renovation cost/m²: INS (National Institute of Statistics) construction price index
 *    https://insse.ro/cms/ro/content/indicii-preturilor-lucrarilor-de-constructii
 *  - Capital gains tax: Romanian Fiscal Code — 10% flat on profit for individuals
 *    https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.pdf
 *  - Mortgage rates: BNR (National Bank of Romania) monthly bulletin
 *    https://www.bnr.ro/Rapoarte-periodice-2504.aspx
 *  - Property market data: imobiliare.ro market reports 2025–2026
 *    https://www.imobiliare.ro/stiri/
 */

window.ASSUMPTIONS = {
  version: "2026-Q1",
  sources: [
    { name: "Romanian Notary Union (UNNPR)", url: "https://www.notariat.ro/" },
    { name: "Romanian Fiscal Code (ANAF)", url: "https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.pdf" },
    { name: "APAIR – Real Estate Agents Association", url: "https://www.apair.ro/" },
    { name: "INS – Construction Price Index", url: "https://insse.ro/cms/ro/content/indicii-preturilor-lucrarilor-de-constructii" },
    { name: "BNR – National Bank of Romania", url: "https://www.bnr.ro/Rapoarte-periodice-2504.aspx" },
    { name: "imobiliare.ro Market Report 2026", url: "https://www.imobiliare.ro/stiri/" }
  ],

  // ACQUISITION COSTS
  notaryFeePct: 0.55,          // ~0.5–0.6% of purchase price (UNNPR scale for €50k–150k)
  transferTaxPct: 0,           // 0% for non-EU nationals via SRL (company); 3% for individuals on value above 450,000 RON
  transferTaxIndividualPct: 3, // 3% on amount exceeding ~450,000 RON (≈€90,000) for individuals
  transferTaxThreshold: 90000, // EUR threshold above which 3% applies (approx €90k)
  buyerAgentPct: 2.5,          // 2–3% buyer side (APAIR standard)
  landRegistryFee: 800,        // fixed ~€800 (OCPI cadastre registration)

  // RENOVATION COSTS (per m² — INS 2025 index)
  renoLow: 300,      // basic refresh (paint, floors, minor works) €/m²
  renoMid: 500,      // standard full renovation €/m²
  renoHigh: 800,     // premium finish €/m²

  // HOLDING COSTS (per month while owning)
  utilityMonthly: 80,          // electricity, water, gas (vacant)
  propertyTaxMonthly: 20,      // approx €20/month (0.1% annual on €240k)
  buildingMaintMonthly: 30,    // condo/building fund (întreținere)

  // SALE COSTS
  sellerAgentPct: 2.5,         // 2–3% seller side (APAIR)
  sellerNotaryPct: 0.15,       // seller pays partial notary on deed (~0.15%)

  // CAPITAL GAINS TAX (Romanian Fiscal Code Art. 111)
  // For individuals: 10% flat on net profit (income minus acquisition cost)
  // For SRL (company): 16% corporate tax on profit
  cgtIndividualPct: 10,
  cgtCompanyPct: 16,

  // FINANCING
  mortgageRateDefault: 6.5,    // BNR + bank margin, Q1 2026 average for non-residents
  ltvMaxForeigner: 70,         // max LTV for non-EU residents at Romanian banks
  ltvMaxResident: 80,
  bankSetupFeePct: 1.0,        // bank arrangement/setup fee
  mortgageInsurancePct: 0.2,   // annual insurance on outstanding loan

  // PARTNERSHIP
  mgmtFeeDefault: 5,           // 5% of gross profit — standard for active partner

  // MARKET DATA (Bucharest 2026 — imobiliare.ro)
  avgPricePerSqmBucharest: 2150,   // €/m² average asking price
  avgRentalYieldBucharest: 6.2,    // % gross rental yield
  avgDaysOnMarket: 55,             // days to sell renovated property
  avgPriceGrowthAnnual: 8.0,       // % YoY price growth (2025 actuals, 2026 forecast)
};
