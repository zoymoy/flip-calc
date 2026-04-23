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
 *  - Capital gains tax: Romanian Fiscal Code Art. 111 — 3% (≤3 yr) or 1% (>3 yr) for individuals
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
    { name: "imobiliare.ro Market Report 2026", url: "https://www.imobiliare.ro/stiri/" },
    { name: "MDLPA – Risc Seismic România", url: "https://www.mdlpa.ro/" },
    { name: "Harta Blocuri – Clase Risc Seismic", url: "https://www.hartablocuri.ro/" },
  ],

  // ACQUISITION COSTS
  notaryFeePct: 0.55,          // ~0.5–0.6% of purchase price (UNNPR scale for €50k–150k)
  transferTaxPct: 0,           // 0% for non-EU nationals via SRL (company); 3% for individuals on value above 450,000 RON
  transferTaxIndividualPct: 3, // 3% on amount exceeding ~450,000 RON (≈€90,000) for individuals
  transferTaxThreshold: 90000, // EUR threshold above which 3% applies (approx €90k)
  buyerAgentPct: 2.5,          // 2–3% buyer side (APAIR standard)
  landRegistryFee: 800,        // fixed ~€800 (OCPI cadastre registration)

  // RENOVATION COSTS (per m² — INS 2025 index)
  renoLow:     300,  // basic refresh (paint, floors, minor works) €/m²
  renoMidLow:  400,  // mid-basic €/m²
  renoMid:     500,  // standard full renovation €/m²
  renoMidHigh: 600,  // mid-premium €/m²
  renoHigh:    800,  // premium finish €/m²

  // HOLDING COSTS (per month while owning)
  utilityMonthly: 80,          // electricity, water, gas (vacant)
  propertyTaxMonthly: 20,      // approx €20/month (0.1% annual on €240k)
  buildingMaintMonthly: 30,    // condo/building fund (întreținere)
  propertyInsuranceMonthly: 20, // property insurance (PAD + facultative)

  // SALE COSTS
  sellerAgentPct: 2.5,         // 2–3% seller side (APAIR)
  sellerNotaryPct: 0.15,       // seller pays partial notary on deed (~0.15%)

  // CAPITAL GAINS TAX (Romanian Fiscal Code Art. 111)
  // Individuals: 3% if held ≤ 3 years, 1% if held > 3 years
  cgtIndividualShortPct: 3,       // ≤ 36 months
  cgtIndividualLongPct:  1,       // > 36 months
  cgtDurationThresholdMonths: 36,

  // FINANCING
  mortgageRateDefault: 6.5,    // BNR + bank margin, Q1 2026 average for non-residents
  ltvMaxForeigner: 70,         // max LTV for non-EU residents at Romanian banks
  ltvMaxResident: 80,
  bankSetupFeePct: 1.0,        // bank arrangement/setup fee
  mortgageInsurancePct: 0.2,   // annual insurance on outstanding loan

  // PARTNERSHIP — JV Term Sheet (Bachrach/Costi, April 2026)
  jvCapitalSplitPassivePct: 75,          // Party A (Yoav) funds 75% of non-reno costs
  jvProfitSplitStandardActivePct: 35,    // Party B (Costi) gets 35% — Standard Deal (≥ 4 months)
  jvProfitSplitFastFlipActivePct: 40,    // Party B (Costi) gets 40% — Fast Flip (< 4 months)
  jvFastFlipThresholdMonths: 4,          // < 4 months proxy for < 120 calendar days

  // MARKET DATA (Bucharest 2026 — imobiliare.ro)
  avgPricePerSqmBucharest: 2150,   // €/m² average asking price
  avgRentalYieldBucharest: 6.2,    // % gross rental yield
  avgDaysOnMarket: 55,             // days to sell renovated property
  avgPriceGrowthAnnual: 8.0,       // % YoY price growth (2025 actuals, 2026 forecast)

  // BUILDING ERA DATA (Romania — seismic risk & pricing)
  // Sources: MDLPA risc seismic, Harta Blocuri, Investropa 2026, Cloud9Residence reno costs
  // priceDiscountPct: vs. Bucharest average (negative = discount, positive = premium)
  // renoHiddenCost: additional hidden renovation costs on top of standard budget (€)
  // riskBonus: added to calculated 1-10 risk score (can be negative for new builds)
  BUILDING_ERAS: {
    'pre1940': {
      seismicClass: 'Rs I',
      priceDiscountPct: -17.5,  // -15% to -20% vs. avg — no seismic design, heritage issues
      renoHiddenCost: 30000,    // €20k–€40k — rewiring, plumbing overhaul, structural surprises
      mortgageEligible: false,  // Romanian banks reject Rs I as collateral
      insurable: false,         // Excluded from mandatory PAD insurance
      riskBonus: 3,
    },
    '1940': {
      seismicClass: 'Rs I',
      priceDiscountPct: -13.5,  // -12% to -15%
      renoHiddenCost: 27500,    // €20k–€35k
      mortgageEligible: false,
      insurable: false,
      riskBonus: 3,
    },
    '1963': {
      seismicClass: 'Rs II–III',
      priceDiscountPct: -9,     // -8% to -10%
      renoHiddenCost: 15000,    // €10k–€20k
      mortgageEligible: true,   // possible but lender-dependent
      insurable: true,
      riskBonus: 2,
    },
    '1978': {
      seismicClass: 'Rs II–III',
      priceDiscountPct: -9,     // -8% to -10% — post-1977 earthquake code, but austerity quality
      renoHiddenCost: 10000,    // €5k–€15k
      mortgageEligible: true,
      insurable: true,
      riskBonus: 1,
    },
    '1990': {
      seismicClass: 'Rs III',
      priceDiscountPct: -4,     // -3% to -5%
      renoHiddenCost: 2500,     // €0–€5k
      mortgageEligible: true,
      insurable: true,
      riskBonus: 0,
    },
    '2000': {
      seismicClass: 'Rs IV',
      priceDiscountPct: 13.5,   // +12% to +15% premium vs. avg
      renoHiddenCost: 0,
      mortgageEligible: true,
      insurable: true,
      riskBonus: -1,            // modern build reduces overall deal risk slightly
    },
  },
};

// Frozen copy of factory defaults — used by Reset-to-Defaults functionality.
// Only includes the scalar numeric values that are editable on the Assumptions page.
window.ASSUMPTION_DEFAULTS = Object.freeze({
  notaryFeePct:              window.ASSUMPTIONS.notaryFeePct,
  transferTaxPct:            window.ASSUMPTIONS.transferTaxPct,
  transferTaxIndividualPct:  window.ASSUMPTIONS.transferTaxIndividualPct,
  transferTaxThreshold:      window.ASSUMPTIONS.transferTaxThreshold,
  buyerAgentPct:             window.ASSUMPTIONS.buyerAgentPct,
  landRegistryFee:           window.ASSUMPTIONS.landRegistryFee,
  renoLow:                   window.ASSUMPTIONS.renoLow,
  renoMidLow:                window.ASSUMPTIONS.renoMidLow,
  renoMid:                   window.ASSUMPTIONS.renoMid,
  renoMidHigh:               window.ASSUMPTIONS.renoMidHigh,
  renoHigh:                  window.ASSUMPTIONS.renoHigh,
  utilityMonthly:            window.ASSUMPTIONS.utilityMonthly,
  propertyTaxMonthly:        window.ASSUMPTIONS.propertyTaxMonthly,
  buildingMaintMonthly:      window.ASSUMPTIONS.buildingMaintMonthly,
  propertyInsuranceMonthly:  window.ASSUMPTIONS.propertyInsuranceMonthly,
  sellerAgentPct:            window.ASSUMPTIONS.sellerAgentPct,
  sellerNotaryPct:           window.ASSUMPTIONS.sellerNotaryPct,
  cgtIndividualShortPct:     window.ASSUMPTIONS.cgtIndividualShortPct,
  cgtIndividualLongPct:      window.ASSUMPTIONS.cgtIndividualLongPct,
  cgtDurationThresholdMonths: window.ASSUMPTIONS.cgtDurationThresholdMonths,
  mortgageRateDefault:       window.ASSUMPTIONS.mortgageRateDefault,
  ltvMaxForeigner:           window.ASSUMPTIONS.ltvMaxForeigner,
  ltvMaxResident:            window.ASSUMPTIONS.ltvMaxResident,
  bankSetupFeePct:           window.ASSUMPTIONS.bankSetupFeePct,
  mortgageInsurancePct:      window.ASSUMPTIONS.mortgageInsurancePct,
  avgPricePerSqmBucharest:   window.ASSUMPTIONS.avgPricePerSqmBucharest,
  avgRentalYieldBucharest:   window.ASSUMPTIONS.avgRentalYieldBucharest,
  avgDaysOnMarket:           window.ASSUMPTIONS.avgDaysOnMarket,
  avgPriceGrowthAnnual:      window.ASSUMPTIONS.avgPriceGrowthAnnual,
});
