/**
 * FlipCalc — Core Calculation Engine
 * Uses realistic Romanian cost items per official sources (see assumptions.js)
 */

window.Calculator = {

  /**
   * Calculate renovation cost based on quality preset or custom value.
   * Returns { base, hidden, total } where hidden is an era-based add-on.
   * Hidden cost only applies to preset tiers — custom amounts are assumed to already
   * account for building-specific issues.
   */
  calcReno(params) {
    const A = window.ASSUMPTIONS;
    let base;
    if (params.renoQuality === 'custom') {
      base = params.renoCustomAmt || 0;
    } else {
      const rates = { low: A.renoLow, mid: A.renoMid, high: A.renoHigh };
      base = (rates[params.renoQuality] || A.renoMid) * (params.propertySize || 60);
    }
    const era = A.BUILDING_ERAS[params.buildingEra] || A.BUILDING_ERAS['1978'];
    const hidden = params.renoQuality !== 'custom' ? (era.renoHiddenCost || 0) : 0;
    return { base, hidden, total: base + hidden };
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
    const utility = A.utilityMonthly * months;
    const propTax = A.propertyTaxMonthly * months;
    const maint = A.buildingMaintMonthly * months;
    return { utility, propTax, maint, total: utility + propTax + maint };
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
   * Romanian Fiscal Code Art. 111: 3% if sold ≤ 3 years, 1% if sold > 3 years
   */
  calcCGT(grossProfit, projectMonths) {
    const A = window.ASSUMPTIONS;
    if (grossProfit <= 0) return 0;
    const threshold = A.cgtDurationThresholdMonths || 36;
    const rate = (projectMonths || 0) > threshold
      ? A.cgtIndividualLongPct   // > 3 years → 1%
      : A.cgtIndividualShortPct; // ≤ 3 years → 3%
    return Math.round(grossProfit * rate / 100);
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
    const cgt = this.calcCGT(grossProfit, params.projectMonths);
    const netProfit = grossProfit - cgt;

    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;
    const profitMargin = params.arv > 0 ? (netProfit / params.arv) * 100 : 0;

    return {
      mode: 'equity',
      purchasePrice: params.purchasePrice,
      acq, reno: renoObj.base, renoHidden: renoObj.hidden, holding, saleCosts,
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
   * Full calculation for Partnership scenario
   */
  calcPartnership(params) {
    const base = this.calcEquity(params);
    const yourShare = (params.yourSharePct || 50) / 100;
    const mgmtRate = (params.mgmtFeePct || 0) / 100;

    const yourCapital = base.totalInvestment * yourShare;
    const partnerCapital = base.totalInvestment * (1 - yourShare);
    const mgmtFee = Math.round(base.grossProfit * mgmtRate);
    const profitAfterMgmt = base.grossProfit - mgmtFee;
    const yourProfitShare = Math.round(profitAfterMgmt * yourShare);
    const yourGrossProfit = mgmtFee + yourProfitShare;
    const yourCGT = this.calcCGT(yourGrossProfit, params.projectMonths);
    const yourNetProfit = yourGrossProfit - yourCGT;

    const roi = yourCapital > 0 ? (yourNetProfit / yourCapital) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;
    const capitalFreed = base.totalInvestment - yourCapital;

    return {
      mode: 'partnership',
      ...base,
      yourShare, yourCapital, partnerCapital,
      mgmtFee, profitAfterMgmt, yourProfitShare,
      yourGrossProfit, yourCGT, yourNetProfit,
      capitalRequired: yourCapital,
      capitalFreed,
      netProfit: yourNetProfit,
      roi, annualROI,
      profitMargin: params.arv > 0 ? (yourNetProfit / params.arv) * 100 : 0,
    };
  },

  /**
   * Run equity and partnership scenarios and return combined result
   */
  calcAll(params) {
    const A = window.ASSUMPTIONS;
    const equity      = this.calcEquity(params);
    const partnership = this.calcPartnership(params);
    const eraInfo = A.BUILDING_ERAS[params.buildingEra] || A.BUILDING_ERAS['1978'];
    return { equity, partnership, params, eraInfo };
  }
};
