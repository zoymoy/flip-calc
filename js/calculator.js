/**
 * FlipCalc — Core Calculation Engine
 * Uses realistic Romanian cost items per official sources (see assumptions.js)
 */

window.Calculator = {

  /**
   * Calculate renovation cost based on quality preset or custom value.
   * Returns { base, total }.
   */
  calcReno(params) {
    const A = window.ASSUMPTIONS;
    let base;
    if (params.renoQuality === 'custom') {
      base = params.renoCustomAmt || 0;
    } else {
      const rates = { low: A.renoLow, midLow: A.renoMidLow, mid: A.renoMid, midHigh: A.renoMidHigh, high: A.renoHigh };
      base = (rates[params.renoQuality] || A.renoMid) * (params.propertySize || 60);
    }
    return { base, total: base };
  },

  /**
   * Calculate all acquisition costs
   */
  calcAcquisitionCosts(purchasePrice, hasLoan, ltvPct) {
    const A = window.ASSUMPTIONS;
    const notary = Math.round(purchasePrice * A.notaryFeePct / 100);
    const buyerAgent = Math.round(purchasePrice * A.buyerAgentPct / 100);
    const landRegistry = A.landRegistryFee;
    const bankSetupFee = hasLoan ? Math.round(purchasePrice * ltvPct / 100 * A.bankSetupFeePct / 100) : 0;
    return { notary, buyerAgent, landRegistry, bankSetupFee,
      total: notary + buyerAgent + landRegistry + bankSetupFee };
  },

  /**
   * Calculate holding costs over project duration
   */
  calcHoldingCosts(months) {
    const A = window.ASSUMPTIONS;
    const utility   = A.utilityMonthly * months;
    const propTax   = A.propertyTaxMonthly * months;
    const maint     = A.buildingMaintMonthly * months;
    const insurance = A.propertyInsuranceMonthly * months;
    return { utility, propTax, maint, insurance, total: utility + propTax + maint + insurance };
  },

  /**
   * Calculate sale costs
   */
  calcSaleCosts(arv) {
    const A = window.ASSUMPTIONS;
    const sellerAgent = Math.round(arv * A.sellerAgentPct / 100);
    const sellerNotary = Math.round(arv * A.sellerNotaryPct / 100);
    return { sellerAgent, sellerNotary, total: sellerAgent + sellerNotary };
  },

  /**
   * Calculate capital gains tax
   * Flip deals: 3% of ARV (Art. 111 — sold within 3 years)
   */
  calcCGT(arv) {
    const A = window.ASSUMPTIONS;
    if (arv <= 0) return 0;
    return Math.round(arv * A.cgtIndividualShortPct / 100);
  },

  /**
   * Full calculation for 100% Equity scenario
   */
  calcEquity(params) {
    const renoObj = this.calcReno(params);
    const acq = this.calcAcquisitionCosts(params.purchasePrice, false, 0);
    const holding = this.calcHoldingCosts(params.projectMonths);
    const saleCosts = this.calcSaleCosts(params.arv);

    const totalInvestment = params.purchasePrice + acq.total + renoObj.total + holding.total;
    const grossProfit = params.arv - totalInvestment - saleCosts.total;
    const cgt = this.calcCGT(params.arv);
    const netProfit = grossProfit - cgt;

    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;
    const profitMargin = params.arv > 0 ? (netProfit / params.arv) * 100 : 0;

    return {
      mode: 'equity',
      purchasePrice: params.purchasePrice,
      acq, reno: renoObj.base, holding, saleCosts,
      totalInvestment,
      arv: params.arv,
      grossProfit,
      cgt,
      netProfit,
      capitalRequired: totalInvestment,
      roi, annualROI, profitMargin,
    };
  },

  /**
   * Active Partner (Party B — Costi): funds 25% of non-reno costs + 100% of renovation.
   * Profit split per term sheet: 35% standard, 40% fast flip (< 4 months).
   */
  calcActivePartner(params) {
    const A = window.ASSUMPTIONS;
    const base = this.calcEquity(params);
    const passiveShare = (params.yourSharePct || A.jvCapitalSplitPassivePct) / 100;
    const activeShare  = 1 - passiveShare;
    const isFastFlip   = params.projectMonths < A.jvFastFlipThresholdMonths;
    const activeProfitPct  = (isFastFlip ? A.jvProfitSplitFastFlipActivePct : A.jvProfitSplitStandardActivePct) / 100;

    // Party B funds 100% of reno + activeShare of all other costs
    const nonRenoCosts  = base.totalInvestment - base.reno;
    const activeCapital = nonRenoCosts * activeShare + base.reno;
    const passiveCapital = nonRenoCosts * passiveShare;

    // Net profit (after CGT) split by profit percentage
    const activeNetProfit = Math.round(base.netProfit * activeProfitPct);

    const roi      = activeCapital > 0 ? (activeNetProfit / activeCapital) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;

    return {
      mode: 'active',
      ...base,
      activeShare, passiveShare, activeCapital, passiveCapital,
      activeProfitPct, isFastFlip,
      activeNetProfit,
      capitalRequired: activeCapital,
      netProfit: activeNetProfit,
      roi, annualROI,
      profitMargin: params.arv > 0 ? (activeNetProfit / params.arv) * 100 : 0,
    };
  },

  /**
   * Passive Partner (Party A — Yoav): funds 75% of non-reno costs, 0% of renovation.
   * Profit split per term sheet: 65% standard, 60% fast flip (< 4 months).
   */
  calcPassivePartner(params) {
    const A = window.ASSUMPTIONS;
    const base = this.calcEquity(params);
    const passiveShare = (params.yourSharePct || A.jvCapitalSplitPassivePct) / 100;
    const activeShare  = 1 - passiveShare;
    const isFastFlip   = params.projectMonths < A.jvFastFlipThresholdMonths;
    const activeProfitPct  = (isFastFlip ? A.jvProfitSplitFastFlipActivePct : A.jvProfitSplitStandardActivePct) / 100;
    const passiveProfitPct = 1 - activeProfitPct;

    // Party A funds passiveShare of non-reno costs, 0% of reno
    const nonRenoCosts   = base.totalInvestment - base.reno;
    const passiveCapital = nonRenoCosts * passiveShare;
    const activeCapital  = nonRenoCosts * activeShare + base.reno;

    // Net profit (after CGT) split by profit percentage
    const passiveNetProfit = Math.round(base.netProfit * passiveProfitPct);

    const roi      = passiveCapital > 0 ? (passiveNetProfit / passiveCapital) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;

    return {
      mode: 'passive',
      ...base,
      passiveShare, activeShare, passiveCapital, activeCapital,
      activeProfitPct, passiveProfitPct, isFastFlip,
      passiveNetProfit,
      capitalRequired: passiveCapital,
      netProfit: passiveNetProfit,
      roi, annualROI,
      profitMargin: params.arv > 0 ? (passiveNetProfit / params.arv) * 100 : 0,
    };
  },

  /**
   * Run all scenarios and return combined result
   */
  calcAll(params) {
    const A = window.ASSUMPTIONS;
    const equity  = this.calcEquity(params);
    const active  = this.calcActivePartner(params);
    const passive = this.calcPassivePartner(params);
    const eraInfo = A.BUILDING_ERAS[params.buildingEra] || A.BUILDING_ERAS['1978'];
    return { equity, active, passive, params, eraInfo };
  }
};
