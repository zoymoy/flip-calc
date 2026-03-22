/**
 * FlipCalc — Core Calculation Engine
 * Uses realistic Romanian cost items per official sources (see assumptions.js)
 */

window.Calculator = {

  /**
   * Calculate renovation cost based on quality preset or custom value
   */
  calcReno(params) {
    const A = window.ASSUMPTIONS;
    if (params.renoQuality === 'custom') return params.renoCustomAmt || 0;
    const rates = { low: A.renoLow, mid: A.renoMid, high: A.renoHigh };
    return (rates[params.renoQuality] || A.renoMid) * (params.propertySize || 60);
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
   * Romanian Fiscal Code: 10% individual, 16% company
   */
  calcCGT(grossProfit, taxStructure) {
    const A = window.ASSUMPTIONS;
    if (grossProfit <= 0) return 0;
    const rate = taxStructure === 'company' ? A.cgtCompanyPct : A.cgtIndividualPct;
    return Math.round(grossProfit * rate / 100);
  },

  /**
   * Full calculation for 100% Equity scenario
   */
  calcEquity(params) {
    const reno = this.calcReno(params);
    const acq = this.calcAcquisitionCosts(params.purchasePrice, false, 0);
    const holding = this.calcHoldingCosts(params.projectMonths);
    const saleCosts = this.calcSaleCosts(params.arv);

    const totalInvestment = params.purchasePrice + acq.total + reno + holding.total;
    const grossProfit = params.arv - totalInvestment - saleCosts.total;
    const cgt = this.calcCGT(grossProfit, params.taxStructure);
    const netProfit = grossProfit - cgt;

    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const annualROI = params.projectMonths > 0 ? roi * (12 / params.projectMonths) : 0;
    const profitMargin = params.arv > 0 ? (netProfit / params.arv) * 100 : 0;

    return {
      mode: 'equity',
      purchasePrice: params.purchasePrice,
      acq, reno, holding, saleCosts,
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
    const yourCGT = this.calcCGT(yourGrossProfit, params.taxStructure);
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
   * Full calculation for Mortgage/Loan scenario
   */
  calcLoan(params) {
    const ltv = (params.ltvPct || 70) / 100;
    const rate = (params.mortgageRate || 6.5) / 100;
    const months = params.projectMonths || 9;

    const loanAmount = Math.round(params.purchasePrice * ltv);
    const ownEquity = params.purchasePrice - loanAmount;
    const interest = Math.round(loanAmount * rate * (months / 12));

    const A = window.ASSUMPTIONS;
    const bankSetupFee = Math.round(loanAmount * A.bankSetupFeePct / 100);
    const acq = this.calcAcquisitionCosts(params.purchasePrice, true, params.ltvPct || 70);
    const reno = this.calcReno(params);
    const holding = this.calcHoldingCosts(months);
    const saleCosts = this.calcSaleCosts(params.arv);

    const totalEquityDeployed = ownEquity + reno + acq.total + holding.total;
    // gross profit: arv minus everything paid out of pocket (equity + interest + sale costs)
    const grossProfit = params.arv - loanAmount - reno - acq.total - holding.total - interest - saleCosts.total - ownEquity;
    const cgt = this.calcCGT(grossProfit, params.taxStructure);
    const netProfit = grossProfit - cgt;

    const roi = totalEquityDeployed > 0 ? (netProfit / totalEquityDeployed) * 100 : 0;
    const annualROI = months > 0 ? roi * (12 / months) : 0;
    const capitalFreed = params.purchasePrice - ownEquity;

    return {
      mode: 'loan',
      purchasePrice: params.purchasePrice,
      loanAmount, ownEquity, interest,
      acq, reno, holding, saleCosts,
      totalEquityDeployed,
      arv: params.arv,
      grossProfit, cgt, netProfit,
      capitalRequired: totalEquityDeployed,
      capitalFreed,
      roi, annualROI,
      profitMargin: params.arv > 0 ? (netProfit / params.arv) * 100 : 0,
    };
  },

  /**
   * Risk score 1–10 for a scenario result.
   * Factors: profit margin cushion (55%), leverage/obligation (30%), project duration (15%).
   */
  calcRiskScore(result, params) {
    const margin = Math.max(result.profitMargin / 100, 0);
    const marginRisk = 1 - Math.min(margin / 0.30, 1);

    let leverageFactor;
    if (result.mode === 'loan') {
      leverageFactor = 0.40 + (params.ltvPct / 100) * 0.60;
    } else if (result.mode === 'partnership') {
      leverageFactor = 0.25;
    } else {
      leverageFactor = 0.40;
    }

    const durationFactor = Math.min(params.projectMonths / 18, 1);
    const raw = marginRisk * 0.55 + leverageFactor * 0.30 + durationFactor * 0.15;
    return Math.round(Math.min(Math.max(1 + raw * 9, 1), 10));
  },

  /**
   * Run all three scenarios and return combined result
   */
  calcAll(params) {
    const equity      = this.calcEquity(params);
    const partnership = this.calcPartnership(params);
    const loan        = this.calcLoan(params);
    equity.riskScore      = this.calcRiskScore(equity,      params);
    partnership.riskScore = this.calcRiskScore(partnership, params);
    loan.riskScore        = this.calcRiskScore(loan,        params);
    return { equity, partnership, loan, params };
  }
};
